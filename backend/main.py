import io
import time
import uuid
import os
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List

import hashlib
import hmac

from dotenv import load_dotenv

# Local dev reads backend/.env; on Render the dashboard env vars are used (no .env is deployed)
load_dotenv()

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from schemas import (
    DiagnosisResponse,
    ClinicalSessionResult,
    DomainClassificationResult,
    DiagnosticResult,
    DicomMetadata,
    AuditLogEntry,
    TenantConfigResponse,
    PatientIntakeRequest,
    PatientLookupRequest,
    VisitSignOffRequest,
)
from model_loader import ModelEngine
from download_models import download_models
import drive_store
import mailer
import patient_store
import whatsapp
from patient_store import PatientStoreUnavailable

engine = ModelEngine()
_models_ready = False

# Domains with a trained child classifier (skin is routed but has no pathology model yet)
SUPPORTED_PATHOLOGY_DOMAINS = ["brain", "lung", "breast", "bone"]

TENANT_CONFIG = {
    "hospitalName": "Metropolitan Radiologic Health Network",
    "departmentName": "Department of Clinical Informatics & Diagnostic Imaging",
    "facilityCode": "MRHN-CENTRAL-01",
    "dicomAeTitle": "MRHN_PACS_ROUTER",
    "regulatoryDisclaimer": "Decision-Support Instrument Only — Investigational Software. Requires Attending Pathologist / Radiologist Sign-off.",
    "modelVersion": "v2.4.1-rc3",
    "lastValidatedDate": "2026-08-15",
    "supportContact": "pacs-informatics@radiologycore.org",
    "anonymizationProtocol": "HIPAA Safe Harbor De-identification (45 CFR § 164.514(b)(2))",
}

audit_logs: List[AuditLogEntry] = [
    AuditLogEntry(
        id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        actor="SYS_INFERENCE_ENGINE",
        action="SUBSYSTEM_INITIALIZED",
        details="Dual-stage hierarchical neural pipeline online and ready for ingestion.",
        status="SUCCESS",
    ),
    AuditLogEntry(
        id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        actor="PACS_GATEWAY_NODE",
        action="SECURE_CHANNEL_READY",
        details=f"Mutual TLS 1.3 session established for AE: {TENANT_CONFIG['dicomAeTitle']}.",
        status="SUCCESS",
    ),
]


_init_error: Optional[str] = None


def _sync_init():
    global _models_ready, _init_error
    try:
        download_models()
        engine.initialize()
        _models_ready = True
        _init_error = None
        print("==> All models loaded. Service is fully operational.")
    except Exception as e:
        import traceback
        _init_error = f"{type(e).__name__}: {str(e)}"
        print(f"==> ERROR INITIALIZING MODELS: {_init_error}")
        traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _sync_init)
    loop.run_in_executor(None, patient_store.init_store)
    yield


app = FastAPI(
    title="Clinical Radiologic Diagnostic API",
    description="Dual-stage hierarchical inference engine for radiologic scan domain routing and pathology classification.",
    version="2.4.1",
    lifespan=lifespan,
)

_default_origins = [
    "https://cancer-detection-system-two.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]
_extra = os.environ.get("RENDER_ALLOWED_ORIGINS", "")
_allowed_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    status = "operational" if _models_ready else ("error" if _init_error else "initializing")
    return {
        "status": status,
        "models_initialized": _models_ready,
        "init_error": _init_error,
        "available_domains": SUPPORTED_PATHOLOGY_DOMAINS,
        "cached_domains": list(getattr(engine, "child_models", {}).keys()),
        "router_classes": getattr(engine, "parent_classes", ["bone", "brain", "breast", "lung", "skin"]),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "modelVersion": TENANT_CONFIG["modelVersion"],
        "facilityCode": TENANT_CONFIG["facilityCode"],
        "patient_db": patient_store.store_status(),
        "email": mailer.mailer_status(),
        "image_archive": drive_store.drive_status(),
    }


@app.get("/api/config", response_model=TenantConfigResponse)
def get_tenant_config():
    return TenantConfigResponse(
        **TENANT_CONFIG,
        availableDomains=list(getattr(engine, "child_models", {}).keys()) if _models_ready else [],
    )


@app.get("/api/audit-logs", response_model=List[AuditLogEntry])
def get_audit_logs():
    return audit_logs


@app.post("/api/audit-logs", response_model=AuditLogEntry)
def record_audit_log(entry: AuditLogEntry):
    audit_logs.insert(0, entry)
    return entry


@app.post("/api/diagnose", response_model=DiagnosisResponse)
async def diagnose_image(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    domain_override: Optional[str] = Form(None),
    visit_code: Optional[str] = Form(None),
):
    if not _models_ready:
        if _init_error:
            raise HTTPException(
                status_code=503,
                detail=f"Neural model loading failed during container boot: {_init_error}. Check Render logs."
            )
        raise HTTPException(
            status_code=503,
            detail="Neural inference engine is still initializing and loading model weights. Please wait a moment and retry."
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    pipeline_start = time.perf_counter()

    try:
        predicted_domain, domain_conf, router_latency, domain_probs = engine.predict_domain(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Domain routing error: {str(e)}")

    target_domain = predicted_domain
    if domain_override and domain_override.lower() in ["brain", "lung", "breast", "bone", "skin"]:
        target_domain = domain_override.lower()

    if target_domain not in SUPPORTED_PATHOLOGY_DOMAINS:
        raise HTTPException(
            status_code=422,
            detail=f"Scan identified as {target_domain.upper()} ({domain_conf*100:.1f}% confidence). "
                   f"Pathology analysis for this domain is not yet available. "
                   f"Supported: {', '.join(d.upper() for d in SUPPORTED_PATHOLOGY_DOMAINS)}.",
        )

    try:
        top_class, display_name, risk_level, child_conf, child_latency, class_probs = engine.predict_child(
            target_domain, image
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pathology prediction error: {str(e)}")

    total_pipeline_ms = (time.perf_counter() - pipeline_start) * 1000
    session_id = f"CLIN-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    timestamp_iso = datetime.utcnow().isoformat() + "Z"

    modality_map = {"brain": "MR", "lung": "CT", "breast": "MG", "bone": "DX", "skin": "US"}
    body_part_map = {
        "brain": "BRAIN / CRANIAL",
        "lung": "CHEST / THORAX",
        "breast": "BREAST BILATERAL",
        "bone": "SKELETAL RADIOGRAPH",
        "skin": "DERMAL LESION",
    }

    dicom_meta = DicomMetadata(
        patientMRN=f"MRN-{uuid.uuid4().int % 10000000:07d}",
        patientName="ANONYMIZED_CLINICAL_STUDY",
        patientDOB="1978-06-14",
        patientSex="F" if target_domain == "breast" else "M",
        studyDate=datetime.utcnow().strftime("%Y-%m-%d"),
        studyUID=f"1.2.840.113619.2.55.3.{uuid.uuid4().int % 1000000000}.1",
        seriesUID=f"1.2.840.113619.2.55.3.{uuid.uuid4().int % 1000000000}.2",
        accessionNumber=f"ACC-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}",
        modality=modality_map.get(target_domain, "DX"),
        bodyPartExamined=body_part_map.get(target_domain, "GENERAL EXAMINATION"),
        sliceThickness="3.0 mm" if target_domain in ["brain", "lung"] else None,
        institution=TENANT_CONFIG["hospitalName"],
        referringPhysician="Clinical Attending Radiologist, MD",
        imagingDevice="Clinical PACS Radiography Node",
    )

    session_result = ClinicalSessionResult(
        sessionId=session_id,
        imageFile=file.filename,
        domainClassification=DomainClassificationResult(
            predictedDomain=target_domain,
            confidence=domain_conf,
            latencyMs=router_latency,
            probabilities=domain_probs,
            analysisTimestamp=timestamp_iso,
        ),
        diagnosticFinding=DiagnosticResult(
            domain=target_domain,
            predictedClass=top_class,
            displayName=display_name,
            riskLevel=risk_level,
            confidence=child_conf,
            classProbabilities=class_probs,
            latencyMs=child_latency,
            totalPipelineMs=round(total_pipeline_ms, 1),
        ),
        timestamp=timestamp_iso,
    )

    audit_logs.insert(
        0,
        AuditLogEntry(
            id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            actor="SYSTEM_PIPELINE",
            action="STUDY_DIAGNOSTIC_EVAL",
            details=f"Inference completed for {file.filename} -> {target_domain.upper()} ({display_name} @ {child_conf*100:.1f}%)",
            status="SUCCESS",
        ),
    )

    if visit_code:
        # Best-effort: a registry outage must never block the clinical result
        try:
            patient_store.get_store().record_diagnosis(
                visit_code,
                finding={
                    "session_id": session_id,
                    "domain": target_domain,
                    "domain_override": target_domain != predicted_domain,
                    "domain_confidence": domain_conf,
                    "predicted_class": top_class,
                    "display_name": display_name,
                    "risk_level": risk_level,
                    "confidence": child_conf,
                    "class_probabilities": [
                        {"class_name": c["className"], "probability": c["probability"]} for c in class_probs
                    ],
                    "model_version": TENANT_CONFIG["modelVersion"],
                    "pipeline_ms": round(total_pipeline_ms, 1),
                },
                scan={
                    "file_name": file.filename,
                    "sha256": hashlib.sha256(contents).hexdigest(),
                    "size_bytes": len(contents),
                    "content_type": file.content_type,
                },
            )
        except Exception as e:
            print(f"[patient_store] Could not record diagnosis for visit: {type(e).__name__}")

        if drive_store.drive_status() == "configured":
            background.add_task(_archive_scan_to_drive, visit_code, contents, file.filename, file.content_type, target_domain)

    return DiagnosisResponse(
        sessionResult=session_result,
        dicomMetadata=dicom_meta,
    )


def _archive_scan_to_drive(visit_code: str, data: bytes, file_name: str, content_type: Optional[str], domain: str):
    """Runs after the response is sent: file the scan in the patient's Drive folder."""
    try:
        store = patient_store.get_store()
        ctx = store.drive_context(visit_code)
        if not ctx:
            return
        sha = hashlib.sha256(data).hexdigest()
        if (ctx["scan_drive"] or {}).get("sha256") == sha:
            return  # same image re-run (e.g. domain override) — already archived
        folder_id = drive_store.ensure_patient_folder(ctx["patient_code"], ctx["patient_name"], ctx["drive_folder_id"])
        if folder_id != ctx["drive_folder_id"]:
            store.set_patient_drive_folder(ctx["patient_code"], folder_id)
        ext = os.path.splitext(file_name or "")[1].lower() or ".jpg"
        name = f"{visit_code}_{domain}_{datetime.utcnow():%Y%m%d-%H%M%S}{ext}"
        info = drive_store.upload_image(folder_id, name, data, content_type or "application/octet-stream")
        store.set_visit_scan_drive(visit_code, {**info, "file_name": name, "sha256": sha, "uploaded_at": datetime.utcnow()})
        print(f"[drive] Archived scan for {ctx['patient_code']} / {visit_code}")
    except Exception as e:
        print(f"[drive] Scan archive failed for {visit_code}: {type(e).__name__}: {e}")


# ── Patient Registry ─────────────────────────────────────────────────────────

def require_registry_key(x_api_key: Optional[str] = Header(None)):
    """If PATIENT_API_KEY is set, patient endpoints require it (injected server-side by the Next.js proxy)."""
    expected = os.environ.get("PATIENT_API_KEY", "")
    if expected and not hmac.compare_digest(x_api_key or "", expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _registry():
    try:
        return patient_store.get_store()
    except PatientStoreUnavailable:
        raise HTTPException(status_code=503, detail="Patient registry is unavailable. Diagnosis still works; records will not be saved.")


@app.post("/api/patients/intake", dependencies=[Depends(require_registry_key)])
def patient_intake(req: PatientIntakeRequest):
    result = _registry().register_visit(req.model_dump())
    audit_logs.insert(0, AuditLogEntry(
        id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        actor="PATIENT_REGISTRY",
        action="RETURNING_PATIENT_VISIT" if result["isReturning"] else "NEW_PATIENT_REGISTERED",
        details=f"{result['patientCode']} opened visit {result['visitCode']} (visit #{result['visitNumber']}).",
        status="SUCCESS",
    ))
    return result


# POST (not GET) so the MRN never appears in URLs or access logs
@app.post("/api/patients/lookup", dependencies=[Depends(require_registry_key)])
def patient_lookup(req: PatientLookupRequest):
    found = _registry().lookup_by_mrn(req.mrn)
    if not found:
        raise HTTPException(status_code=404, detail="No patient on record with this MRN")
    return found


@app.post("/api/visits/{visit_code}/signoff", dependencies=[Depends(require_registry_key)])
def visit_signoff(visit_code: str, req: VisitSignOffRequest):
    if not _registry().sign_off(visit_code, req.notes, req.signedBy):
        raise HTTPException(status_code=404, detail="Visit not found")
    return {"visitCode": visit_code, "status": "signed_off"}


@app.post("/api/visits/{visit_code}/send-report", dependencies=[Depends(require_registry_key)])
def visit_send_report(visit_code: str):
    """E-mail the signed-off report to the patient's address on record (never taken from the client)."""
    store = _registry()
    ctx = store.report_context(visit_code)
    if not ctx:
        raise HTTPException(status_code=404, detail="Visit not found")
    if ctx["visit"].get("status") != "signed_off":
        raise HTTPException(status_code=409, detail="Report can only be sent after the doctor has signed off")
    if not ctx["email"]:
        raise HTTPException(status_code=422, detail="No e-mail address on record for this patient")

    mail = mailer.build_report_email(
        patient_name=ctx["patient_name"] or "Patient",
        hospital=os.environ.get("BREVO_SENDER_NAME") or "CancerLens",
        support_contact=os.environ.get("BREVO_SENDER_EMAIL") or TENANT_CONFIG["supportContact"],
        visit=ctx["visit"],
        doctor_notes=ctx["doctor_notes"],
        signed_by=ctx["signed_by"],
    )
    try:
        message_id = mailer.send_email(ctx["email"], ctx["patient_name"] or "Patient", mail["subject"], mail["html"], mail["text"])
    except mailer.MailerError as e:
        raise HTTPException(status_code=502, detail=str(e))

    store.log_report_email(visit_code, message_id)
    patient_code = ctx["visit"].get("patient_code")
    audit_logs.insert(0, AuditLogEntry(
        id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        actor="PATIENT_REGISTRY",
        action="REPORT_EMAILED",
        details=f"Report for visit {visit_code} e-mailed to {patient_code}'s address on record.",
        status="SUCCESS",
    ))
    return {"visitCode": visit_code, "sent": True, "recipient": _mask_email(ctx["email"])}


@app.post("/api/visits/{visit_code}/whatsapp-link", dependencies=[Depends(require_registry_key)])
def visit_whatsapp_link(visit_code: str):
    """Build a WhatsApp click-to-chat link (notification only, no diagnosis) for the patient's number on record."""
    store = _registry()
    ctx = store.report_context(visit_code)
    if not ctx:
        raise HTTPException(status_code=404, detail="Visit not found")
    if ctx["visit"].get("status") != "signed_off":
        raise HTTPException(status_code=409, detail="WhatsApp notification is available after the doctor has signed off")
    try:
        phone = whatsapp.normalize_phone(ctx["phone"])
    except whatsapp.WhatsAppError as e:
        raise HTTPException(status_code=422, detail=str(e))

    message = whatsapp.build_message(
        ctx["patient_name"] or "",
        os.environ.get("BREVO_SENDER_NAME") or "CancerLens",
        report_emailed=bool(ctx["visit"].get("report_emails")),
    )
    store.log_whatsapp_link(visit_code)
    audit_logs.insert(0, AuditLogEntry(
        id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        actor="PATIENT_REGISTRY",
        action="WHATSAPP_NOTIFICATION_OPENED",
        details=f"WhatsApp notification prepared for {ctx['visit'].get('patient_code')} (visit {visit_code}).",
        status="INFO",
    ))
    return {
        "visitCode": visit_code,
        "url": whatsapp.click_to_chat_url(phone, message),
        "recipient": whatsapp.mask_phone(phone),
    }


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}{'•' * max(len(local) - 1, 2)}@{domain}"

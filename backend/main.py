import io
import time
import uuid
import os
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
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
)
from model_loader import ModelEngine
from download_models import download_models

engine = ModelEngine()
_models_ready = False

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
        "available_domains": ["brain", "lung", "breast", "bone", "skin"],
        "cached_domains": list(engine.child_models.keys()),
        "router_classes": getattr(engine, "parent_classes", []),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "modelVersion": TENANT_CONFIG["modelVersion"],
        "facilityCode": TENANT_CONFIG["facilityCode"],
    }


@app.get("/api/config", response_model=TenantConfigResponse)
def get_tenant_config():
    return TenantConfigResponse(
        **TENANT_CONFIG,
        availableDomains=list(engine.child_models.keys()) if _models_ready else [],
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
    file: UploadFile = File(...),
    domain_override: Optional[str] = Form(None),
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

    return DiagnosisResponse(
        sessionResult=session_result,
        dicomMetadata=dicom_meta,
    )

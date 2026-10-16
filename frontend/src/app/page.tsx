"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import HospitalHeader from "@/components/header/HospitalHeader";
import DicomViewer from "@/components/viewer/DicomViewer";
import ParentRouterCard from "@/components/router/ParentRouterCard";
import ChildDiagnosticCard from "@/components/diagnostic/ChildDiagnosticCard";
import ClinicalActionPanel from "@/components/diagnostic/ClinicalActionPanel";
import FindingsTab from "@/components/tabs/FindingsTab";
import DicomMetadataTab from "@/components/tabs/DicomMetadataTab";
import SendToPhysicianModal from "@/components/modals/SendToPhysicianModal";
import PatientReportModal from "@/components/modals/PatientReportModal";
import AuditLogsModal from "@/components/modals/AuditLogsModal";

// ── Workflow Components ──────────────────────────────────────────────────────
import WorkflowTimeline, { type WorkflowStep } from "@/components/workflow/WorkflowTimeline";
import PatientIntakeForm, { type PatientFormData } from "@/components/workflow/PatientIntakeForm";
import DoctorInspectionPanel from "@/components/workflow/DoctorInspectionPanel";
import ReportTransmissionPanel from "@/components/workflow/ReportTransmissionPanel";

import {
  runApiDiagnosis,
  checkBackendHealth,
  fetchTenantConfig,
  fetchAuditLogs,
  recordClientAuditLog,
  registerPatientVisit,
  lookupPatientByMrn,
  signOffVisit,
} from "@/lib/api";
import type {
  ClinicalSessionResult,
  InferenceStatus,
  ViewportSettings,
  DicomMetadata,
  Domain,
  AuditLogEntry,
  BackendHealthInfo,
  ClinicalPriority,
  PatientVisitRegistration,
} from "@/lib/types";
import { DEFAULT_TENANT, type TenantBranding } from "@/config/tenant";
import { STRINGS } from "@/config/strings";
import { DEFAULT_VIEWPORT_SETTINGS } from "@/config/imaging";
import { createPreliminaryDicomMetadata, cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export default function DiagnosticWorkspacePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Tenant / Health ──────────────────────────────────────────────────────
  const [tenant, setTenant] = useState<TenantBranding>(DEFAULT_TENANT);
  const [healthInfo, setHealthInfo] = useState<BackendHealthInfo>({ online: false, status: "offline" });

  // ── Workflow Step State ──────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set());
  const [patientData, setPatientData] = useState<PatientFormData | null>(null);
  const [doctorNotes, setDoctorNotes] = useState<string>("");
  const [visit, setVisit] = useState<PatientVisitRegistration | null>(null);

  // ── Scan / AI State ──────────────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [inferenceStatus, setInferenceStatus] = useState<InferenceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ClinicalSessionResult | null>(null);
  const [dicom, setDicom] = useState<DicomMetadata | null>(null);
  const [overrideDomain, setOverrideDomain] = useState<Domain | null>(null);

  // ── Viewport Control State & Heatmap Overlay ─────────────────────────────
  const [viewport, setViewport] = useState<ViewportSettings>(DEFAULT_VIEWPORT_SETTINGS);
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(false);

  // ── Bottom Tabs State ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"findings" | "metadata">("findings");

  // ── Modals & Audit Logs State ────────────────────────────────────────────
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // ── Load Tenant Config, Health, & Smart Heartbeat Polling ────────────────
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const maxPolls = 6;

    const check = async () => {
      const health = await checkBackendHealth();
      setHealthInfo(health);
      if (health.status === "initializing" && pollCount < maxPolls) {
        pollCount++;
        timerId = setTimeout(check, 10000);
      }
    };

    check();
    fetchTenantConfig().then(setTenant);
    fetchAuditLogs().then(setAuditLogs);

    return () => { if (timerId) clearTimeout(timerId); };
  }, []);

  // ── Audit Log Helper ─────────────────────────────────────────────────────
  const addAuditEvent = useCallback((action: string, details: string, status: "SUCCESS" | "WARNING" | "INFO" = "SUCCESS") => {
    const newEntry: AuditLogEntry = {
      id: `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      actor: "CLINICAL_USER_WORKSTATION",
      action,
      details,
      status,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    recordClientAuditLog({ actor: "CLINICAL_USER_WORKSTATION", action, details, status });
  }, []);

  // ── Step Navigation Helpers ──────────────────────────────────────────────
  const markStepComplete = useCallback((step: WorkflowStep) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  // ── Step 1: Patient Intake Submit ────────────────────────────────────────
  const handlePatientSubmit = useCallback(async (data: PatientFormData) => {
    setPatientData(data);
    markStepComplete(1);
    setCurrentStep(2);
    const registration = await registerPatientVisit(data);
    setVisit(registration);
    // Audit entries reference the non-identifying patient code, never name/MRN
    if (registration) {
      addAuditEvent(
        "PATIENT_INTAKE",
        `${registration.patientCode} ${registration.isReturning ? `returning (visit #${registration.visitNumber})` : "registered"} — visit ${registration.visitCode}.`
      );
    } else {
      addAuditEvent("PATIENT_INTAKE", "Patient intake completed; registry offline — visit not persisted.", "WARNING");
    }
  }, [markStepComplete, addAuditEvent]);

  // ── Step 2: File Ingestion ────────────────────────────────────────────────
  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setInferenceStatus("idle");
    setResult(null);
    setIsHeatmapActive(false);
    const prelimDicom = createPreliminaryDicomMetadata(file, tenant);
    setDicom(prelimDicom);
    setViewport(DEFAULT_VIEWPORT_SETTINGS);
    setOverrideDomain(null);
    addAuditEvent("SCAN_INGESTED", `File ${file.name} (${(file.size / 1024).toFixed(1)} KB) ingested into workspace.`);
  }, [tenant, addAuditEvent]);

  const handleClearImage = useCallback(() => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setInferenceStatus("idle");
    setErrorMessage(null);
    setResult(null);
    setDicom(null);
    setOverrideDomain(null);
    setIsHeatmapActive(false);
    // Also un-complete step 2 if we clear scan
    setCompletedSteps((prev) => { const next = new Set(prev); next.delete(2); next.delete(3); next.delete(4); return next; });
    addAuditEvent("SCAN_PURGED", "Patient radiograph unloaded from viewport.");
  }, [addAuditEvent]);

  // ── Run Diagnostic Pipeline ───────────────────────────────────────────────
  const handleRunDiagnostic = useCallback(async () => {
    if (!uploadedFile) return;
    setInferenceStatus("loading");
    setErrorMessage(null);
    try {
      const response = await runApiDiagnosis(uploadedFile, uploadedFile.name, undefined, visit?.visitCode);
      setResult(response.sessionResult);
      setDicom(response.dicomMetadata);
      setInferenceStatus("complete");
      setErrorMessage(null);
      // Mark step 2 complete when analysis finishes
      markStepComplete(2);
      addAuditEvent(
        "DIAGNOSTIC_INFERENCE_COMPLETE",
        `Inferred ${response.sessionResult.diagnosticFinding.displayName} (${(response.sessionResult.diagnosticFinding.confidence * 100).toFixed(1)}% confidence) via ${response.sessionResult.domainClassification.predictedDomain.toUpperCase()} model.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Diagnostic execution error:", message);
      setInferenceStatus("error");
      setErrorMessage(message);
      addAuditEvent("INFERENCE_ERROR", `Pipeline error: ${message}`, "WARNING");
    }
  }, [uploadedFile, addAuditEvent, markStepComplete, visit]);

  // ── Domain Override ───────────────────────────────────────────────────────
  const handleDomainOverride = useCallback(async (domain: Domain) => {
    setOverrideDomain(domain);
    if (!uploadedFile) return;
    setInferenceStatus("loading");
    setErrorMessage(null);
    try {
      const response = await runApiDiagnosis(uploadedFile, uploadedFile.name, domain, visit?.visitCode);
      setResult(response.sessionResult);
      setDicom(response.dicomMetadata);
      setInferenceStatus("complete");
      setErrorMessage(null);
      addAuditEvent("MANUAL_DOMAIN_OVERRIDE", `User redirected study to ${domain.toUpperCase()} domain. Inferred ${response.sessionResult.diagnosticFinding.displayName}.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setInferenceStatus("error");
      setErrorMessage(message);
    }
  }, [uploadedFile, addAuditEvent, visit]);

  // ── Export JSON ───────────────────────────────────────────────────────────
  const handleExportMetrics = useCallback(() => {
    if (!result) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `clinical_findings_${result.sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addAuditEvent("FINDINGS_EXPORTED", `Case ${result.sessionId} findings exported as JSON.`);
  }, [result, addAuditEvent]);

  // ── Modal Audit Events ────────────────────────────────────────────────────
  const handlePhysicianDispatched = useCallback((physician: string, priority: ClinicalPriority) => {
    addAuditEvent("PHYSICIAN_NOTIFICATION", `Transmitted case to ${physician} (Priority: ${priority.toUpperCase()}).`);
  }, [addAuditEvent]);

  const handleReportPrinted = useCallback(() => {
    if (!result) return;
    addAuditEvent("REPORT_GENERATED", `Formal PDF report printed/downloaded for case ${result.sessionId}.`);
  }, [result, addAuditEvent]);

  // ── Step 3: Doctor Sign-off ───────────────────────────────────────────────
  const handleDoctorSignOff = useCallback(async (notes: string) => {
    setDoctorNotes(notes);
    // Persist before step 4 so "Send report" never races an unsaved sign-off
    if (visit && !(await signOffVisit(visit.visitCode, notes))) {
      addAuditEvent("SIGNOFF_NOT_PERSISTED", `Sign-off for ${visit.visitCode} could not be saved to the registry.`, "WARNING");
    }
    markStepComplete(3);
    setCurrentStep(4);
    // Notes are stored encrypted in the registry; keep them out of the plaintext audit trail
    addAuditEvent("DOCTOR_SIGNOFF", `Attending physician signed off on case${result ? ` ${result.sessionId}` : ""}${notes ? " with notes" : ""}.`);
  }, [markStepComplete, addAuditEvent, result, visit]);

  // ── Step 4: New Case Reset ─────────────────────────────────────────────────
  const handleNewCase = useCallback(() => {
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setPatientData(null);
    setDoctorNotes("");
    setVisit(null);
    setUploadedFile(null);
    setPreviewUrl(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setInferenceStatus("idle");
    setErrorMessage(null);
    setResult(null);
    setDicom(null);
    setOverrideDomain(null);
    setIsHeatmapActive(false);
    addAuditEvent("NEW_CASE_STARTED", "Workspace reset for new patient case.");
  }, [addAuditEvent]);

  // ── Step 2 → Step 3 progression (after analysis is complete) ─────────────
  const handleProceedToReview = useCallback(() => {
    if (result) {
      markStepComplete(2);
      setCurrentStep(3);
    }
  }, [result, markStepComplete]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F8FB]">
      {/* ── CancerLens Clinical Header ── */}
      <HospitalHeader tenant={tenant} healthInfo={healthInfo} />

      {/* ── Main Workspace ── */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto p-4 md:p-6 space-y-5">
        {/* ── Workflow Timeline Navigator ── */}
        <WorkflowTimeline
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={(step) => {
            // Allow navigation to completed steps or current step
            if (completedSteps.has(step) || step === currentStep) {
              setCurrentStep(step);
            }
          }}
        />

        {/* ══════════════════════════════════════════════
            STEP 1: Patient Intake
        ══════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <PatientIntakeForm
            defaultValues={patientData ?? undefined}
            onSubmit={handlePatientSubmit}
            onLookupMrn={lookupPatientByMrn}
          />
        )}

        {/* ══════════════════════════════════════════════
            STEP 2: Scan & AI Diagnostics (main viewport)
        ══════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* Patient context strip */}
            {patientData && (
              <div className="bg-white border border-[#DCE8F0] rounded-[12px] px-4 py-3 flex items-center gap-4 flex-wrap shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0B2239] to-[#16385C] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {patientData.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-bold text-[#0B2239]">{patientData.fullName}</span>
                </div>
                <span className="text-[#DCE8F0]">|</span>
                <span className="text-[12px] text-[#3C566E]">Age: <strong>{patientData.age}</strong></span>
                <span className="text-[#DCE8F0]">|</span>
                <span className="text-[12px] text-[#3C566E]">Blood: <strong className="font-mono">{patientData.bloodGroup}</strong></span>
                <span className="text-[#DCE8F0]">|</span>
                <span className="text-[12px] font-mono text-[#0F74C9] font-bold">{patientData.mrn}</span>
                {visit && (
                  <>
                    <span className="text-[#DCE8F0]">|</span>
                    <span className="text-[12px] font-mono text-[#3C566E]">{visit.patientCode}</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[6px] border",
                        visit.isReturning
                          ? "bg-[#FEF9EE] text-[#C98A0A] border-[#FBE3B5]"
                          : "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                      )}
                    >
                      {visit.isReturning ? `Returning · Visit #${visit.visitNumber}` : "New patient"}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* 2-Column Core Viewport Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Column 1: DICOM Viewer */}
              <section className="space-y-4">
                <DicomViewer
                  previewUrl={previewUrl}
                  uploadedFileName={uploadedFileName}
                  uploadedFileSize={uploadedFileSize}
                  viewport={viewport}
                  inferenceStatus={inferenceStatus}
                  fileInputRef={fileInputRef}
                  isHeatmapActive={isHeatmapActive}
                  onFileUpload={(file) => { setErrorMessage(null); handleFileUpload(file); }}
                  onClearImage={handleClearImage}
                  onViewportChange={setViewport}
                  onRunDiagnostic={handleRunDiagnostic}
                  onToggleHeatmap={() => setIsHeatmapActive(!isHeatmapActive)}
                />
              </section>

              {/* Column 2: AI Cards */}
              <section className="space-y-4">
                <ParentRouterCard
                  status={inferenceStatus}
                  routerResult={result ? result.domainClassification : null}
                  onSelectDomainOverride={handleDomainOverride}
                />

                <ChildDiagnosticCard
                  status={inferenceStatus}
                  childResult={result ? result.diagnosticFinding : null}
                  errorMessage={errorMessage}
                  onRetry={handleRunDiagnostic}
                  isHeatmapActive={isHeatmapActive}
                  onToggleHeatmap={() => setIsHeatmapActive(!isHeatmapActive)}
                />

                <ClinicalActionPanel
                  status={inferenceStatus}
                  result={result}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                  onOpenSendModal={() => setIsSendModalOpen(true)}
                  onExportMetrics={handleExportMetrics}
                />

                {/* Proceed to Review CTA (shown only when analysis is complete) */}
                {inferenceStatus === "complete" && result && (
                  <div className="animate-fade-rise">
                    <button
                      type="button"
                      id="proceed-to-review-btn"
                      onClick={handleProceedToReview}
                      className="w-full btn-clinical bg-gradient-to-r from-[#059669] to-[#0E9F8E] text-white font-bold py-3 rounded-[12px] shadow-[0_3px_12px_rgba(14,159,142,0.3)] hover:from-[#047857] hover:to-[#0A8F7E] cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Doctor's Review</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </section>
            </div>

            {/* Bottom Tabs: Findings & Metadata */}
            <section className="clinical-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#DCE8F0] px-4 bg-gradient-to-r from-[#F0F7FD] via-white to-[#F0FAF9]">
                <div className="flex items-center gap-2" role="tablist" aria-label="Workstation detail tabs">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "findings"}
                    onClick={() => setActiveTab("findings")}
                    className={cn(
                      "relative py-3.5 px-4 text-[13px] font-bold transition-all cursor-pointer rounded-t-[8px]",
                      activeTab === "findings"
                        ? "text-[#0F74C9] bg-white shadow-2xs"
                        : "text-[#7A91A6] hover:text-[#0B2239]"
                    )}
                  >
                    {STRINGS.tabs.findingsTabTitle}
                    {activeTab === "findings" && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E] rounded-t-full" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "metadata"}
                    onClick={() => setActiveTab("metadata")}
                    className={cn(
                      "relative py-3.5 px-4 text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 rounded-t-[8px]",
                      activeTab === "metadata"
                        ? "text-[#0F74C9] bg-white shadow-2xs"
                        : "text-[#7A91A6] hover:text-[#0B2239]"
                    )}
                  >
                    {STRINGS.tabs.metadataTabTitle}
                    {dicom?.isPreliminary && (
                      <span className="w-2 h-2 rounded-full bg-[#0F74C9] animate-pulse" />
                    )}
                    {activeTab === "metadata" && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E] rounded-t-full" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <span className="text-[11px] font-mono font-bold text-[#0F74C9] bg-[#EBF4FC] border border-[#BAE6FD] px-2.5 py-1 rounded-[6px] hidden md:inline">
                  {tenant.facilityCode}
                </span>
              </div>

              <div className="p-6">
                {activeTab === "findings" && <FindingsTab result={result} />}
                {activeTab === "metadata" && <DicomMetadataTab metadata={dicom} tenant={tenant} />}
              </div>
            </section>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3: Doctor's Review & Sign-off
        ══════════════════════════════════════════════ */}
        {currentStep === 3 && patientData && result && (
          <DoctorInspectionPanel
            patient={patientData}
            result={result}
            onBack={() => setCurrentStep(2)}
            onSignOff={handleDoctorSignOff}
          />
        )}

        {/* Fallback: if step 3 reached without result, redirect back */}
        {currentStep === 3 && (!patientData || !result) && (
          <div className="text-center py-12 text-[#7A91A6]">
            <p className="font-semibold">No diagnostic result found. Please complete the scan step first.</p>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="mt-4 px-5 py-2.5 rounded-[10px] bg-[#0F74C9] text-white font-bold text-[13px] cursor-pointer"
            >
              ← Back to Scan
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STEP 4: Report Transmission
        ══════════════════════════════════════════════ */}
        {currentStep === 4 && patientData && result && (
          <ReportTransmissionPanel
            patient={patientData}
            result={result}
            doctorNotes={doctorNotes}
            visitCode={visit?.visitCode}
            onBack={() => setCurrentStep(3)}
            onNewCase={handleNewCase}
            onReportSent={() => addAuditEvent("REPORT_EMAILED", `Report for ${visit?.patientCode ?? "patient"} e-mailed (visit ${visit?.visitCode}).`)}
            onWhatsAppOpened={() => addAuditEvent("WHATSAPP_NOTIFICATION_OPENED", `WhatsApp notification opened for ${visit?.patientCode ?? "patient"} (visit ${visit?.visitCode}).`, "INFO")}
          />
        )}

        {currentStep === 4 && (!patientData || !result) && (
          <div className="text-center py-12 text-[#7A91A6]">
            <p className="font-semibold">Workflow incomplete. Please restart from Step 1.</p>
            <button type="button" onClick={handleNewCase} className="mt-4 px-5 py-2.5 rounded-[10px] bg-[#0F74C9] text-white font-bold text-[13px] cursor-pointer">
              Start New Case
            </button>
          </div>
        )}
      </main>

      {/* ── Regulatory Footer ── */}
      <footer
        className="bg-white border-t border-[#DCE8F0] py-3.5 px-4 md:px-6 text-[12px] text-[#3C566E] mt-auto shadow-[0_-1px_4px_rgba(11,34,57,0.02)]"
        role="contentinfo"
      >
        <div className="max-w-[1780px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[#0B2239]">
            <span className="p-1 rounded-[6px] bg-[#FEF9EE] border border-[#FBE3B5] text-[#C98A0A] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-[#C98A0A] flex-shrink-0" />
            </span>
            <span className="font-bold text-[#0B2239]">
              {STRINGS.footer.regulatoryNotice}
            </span>
            <span className="hidden lg:inline text-[#7A91A6]">
              — {tenant.regulatoryDisclaimer}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="bg-[#0B2239] text-[#7DD3FC] px-2.5 py-1 rounded-[6px] border border-[#16385C] shadow-2xs">
              Model: <strong className="text-white">{tenant.modelVersion}</strong>
            </span>
            <span className="bg-[#F3F8FB] text-[#3C566E] border border-[#DCE8F0] px-2.5 py-1 rounded-[6px]">
              Validated: <strong className="text-[#0B2239]">{tenant.lastValidatedDate}</strong>
            </span>
          </div>
        </div>
      </footer>

      {/* ── Clinical Modals ── */}
      <SendToPhysicianModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        result={result}
        tenant={tenant}
        onDispatched={handlePhysicianDispatched}
      />

      <PatientReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        result={result}
        dicom={dicom}
        tenant={tenant}
        onReportPrinted={handleReportPrinted}
      />

      <AuditLogsModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
        tenant={tenant}
      />
    </div>
  );
}

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

import {
  runApiDiagnosis,
  checkBackendHealth,
  fetchTenantConfig,
  fetchAuditLogs,
  recordClientAuditLog,
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
} from "@/lib/types";
import { DEFAULT_TENANT, type TenantBranding } from "@/config/tenant";
import { STRINGS } from "@/config/strings";
import { WORKFLOW_STAGES } from "@/config/workflow";
import { DEFAULT_VIEWPORT_SETTINGS } from "@/config/imaging";
import { createPreliminaryDicomMetadata, cn } from "@/lib/utils";
import { ArrowRight, ShieldAlert } from "lucide-react";

export default function DiagnosticWorkspacePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Multi-Tenant Branding & Health State ──
  const [tenant, setTenant] = useState<TenantBranding>(DEFAULT_TENANT);
  const [healthInfo, setHealthInfo] = useState<BackendHealthInfo>({ online: true });

  // ── Workspace State (Only User Input — No Hardcoded Sample Presets) ──
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);

  // ── Inference Result State ──
  const [inferenceStatus, setInferenceStatus] = useState<InferenceStatus>("idle");
  const [result, setResult] = useState<ClinicalSessionResult | null>(null);
  const [dicom, setDicom] = useState<DicomMetadata | null>(null);

  // ── Viewport Control State & Heatmap Overlay ──
  const [viewport, setViewport] = useState<ViewportSettings>(DEFAULT_VIEWPORT_SETTINGS);
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(false);

  // ── Bottom Tabs State ──
  const [activeTab, setActiveTab] = useState<"findings" | "metadata">("findings");

  // ── Modals & Audit Logs State ──
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // ── Load Tenant Config, Health, & Initial Audit Trail on Mount ──
  useEffect(() => {
    checkBackendHealth().then((health) => {
      setHealthInfo(health);
    });

    fetchTenantConfig().then((cfg) => {
      setTenant(cfg);
    });

    fetchAuditLogs().then((logs) => {
      setAuditLogs(logs);
    });
  }, []);

  // ── Helper to Append Local Audit Log & Sync Server ──
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

  // ── Handle Custom File Ingestion by User ──
  // Auto-populates preliminary DICOM metadata immediately on ingestion!
  const handleFileUpload = useCallback(
    (file: File) => {
      setUploadedFile(file);
      setUploadedFileName(file.name);
      setUploadedFileSize(file.size);

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setInferenceStatus("idle");
      setResult(null);
      setIsHeatmapActive(false);

      // Auto-populate preliminary DICOM metadata immediately on file drop
      const prelimDicom = createPreliminaryDicomMetadata(file, tenant);
      setDicom(prelimDicom);
      setViewport(DEFAULT_VIEWPORT_SETTINGS);

      addAuditEvent("SCAN_INGESTED", `File ${file.name} (${(file.size / 1024).toFixed(1)} KB) ingested into workspace.`);
    },
    [tenant, addAuditEvent]
  );

  // ── Clear Loaded Image ──
  const handleClearImage = useCallback(() => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setInferenceStatus("idle");
    setResult(null);
    setDicom(null);
    setIsHeatmapActive(false);
    addAuditEvent("SCAN_PURGED", "Patient radiograph unloaded from viewport.");
  }, [addAuditEvent]);

  // ── Run Diagnostic Pipeline ──
  const handleRunDiagnostic = useCallback(async () => {
    if (!uploadedFile) return;

    setInferenceStatus("loading");

    try {
      const response = await runApiDiagnosis(uploadedFile, uploadedFile.name);
      setResult(response.sessionResult);
      setDicom(response.dicomMetadata);
      setInferenceStatus("complete");

      addAuditEvent(
        "DIAGNOSTIC_INFERENCE_COMPLETE",
        `Inferred ${response.sessionResult.diagnosticFinding.displayName} (${(response.sessionResult.diagnosticFinding.confidence * 100).toFixed(1)}% confidence) via ${response.sessionResult.domainClassification.predictedDomain.toUpperCase()} model.`
      );
    } catch (err) {
      console.error("Diagnostic execution error:", err);
      setInferenceStatus("error");
      addAuditEvent("INFERENCE_ERROR", "Pipeline execution encountered an error.", "WARNING");
    }
  }, [uploadedFile, addAuditEvent]);

  // ── Interactive Domain Override ──
  const handleDomainOverride = useCallback(
    async (domain: Domain) => {
      if (!uploadedFile) return;

      setInferenceStatus("loading");

      try {
        const response = await runApiDiagnosis(uploadedFile, uploadedFile.name, domain);
        setResult(response.sessionResult);
        setDicom(response.dicomMetadata);
        setInferenceStatus("complete");

        addAuditEvent(
          "MANUAL_DOMAIN_OVERRIDE",
          `User redirected study to ${domain.toUpperCase()} domain. Inferred ${response.sessionResult.diagnosticFinding.displayName}.`
        );
      } catch (err) {
        console.error("Domain override error:", err);
        setInferenceStatus("error");
      }
    },
    [uploadedFile, addAuditEvent]
  );

  // ── Export JSON Findings ──
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

  // ── Handlers for Modal Audit Events ──
  const handlePhysicianDispatched = useCallback(
    (physician: string, priority: ClinicalPriority) => {
      addAuditEvent("PHYSICIAN_NOTIFICATION", `Transmitted case to ${physician} (Priority: ${priority.toUpperCase()}).`);
    },
    [addAuditEvent]
  );

  const handleReportPrinted = useCallback(() => {
    if (!result) return;
    addAuditEvent("REPORT_GENERATED", `Formal PDF report printed/downloaded for case ${result.sessionId}.`);
  }, [result, addAuditEvent]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* ── Hospital Header (White-Labelable Slot & Promoted Audit Logs) ── */}
      <HospitalHeader
        tenant={tenant}
        healthInfo={healthInfo}
        onTriggerUpload={() => fileInputRef.current?.click()}
        onAuditLogs={() => setIsAuditModalOpen(true)}
        unreadAuditCount={auditLogs.length}
      />

      {/* ── Main Workspace ── */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* ── Declarative Workflow Progression Banner ── */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs gap-3"
          role="region"
          aria-label="Clinical workflow progress"
        >
          {/* Dynamic Stages Generated from WORKFLOW_STAGES Array */}
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 flex-wrap">
            <span className="text-clinical-700 font-extrabold">{STRINGS.workflow.title}</span>
            {WORKFLOW_STAGES.map((stage, idx) => {
              const isStageDone =
                stage.id === "ingestion"
                  ? !!uploadedFile
                  : stage.id === "routing"
                  ? !!result
                  : stage.id === "pathology"
                  ? !!result && inferenceStatus === "complete"
                  : false;

              return (
                <div key={stage.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors text-[11px]",
                      isStageDone
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs font-extrabold"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    )}
                  >
                    {stage.labelKey}
                  </span>
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Session ID Telemetry */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>
              {STRINGS.workflow.sessionPrefix}:{" "}
              <strong className="text-slate-800">
                {result?.sessionId || STRINGS.workflow.awaitingSession}
              </strong>
            </span>
          </div>
        </div>

        {/* ── 3-Column Core Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Column 1: Image Upload & Viewport (4 cols) */}
          <section className="lg:col-span-4">
            <DicomViewer
              previewUrl={previewUrl}
              uploadedFileName={uploadedFileName}
              uploadedFileSize={uploadedFileSize}
              viewport={viewport}
              inferenceStatus={inferenceStatus}
              fileInputRef={fileInputRef}
              isHeatmapActive={isHeatmapActive}
              onFileUpload={handleFileUpload}
              onClearImage={handleClearImage}
              onViewportChange={setViewport}
              onRunDiagnostic={handleRunDiagnostic}
              onToggleHeatmap={() => setIsHeatmapActive(!isHeatmapActive)}
            />
          </section>

          {/* Column 2: Automated Domain Classification (4 cols) */}
          <section className="lg:col-span-4">
            <ParentRouterCard
              status={inferenceStatus}
              routerResult={result ? result.domainClassification : null}
              onSelectDomainOverride={handleDomainOverride}
            />
          </section>

          {/* Column 3: Diagnostic Output & Actions (4 cols) */}
          <section className="lg:col-span-4 space-y-4">
            <ChildDiagnosticCard
              status={inferenceStatus}
              childResult={result ? result.diagnosticFinding : null}
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
          </section>
        </div>

        {/* ── Bottom Tabs: Clinical Findings & DICOM Metadata ── */}
        <section className="clinical-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50/70">
            <div className="flex items-center gap-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "findings"}
                onClick={() => setActiveTab("findings")}
                className={cn(
                  "flex items-center gap-2 py-3 px-4 text-[12px] font-bold border-b-2 transition-all cursor-pointer",
                  activeTab === "findings"
                    ? "border-clinical-600 text-clinical-700 bg-white shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                {STRINGS.tabs.findingsTabTitle}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "metadata"}
                onClick={() => setActiveTab("metadata")}
                className={cn(
                  "flex items-center gap-2 py-3 px-4 text-[12px] font-bold border-b-2 transition-all cursor-pointer",
                  activeTab === "metadata"
                    ? "border-clinical-600 text-clinical-700 bg-white shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                {STRINGS.tabs.metadataTabTitle}
                {dicom?.isPreliminary && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              {tenant.facilityCode}
            </span>
          </div>

          <div className="p-5">
            {activeTab === "findings" && <FindingsTab result={result} />}
            {activeTab === "metadata" && (
              <DicomMetadataTab metadata={dicom} tenant={tenant} />
            )}
          </div>
        </section>
      </main>

      {/* ── Persistent Non-Dismissible Regulatory & Compliance Footer ── */}
      <footer
        className="bg-white border-t border-slate-200 py-3.5 px-4 md:px-6 text-[11px] text-slate-600 mt-auto"
        role="contentinfo"
      >
        <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-semibold text-slate-900">
              {STRINGS.footer.regulatoryNotice}
            </span>
            <span className="hidden lg:inline text-slate-500">
              — {tenant.regulatoryDisclaimer}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-mono text-[10px]">
            <span>
              {STRINGS.footer.modelVersionLabel}{" "}
              <strong className="text-slate-800">{tenant.modelVersion}</strong>
            </span>
            <span>•</span>
            <span>
              {STRINGS.footer.lastValidatedLabel}{" "}
              <strong className="text-slate-800">{tenant.lastValidatedDate}</strong>
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

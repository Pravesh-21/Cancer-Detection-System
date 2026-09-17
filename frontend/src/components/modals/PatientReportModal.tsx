"use client";

import { X, Printer, ShieldCheck } from "lucide-react";
import type { ClinicalSessionResult, DicomMetadata } from "@/lib/types";
import { formatTimestamp, formatConfidence, getICD10 } from "@/lib/utils";
import type { TenantBranding } from "@/config/tenant";
import { STRINGS } from "@/config/strings";
import { getSeverityToken } from "@/config/themeTokens";

interface PatientReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ClinicalSessionResult | null;
  dicom: DicomMetadata | null;
  tenant: TenantBranding;
  onReportPrinted?: () => void;
}

export default function PatientReportModal({
  isOpen,
  onClose,
  result,
  dicom,
  tenant,
  onReportPrinted,
}: PatientReportModalProps) {
  if (!isOpen || !result) return null;

  const handlePrint = () => {
    onReportPrinted?.();
    window.print();
  };

  const severity = getSeverityToken(result.diagnosticFinding.riskLevel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <span id="report-modal-title" className="text-[12px] font-bold text-slate-800">
              {STRINGS.modals.patientReport.title}
            </span>
            <span className="text-[10px] font-mono text-slate-500">({result.sessionId})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-clinical-600 hover:bg-clinical-700 text-white shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{STRINGS.modals.patientReport.printPdfButton}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clinical Document Paper */}
        <div className="p-8 space-y-6 text-slate-900 text-[12px] font-sans">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-[16px] font-black uppercase tracking-tight text-slate-900">
                {tenant.hospitalName}
              </h2>
              <p className="text-[11px] text-slate-600 font-medium">
                {tenant.departmentName}
              </p>
              <p className="text-[10px] text-slate-400">
                Facility Code: {tenant.facilityCode} • AE: {tenant.dicomAeTitle}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-clinical-800 bg-clinical-50 border border-clinical-200 px-2 py-0.5 rounded block mb-1">
                Clinical Pathology Finding
              </span>
              <p className="text-[10px] font-mono text-slate-500">
                Date: {formatTimestamp(result.timestamp)}
              </p>
            </div>
          </div>

          {/* Patient / Study Demographics */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-[11px]">
            <div>
              <p><strong>Patient MRN:</strong> {dicom?.patientMRN || "MRN-PENDING"}</p>
              <p><strong>Patient Name:</strong> {dicom?.patientName || "ANONYMIZED_CLINICAL_STUDY"}</p>
              <p><strong>DOB / Sex:</strong> {dicom?.patientDOB || "N/A"} ({dicom?.patientSex || "U"})</p>
            </div>
            <div>
              <p><strong>Accession No:</strong> {dicom?.accessionNumber || result.sessionId}</p>
              <p><strong>Examined Region:</strong> {dicom?.bodyPartExamined || result.domainClassification.predictedDomain.toUpperCase()}</p>
              <p><strong>Modality:</strong> {dicom?.modality || "DX"} Radiograph</p>
            </div>
          </div>

          {/* Primary Finding Statement */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              Diagnostic Pathology Assessment
            </h3>
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Primary Classification</span>
                  <p className="text-[16px] font-extrabold text-slate-900">
                    {result.diagnosticFinding.displayName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Concordance Score</span>
                  <p className="text-[18px] font-extrabold font-mono text-slate-900">
                    {formatConfidence(result.diagnosticFinding.confidence)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-mono">
                ICD-10 Code: {getICD10(result.diagnosticFinding.predictedClass)}
              </p>
              <p className="text-[11px] text-slate-700">
                <strong>{STRINGS.modals.patientReport.riskStratification}</strong>{" "}
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${severity.badgeClass}`}>
                  {severity.label}
                </span>
              </p>
            </div>
          </div>

          {/* Differential Probability Table */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
              Differential Diagnosis Stratification
            </h3>
            <div className="rounded border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="py-1.5 px-3">{STRINGS.modals.patientReport.differentialTableClass}</th>
                    <th className="py-1.5 px-3 text-right">{STRINGS.modals.patientReport.differentialTableProb}</th>
                    <th className="py-1.5 px-3 text-right">{STRINGS.modals.patientReport.differentialTableTier}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[10px]">
                  {result.diagnosticFinding.classProbabilities.map((cls) => {
                    const isTop = cls.className === result.diagnosticFinding.predictedClass;
                    const clsSev = getSeverityToken(cls.riskLevel);
                    return (
                      <tr key={cls.className} className={isTop ? "bg-slate-50 font-bold" : ""}>
                        <td className="py-1.5 px-3 font-sans">{cls.displayName}</td>
                        <td className="py-1.5 px-3 text-right">{formatConfidence(cls.probability)}</td>
                        <td className="py-1.5 px-3 text-right uppercase">
                          <span className={clsSev.textColor}>{cls.riskLevel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attending Sign-Off Box */}
          <div className="pt-4 border-t-2 border-slate-200 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-mono">
                Study UID: {dicom?.studyUID || result.sessionId}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-teal-800">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>{tenant.anonymizationProtocol}</span>
              </div>
            </div>
            <div className="text-right border-t border-slate-400 pt-1 w-48">
              <p className="text-[10px] text-slate-500">Attending Pathologist Signature</p>
              <p className="text-[11px] font-serif italic text-slate-700">Dr. Staff Attending, MD</p>
            </div>
          </div>

          {/* Legal / Regulatory Disclaimer */}
          <p className="text-[9px] text-slate-400 text-center border-t border-slate-100 pt-3">
            {tenant.regulatoryDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

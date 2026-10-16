"use client";

import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Stethoscope,
} from "lucide-react";
import { cn, getICD10 } from "@/lib/utils";
import type { ClinicalSessionResult } from "@/lib/types";
import { STRINGS } from "@/config/strings";
import { getSeverityToken } from "@/config/themeTokens";

interface FindingsTabProps {
  result: ClinicalSessionResult | null;
}

export default function FindingsTab({ result }: FindingsTabProps) {
  if (!result) {
    return (
      <div className="py-12 text-center text-[#7A91A6]">
        <FileText className="w-8 h-8 mx-auto mb-2 text-[#7A91A6] opacity-60" />
        <p className="text-[14px] font-bold text-[#0B2239]">{STRINGS.tabs.emptyFindingsTitle}</p>
        <p className="text-[12px] text-[#7A91A6] mt-1 max-w-sm mx-auto">
          {STRINGS.tabs.emptyFindingsPrompt}
        </p>
      </div>
    );
  }

  const { diagnosticFinding } = result;

  const cdsRecommendations: Record<string, { summary: string; followUp: string; urgency: string }> = {
    glioma: {
      summary: "Intra-axial lesion pattern observed with localized mass effect and surrounding signal disruption.",
      followUp: "Recommend high-resolution contrast-enhanced Brain MRI with perfusion study. Neurosurgical oncology consult advised.",
      urgency: "High Priority Clinical Review",
    },
    meningioma: {
      summary: "Extra-axial dural-based enhancing mass with smooth circumscribed borders.",
      followUp: "Recommend volumetric surveillance MRI in 3 months vs specialist neurosurgical review.",
      urgency: "Routine Review",
    },
    pituitary: {
      summary: "Sellar expansion pattern with possible chiasmatic abutment.",
      followUp: "Endocrine pituitary panel and visual field perimetry examination suggested.",
      urgency: "Subacute Consultation",
    },
    notumor: {
      summary: "No intracranial focal mass lesion or acute structural abnormality detected.",
      followUp: "Correlate clinically. Repeat imaging only if new focal neurological deficits emerge.",
      urgency: "Standard Observation",
    },
    lung_aca: {
      summary: "Peripheral pulmonary opacity with irregular borders and spiculated margins.",
      followUp: "Contrast chest CT and core needle biopsy recommended per clinical oncology guidelines.",
      urgency: "High Priority Oncology Referral",
    },
    lung_scc: {
      summary: "Central peribronchial thickening pattern with possible bronchial narrowing.",
      followUp: "Bronchoscopic evaluation and thoracic surgery consultation suggested.",
      urgency: "High Priority Referral",
    },
    lung_n: {
      summary: "Clear lung parenchyma without focal consolidation, pleural effusion, or acute lesions.",
      followUp: "Routine surveillance screening per clinical protocol.",
      urgency: "Normal / Low Risk",
    },
    malignant: {
      summary: "Focal architectural distortion with irregular margins and microcalcification pattern.",
      followUp: "Diagnostic ultrasound and image-guided core biopsy strongly indicated.",
      urgency: "Immediate Follow-up Recommended",
    },
    benign: {
      summary: "Well-circumscribed lesion consistent with benign fibrocystic or adenomatous etiology.",
      followUp: "Standard 6-month surveillance mammography protocol.",
      urgency: "Routine Follow-up",
    },
    cancer: {
      summary: "Cortical bone discontinuity with focal lucency and periosteal elevation.",
      followUp: "Orthopedic surgical oncology consultation and cross-sectional MRI staging advised.",
      urgency: "High Priority Consultation",
    },
    normal: {
      summary: "Intact trabecular and cortical architecture without evidence of acute destructive lesion.",
      followUp: "Conservative clinical observation.",
      urgency: "Normal / Low Risk",
    },
    mel: {
      summary: "Asymmetric pigmentation network with irregular borders and atypical architectural features.",
      followUp: "Dermatologic excisional biopsy recommended with narrow surgical margins.",
      urgency: "Urgent Dermatologic Review",
    },
  };

  const advice = cdsRecommendations[diagnosticFinding.predictedClass] || {
    summary: "Automated radiologic assessment complete.",
    followUp: "Correlate with clinical history, prior studies, and specialist examination.",
    urgency: "Standard Review",
  };

  const severity = getSeverityToken(diagnosticFinding.riskLevel);
  const isHighRisk = diagnosticFinding.riskLevel === "high";

  return (
    <div className="space-y-4 animate-fade-rise" role="tabpanel" aria-label={STRINGS.tabs.findingsTabTitle}>
      {/* ── Clinical Impression Summary: Dark and Light Contrast ── */}
      <div className="clinical-card p-5 space-y-3.5 border-l-4 border-l-[#0F74C9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0F74C9]" />
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#0B2239]">
              Primary Diagnostic Impression
            </span>
          </div>
          <span
            className={cn(
              "text-[12px] font-bold px-3 py-0.5 rounded-full shadow-2xs",
              severity.badgeClass
            )}
          >
            {severity.label}
          </span>
        </div>

        <p className="body-14 text-[#0B2239] font-medium leading-relaxed">
          {advice.summary}
        </p>

        <div className="p-3.5 bg-gradient-to-r from-[#F0F7FD] to-white border border-[#BAE6FD] rounded-[10px] space-y-1">
          <span className="text-[11px] uppercase font-bold text-[#0F74C9] tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#0F74C9]" />
            Decision Support &amp; Follow-Up Recommendation
          </span>
          <p className="body-14 text-[#3C566E] leading-relaxed">
            {advice.followUp}
          </p>
        </div>
      </div>

      {/* ── Urgency Triage Strip: High-Contrast Dark & Light Card ── */}
      <div
        className={cn(
          "clinical-card p-4 flex items-center justify-between transition-all",
          isHighRisk
            ? "border-l-4 border-l-[#C8353B] bg-gradient-to-r from-[#FFF8F8] to-white border-[#F5C2C4]"
            : "border-l-4 border-l-[#0E9F8E] bg-gradient-to-r from-[#F0FAF9] to-white border-[#BCE8E3]"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-[10px] flex items-center justify-center shadow-xs flex-shrink-0",
              isHighRisk
                ? "bg-[#FDF2F2] border border-[#F8B4B7] text-[#C8353B]"
                : "bg-[#F0FAF9] border border-[#BCE8E3] text-[#0E9F8E]"
            )}
          >
            {diagnosticFinding.riskLevel === "high" ? (
              <AlertTriangle className="w-5 h-5 text-[#C8353B]" />
            ) : diagnosticFinding.riskLevel === "moderate" ? (
              <AlertCircle className="w-5 h-5 text-[#C98A0A]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#0E9F8E]" />
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase font-bold text-[#7A91A6]">Clinical Triage Urgency</p>
            <p className="text-[15px] font-extrabold text-[#0B2239]">{advice.urgency}</p>
          </div>
        </div>

        {/* Dark & light contrast pill for ICD code */}
        <span className="text-[11px] font-mono font-bold bg-[#0B2239] text-[#7DD3FC] border border-[#16385C] px-3 py-1 rounded-[6px] shadow-2xs">
          ICD-10: {getICD10(diagnosticFinding.predictedClass).split("—")[0].trim()}
        </span>
      </div>
    </div>
  );
}

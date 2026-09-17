"use client";

import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Info,
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
      <div className="py-12 text-center text-slate-400">
        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p className="text-[13px] font-bold text-slate-600">{STRINGS.tabs.emptyFindingsTitle}</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
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

  return (
    <div className="space-y-4 animate-fade-in" role="tabpanel" aria-label={STRINGS.tabs.findingsTabTitle}>
      {/* ── Clinical Impression Summary ── */}
      <div className="clinical-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="section-header">Primary Diagnostic Impression</span>
          <span
            className={cn(
              "text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs",
              severity.badgeClass
            )}
          >
            {severity.label}
          </span>
        </div>

        <p className="text-[13px] text-slate-800 font-medium leading-relaxed">
          {advice.summary}
        </p>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-clinical-600" />
            Decision Support &amp; Follow-Up Recommendation
          </span>
          <p className="text-[12px] text-slate-700 leading-relaxed font-normal">
            {advice.followUp}
          </p>
        </div>
      </div>

      {/* ── Urgency Triage Strip ── */}
      <div className="clinical-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            {diagnosticFinding.riskLevel === "high" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : diagnosticFinding.riskLevel === "moderate" ? (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Clinical Triage Urgency</p>
            <p className="text-[13px] font-bold text-slate-900">{advice.urgency}</p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-600 font-medium">
          ICD-10: {getICD10(diagnosticFinding.predictedClass).split("—")[0].trim()}
        </span>
      </div>
    </div>
  );
}

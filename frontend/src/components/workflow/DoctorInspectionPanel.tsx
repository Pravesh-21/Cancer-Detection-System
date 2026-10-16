"use client";

import React, { useState } from "react";
import {
  Stethoscope, CheckCircle2, AlertTriangle, ClipboardList,
  ChevronRight, ChevronLeft, BadgeCheck, MessageSquare, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicalSessionResult } from "@/lib/types";
import type { PatientFormData } from "./PatientIntakeForm";

interface DoctorInspectionPanelProps {
  patient: PatientFormData;
  result: ClinicalSessionResult;
  onBack: () => void;
  onSignOff: (notes: string) => void;
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high: {
    bg: "bg-[#FEF2F2]",
    text: "text-[#C8353B]",
    border: "border-[#FECACA]",
    label: "High Risk — Urgent Review",
  },
  moderate: {
    bg: "bg-[#FFFBEB]",
    text: "text-[#C98A0A]",
    border: "border-[#FDE68A]",
    label: "Moderate Risk — Timely Review",
  },
  low: {
    bg: "bg-[#F0FAF9]",
    text: "text-[#0E9F8E]",
    border: "border-[#BCE8E3]",
    label: "Low Risk — Routine Review",
  },
  normal: {
    bg: "bg-[#F0F9F9]",
    text: "text-[#0E9F8E]",
    border: "border-[#BCE8E3]",
    label: "Within Normal Limits",
  },
};

export default function DoctorInspectionPanel({
  patient,
  result,
  onBack,
  onSignOff,
}: DoctorInspectionPanelProps) {
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);

  const finding = result.diagnosticFinding;
  const domain = result.domainClassification;
  const riskStyle = URGENCY_STYLES[finding.riskLevel] || URGENCY_STYLES.low;
  const confidencePct = Math.round(finding.confidence * 100);

  const canSignOff = agreed;

  return (
    <div className="space-y-4 animate-fade-rise">
      {/* Inspection Header Card */}
      <div className="bg-white border border-[#DCE8F0] rounded-[16px] shadow-[0_1px_3px_rgba(11,34,57,0.04)] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E]" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F0F6FA]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center shadow-sm">
              <Stethoscope className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#0B2239] leading-tight">Doctor's Review & Sign-off</h2>
              <p className="text-[11px] text-[#7A91A6] font-medium">Step 3 — Review AI findings and confirm</p>
            </div>
          </div>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-[6px] border",
            riskStyle.bg, riskStyle.text, riskStyle.border
          )}>
            {riskStyle.label}
          </span>
        </div>

        {/* Patient Summary Strip */}
        <div className="px-6 py-3 bg-[#F8FBFC] border-b border-[#F0F6FA] flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#7A91A6]" />
            <span className="text-[13px] font-bold text-[#0B2239]">{patient.fullName}</span>
          </div>
          <div className="text-[12px] text-[#3C566E]">
            <span className="font-semibold">{patient.age} yrs</span>
            <span className="text-[#7A91A6] mx-1.5">·</span>
            <span className="capitalize">{patient.sex}</span>
            <span className="text-[#7A91A6] mx-1.5">·</span>
            <span>Blood: <strong className="font-mono">{patient.bloodGroup}</strong></span>
            <span className="text-[#7A91A6] mx-1.5">·</span>
            <span>MRN: <strong className="font-mono text-[#0F74C9]">{patient.mrn}</strong></span>
          </div>
        </div>

        {/* AI Findings Summary */}
        <div className="px-6 py-5 space-y-4">
          {/* Domain + Finding Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#F3F8FB] rounded-[12px] border border-[#DCE8F0] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A91A6] mb-1">Anatomical Domain</p>
              <p className="text-[15px] font-bold text-[#0B2239] capitalize">{domain.predictedDomain}</p>
              <p className="text-[11px] text-[#3C566E] mt-0.5">
                Confidence: <span className="font-mono font-bold text-[#0F74C9]">{Math.round(domain.confidence * 100)}%</span>
              </p>
            </div>
            <div className="md:col-span-2 bg-[#F3F8FB] rounded-[12px] border border-[#DCE8F0] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A91A6] mb-1">Pathology Finding</p>
              <p className="text-[15px] font-bold text-[#0B2239]">{finding.displayName}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex-1 h-2 bg-[#E5EEF4] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      finding.riskLevel === "high" ? "bg-gradient-to-r from-[#C8353B] to-[#EF4444]" :
                      finding.riskLevel === "moderate" ? "bg-gradient-to-r from-[#C98A0A] to-[#F59E0B]" :
                      "bg-gradient-to-r from-[#0E9F8E] to-[#10B981]"
                    )}
                    style={{ width: `${confidencePct}%` }}
                  />
                </div>
                <span className="text-[12px] font-mono font-bold text-[#0B2239] w-10 text-right">
                  {confidencePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Differential Breakdown */}
          {finding.classProbabilities && finding.classProbabilities.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A91A6] mb-2 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                Differential Probabilities
              </p>
              <div className="space-y-2">
                {finding.classProbabilities.slice(0, 4).map((cls) => {
                  const pct = Math.round(cls.probability * 100);
                  const isPrimary = cls.className === finding.predictedClass;
                  return (
                    <div key={cls.className} className="flex items-center gap-3">
                      <span className={cn(
                        "text-[12px] min-w-0 flex-[2] truncate",
                        isPrimary ? "font-bold text-[#0B2239]" : "font-medium text-[#3C566E]"
                      )}>
                        {cls.displayName}
                      </span>
                      <div className="flex-[3] h-1.5 bg-[#E5EEF4] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            isPrimary ? "bg-[#0F74C9]" : "bg-[#A4B7C6]"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#3C566E] w-9 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doctor Notes Textarea */}
          <div>
            <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#3C566E] uppercase tracking-wider mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#7A91A6]" />
              Clinical Notes & Observations
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any additional clinical observations, context, or recommendations for the patient report…"
              className="w-full px-3 py-2.5 rounded-[10px] border border-[#DCE8F0] text-[13px] text-[#0B2239] font-medium placeholder:text-[#A4B7C6] focus:outline-none focus:ring-2 focus:ring-[#0F74C9]/20 focus:border-[#0F74C9] resize-none transition-all duration-150"
            />
          </div>

          {/* Disclaimer Checkbox */}
          <div className="flex items-start gap-3 p-3.5 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A]">
            <input
              type="checkbox"
              id="doctor-signoff-agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[#C98A0A] text-[#C98A0A] cursor-pointer flex-shrink-0 accent-[#0F74C9]"
            />
            <label htmlFor="doctor-signoff-agree" className="text-[12px] text-[#7A5C00] font-medium cursor-pointer leading-relaxed">
              I confirm that I have reviewed the AI-generated findings and that this report is for{" "}
              <strong>research/decision-support purposes only</strong>. This is not a clinical diagnosis and does not replace professional medical judgement.
            </label>
          </div>

          {/* Risk warning for high findings */}
          {finding.riskLevel === "high" && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA]">
              <AlertTriangle className="w-4 h-4 text-[#C8353B] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#9B1C1C] font-medium">
                High-risk finding detected. Please ensure expedited clinical review and consider immediate referral to specialist oncology services.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-5 flex items-center justify-between gap-4 border-t border-[#F0F6FA] pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#DCE8F0] text-[13px] font-semibold text-[#3C566E] bg-white hover:bg-[#F3F8FB] transition-all duration-150 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Scan
          </button>

          <button
            type="button"
            onClick={() => onSignOff(notes)}
            disabled={!canSignOff}
            id="doctor-signoff-btn"
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-[10px] font-bold text-[13px] transition-all duration-200",
              canSignOff
                ? "bg-gradient-to-r from-[#059669] to-[#0E9F8E] text-white shadow-[0_3px_12px_rgba(14,159,142,0.3)] hover:from-[#047857] hover:to-[#0A8F7E] cursor-pointer"
                : "bg-[#E6EFF5] text-[#7A91A6] border border-[#DCE8F0] cursor-not-allowed opacity-60"
            )}
          >
            <BadgeCheck className="w-4 h-4" />
            Sign Off & Dispatch Report
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

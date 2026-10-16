"use client";

import { FileDown, Send, Download, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicalSessionResult, InferenceStatus } from "@/lib/types";
import { STRINGS } from "@/config/strings";

interface ClinicalActionPanelProps {
  status: InferenceStatus;
  result: ClinicalSessionResult | null;
  onOpenReportModal: () => void;
  onOpenSendModal: () => void;
  onExportMetrics: () => void;
}

export default function ClinicalActionPanel({
  status,
  result,
  onOpenReportModal,
  onOpenSendModal,
  onExportMetrics,
}: ClinicalActionPanelProps) {
  const isEnabled = status === "complete" && !!result;
  const disabledTooltip = !isEnabled ? "Run analysis first to unlock clinical actions" : undefined;

  return (
    <div
      className="clinical-card p-5 space-y-3.5 overflow-hidden"
      role="region"
      aria-label={STRINGS.clinicalActions.title}
    >
      {/* Top Card Color Accent Line */}
      <div className="h-[3px] bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E] -mx-5 -mt-5 mb-3.5 rounded-t-[16px]" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center text-[#38BDF8] shadow-xs flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="text-[13px] font-bold text-[#0B2239] uppercase tracking-wide">
            {STRINGS.clinicalActions.title}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F74C9] bg-[#EBF4FC] border border-[#BAE6FD] px-2 py-0.5 rounded-[6px]">
            Handoff
          </span>
        </div>

        {isEnabled && (
          <span className="text-[11px] text-[#0E9F8E] font-bold flex items-center gap-1.5 bg-[#F0FAF9] px-2.5 py-0.5 rounded-[6px] border border-[#BCE8E3] animate-fade-rise shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F8E]" />
            {STRINGS.clinicalActions.caseReadyNotice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {/* Primary Action: Send to Attending Physician (Visually prominent with rich gradient) */}
        <button
          type="button"
          onClick={onOpenSendModal}
          disabled={!isEnabled}
          title={disabledTooltip}
          className={cn(
            "w-full btn-clinical",
            isEnabled
              ? "bg-gradient-to-r from-[#0F74C9] via-[#0284C7] to-[#0F74C9] hover:from-[#0A5BA8] hover:to-[#0284C7] text-white font-bold shadow-[0_3px_12px_rgba(15,116,201,0.3)] cursor-pointer"
              : "bg-[#E6EFF5] text-[#7A91A6] border border-[#DCE8F0] opacity-60 cursor-not-allowed"
          )}
          aria-disabled={!isEnabled}
        >
          <Send className="w-4 h-4" />
          <span>{STRINGS.clinicalActions.sendToPhysician}</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Secondary Action 1: Download Patient PDF Report */}
          <button
            type="button"
            onClick={onOpenReportModal}
            disabled={!isEnabled}
            title={disabledTooltip}
            className={cn(
              "btn-clinical",
              isEnabled
                ? "bg-gradient-to-b from-white to-[#F0F7FD] border-[#BAE6FD] text-[#0F74C9] hover:bg-[#E0F2FE] hover:border-[#0F74C9] shadow-2xs cursor-pointer font-semibold"
                : "bg-[#F3F8FB] text-[#A4B7C6] border-[#E2ECF2] opacity-60 cursor-not-allowed"
            )}
            aria-disabled={!isEnabled}
          >
            <FileDown className="w-4 h-4 text-[#0F74C9]" />
            <span className="truncate">{STRINGS.clinicalActions.patientPdfReport}</span>
          </button>

          {/* Secondary Action 2: Export JSON Metrics */}
          <button
            type="button"
            onClick={onExportMetrics}
            disabled={!isEnabled}
            title={disabledTooltip}
            className={cn(
              "btn-clinical",
              isEnabled
                ? "bg-gradient-to-b from-white to-[#F0FAF9] border-[#BCE8E3] text-[#0E9F8E] hover:bg-[#CCFBF1] hover:border-[#0E9F8E] shadow-2xs cursor-pointer font-semibold"
                : "bg-[#F3F8FB] text-[#A4B7C6] border-[#E2ECF2] opacity-60 cursor-not-allowed"
            )}
            aria-disabled={!isEnabled}
          >
            <Download className="w-4 h-4 text-[#0E9F8E]" />
            <span className="truncate">{STRINGS.clinicalActions.exportFindings}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

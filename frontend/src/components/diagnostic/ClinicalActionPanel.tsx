"use client";

import { FileDown, Send, Download, CheckCircle2 } from "lucide-react";
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

  return (
    <div
      className="clinical-card p-4 space-y-3"
      role="region"
      aria-label={STRINGS.clinicalActions.title}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {STRINGS.clinicalActions.title}
        </span>
        {isEnabled && (
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {STRINGS.clinicalActions.caseReadyNotice}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {/* Send to Attending Physician Button */}
        <button
          type="button"
          onClick={onOpenSendModal}
          disabled={!isEnabled}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-bold transition-all shadow-xs",
            isEnabled
              ? "bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.99] cursor-pointer"
              : "bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60"
          )}
          aria-disabled={!isEnabled}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{STRINGS.clinicalActions.sendToPhysician}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          {/* Download Patient PDF Report Button */}
          <button
            type="button"
            onClick={onOpenReportModal}
            disabled={!isEnabled}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all",
              isEnabled
                ? "border-clinical-600 bg-clinical-50 text-clinical-700 hover:bg-clinical-100 cursor-pointer shadow-2xs"
                : "border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
            )}
            aria-disabled={!isEnabled}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{STRINGS.clinicalActions.patientPdfReport}</span>
          </button>

          {/* Export JSON Metrics Button */}
          <button
            type="button"
            onClick={onExportMetrics}
            disabled={!isEnabled}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all",
              isEnabled
                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer shadow-2xs"
                : "border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
            )}
            aria-disabled={!isEnabled}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{STRINGS.clinicalActions.exportFindings}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

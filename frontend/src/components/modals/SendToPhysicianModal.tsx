"use client";

import { useState } from "react";
import { X, Send, CheckCircle2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicalSessionResult, ClinicalPriority } from "@/lib/types";
import { STRINGS } from "@/config/strings";
import type { TenantBranding } from "@/config/tenant";

interface SendToPhysicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ClinicalSessionResult | null;
  tenant: TenantBranding;
  onDispatched?: (physician: string, priority: ClinicalPriority) => void;
}

export default function SendToPhysicianModal({
  isOpen,
  onClose,
  result,
  tenant,
  onDispatched,
}: SendToPhysicianModalProps) {
  const [priority, setPriority] = useState<ClinicalPriority>("urgent");
  const [physician, setPhysician] = useState("Dr. Staff Attending, MD — Radiology Subspecialist");
  const [notes, setNotes] = useState(
    "Automated neural diagnostic evaluation flagged candidate pathology. Clinical decision support assessment complete. Forwarded for attending verification and sign-off."
  );
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !result) return null;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSuccess(true);
      onDispatched?.(physician, priority);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1600);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-clinical-50 text-clinical-700 border border-clinical-200">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 id="send-modal-title" className="text-[14px] font-bold text-slate-900">
                {STRINGS.modals.sendPhysician.title}
              </h3>
              <p className="text-[11px] text-slate-500">
                {STRINGS.modals.sendPhysician.subtitle} • {tenant.hospitalName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-[12px]">
          {/* Finding Summary Pill */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Identified Finding</span>
              <span className="font-bold text-slate-900 text-[13px]">
                {result.diagnosticFinding.displayName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency</span>
              <span className="capitalize font-bold text-rose-700">
                {result.diagnosticFinding.riskLevel} Risk
              </span>
            </div>
          </div>

          {/* Physician Selection */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {STRINGS.modals.sendPhysician.targetPhysicianLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={physician}
                onChange={(e) => setPhysician(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-[12px] focus:outline-none focus:border-clinical-600 focus:ring-1 focus:ring-clinical-600"
              />
              <UserCheck className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* Clinical Urgency / Triage Priority */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {STRINGS.modals.sendPhysician.priorityLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["routine", "urgent", "stat"] as ClinicalPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "py-2 px-3 rounded-lg border text-center font-bold text-[11px] uppercase tracking-wide transition-all",
                    priority === p
                      ? p === "stat"
                        ? "bg-rose-600 border-rose-700 text-white shadow-xs"
                        : p === "urgent"
                        ? "bg-amber-600 border-amber-700 text-white shadow-xs"
                        : "bg-clinical-600 border-clinical-700 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Notes & Impression */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">
              {STRINGS.modals.sendPhysician.notesLabel}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-[12px] focus:outline-none focus:border-clinical-600 focus:ring-1 focus:ring-clinical-600"
            />
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 animate-fade-in font-bold text-[11px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{STRINGS.modals.sendPhysician.successNotice}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-900 font-semibold transition-colors"
          >
            {STRINGS.modals.sendPhysician.cancelButton}
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || isSuccess}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold shadow-xs transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSending
                ? STRINGS.modals.sendPhysician.sendingButton
                : STRINGS.modals.sendPhysician.sendButton}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

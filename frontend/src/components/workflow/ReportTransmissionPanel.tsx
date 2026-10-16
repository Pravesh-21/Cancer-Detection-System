"use client";

import React, { useState } from "react";
import {
  Mail, CheckCircle2, Loader2, RefreshCw, ArrowLeft, Send,
  FileText, User, Phone, Shield, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicalSessionResult } from "@/lib/types";
import type { PatientFormData } from "./PatientIntakeForm";
import { sendReportEmail, getWhatsAppLink } from "@/lib/api";

interface ReportTransmissionPanelProps {
  patient: PatientFormData;
  result: ClinicalSessionResult;
  doctorNotes: string;
  /** Registry visit code; without it the report cannot be e-mailed */
  visitCode?: string;
  onBack: () => void;
  onNewCase: () => void;
  onReportSent?: (recipient: string) => void;
  onWhatsAppOpened?: (recipient: string) => void;
}

type TransmitStatus = "idle" | "sending" | "sent" | "error";

export default function ReportTransmissionPanel({
  patient,
  result,
  doctorNotes,
  visitCode,
  onBack,
  onNewCase,
  onReportSent,
  onWhatsAppOpened,
}: ReportTransmissionPanelProps) {
  const [waStatus, setWaStatus] = useState<"idle" | "opening" | "opened">("idle");
  const [waRecipient, setWaRecipient] = useState<string | null>(null);
  const [transmitStatus, setTransmitStatus] = useState<TransmitStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<string>(patient.email);

  const finding = result.diagnosticFinding;
  const domain = result.domainClassification;

  const handleSendReport = async () => {
    if (!visitCode) {
      setTransmitStatus("error");
      setErrorMsg("This visit was not saved to the patient registry, so the report cannot be e-mailed.");
      return;
    }
    setTransmitStatus("sending");
    setErrorMsg(null);
    try {
      const res = await sendReportEmail(visitCode);
      setRecipient(res.recipient);
      setTransmitStatus("sent");
      onReportSent?.(res.recipient);
    } catch (err) {
      setTransmitStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleWhatsApp = async () => {
    if (!visitCode) {
      setTransmitStatus("error");
      setErrorMsg("This visit was not saved to the patient registry, so a WhatsApp message cannot be prepared.");
      return;
    }
    // Open the tab synchronously inside the click, or pop-up blockers stop it after the await
    const win = window.open("about:blank", "_blank");
    setWaStatus("opening");
    setErrorMsg(null);
    try {
      const res = await getWhatsAppLink(visitCode);
      if (win) {
        win.opener = null;
        win.location.href = res.url;
      } else {
        window.location.href = res.url;
      }
      setWaRecipient(res.recipient);
      setWaStatus("opened");
      onWhatsAppOpened?.(res.recipient);
    } catch (err) {
      win?.close();
      setWaStatus("idle");
      setTransmitStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4 animate-fade-rise">
      {/* Panel Header Card */}
      <div className="bg-white border border-[#DCE8F0] rounded-[16px] shadow-[0_1px_3px_rgba(11,34,57,0.04)] overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-[#0E9F8E] to-[#0F74C9]" />
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F0F6FA]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#059669] to-[#0E9F8E] border border-[#34D399]/30 flex items-center justify-center shadow-sm">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#0B2239] leading-tight">Report Dispatch</h2>
              <p className="text-[11px] text-[#7A91A6] font-medium">Step 4 — Transmit findings to patient</p>
            </div>
          </div>
          {transmitStatus === "sent" && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-[6px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Transmitted
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Report Preview Card */}
          <div className="bg-[#F8FBFC] border border-[#DCE8F0] rounded-[12px] p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A91A6] flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5" />
              Report Summary
            </p>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="space-y-0.5">
                <p className="text-[#7A91A6] font-medium">Patient</p>
                <p className="font-bold text-[#0B2239]">{patient.fullName}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[#7A91A6] font-medium">MRN</p>
                <p className="font-bold font-mono text-[#0F74C9]">{patient.mrn}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[#7A91A6] font-medium">Anatomical Domain</p>
                <p className="font-bold text-[#0B2239] capitalize">{domain.predictedDomain}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[#7A91A6] font-medium">Finding</p>
                <p className="font-bold text-[#0B2239]">{finding.displayName}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[#7A91A6] font-medium">Confidence</p>
                <p className="font-bold font-mono text-[#0B2239]">{Math.round(finding.confidence * 100)}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[#7A91A6] font-medium">Risk Level</p>
                <p className={cn(
                  "font-bold capitalize",
                  finding.riskLevel === "high" ? "text-[#C8353B]" :
                  finding.riskLevel === "moderate" ? "text-[#C98A0A]" :
                  "text-[#0E9F8E]"
                )}>
                  {finding.riskLevel}
                </p>
              </div>
            </div>
            {doctorNotes && (
              <div className="pt-2 border-t border-[#DCE8F0]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A91A6] mb-1">Doctor's Notes</p>
                <p className="text-[12px] text-[#3C566E] italic leading-relaxed">{doctorNotes}</p>
              </div>
            )}
          </div>

          {/* Recipient Info */}
          <div className="bg-[#EBF4FC] border border-[#BAE6FD] rounded-[12px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F74C9] mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Recipient Details
            </p>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-[#7A91A6] flex-shrink-0" />
                <span className="text-[#3C566E]">Email:</span>
                <span className="font-semibold text-[#0B2239]">{patient.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-[#7A91A6] flex-shrink-0" />
                <span className="text-[#3C566E]">Phone:</span>
                <span className="font-semibold text-[#0B2239]">{patient.phone}</span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A]">
            <Shield className="w-4 h-4 text-[#C98A0A] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#7A5C00] leading-relaxed">
              <strong>Confidentiality Notice:</strong> A real e-mail containing the finding and doctor&apos;s notes will be sent to the address on the patient&apos;s record. The subject line contains no diagnosis. Confirm the address with the patient before sending.
            </p>
          </div>

          {/* Transmission Status Area */}
          {transmitStatus === "sent" && (
            <div className="flex flex-col items-center gap-3 py-5 animate-fade-rise">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#059669] to-[#0E9F8E] flex items-center justify-center shadow-[0_0_24px_rgba(14,159,142,0.35)]">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-[#0B2239]">Report Dispatched!</p>
                <p className="text-[13px] text-[#3C566E] mt-1">
                  A clinical summary has been e-mailed to{" "}
                  <strong className="text-[#0F74C9]">{recipient}</strong>
                </p>
                <p className="text-[11px] text-[#7A91A6] mt-1">
                  Case ID: <span className="font-mono">{result.sessionId}</span>
                </p>
              </div>
            </div>
          )}

          {waStatus === "opened" && waRecipient && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] text-[#065F46]">
              <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                WhatsApp opened for <strong>{waRecipient}</strong> with a notification message (no diagnosis).
                Press <strong>Send</strong> in WhatsApp to deliver it.
              </p>
            </div>
          )}

          {transmitStatus === "error" && (
            <div className="p-3.5 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] text-[12px] text-[#9B1C1C]">
              {errorMsg || "Failed to dispatch report. Please try again."}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-6 pb-5 pt-2 flex items-center justify-between gap-4 border-t border-[#F0F6FA]">
          <button
            type="button"
            onClick={onBack}
            disabled={transmitStatus === "sending"}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#DCE8F0] text-[13px] font-semibold text-[#3C566E] bg-white hover:bg-[#F3F8FB] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Review
          </button>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              id="send-whatsapp-btn"
              onClick={handleWhatsApp}
              disabled={waStatus === "opening" || transmitStatus === "sending"}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#A7F3D0] text-[13px] font-semibold text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {waStatus === "opening" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {waStatus === "opened" ? "Open WhatsApp Again" : "Notify on WhatsApp"}
            </button>
            {transmitStatus === "sent" && (
              <button
                type="button"
                onClick={onNewCase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] border border-[#DCE8F0] text-[13px] font-semibold text-[#3C566E] bg-white hover:bg-[#F3F8FB] transition-all duration-150 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                New Case
              </button>
            )}
            {transmitStatus !== "sent" && (
              <button
                type="button"
                id="send-report-btn"
                onClick={handleSendReport}
                disabled={transmitStatus === "sending"}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-[10px] font-bold text-[13px] transition-all duration-200",
                  transmitStatus === "sending"
                    ? "bg-[#0E9F8E]/70 text-white cursor-wait"
                    : "bg-gradient-to-r from-[#059669] to-[#0E9F8E] text-white shadow-[0_3px_12px_rgba(14,159,142,0.3)] hover:from-[#047857] hover:to-[#0A8F7E] cursor-pointer"
                )}
              >
                {transmitStatus === "sending" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transmitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Report to Patient
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

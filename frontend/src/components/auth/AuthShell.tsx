"use client";

import React from "react";
import { ShieldCheck, Building2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

/** Split layout shared by /login and /register: brand panel left, form card right. */
export default function AuthShell({ title, subtitle, children, footer, wide }: AuthShellProps) {
  return (
    <div className="min-h-screen grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] bg-[#F3F8FB]">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-[#0B2239] via-[#0E2A47] to-[#07131F] text-white p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#07131F] border border-[#0E9F8E]/40 flex items-center justify-center shadow-[0_0_12px_rgba(14,159,142,0.3)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-[#0E9F8E]" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
              <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
              <circle cx="12" cy="12" r="3" fill="#0E9F8E" fillOpacity={0.3} />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          </div>
          <span className="text-[20px] font-extrabold tracking-tight">
            Cancer<span className="text-[#38BDF8]">Lens</span>
          </span>
        </div>

        <div className="space-y-6 max-w-md">
          <h2 className="text-[28px] xl:text-[32px] font-extrabold leading-tight">
            AI-assisted oncology diagnostics for your hospital.
          </h2>
          <ul className="space-y-4 text-[14px] text-[#B8CCE0]">
            <li className="flex gap-3">
              <Building2 className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" />
              <span>Each hospital has its own private workspace — patients, scans and reports are never shared between hospitals.</span>
            </li>
            <li className="flex gap-3">
              <Lock className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" />
              <span>Patient identities are encrypted at rest; every action is recorded in your hospital&apos;s audit trail.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-[#38BDF8] flex-shrink-0 mt-0.5" />
              <span>Decision support only — every AI finding requires sign-off by an attending clinician.</span>
            </li>
          </ul>
        </div>

        <p className="text-[11px] text-[#7A91A6]">
          Investigational software. Not a standalone diagnostic device.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className={cn("w-full", wide ? "max-w-[560px]" : "max-w-[420px]")}>
          <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
            <span className="text-[22px] font-extrabold tracking-tight text-[#0B2239]">
              Cancer<span className="text-[#0F74C9]">Lens</span>
            </span>
          </div>
          <div className="bg-white border border-[#DCE8F0] rounded-[16px] shadow-[0_1px_3px_rgba(11,34,57,0.04),0_8px_24px_rgba(11,34,57,0.06)] overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E]" />
            <div className="px-6 sm:px-8 pt-7 pb-2">
              <h1 className="text-[22px] font-extrabold text-[#0B2239] leading-tight">{title}</h1>
              <p className="text-[13px] text-[#7A91A6] font-medium mt-1">{subtitle}</p>
            </div>
            <div className="px-6 sm:px-8 pb-7 pt-4">{children}</div>
          </div>
          {footer && <div className="text-center text-[13px] text-[#3C566E] mt-5">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

// ── Shared form primitives ────────────────────────────────────────────────────

export function AuthField({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold text-[#3C566E] uppercase tracking-wider">{label}</span>
      {children}
      {error ? (
        <span className="text-[11px] text-[#C8353B] font-medium">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-[#7A91A6]">{hint}</span>
      ) : null}
    </label>
  );
}

export const authInputCls = (hasError = false) => cn(
  "w-full h-11 px-3.5 rounded-[10px] border text-[14px] font-medium text-[#0B2239] bg-white transition-all duration-150",
  "placeholder:text-[#A4B7C6] focus:outline-none focus:ring-2 focus:ring-[#0F74C9]/20 focus:border-[#0F74C9]",
  hasError ? "border-[#C8353B] bg-[#FFF5F5]" : "border-[#DCE8F0] hover:border-[#BAD4E8]"
);

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#9B1C1C] font-medium">
      {message}
    </div>
  );
}

export function AuthSubmit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full h-11 rounded-[10px] font-bold text-[14px] text-white bg-gradient-to-r from-[#0F74C9] to-[#0E9F8E] shadow-[0_3px_12px_rgba(15,116,201,0.25)] hover:from-[#0B5FA5] hover:to-[#0A8F7E] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

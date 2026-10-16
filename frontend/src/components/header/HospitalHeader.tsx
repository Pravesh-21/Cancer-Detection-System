"use client";

import React from "react";
import type { TenantBranding } from "@/config/tenant";
import type { BackendHealthInfo } from "@/lib/types";

interface HospitalHeaderProps {
  tenant?: TenantBranding;
  healthInfo?: BackendHealthInfo;
  onTriggerUpload?: () => void;
  onAuditLogs?: () => void;
  unreadAuditCount?: number;
  customLogo?: React.ReactNode;
  onRefreshHealth?: () => void;
  isRefreshingHealth?: boolean;
}

export default function HospitalHeader({
  tenant,
  healthInfo,
}: HospitalHeaderProps) {
  const isOnline = healthInfo ? healthInfo.online : true;
  const modelVer = tenant?.modelVersion || "v2.4.1";

  return (
    <header
      className="bg-[#FFFFFF] border-b border-[#DCE8F0] sticky top-0 z-30 shadow-[0_2px_8px_rgba(11,34,57,0.05)]"
      role="banner"
    >
      <div className="max-w-[1780px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* CancerLens Branding: Dark and Light Accent Combination */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#0E9F8E]/40 flex items-center justify-center text-[#0E9F8E] shadow-[0_0_12px_rgba(14,159,142,0.22)] flex-shrink-0"
            aria-hidden="true"
          >
            {/* Precision Optical Diagnostic Reticle with Teal Glow */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-[#0E9F8E]"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
              <circle cx="12" cy="12" r="3" fill="#0E9F8E" fillOpacity={0.3} />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-extrabold text-[#0B2239] leading-tight tracking-tight">
                Cancer<span className="text-[#0F74C9]">Lens</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[6px] bg-[#0B2239] text-[#38BDF8] border border-[#16385C] font-mono shadow-2xs">
                {modelVer}
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[6px] bg-[#F0FAF9] text-[#0E9F8E] border border-[#BCE8E3]">
                AI WORKSTATION
              </span>
            </div>
            <p className="text-[12px] text-[#7A91A6] truncate font-medium leading-tight">
              Clinical Radiologic Oncology Decision Support
            </p>
          </div>
        </div>

        {/* Right Side Status Badges: Dark and Light contrast */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] bg-[#F3F8FB] border border-[#DCE8F0] shadow-2xs">
            <span
              className="w-2.5 h-2.5 rounded-full bg-[#0E9F8E] animate-heartbeat flex-shrink-0 shadow-[0_0_8px_rgba(14,159,142,0.6)]"
              aria-hidden="true"
            />
            <span className="text-[12px] font-bold text-[#0B2239]">
              {isOnline ? "Workstation Active" : "Offline Cache Mode"}
            </span>
            <span className="text-[#DCE8F0]">|</span>
            <span className="text-[11px] font-semibold text-[#0F74C9] bg-[#EBF4FC] px-2 py-0.5 rounded-[5px]">
              Decision Support Only
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

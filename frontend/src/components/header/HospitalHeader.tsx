"use client";

import React from "react";
import { Database, Upload, ShieldCheck, Activity, Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";
import type { TenantBranding } from "@/config/tenant";
import { STRINGS } from "@/config/strings";
import type { BackendHealthInfo } from "@/lib/types";

interface HospitalHeaderProps {
  tenant: TenantBranding;
  healthInfo: BackendHealthInfo;
  onTriggerUpload: () => void;
  onAuditLogs: () => void;
  unreadAuditCount?: number;
  customLogo?: React.ReactNode;
  onRefreshHealth?: () => void;
  isRefreshingHealth?: boolean;
}

export default function HospitalHeader({
  tenant,
  healthInfo,
  onTriggerUpload,
  onAuditLogs,
  unreadAuditCount = 0,
  customLogo,
  onRefreshHealth,
  isRefreshingHealth = false,
}: HospitalHeaderProps) {
  const isOnline = healthInfo.online;
  const isOperational = isOnline && (healthInfo.status === "operational" || healthInfo.modelsInitialized === true);
  const isError = isOnline && healthInfo.status === "error";
  const isInitializing = isOnline && !isOperational && !isError;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs" role="banner">
      <div className="max-w-[1720px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Swappable Hospital / Lab Branding Slot */}
        <div className="flex items-center gap-3 min-w-0">
          {customLogo ? (
            customLogo
          ) : (
            <div
              className="w-9 h-9 rounded-lg bg-clinical-600 flex items-center justify-center text-white shadow-xs flex-shrink-0"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-8h16" />
              </svg>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
              {tenant.hospitalName}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              {tenant.departmentName}
            </p>
          </div>
        </div>

        {/* Live Clinical Telemetry & PHI De-identification Indicators */}
        <div className="hidden lg:flex items-center gap-2.5 text-[11px]">
          {/* PHI Anonymization Compliance Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 font-medium"
            title={tenant.anonymizationProtocol}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>{STRINGS.header.phiDeidentifiedBadge}</span>
          </div>

          {/* Dynamic Backend Engine Health & Ping */}
          {isOperational ? (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer hover:bg-emerald-100/70 transition-colors"
              onClick={onRefreshHealth}
              title="Gateway is operational and ready for scans. Click to refresh telemetry."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {STRINGS.header.telemetryServerLabel}: Operational
                {healthInfo.latencyMs !== undefined && ` (${healthInfo.latencyMs}ms)`}
              </span>
            </div>
          ) : isInitializing ? (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium bg-amber-50 text-amber-800 border-amber-200 cursor-pointer hover:bg-amber-100/70 transition-colors"
              onClick={onRefreshHealth}
              title="Backend server is warming up from hibernation. Click to refresh status."
            >
              <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>
                {STRINGS.header.telemetryServerLabel}: Waking Up...
                {healthInfo.latencyMs !== undefined && ` (${healthInfo.latencyMs}ms)`}
              </span>
            </div>
          ) : isError ? (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium bg-rose-50 text-rose-800 border-rose-200 cursor-pointer hover:bg-rose-100 transition-colors"
              onClick={onRefreshHealth}
              title={healthInfo.initError || "Click to retry connection"}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {STRINGS.header.telemetryServerLabel}: Error (Retry)
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isRefreshingHealth}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80 transition-all cursor-pointer"
              title="Inference Gateway in standby (Render spins down after 15m idle). Click to wake server."
            >
              {isRefreshingHealth ? (
                <Loader2 className="w-3.5 h-3.5 text-rose-600 animate-spin" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>
                {isRefreshingHealth ? "Connecting..." : `${STRINGS.header.telemetryServerLabel}: Standby (Click to Wake)`}
              </span>
            </button>
          )}

          {/* PACS Routing Gateway Node */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 font-medium">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {STRINGS.header.pacsGatewayLabel}: {tenant.dicomAeTitle}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons (Promoted Audit Logs) */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Primary Audit Logs Navigation Button */}
          <button
            type="button"
            onClick={onAuditLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs relative"
            aria-label="Open Regulatory Audit Logs"
          >
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>{STRINGS.header.auditLogsButton}</span>
            {unreadAuditCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold bg-clinical-600 text-white rounded-full">
                {unreadAuditCount}
              </span>
            )}
          </button>

          {/* Upload Scan Button */}
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[12px] font-bold bg-clinical-600 hover:bg-clinical-700 text-white shadow-xs transition-all active:scale-[0.98]"
            aria-label="Upload New Patient Scan"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{STRINGS.header.uploadScanButton}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

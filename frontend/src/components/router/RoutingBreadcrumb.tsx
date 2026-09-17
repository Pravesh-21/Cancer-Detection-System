"use client";

import { ArrowRight, CheckCircle2, Cpu, Database, Network, Loader2 } from "lucide-react";
import { cn, formatLatency } from "@/lib/utils";
import type { Domain, InferenceStatus } from "@/lib/types";
import { WORKFLOW_STAGES } from "@/config/workflow";
import { getDomainLabel } from "@/lib/utils";

interface RoutingBreadcrumbProps {
  status: InferenceStatus;
  domain: Domain | null;
  latencyMs?: number;
}

export default function RoutingBreadcrumb({
  status,
  domain,
  latencyMs,
}: RoutingBreadcrumbProps) {
  const isLoading = status === "loading";
  const isComplete = status === "complete";

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Hierarchical Neural Pipeline Telemetry
        </span>
        <span className="text-[10px] font-mono text-slate-600">
          Latency: <strong className="text-slate-900">{isComplete ? formatLatency(latencyMs) : "--"}</strong>
        </span>
      </div>

      <div className="flex items-center justify-between gap-1.5 text-[11px]">
        {/* Node 1: Ingestion */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 min-w-0 flex-1">
          <Database className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <div className="truncate">
            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
              {WORKFLOW_STAGES[0].badgeLabel}
            </p>
            <p className="text-[11px] font-medium truncate">PACS Ingestion</p>
          </div>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />

        {/* Node 2: Domain Router */}
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-md border min-w-0 flex-1 transition-all",
            isLoading
              ? "bg-clinical-50 border-clinical-300 text-clinical-900"
              : isComplete
              ? "bg-white border-emerald-300 text-slate-800"
              : "bg-white border-slate-200 text-slate-500"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-clinical-600 animate-spin flex-shrink-0" />
          ) : isComplete ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          ) : (
            <Cpu className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          )}
          <div className="truncate">
            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
              {WORKFLOW_STAGES[1].badgeLabel}
            </p>
            <p className="text-[11px] font-medium truncate">Domain Classifier</p>
          </div>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />

        {/* Node 3: Specialized Pathology Engine */}
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-md border min-w-0 flex-1 transition-all",
            isComplete && domain
              ? "bg-clinical-50 border-clinical-400 text-clinical-900 shadow-xs"
              : "bg-white border-slate-200 text-slate-400"
          )}
        >
          <Network
            className={cn(
              "w-3.5 h-3.5 flex-shrink-0",
              isComplete ? "text-clinical-600" : "text-slate-400"
            )}
          />
          <div className="truncate">
            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
              {WORKFLOW_STAGES[2].badgeLabel}
            </p>
            <p className="text-[11px] font-medium truncate">
              {domain ? `${getDomainLabel(domain)}` : "Pathology Model"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

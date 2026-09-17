"use client";

import { useState } from "react";
import {
  Brain,
  Wind,
  Heart,
  Bone,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Compass,
  Layers,
} from "lucide-react";
import { cn, formatConfidence } from "@/lib/utils";
import type { DomainClassificationResult, InferenceStatus, Domain } from "@/lib/types";
import { STRINGS } from "@/config/strings";
import RoutingBreadcrumb from "./RoutingBreadcrumb";

interface ParentRouterCardProps {
  status: InferenceStatus;
  routerResult: DomainClassificationResult | null;
  onSelectDomainOverride?: (domain: Domain) => void;
}

const domainIcons: Record<Domain, React.ReactNode> = {
  brain: <Brain className="w-4 h-4" />,
  lung: <Wind className="w-4 h-4" />,
  breast: <Heart className="w-4 h-4" />,
  bone: <Bone className="w-4 h-4" />,
  skin: <Eye className="w-4 h-4" />,
};

export default function ParentRouterCard({
  status,
  routerResult,
  onSelectDomainOverride,
}: ParentRouterCardProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const isLoading = status === "loading";
  const isComplete = status === "complete" && !!routerResult;

  // Selected anatomical domain icon
  const activeIcon = routerResult ? domainIcons[routerResult.predictedDomain] ?? <Layers className="w-4 h-4" /> : null;

  return (
    <div className="clinical-card p-4 space-y-4" role="region" aria-label={STRINGS.router.title}>
      {/* ── Stage 2 Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 font-bold text-[12px] flex items-center justify-center">
            2
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 leading-tight">
              {STRINGS.router.title}
            </h2>
            <p className="text-[11px] text-slate-500">
              {STRINGS.router.subtitle}
            </p>
          </div>
        </div>

        {isComplete && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="capitalize">{routerResult.predictedDomain}</span>
          </span>
        )}
      </div>

      {/* ── Collapsed Progress Indicator by default / Technical View behind toggle ── */}
      <div className="space-y-2">
        {/* Sleek Collapsed Progress Bar */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
            {isLoading ? (
              <span className="w-2 h-2 rounded-full bg-clinical-500 animate-ping" />
            ) : isComplete ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            )}
            <span>
              {isLoading
                ? "Autonomous Domain Classifier Running…"
                : isComplete
                ? `Domain Confirmed: ${routerResult.predictedDomain.toUpperCase()}`
                : "Router Standby (Awaiting Scan)"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-[11px] font-semibold text-clinical-700 hover:text-clinical-800 inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white transition-colors"
            aria-expanded={showTechnicalDetails}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>
              {showTechnicalDetails
                ? STRINGS.router.hideTechnicalDetails
                : STRINGS.router.viewTechnicalDetails}
            </span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Technical Pipeline View (Accordion) */}
        {showTechnicalDetails && (
          <RoutingBreadcrumb
            status={status}
            domain={routerResult ? routerResult.predictedDomain : null}
            latencyMs={routerResult?.latencyMs}
          />
        )}
      </div>

      {/* ── Domain Probabilities Horizontal Distribution Bar Chart ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {STRINGS.router.targetConcordance}
          </span>
          {isComplete && (
            <span className="text-[11px] font-mono text-slate-600">
              Confidence: <strong className="text-slate-900">{formatConfidence(routerResult.confidence)}</strong>
            </span>
          )}
        </div>

        {isLoading ? (
          /* Loading Skeleton */
          <div className="space-y-3 py-3" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-1/3 bg-slate-200 rounded skeleton" />
                <div className="h-2 w-full bg-slate-100 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : isComplete && routerResult.probabilities ? (
          /* Dynamic Probabilities Bar Chart (Populated solely from API response array) */
          <div className="space-y-2.5" role="list" aria-label="Domain probabilities">
            {routerResult.probabilities.map((item) => {
              const isSelected = item.domain === routerResult.predictedDomain;
              return (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => onSelectDomainOverride?.(item.domain)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg border transition-all space-y-1.5 block group",
                    isSelected
                      ? "border-clinical-400 bg-clinical-50/80 shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                  )}
                  title={`${STRINGS.router.clickToOverride}: ${item.label}`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={cn(
                        "flex items-center gap-2 font-medium",
                        isSelected ? "text-slate-900 font-bold" : "text-slate-600"
                      )}
                    >
                      <span className={isSelected ? "text-clinical-600" : "text-slate-400"}>
                        {domainIcons[item.domain] ?? <Layers className="w-4 h-4" />}
                      </span>
                      <span>{item.label}</span>
                      {isSelected && (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {STRINGS.router.routedBadge}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[11px]",
                        isSelected ? "font-bold text-slate-900" : "text-slate-400"
                      )}
                    >
                      {formatConfidence(item.probability)}
                    </span>
                  </div>

                  {/* Horizontal Bar Chart */}
                  <div className="confidence-track">
                    <div
                      className={cn(
                        "confidence-fill",
                        isSelected
                          ? "bg-clinical-600"
                          : item.probability > 0.1
                          ? "bg-slate-400"
                          : "bg-slate-200"
                      )}
                      style={{ width: `${Math.max(item.probability * 100, 1.5)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Standby State with state-appropriate visual */
          <div className="py-10 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/60">
            {activeIcon ? (
              <div className="w-9 h-9 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                {activeIcon}
              </div>
            ) : (
              <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            )}
            <p className="text-[12px] font-bold text-slate-700">{STRINGS.router.awaitingTitle}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {STRINGS.router.awaitingSubtext}
            </p>
          </div>
        )}
      </div>

      {/* ── Summary Info Banner ── */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
        <span className="text-slate-500">{STRINGS.router.autonomousRoutingLabel}</span>
        <span className="font-semibold text-slate-800">
          {isComplete ? STRINGS.router.networkEngaged : STRINGS.router.standingBy}
        </span>
      </div>
    </div>
  );
}

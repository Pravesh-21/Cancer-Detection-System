"use client";

import {
  Brain,
  Wind,
  Heart,
  Bone,
  Eye,
  CheckCircle2,
  Compass,
  Layers,
  Route,
} from "lucide-react";
import { cn, formatConfidence } from "@/lib/utils";
import type { DomainClassificationResult, InferenceStatus, Domain } from "@/lib/types";
import { STRINGS } from "@/config/strings";

interface ParentRouterCardProps {
  status: InferenceStatus;
  routerResult: DomainClassificationResult | null;
  onSelectDomainOverride?: (domain: Domain) => void;
}

const domainIcons: Record<Domain, React.ReactNode> = {
  brain: <Brain className="w-3.5 h-3.5" />,
  lung: <Wind className="w-3.5 h-3.5" />,
  breast: <Heart className="w-3.5 h-3.5" />,
  bone: <Bone className="w-3.5 h-3.5" />,
  skin: <Eye className="w-3.5 h-3.5" />,
};

const domainChipStyles: Record<Domain, { bg: string; text: string; border: string }> = {
  brain: { bg: "bg-[#EEF2FF]", text: "text-[#4F46E5]", border: "border-[#C7D2FE]" },
  lung: { bg: "bg-[#E0F2FE]", text: "text-[#0284C7]", border: "border-[#BAE6FD]" },
  breast: { bg: "bg-[#FDF2F8]", text: "text-[#DB2777]", border: "border-[#FBCFE8]" },
  bone: { bg: "bg-[#FEF3C7]", text: "text-[#D97706]", border: "border-[#FDE68A]" },
  skin: { bg: "bg-[#ECFDF5]", text: "text-[#059669]", border: "border-[#A7F3D0]" },
};

export default function ParentRouterCard({
  status,
  routerResult,
  onSelectDomainOverride,
}: ParentRouterCardProps) {
  const isLoading = status === "loading";
  const isComplete = status === "complete" && !!routerResult;

  // Selected anatomical domain icon
  const activeIcon = routerResult ? domainIcons[routerResult.predictedDomain] ?? <Layers className="w-4 h-4" /> : null;

  return (
    <div
      className="clinical-card p-5 space-y-4 overflow-hidden"
      role="region"
      aria-label={STRINGS.router.title}
    >
      {/* Top Card Color Accent Line */}
      <div className="h-[3px] bg-gradient-to-r from-[#0E9F8E] via-[#0F74C9] to-transparent -mx-5 -mt-5 mb-4 rounded-t-[16px]" />

      {/* ── Header: Dark and Light Contrast ── */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center text-[#0E9F8E] shadow-xs flex-shrink-0">
            <Route className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[16px] font-bold text-[#0B2239] leading-tight tracking-tight">
            Anatomical Domain Routing
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E9F8E] bg-[#F0FAF9] border border-[#BCE8E3] px-2 py-0.5 rounded-[6px]">
            Domain Classifier
          </span>
        </div>

        {isComplete && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-[#F0FAF9] text-[#0E9F8E] border border-[#BCE8E3] animate-fade-rise shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F8E]" />
            <span className="capitalize">{routerResult.predictedDomain} Domain</span>
          </span>
        )}
      </div>

      {/* ── Status Indicator Bar ── */}
      <div className="p-3 bg-[#F3F8FB] border border-[#DCE8F0] rounded-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#3C566E]">
          {isLoading ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F74C9] animate-ping" />
          ) : isComplete ? (
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E9F8E] shadow-[0_0_6px_rgba(14,159,142,0.6)]" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-[#7A91A6]" />
          )}
          <span className="font-semibold text-[#0B2239]">
            {isLoading
              ? "Routing Anatomy…"
              : isComplete
              ? `Domain Confirmed: ${routerResult.predictedDomain.toUpperCase()}`
              : "Router Standby (Awaiting Scan)"}
          </span>
        </div>

        {isComplete && (
          <span className="text-[12px] font-mono text-[#3C566E] font-medium">
            Confidence: <strong className="text-[#0B2239]">{formatConfidence(routerResult.confidence)}</strong>
          </span>
        )}
      </div>

      {/* ── Domain Probabilities Distribution ── */}
      <div className="space-y-2">
        {isLoading ? (
          /* Loading Skeleton */
          <div className="space-y-3 py-2" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-1/3 bg-[#E2ECF2] rounded skeleton" />
                <div className="h-2 w-full bg-[#EEF4F8] rounded skeleton" />
              </div>
            ))}
          </div>
        ) : isComplete && routerResult.probabilities ? (
          /* Probabilities Distribution with Smooth Rise and Fade In (8px) */
          <div className="space-y-2 animate-fade-rise" role="list" aria-label="Domain probabilities">
            {routerResult.probabilities.map((item) => {
              const isSelected = item.domain === routerResult.predictedDomain;
              const chip = domainChipStyles[item.domain];
              return (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => onSelectDomainOverride?.(item.domain)}
                  className={cn(
                    "w-full text-left p-3 rounded-[10px] border transition-all space-y-1.5 block group cursor-pointer",
                    isSelected
                      ? "border-l-4 border-l-[#0F74C9] border-[#0F74C9] bg-gradient-to-r from-[#F0F7FD] to-white shadow-[0_2px_8px_rgba(15,116,201,0.1)]"
                      : "border-[#DCE8F0] bg-white hover:border-[#B5D3E8] hover:bg-[#F8FBFC]"
                  )}
                  title={`${STRINGS.router.clickToOverride}: ${item.label}`}
                >
                  <div className="flex items-center justify-between text-[12px]">
                    <span
                      className={cn(
                        "flex items-center gap-2.5 font-medium",
                        isSelected ? "text-[#0B2239] font-bold" : "text-[#3C566E]"
                      )}
                    >
                      {/* Individual domain colored icon chip */}
                      <span className={cn("w-6 h-6 rounded-[6px] border flex items-center justify-center flex-shrink-0", chip.bg, chip.text, chip.border)}>
                        {domainIcons[item.domain] ?? <Layers className="w-3.5 h-3.5" />}
                      </span>
                      <span>{item.label}</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-[5px] bg-[#F0FAF9] text-[#0E9F8E] border border-[#BCE8E3] shadow-2xs">
                          {STRINGS.router.routedBadge}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[12px]",
                        isSelected ? "font-bold text-[#0B2239]" : "text-[#7A91A6]"
                      )}
                    >
                      {formatConfidence(item.probability)}
                    </span>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div className="confidence-track">
                    <div
                      className={cn(
                        "confidence-fill",
                        isSelected
                          ? "bg-gradient-to-r from-[#0F74C9] to-[#0284C7]"
                          : item.probability > 0.1
                          ? "bg-[#7A91A6]"
                          : "bg-[#DCE8F0]"
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
          <div className="py-8 text-center border border-dashed border-[#DCE8F0] rounded-[10px] bg-[#F3F8FB]/60">
            {activeIcon ? (
              <div className="w-10 h-10 rounded-full bg-[#E8F2FA] text-[#0F74C9] flex items-center justify-center mx-auto mb-2 shadow-xs">
                {activeIcon}
              </div>
            ) : (
              <Compass className="w-8 h-8 text-[#7A91A6] mx-auto mb-2 opacity-60" />
            )}
            <p className="text-[13px] font-bold text-[#0B2239]">Awaiting Scan Analysis</p>
            <p className="text-[12px] text-[#7A91A6] mt-0.5 max-w-xs mx-auto">
              Run diagnostic pipeline to classify anatomical region
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

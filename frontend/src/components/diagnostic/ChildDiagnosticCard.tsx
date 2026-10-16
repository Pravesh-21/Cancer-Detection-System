"use client";

import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Clock,
  Activity,
  Sparkles,
  AlertOctagon,
  RotateCcw,
} from "lucide-react";
import {
  cn,
  formatConfidence,
  formatLatency,
  getICD10,
} from "@/lib/utils";
import type { DiagnosticResult, InferenceStatus, DiagnosticState } from "@/lib/types";
import { STRINGS } from "@/config/strings";
import { getSeverityToken } from "@/config/themeTokens";
import { getRiskTierConfig, classifyClinicalRisk } from "@/utils/riskRegistry";

interface ChildDiagnosticCardProps {
  status: InferenceStatus;
  childResult: DiagnosticResult | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  isHeatmapActive?: boolean;
  onToggleHeatmap?: () => void;
}

export default function ChildDiagnosticCard({
  status,
  childResult,
  errorMessage,
  onRetry,
  isHeatmapActive = false,
  onToggleHeatmap,
}: ChildDiagnosticCardProps) {
  const isLoading = status === "loading";
  const isError = status === "error";
  const isComplete = status === "complete" && !!childResult;

  const calculatedRiskTier = childResult ? classifyClinicalRisk(childResult.predictedClass) : "normal";
  const riskConfig = childResult ? getRiskTierConfig(childResult.predictedClass) : null;

  let diagnosticState: DiagnosticState = "empty";
  if (isLoading) {
    diagnosticState = "loading";
  } else if (isError) {
    diagnosticState = "error";
  } else if (isComplete) {
    if (childResult.confidence < 0.55) {
      diagnosticState = "low-confidence";
    } else if (calculatedRiskTier === "high") {
      diagnosticState = "high-confidence-malignant";
    } else {
      diagnosticState = "high-confidence-benign";
    }
  }

  const severityToken = childResult ? getSeverityToken(calculatedRiskTier) : null;

  return (
    <div
      className="clinical-card p-5 space-y-4 overflow-hidden"
      role="region"
      aria-label={STRINGS.diagnostic.title}
    >
      {/* Top Card Color Accent Line */}
      <div className="h-[3px] bg-gradient-to-r from-[#C8353B] via-[#C98A0A] to-[#0E9F8E] -mx-5 -mt-5 mb-4 rounded-t-[16px]" />

      {/* ── Header: Dark & Light Contrast ── */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#0B2239] to-[#07131F] border border-[#16385C] flex items-center justify-center text-[#F43F5E] shadow-xs flex-shrink-0">
            <Stethoscope className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[16px] font-bold text-[#0B2239] leading-tight tracking-tight">
            Diagnostic Pathology Finding
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8353B] bg-[#FDF2F2] border border-[#F8B4B7] px-2 py-0.5 rounded-[6px]">
            Neural Inference
          </span>
        </div>

        {isComplete && riskConfig && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold animate-fade-rise shadow-2xs",
              riskConfig.tier === "high"
                ? "bg-[#FDF2F2] text-[#C8353B] border border-[#F8B4B7]"
                : riskConfig.tier === "moderate"
                ? "bg-[#FEF9EE] text-[#C98A0A] border border-[#FBE3B5]"
                : "bg-[#F0FAF9] text-[#0E9F8E] border border-[#BCE8E3]"
            )}
            aria-label={`${riskConfig.label}: ${riskConfig.sublabel}`}
          >
            {/* Always pair severity color with icon AND clear text label */}
            {riskConfig.tier === "high" && (
              <AlertTriangle className="w-3.5 h-3.5 text-[#C8353B]" aria-hidden="true" />
            )}
            {riskConfig.tier === "moderate" && (
              <AlertCircle className="w-3.5 h-3.5 text-[#C98A0A]" aria-hidden="true" />
            )}
            {riskConfig.tier === "normal" && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0E9F8E]" aria-hidden="true" />
            )}
            <span>{riskConfig.label}</span>
          </span>
        )}
      </div>

      {/* ── Diagnostic State Machine ── */}
      {diagnosticState === "loading" && (
        <div className="space-y-4 py-2" aria-busy="true">
          <div className="h-24 w-full bg-[#EEF4F8] rounded-[10px] skeleton" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-1/3 bg-[#E2ECF2] rounded skeleton" />
                <div className="h-2 w-full bg-[#EEF4F8] rounded skeleton" />
              </div>
            ))}
          </div>
        </div>
      )}

      {diagnosticState === "error" && (
        <div className="p-4 rounded-[10px] bg-[#FDF2F2] border border-[#F8B4B7] text-[#C8353B] text-center space-y-2.5 animate-fade-rise">
          <AlertOctagon className="w-6 h-6 mx-auto text-[#C8353B]" />
          <p className="text-[14px] font-bold">Diagnostic Evaluation Notice</p>
          <p className="text-[12px] text-[#C8353B]/90 max-w-sm mx-auto leading-relaxed">
            {errorMessage || "Unable to complete radiologic assessment. Please ensure a valid medical scan is provided and retry."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn-clinical bg-[#C8353B] hover:bg-[#A8242A] text-white cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Diagnostic Analysis</span>
            </button>
          )}
        </div>
      )}

      {isComplete && childResult && severityToken && (
        <div className="space-y-4 animate-fade-rise">
          {/* Prominent Primary Pathology Box with High-Contrast Dark & Light Design */}
          <div
            className={cn(
              "p-4 rounded-[10px] border transition-all relative overflow-hidden",
              severityToken.cardBgClass,
              severityToken.cardBorderClass,
              calculatedRiskTier === "high"
                ? "border-l-4 border-l-[#C8353B]"
                : calculatedRiskTier === "moderate"
                ? "border-l-4 border-l-[#C98A0A]"
                : "border-l-4 border-l-[#0E9F8E]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#7A91A6] block">
                  {STRINGS.diagnostic.primaryFindingHeader}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#0B2239] leading-tight truncate">
                  {childResult.displayName}
                </h3>
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  {/* High-contrast dark pill for real clinical ICD tag */}
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-[6px] bg-[#0B2239] border border-[#16385C] text-[#7DD3FC] shadow-2xs">
                    ICD-10: {getICD10(childResult.predictedClass)}
                  </span>
                </div>
              </div>

              {/* Dominant Confidence Score Badge with Dark & Light Contrast */}
              <div className="text-right flex-shrink-0 bg-[#0B2239] border border-[#16385C] px-3.5 py-2 rounded-[8px] shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#7DD3FC] block">
                  {STRINGS.diagnostic.confidenceHeader}
                </span>
                <span className="text-[22px] font-extrabold text-[#38BDF8] font-mono tracking-tight">
                  {formatConfidence(childResult.confidence)}
                </span>
              </div>
            </div>

            {/* Low Confidence Advisory Notice */}
            {diagnosticState === "low-confidence" && (
              <div className="mt-3 p-2.5 rounded-[8px] bg-[#FEF9EE] border border-[#FBE3B5] text-[#C98A0A] text-[12px] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0 text-[#C98A0A]" />
                <span>{STRINGS.diagnostic.lowConfidenceNotice}</span>
              </div>
            )}
          </div>

          {/* Saliency / Grad-CAM Attention Map Activation Toggle */}
          {onToggleHeatmap && (
            <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#F3F8FB] border border-[#DCE8F0]">
              <div className="flex items-center gap-2 text-[12px] font-medium text-[#3C566E]">
                <Sparkles className="w-3.5 h-3.5 text-[#0F74C9]" />
                <span>{STRINGS.diagnostic.toggleHeatmapButton}</span>
              </div>
              <button
                type="button"
                onClick={onToggleHeatmap}
                className={cn(
                  "px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all cursor-pointer",
                  isHeatmapActive
                    ? "bg-[#0F74C9] text-white shadow-2xs"
                    : "bg-white text-[#3C566E] border border-[#DCE8F0] hover:bg-[#F3F8FB]"
                )}
                aria-pressed={isHeatmapActive}
              >
                {isHeatmapActive ? "Layer Active" : "Overlay Heatmap"}
              </button>
            </div>
          )}

          {/* Differential Diagnosis Candidate Probabilities */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A91A6] block">
              {STRINGS.diagnostic.differentialBreakdown}
            </span>

            <div className="space-y-2" role="list" aria-label="Differential probabilities">
              {childResult.classProbabilities.map((cls) => {
                const isSelected = cls.className === childResult.predictedClass;
                const clsSeverity = getSeverityToken(cls.riskLevel);
                return (
                  <div key={cls.className} className="space-y-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span
                        className={cn(
                          "font-medium",
                          isSelected ? "text-[#0B2239] font-bold" : "text-[#3C566E]"
                        )}
                      >
                        {cls.displayName}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]", clsSeverity.badgeClass)}>
                          {clsSeverity.label.split("/")[0].trim()}
                        </span>
                        <span
                          className={cn(
                            "text-[12px]",
                            isSelected ? "font-bold text-[#0B2239]" : "text-[#7A91A6]"
                          )}
                        >
                          {formatConfidence(cls.probability)}
                        </span>
                      </div>
                    </div>

                    <div className="confidence-track">
                      <div
                        className={cn(
                          "confidence-fill",
                          isSelected
                            ? clsSeverity.barColor
                            : cls.probability > 0.1
                            ? "bg-[#7A91A6]"
                            : "bg-[#DCE8F0]"
                        )}
                        style={{ width: `${Math.max(cls.probability * 100, 1.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timing Strip */}
          <div className="flex items-center justify-between pt-2 border-t border-[#DCE8F0] text-[11px] text-[#7A91A6] font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {STRINGS.diagnostic.analysisLatency} {formatLatency(childResult.latencyMs)}
            </span>
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              {STRINGS.diagnostic.pipelineTotalLatency} {formatLatency(childResult.totalPipelineMs)}
            </span>
          </div>
        </div>
      )}

      {diagnosticState === "empty" && (
        <div className="py-8 text-center border border-dashed border-[#DCE8F0] rounded-[10px] bg-[#F3F8FB]/60">
          <Stethoscope className="w-8 h-8 text-[#7A91A6] mx-auto mb-2 opacity-60" />
          <p className="text-[13px] font-bold text-[#0B2239]">{STRINGS.diagnostic.emptyStateTitle}</p>
          <p className="text-[12px] text-[#7A91A6] mt-0.5 max-w-xs mx-auto">
            {STRINGS.diagnostic.emptyStateSubtext}
          </p>
        </div>
      )}
    </div>
  );
}

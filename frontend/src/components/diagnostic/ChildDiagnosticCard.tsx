"use client";

import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Clock,
  Activity,
  Layers,
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
      className="clinical-card p-4 space-y-4"
      role="region"
      aria-label={STRINGS.diagnostic.title}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-clinical-100 text-clinical-700 font-bold text-[12px] flex items-center justify-center">
            3
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 leading-tight">
              {STRINGS.diagnostic.title}
            </h2>
            <p className="text-[11px] text-slate-500">
              {STRINGS.diagnostic.subtitle}
            </p>
          </div>
        </div>

        {isComplete && riskConfig && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-2xs transition-all",
              riskConfig.badgeClass,
              riskConfig.pulseClass
            )}
            aria-label={`${riskConfig.label}: ${riskConfig.sublabel}`}
          >
            {riskConfig.tier === "high" && (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
            )}
            {riskConfig.tier === "moderate" && (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
            )}
            {riskConfig.tier === "normal" && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            )}
            <span>{riskConfig.label}</span>
          </span>
        )}
      </div>

      {/* ── Diagnostic State Machine ── */}
      {diagnosticState === "loading" && (
        <div className="space-y-4 py-2" aria-busy="true">
          <div className="h-20 w-full bg-slate-100 rounded-lg skeleton" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-1/3 bg-slate-200 rounded skeleton" />
                <div className="h-2 w-full bg-slate-100 rounded skeleton" />
              </div>
            ))}
          </div>
        </div>
      )}

      {diagnosticState === "error" && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-2 animate-fade-in">
          <AlertOctagon className="w-6 h-6 mx-auto text-rose-600 mb-1" />
          <p className="text-[13px] font-bold">Diagnostic Inference Interrupted</p>
          <div className="p-2.5 rounded bg-white/80 border border-rose-200 text-[11px] text-rose-700 text-left font-mono break-words">
            {errorMessage || "Pipeline encountered an evaluation exception. Verify network connection and retry."}
          </div>
          <p className="text-[11px] text-rose-600">
            {errorMessage?.includes("initializing") || errorMessage?.includes("loading")
              ? "The cloud server is online and downloading neural model weights. Please allow 30–60 seconds, then retry."
              : "Verify that the backend service is healthy and retry."}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Diagnostic Pipeline</span>
            </button>
          )}
        </div>
      )}

      {isComplete && childResult && severityToken && (
        <div className="space-y-4 animate-fade-in">
          {/* Prominent Primary Pathology Box with Accessible Typographic Hierarchy */}
          <div
            className={cn(
              "p-4 rounded-lg border transition-all relative overflow-hidden",
              severityToken.cardBgClass,
              severityToken.cardBorderClass,
              severityToken.patternClass
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  {STRINGS.diagnostic.primaryFindingHeader}
                </span>
                <h3 className="text-[18px] font-black text-slate-900 leading-tight truncate">
                  {childResult.displayName}
                </h3>
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700 shadow-2xs">
                    ICD-10: {getICD10(childResult.predictedClass)}
                  </span>
                </div>
              </div>

              {/* Dominant Confidence Score */}
              <div className="text-right flex-shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  {STRINGS.diagnostic.confidenceHeader}
                </span>
                <span className="text-[22px] font-extrabold text-slate-900 font-mono tracking-tight">
                  {formatConfidence(childResult.confidence)}
                </span>
              </div>
            </div>

            {/* Low Confidence Advisory Notice */}
            {diagnosticState === "low-confidence" && (
              <div className="mt-3 p-2 rounded bg-amber-100/90 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                <span>{STRINGS.diagnostic.lowConfidenceNotice}</span>
              </div>
            )}
          </div>

          {/* Saliency / Grad-CAM Attention Map Activation Toggle */}
          {onToggleHeatmap && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-clinical-600" />
                <span>{STRINGS.diagnostic.toggleHeatmapButton}</span>
              </div>
              <button
                type="button"
                onClick={onToggleHeatmap}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                  isHeatmapActive
                    ? "bg-clinical-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                )}
                aria-pressed={isHeatmapActive}
              >
                {isHeatmapActive ? "Layer Active" : "Overlay Heatmap"}
              </button>
            </div>
          )}

          {/* Differential Diagnosis Candidate Probabilities */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              {STRINGS.diagnostic.differentialBreakdown}
            </span>

            <div className="space-y-2" role="list" aria-label="Differential probabilities">
              {childResult.classProbabilities.map((cls) => {
                const isSelected = cls.className === childResult.predictedClass;
                const clsSeverity = getSeverityToken(cls.riskLevel);
                return (
                  <div key={cls.className} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={cn(
                          "font-medium",
                          isSelected ? "text-slate-900 font-bold" : "text-slate-600"
                        )}
                      >
                        {cls.displayName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {clsSeverity.label.split("/")[0].trim()}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[11px]",
                            isSelected ? "font-bold text-slate-900" : "text-slate-400"
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
                            ? "bg-slate-400"
                            : "bg-slate-200"
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
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {STRINGS.diagnostic.analysisLatency} {formatLatency(childResult.latencyMs)}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {STRINGS.diagnostic.pipelineTotalLatency} {formatLatency(childResult.totalPipelineMs)}
            </span>
          </div>
        </div>
      )}

      {diagnosticState === "empty" && (
        <div className="py-10 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50/60">
          <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-[12px] font-bold text-slate-700">{STRINGS.diagnostic.emptyStateTitle}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {STRINGS.diagnostic.emptyStateSubtext}
          </p>
        </div>
      )}
    </div>
  );
}

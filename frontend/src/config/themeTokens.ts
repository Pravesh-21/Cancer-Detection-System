import type { RiskLevel } from "@/lib/types";

export interface SeverityToken {
  riskLevel: RiskLevel;
  label: string;
  badgeClass: string;
  cardBgClass: string;
  cardBorderClass: string;
  textColor: string;
  barColor: string;
  patternClass: string;
  ariaLabel: string;
}

export const SEVERITY_TOKENS: Record<RiskLevel, SeverityToken> = {
  high: {
    riskLevel: "high",
    label: "High Risk / Malignant",
    badgeClass: "badge-risk-high",
    cardBgClass: "bg-rose-50/80",
    cardBorderClass: "border-rose-300 ring-1 ring-rose-200",
    textColor: "text-rose-900",
    barColor: "bg-rose-600",
    patternClass: "pattern-stripe-rose",
    ariaLabel: "High risk tier: Alert. Requires immediate clinical attention.",
  },
  moderate: {
    riskLevel: "moderate",
    label: "Moderate Risk / Indeterminate",
    badgeClass: "badge-risk-moderate",
    cardBgClass: "bg-amber-50/80",
    cardBorderClass: "border-amber-300 ring-1 ring-amber-200",
    textColor: "text-amber-900",
    barColor: "bg-amber-500",
    patternClass: "pattern-dash-amber",
    ariaLabel: "Moderate risk tier: Advisory. Follow-up surveillance indicated.",
  },
  low: {
    riskLevel: "low",
    label: "Low Risk / Benign",
    badgeClass: "badge-risk-low",
    cardBgClass: "bg-emerald-50/80",
    cardBorderClass: "border-emerald-300 ring-1 ring-emerald-200",
    textColor: "text-emerald-900",
    barColor: "bg-emerald-600",
    patternClass: "pattern-solid-emerald",
    ariaLabel: "Low risk tier: Routine. Low clinical urgency.",
  },
  normal: {
    riskLevel: "normal",
    label: "Normal / Non-Pathologic",
    badgeClass: "badge-risk-normal",
    cardBgClass: "bg-teal-50/80",
    cardBorderClass: "border-teal-300 ring-1 ring-teal-200",
    textColor: "text-teal-900",
    barColor: "bg-teal-600",
    patternClass: "pattern-solid-teal",
    ariaLabel: "Normal findings: No acute pathology detected.",
  },
};

export function getSeverityToken(risk: RiskLevel): SeverityToken {
  return SEVERITY_TOKENS[risk] || SEVERITY_TOKENS.normal;
}

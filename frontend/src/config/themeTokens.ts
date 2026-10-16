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
    label: "High Risk / Malignant Finding",
    badgeClass: "bg-[#FDF2F2] text-[#C8353B] border border-[#F8B4B7]",
    cardBgClass: "bg-[#FFF8F8]",
    cardBorderClass: "border-[#F5C2C4]",
    textColor: "text-[#C8353B]",
    barColor: "bg-[#C8353B]",
    patternClass: "",
    ariaLabel: "High risk tier: Alert. Requires immediate clinical review and oncologist evaluation.",
  },
  moderate: {
    riskLevel: "moderate",
    label: "Moderate Risk / Indeterminate",
    badgeClass: "bg-[#FEF9EE] text-[#C98A0A] border border-[#FBE3B5]",
    cardBgClass: "bg-[#FFFCF6]",
    cardBorderClass: "border-[#F8DCA5]",
    textColor: "text-[#C98A0A]",
    barColor: "bg-[#C98A0A]",
    patternClass: "",
    ariaLabel: "Moderate risk tier: Advisory. Follow-up surveillance study indicated.",
  },
  low: {
    riskLevel: "low",
    label: "Low Risk / Likely Benign",
    badgeClass: "bg-[#F0FAF9] text-[#0E9F8E] border border-[#BCE8E3]",
    cardBgClass: "bg-[#F7FCFB]",
    cardBorderClass: "border-[#C7EDE8]",
    textColor: "text-[#0E9F8E]",
    barColor: "bg-[#0E9F8E]",
    patternClass: "",
    ariaLabel: "Low risk tier: Routine. Low clinical urgency.",
  },
  normal: {
    riskLevel: "normal",
    label: "Normal / Non-Pathologic",
    badgeClass: "bg-[#F0FAF9] text-[#0E9F8E] border border-[#BCE8E3]",
    cardBgClass: "bg-[#F7FCFB]",
    cardBorderClass: "border-[#C7EDE8]",
    textColor: "text-[#0E9F8E]",
    barColor: "bg-[#0E9F8E]",
    patternClass: "",
    ariaLabel: "Normal findings: No acute pathology detected.",
  },
};

export function getSeverityToken(risk: RiskLevel): SeverityToken {
  return SEVERITY_TOKENS[risk] || SEVERITY_TOKENS.normal;
}

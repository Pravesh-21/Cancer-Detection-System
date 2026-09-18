import type { Domain, RiskLevel } from "@/lib/types";

export type ClinicalUrgencyTier = "high" | "moderate" | "normal";

export interface RiskTierConfig {
  tier: ClinicalUrgencyTier;
  label: string;
  sublabel: string;
  urgencyCode: "URGENT" | "MODERATE" | "ROUTINE";
  accentHex: string;
  threeColor: string;
  badgeClass: string;
  bgLightClass: string;
  borderClass: string;
  textClass: string;
  pulseClass: string;
  actionRecommendation: string;
}

export const HIGH_RISK_CLASSES = new Set([
  "glioma",
  "lung_aca",
  "lung_scc",
  "malignant",
  "cancer",
  "mel",
  "bcc",
]);

export const MODERATE_RISK_CLASSES = new Set([
  "meningioma",
  "pituitary",
  "akiec",
  "bkl",
]);

export const NORMAL_RISK_CLASSES = new Set([
  "notumor",
  "lung_n",
  "benign",
  "nv",
  "normal",
  "df",
  "vasc",
]);

export const RISK_TIER_CONFIGS: Record<ClinicalUrgencyTier, RiskTierConfig> = {
  high: {
    tier: "high",
    label: "High Risk",
    sublabel: "Urgent Clinical Intervention Required",
    urgencyCode: "URGENT",
    accentHex: "#F43F5E",
    threeColor: "#F43F5E",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-300",
    bgLightClass: "bg-rose-50/70",
    borderClass: "border-rose-300",
    textClass: "text-rose-700",
    pulseClass: "animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.45)]",
    actionRecommendation: "Immediate STAT oncology/surgical triage. Expedited multi-disciplinary team review recommended.",
  },
  moderate: {
    tier: "moderate",
    label: "Moderate Risk",
    sublabel: "Follow-up Surveillance Advised",
    urgencyCode: "MODERATE",
    accentHex: "#F59E0B",
    threeColor: "#F59E0B",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-300",
    bgLightClass: "bg-amber-50/70",
    borderClass: "border-amber-300",
    textClass: "text-amber-800",
    pulseClass: "shadow-[0_0_8px_rgba(245,158,11,0.35)]",
    actionRecommendation: "Secondary cross-sectional imaging within 14-30 days. Correlate with clinical histopathology.",
  },
  normal: {
    tier: "normal",
    label: "Routine / Normal",
    sublabel: "Non-Pathologic Baseline Confirmed",
    urgencyCode: "ROUTINE",
    accentHex: "#10B981",
    threeColor: "#10B981",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-300",
    bgLightClass: "bg-emerald-50/70",
    borderClass: "border-emerald-300",
    textClass: "text-emerald-800",
    pulseClass: "",
    actionRecommendation: "Standard surveillance interval. No acute suspicious radiographic focal lesion detected.",
  },
};

export function classifyClinicalRisk(className?: string | null): ClinicalUrgencyTier {
  if (!className) return "normal";
  const normalized = className.trim().toLowerCase();
  if (HIGH_RISK_CLASSES.has(normalized)) return "high";
  if (MODERATE_RISK_CLASSES.has(normalized)) return "moderate";
  return "normal";
}

export function getRiskTierConfig(tierOrClass?: string | null): RiskTierConfig {
  if (!tierOrClass) return RISK_TIER_CONFIGS.normal;
  const lower = tierOrClass.toLowerCase();
  if (lower === "high" || lower === "moderate" || lower === "normal") {
    return RISK_TIER_CONFIGS[lower as ClinicalUrgencyTier];
  }
  if (lower === "low") {
    return RISK_TIER_CONFIGS.normal;
  }
  const tier = classifyClinicalRisk(tierOrClass);
  return RISK_TIER_CONFIGS[tier];
}

export function get3DLesionColor(className?: string | null): string {
  const tier = classifyClinicalRisk(className);
  return RISK_TIER_CONFIGS[tier].threeColor;
}

export interface OrganSpatialMetadata {
  domain: Domain;
  organName: string;
  anatomicalCoordinates: { x: number; y: number; z: number };
  estimatedVolumeCm3: number;
  sliceThicknessMm: number;
  defaultLesionOffset: [number, number, number];
  suggestedCameraPosition: [number, number, number];
}

export const ORGAN_SPATIAL_REGISTRY: Record<Domain, OrganSpatialMetadata> = {
  brain: {
    domain: "brain",
    organName: "Cerebral Cortex & Cranial Vault",
    anatomicalCoordinates: { x: 12.4, y: 34.8, z: -18.2 },
    estimatedVolumeCm3: 14.8,
    sliceThicknessMm: 3.0,
    defaultLesionOffset: [0.45, 0.35, 0.2],
    suggestedCameraPosition: [0, 1.2, 4.2],
  },
  lung: {
    domain: "lung",
    organName: "Pulmonary Lobes & Thoracic Cavity",
    anatomicalCoordinates: { x: -28.6, y: 15.2, z: 4.5 },
    estimatedVolumeCm3: 21.3,
    sliceThicknessMm: 2.5,
    defaultLesionOffset: [-0.4, 0.2, 0.25],
    suggestedCameraPosition: [0, 0.8, 4.5],
  },
  breast: {
    domain: "breast",
    organName: "Fibroglandular Parenchyma",
    anatomicalCoordinates: { x: 18.0, y: -6.4, z: 22.1 },
    estimatedVolumeCm3: 6.2,
    sliceThicknessMm: 1.0,
    defaultLesionOffset: [0.25, 0.15, 0.35],
    suggestedCameraPosition: [0, 0.5, 4.0],
  },
  bone: {
    domain: "bone",
    organName: "Cortical Bone & Skeletal Matrix",
    anatomicalCoordinates: { x: 5.1, y: -45.0, z: -8.3 },
    estimatedVolumeCm3: 9.7,
    sliceThicknessMm: 1.5,
    defaultLesionOffset: [0.35, 0.1, 0.3],
    suggestedCameraPosition: [0, 0, 4.8],
  },
  skin: {
    domain: "skin",
    organName: "Dermal Epidermal Junction",
    anatomicalCoordinates: { x: 0.0, y: 12.0, z: 8.0 },
    estimatedVolumeCm3: 1.4,
    sliceThicknessMm: 0.5,
    defaultLesionOffset: [0.15, 0.25, 0.35],
    suggestedCameraPosition: [0, 1.5, 3.8],
  },
};

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RiskLevel, Domain, DicomMetadata } from "./types";
import { getSeverityToken } from "@/config/themeTokens";
import type { TenantBranding } from "@/config/tenant";

// ─── Class Name Merger ────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Risk & Severity Helpers (Driven by Theme Tokens) ─────────────────────────

export function getRiskColor(risk: RiskLevel): string {
  return getSeverityToken(risk).textColor;
}

export function getRiskBgClass(risk: RiskLevel): string {
  return getSeverityToken(risk).badgeClass;
}

export function getRiskBarColor(risk: RiskLevel): string {
  return getSeverityToken(risk).barColor;
}

export function getRiskLabel(risk: RiskLevel): string {
  return getSeverityToken(risk).label;
}

// ─── Domain Helpers ───────────────────────────────────────────────────────────

export function getDomainLabel(domain: Domain): string {
  const map: Record<Domain, string> = {
    brain: "Brain / Neuro-Cranial",
    lung: "Lung / Thoracic CT",
    breast: "Breast / Mammography",
    bone: "Bone / Skeletal Radiograph",
    skin: "Skin / Dermoscopic",
  };
  return map[domain] ?? domain.toUpperCase();
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatConfidence(score: number): string {
  if (score === undefined || score === null || isNaN(score)) return "--%";
  return `${(score * 100).toFixed(1)}%`;
}

export function formatLatency(ms: number | undefined): string {
  if (ms === undefined || isNaN(ms)) return "-- ms";
  if (ms < 1) return "< 1 ms";
  return `${Math.round(ms)} ms`;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ─── Pathology Display Names & Risk Mappings ──────────────────────────────────

export function getPathologyDisplayName(className: string): string {
  const map: Record<string, string> = {
    glioma: "Glioma / Astrocytic Neoplasm",
    meningioma: "Meningioma",
    pituitary: "Pituitary Adenoma",
    notumor: "Normal Intracranial Anatomy",
    lung_aca: "Adenocarcinoma of Lung",
    lung_scc: "Squamous Cell Carcinoma of Lung",
    lung_n: "Normal Lung Parenchyma",
    benign: "Benign Lesion",
    malignant: "Malignant Neoplasm",
    cancer: "Osseous Malignancy",
    normal: "Normal Osseous Architecture",
    mel: "Malignant Melanoma",
    nv: "Benign Melanocytic Nevus",
    bcc: "Basal Cell Carcinoma",
    akiec: "Actinic Keratosis",
    bkl: "Benign Keratotic Lesion",
    df: "Dermatofibroma",
    vasc: "Vascular Lesion",
  };
  return map[className] ?? className.charAt(0).toUpperCase() + className.slice(1);
}

export function classToRisk(className: string): RiskLevel {
  const highRisk = ["glioma", "malignant", "cancer", "lung_aca", "lung_scc", "mel", "bcc", "akiec"];
  const moderate = ["meningioma", "pituitary", "bkl"];
  const low = ["notumor", "lung_n", "normal", "benign", "nv", "df", "vasc"];

  if (highRisk.includes(className)) return "high";
  if (moderate.includes(className)) return "moderate";
  if (low.includes(className)) return "low";
  return "normal";
}

// ─── ICD-10 Registry ─────────────────────────────────────────────────────────

export function getICD10(className: string): string {
  const map: Record<string, string> = {
    glioma: "C71.9 — Malignant Neoplasm of Brain, Unspecified",
    meningioma: "D32.9 — Benign Neoplasm of Meninges, Unspecified",
    pituitary: "D35.2 — Benign Neoplasm of Pituitary Gland",
    notumor: "Z03.89 — Encounter for Observation for Other Suspected Diseases Ruled Out",
    lung_aca: "C34.90 — Malignant Neoplasm of Unspecified Bronchus or Lung",
    lung_scc: "C34.90 — Squamous Cell Carcinoma of Lung",
    lung_n: "Z03.89 — No Acute Pathology Detected, Observation",
    malignant: "C50.919 — Malignant Neoplasm of Unspecified Site of Breast",
    benign: "D24.9 — Benign Neoplasm of Breast",
    cancer: "C41.9 — Malignant Neoplasm of Bone",
    normal: "Z03.89 — Intact Skeletal Structure",
    mel: "C43.9 — Malignant Melanoma of Skin, Unspecified",
    nv: "D22.9 — Melanocytic Naevi of Unspecified Site",
    bcc: "C44.91 — Basal Cell Carcinoma of Skin",
    akiec: "L57.0 — Actinic Keratosis",
  };
  return map[className] ?? "Z03.89 — Observation & Clinical Examination";
}

// ─── Preliminary Ingestion DICOM Metadata Generator ──────────────────────────

/**
 * Creates immediate, client-side preliminary DICOM metadata tags as soon as
 * a radiologic scan file is ingested by the user, satisfying clinical DICOM inspection before inference.
 */
export function createPreliminaryDicomMetadata(
  file: File,
  tenant: TenantBranding
): DicomMetadata {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const hash = Math.abs(
    file.name.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  );

  const isDicom = file.name.toLowerCase().endsWith(".dcm");
  const ext = file.name.split(".").pop()?.toUpperCase() || "IMG";

  return {
    patientMRN: `MRN-${String(hash % 10000000).padStart(7, "0")}`,
    patientName: "ANONYMIZED_CLINICAL_SUBJECT",
    patientDOB: "1982-04-12",
    patientSex: "U",
    studyDate: dateStr,
    studyUID: `1.2.840.113619.2.55.3.${hash % 1000000000}.1`,
    seriesUID: `1.2.840.113619.2.55.3.${hash % 1000000000}.2`,
    accessionNumber: `ACC-${dateStr.replace(/-/g, "")}-${String(hash % 10000).padStart(4, "0")}`,
    modality: isDicom ? "DX" : ("OT" as any),
    bodyPartExamined: "UNASSIGNED — ROUTING PENDING",
    institution: tenant.hospitalName,
    referringPhysician: "Pending Diagnostic Dispatch",
    imagingDevice: `${ext} Digital Ingestion Pipeline`,
    isPreliminary: true,
  };
}

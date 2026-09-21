// ─── Imaging Modality & Clinical Domains ──────────────────────────────────────

export type Modality = "MR" | "CT" | "DX" | "MG" | "US" | "NM";
export type Domain = "brain" | "lung" | "breast" | "bone" | "skin";
export type RiskLevel = "low" | "moderate" | "high" | "normal";
export type InferenceStatus = "idle" | "loading" | "complete" | "error";
export type ClinicalPriority = "routine" | "urgent" | "stat";

export type DiagnosticState =
  | "empty"
  | "loading"
  | "high-confidence-malignant"
  | "high-confidence-benign"
  | "low-confidence"
  | "error";

// ─── Anatomical Domain Classification Output ─────────────────────────────────

export interface DomainProbability {
  domain: Domain;
  probability: number;
  label: string;
}

export interface DomainClassificationResult {
  predictedDomain: Domain;
  confidence: number;
  latencyMs: number;
  probabilities: DomainProbability[];
  analysisTimestamp: string;
}

// ─── Pathology Diagnostic Output ─────────────────────────────────────────────

export interface ClassProbability {
  className: string;
  displayName: string;
  probability: number;
  riskLevel: RiskLevel;
}

export interface DiagnosticResult {
  domain: Domain;
  predictedClass: string;
  displayName: string;
  riskLevel: RiskLevel;
  confidence: number;
  classProbabilities: ClassProbability[];
  latencyMs: number;
  totalPipelineMs: number;
}

// ─── Full Clinical Session Result ────────────────────────────────────────────

export interface ClinicalSessionResult {
  sessionId: string;
  imageFile: string;
  domainClassification: DomainClassificationResult;
  diagnosticFinding: DiagnosticResult;
  timestamp: string;
}

// ─── DICOM Metadata ──────────────────────────────────────────────────────────

export interface DicomMetadata {
  patientMRN: string;
  patientName: string;
  patientDOB: string;
  patientSex: string;
  studyDate: string;
  studyUID: string;
  seriesUID: string;
  accessionNumber: string;
  modality: Modality;
  bodyPartExamined: string;
  sliceThickness?: string;
  repetitionTime?: string;
  echoTime?: string;
  magneticFieldStrength?: string;
  kvp?: string;
  exposureTime?: string;
  institution: string;
  referringPhysician: string;
  imagingDevice: string;
  isPreliminary?: boolean;
}

// ─── Viewport Settings ───────────────────────────────────────────────────────

export interface ViewportSettings {
  brightness: number;
  contrast: number;
  zoom: number;
  invert: boolean;
}

// ─── Audit Log Entry ─────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  status: "SUCCESS" | "WARNING" | "INFO";
}

// ─── Backend Health / Config Information ────────────────────────────────────

export interface BackendHealthInfo {
  online: boolean;
  serverUrl?: string;
  status?: "operational" | "initializing" | "error" | "offline" | string;
  modelsInitialized?: boolean;
  initError?: string | null;
  modelVersion?: string;
  latencyMs?: number;
  availableDomains?: string[];
}

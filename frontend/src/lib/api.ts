import type {
  ClinicalSessionResult,
  DicomMetadata,
  Domain,
  AuditLogEntry,
  BackendHealthInfo,
} from "./types";
import { DEFAULT_TENANT, type TenantBranding } from "@/config/tenant";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface DiagnosisApiResponse {
  sessionResult: ClinicalSessionResult;
  dicomMetadata: DicomMetadata;
}

/**
 * Checks if the backend server is alive, measuring connection latency and retrieving runtime info.
 */
export async function checkBackendHealth(): Promise<BackendHealthInfo> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    const latency = Math.round(performance.now() - start);
    if (!res.ok) return { online: false, latencyMs: latency };
    const data = await res.json();
    return {
      online: true,
      serverUrl: API_BASE_URL,
      status: data.status,
      modelVersion: data.modelVersion,
      availableDomains: data.available_domains,
      latencyMs: latency,
    };
  } catch {
    return { online: false, latencyMs: Math.round(performance.now() - start) };
  }
}

/**
 * Retrieves white-label tenant metadata, regulatory disclaimers, and version info.
 */
export async function fetchTenantConfig(): Promise<TenantBranding> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return DEFAULT_TENANT;
    const data = await res.json();
    return {
      ...DEFAULT_TENANT,
      ...data,
    };
  } catch {
    return DEFAULT_TENANT;
  }
}

/**
 * Retrieves chronologically ordered compliance audit logs.
 */
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/audit-logs`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Records an audit event on the backend audit trail.
 */
export async function recordClientAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<void> {
  try {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    await fetch(`${API_BASE_URL}/api/audit-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullEntry),
    });
  } catch (err) {
    console.warn("Could not log audit event to server:", err);
  }
}

/**
 * Sends a radiologic scan to the dual-stage model pipeline.
 */
export async function runApiDiagnosis(
  imageSource: File | Blob | string,
  fileName: string = "scan.jpg",
  domainOverride?: Domain
): Promise<DiagnosisApiResponse> {
  let fileToUpload: File | Blob;

  if (typeof imageSource === "string") {
    const fetchRes = await fetch(imageSource);
    const blob = await fetchRes.blob();
    fileToUpload = new File([blob], fileName, { type: blob.type || "image/jpeg" });
  } else {
    fileToUpload = imageSource;
  }

  const formData = new FormData();
  formData.append("file", fileToUpload, fileName);
  if (domainOverride) {
    formData.append("domain_override", domainOverride);
  }

  const res = await fetch(`${API_BASE_URL}/api/diagnose`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Diagnostic API failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

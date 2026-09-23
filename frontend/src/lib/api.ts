import type {
  ClinicalSessionResult,
  DicomMetadata,
  Domain,
  AuditLogEntry,
  BackendHealthInfo,
} from "./types";
import { DEFAULT_TENANT, type TenantBranding } from "@/config/tenant";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/backend" : "https://cancer-detection-system-n1hx.onrender.com");

export interface DiagnosisApiResponse {
  sessionResult: ClinicalSessionResult;
  dicomMetadata: DicomMetadata;
}

export async function checkBackendHealth(): Promise<BackendHealthInfo> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    const latency = Math.round(performance.now() - start);

    if (!res.ok) {
      // 503 = Render hibernate-wake-error; 429 = Cloudflare rate limit cooldown
      if (res.status === 503 || res.status === 502 || res.status === 429) {
        return {
          online: true,
          status: "initializing",
          serverUrl: API_BASE_URL,
          latencyMs: latency,
          initError: "Server container is waking up from standby (Render Free Tier ~30s)...",
        };
      }
      return { online: false, latencyMs: latency, status: "offline" };
    }

    const data = await res.json();
    return {
      online: true,
      serverUrl: API_BASE_URL,
      status: data.status || (data.models_initialized ? "operational" : "initializing"),
      modelsInitialized: !!data.models_initialized,
      initError: data.init_error,
      modelVersion: data.modelVersion,
      availableDomains: data.available_domains || ["brain", "lung", "breast", "bone", "skin"],
      latencyMs: latency,
    };
  } catch {
    return { online: false, latencyMs: Math.round(performance.now() - start), status: "offline" };
  }
}

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
    let errDetail = "";
    try {
      const errJson = await res.json();
      errDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errDetail = await res.text();
    }
    throw new Error(errDetail || `Diagnostic API failed (${res.status})`);
  }

  return await res.json();
}

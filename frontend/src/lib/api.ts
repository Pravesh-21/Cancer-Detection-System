import type {
  ClinicalSessionResult,
  DicomMetadata,
  Domain,
  AuditLogEntry,
  BackendHealthInfo,
  PatientVisitRegistration,
  PatientLookupResult,
} from "./types";
import type { PatientFormData } from "@/components/workflow/PatientIntakeForm";
import { DEFAULT_TENANT, type TenantBranding } from "@/config/tenant";

// In browser, always route through same-origin reverse proxy /api/backend to prevent backend exposure
const API_BASE_URL =
  typeof window !== "undefined"
    ? "/api/backend"
    : (process.env.BACKEND_API_URL || "https://cancer-detection-system-n1hx.onrender.com");

export interface DiagnosisApiResponse {
  sessionResult: ClinicalSessionResult;
  dicomMetadata: DicomMetadata;
}

/** fetch for signed-in endpoints: an expired/revoked session sends the user back to /login. */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?expired=1&next=${next}`);
  }
  return res;
}

async function errorDetail(res: Response, fallback: string): Promise<string> {
  try {
    return (await res.json()).detail || fallback;
  } catch {
    return fallback;
  }
}

// ─── Hospital accounts ───────────────────────────────────────────────────────

export interface HospitalSession {
  user: { name: string; email: string; role: string };
  hospital: { code: string; name: string; city?: string | null };
}

export interface HospitalRegistration {
  hospitalName: string;
  city: string;
  phone: string;
  licenseNumber?: string;
  adminName: string;
  email: string;
  password: string;
  registrationCode?: string;
}

// Login/register use plain fetch: a 401 there means "wrong password", not "session expired"
async function authPost<T>(path: string, body: unknown, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Please check your connection and retry.");
  }
  if (!res.ok) throw new Error(await errorDetail(res, fallback));
  return await res.json();
}

export function loginHospitalUser(email: string, password: string): Promise<HospitalSession> {
  return authPost("/api/auth/login", { email, password }, "Sign-in failed. Please retry.");
}

export function registerHospital(data: HospitalRegistration): Promise<HospitalSession> {
  return authPost("/api/auth/register", data, "Registration failed. Please retry.");
}

export async function fetchCurrentSession(): Promise<HospitalSession | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/auth/me`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function logoutHospitalUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
  } finally {
    window.location.replace("/login");
  }
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
      if (res.status === 503 || res.status === 502 || res.status === 429) {
        return {
          online: true,
          status: "initializing",
          latencyMs: latency,
          initError: "Diagnostic models are initializing. Ready momentarily...",
        };
      }
      return { online: false, latencyMs: latency, status: "offline" };
    }

    const data = await res.json();
    return {
      online: true,
      status: data.status || (data.models_initialized ? "operational" : "initializing"),
      modelsInitialized: !!data.models_initialized,
      initError: data.init_error ? "Service initialization in progress..." : null,
      modelVersion: data.modelVersion || "v2.4.1",
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
    const res = await apiFetch(`${API_BASE_URL}/api/audit-logs`, {
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
    await apiFetch(`${API_BASE_URL}/api/audit-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullEntry),
    });
  } catch (err) {
    console.warn("Could not log audit event to server:", err);
  }
}

// ─── Patient Registry ────────────────────────────────────────────────────────

/** Opens a visit for the patient (creating them on first visit). Returns null if the registry is offline. */
export async function registerPatientVisit(data: PatientFormData): Promise<PatientVisitRegistration | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/patients/intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Finds a returning patient by MRN. Returns null if not found or the registry is offline. */
export async function lookupPatientByMrn(mrn: string): Promise<PatientLookupResult | null> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/patients/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mrn }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function signOffVisit(visitCode: string, notes: string): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE_URL}/api/visits/${encodeURIComponent(visitCode)}/signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** E-mails the signed-off report to the patient's address on record. Throws with a readable message on failure. */
export async function sendReportEmail(visitCode: string): Promise<{ sent: boolean; recipient: string }> {
  let res: Response;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/visits/${encodeURIComponent(visitCode)}/send-report`, { method: "POST" });
  } catch {
    throw new Error("Could not reach the server. Please check your connection and retry.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail || "";
    } catch {
      detail = "";
    }
    throw new Error(detail || "The report could not be sent. Please retry.");
  }
  return await res.json();
}

/** Builds a WhatsApp click-to-chat link (notification only) for the patient's number on record. */
export async function getWhatsAppLink(visitCode: string): Promise<{ url: string; recipient: string }> {
  let res: Response;
  try {
    res = await apiFetch(`${API_BASE_URL}/api/visits/${encodeURIComponent(visitCode)}/whatsapp-link`, { method: "POST" });
  } catch {
    throw new Error("Could not reach the server. Please check your connection and retry.");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail || "";
    } catch {
      detail = "";
    }
    throw new Error(detail || "Could not prepare the WhatsApp message. Please retry.");
  }
  return await res.json();
}

export async function runApiDiagnosis(
  imageSource: File | Blob | string,
  fileName: string = "scan.jpg",
  domainOverride?: Domain,
  visitCode?: string
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
  if (visitCode) {
    formData.append("visit_code", visitCode);
  }

  const res = await apiFetch(`${API_BASE_URL}/api/diagnose`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errDetail = "";
    try {
      const errJson = await res.json();
      errDetail = errJson.detail || "";
    } catch {
      errDetail = "";
    }
    // Sanitize any raw backend or container details
    if (errDetail.toLowerCase().includes("render") || errDetail.toLowerCase().includes("traceback")) {
      errDetail = "Diagnostic service is currently initializing. Please retry in a few moments.";
    }
    throw new Error(errDetail || "Diagnostic analysis could not be completed. Please retry.");
  }

  return await res.json();
}

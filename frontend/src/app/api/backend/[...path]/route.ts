import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_ISSUING_PATHS, SESSION_ENDING_PATH } from "@/lib/authCookie";

const CANDIDATES = [
  process.env.BACKEND_API_URL,
  process.env.NEXT_PUBLIC_API_URL,
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8001",
  "http://localhost:8000",
  "http://localhost:8001",
  "https://cancer-detection-system-n1hx.onrender.com",
].filter(Boolean) as string[];

const UNIQUE_CANDIDATES = Array.from(new Set(CANDIDATES));

async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathStr = path.join("/");
  const urlObj = new URL(req.url);
  const search = urlObj.search;
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;

  let body: ArrayBuffer | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.arrayBuffer();
    } catch {
      body = null;
    }
  }

  let lastStatus = 503;
  let lastErrorText = "Backend not reachable on any configured port (tried 8000, 8001, and cloud).";

  for (const base of UNIQUE_CANDIDATES) {
    const cleanBase = base.replace(/\/+$/, "");
    const targetUrl = `${cleanBase}/${pathStr}${search}`;

    try {
      const headers = new Headers();
      req.headers.forEach((val, key) => {
        const k = key.toLowerCase();
        // Browser cookies / auth headers are never forwarded; the session is re-attached below
        if (!["host", "content-length", "connection", "cookie", "authorization", "x-api-key"].includes(k)) {
          headers.set(key, val);
        }
      });
      // Server-side secret for private endpoints; never exposed to the browser
      if (process.env.PATIENT_API_KEY) {
        headers.set("x-api-key", process.env.PATIENT_API_KEY);
      }
      if (sessionToken) {
        headers.set("authorization", `Bearer ${sessionToken}`);
      }

      const res = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: body ? body : undefined,
        cache: "no-store",
        // @ts-expect-error duplex is required for streaming body in Node fetch
        duplex: "half",
      });

      const resBuffer = await res.arrayBuffer();
      const resHeaders = new Headers();
      res.headers.forEach((val, key) => {
        const k = key.toLowerCase();
        if (k !== "content-encoding" && k !== "content-length" && k !== "transfer-encoding") {
          resHeaders.set(key, val);
        }
      });

      // Login / register: move the token from the JSON body into an httpOnly cookie
      if (SESSION_ISSUING_PATHS.has(pathStr) && res.ok) {
        const { token, maxAgeSeconds, ...publicBody } = JSON.parse(new TextDecoder().decode(resBuffer));
        const out = NextResponse.json(publicBody, { status: res.status });
        out.cookies.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: maxAgeSeconds,
        });
        return out;
      }

      const out = new NextResponse(resBuffer, {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
      });
      // Logged out, or the backend rejected the session (expired / revoked): drop the cookie
      if (pathStr === SESSION_ENDING_PATH || (res.status === 401 && sessionToken)) {
        out.cookies.delete(SESSION_COOKIE);
      }
      return out;
    } catch (err) {
      lastStatus = 503;
      lastErrorText = err instanceof Error ? err.message : String(err);
      // Connection failed on this candidate -> seamlessly try the next one
      continue;
    }
  }

  return NextResponse.json(
    { detail: `Diagnostic service unavailable: ${lastErrorText}. Ensure backend is running.` },
    { status: lastStatus }
  );
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;

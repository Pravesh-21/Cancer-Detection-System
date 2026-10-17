import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/authCookie";

// Optimistic gate only: checks that a session cookie exists. The backend validates the
// session on every API call, and an invalid one clears the cookie (see api/backend route).
const PUBLIC_PAGES = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PAGES.includes(pathname);

  if (!hasSession && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only — API routes, Next.js assets and public files are excluded
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|samples|metrics|.*\\.(?:svg|png|jpg|jpeg|ico|webp)$).*)"],
};

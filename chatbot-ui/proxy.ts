import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isKnownCity } from "./lib/cities";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";
import { isLocale, LOCALE_COOKIE, pickLocale } from "./lib/i18n/config";

/** App-Bereiche, die Auth brauchen. Alles andere unter /<segment> ist die
 *  öffentliche, indexierbare Stadt-Seite (die Seite selbst macht notFound()
 *  für unbekannte Städte). */
const RESERVED_FIRST_SEGMENTS = new Set([
  "api",
  "chat",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "ping",
]);

function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt") {
    return true;
  }
  const seg = pathname.split("/").filter(Boolean);
  return seg.length >= 1 && !RESERVED_FIRST_SEGMENTS.has(seg[0]);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (isPublicMarketingPath(pathname)) {
    // Legacy-URL ohne Locale-Präfix (/berlin, /berlin/sprachen) → /<locale>/…
    const seg = pathname.split("/").filter(Boolean);
    if (seg.length >= 1 && !isLocale(seg[0]) && isKnownCity(seg[0])) {
      const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
      const locale = isLocale(cookieLocale)
        ? cookieLocale
        : pickLocale(request.headers.get("accept-language"));
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${pathname}`;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!token) {
    // Pfad UND Query-String übernehmen (nicht nur pathname) — sonst gehen
    // Query-Parameter wie der Token in Passwort-Reset-Links beim
    // Guest-Bootstrap-Redirect verloren.
    const requestUrl = new URL(request.url);
    const redirectUrl = encodeURIComponent(
      `${requestUrl.pathname}${requestUrl.search}`
    );

    return NextResponse.redirect(
      new URL(`${base}/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

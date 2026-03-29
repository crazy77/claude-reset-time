import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/getDictionary";

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") || "";
  const preferred = acceptLanguage
    .split(",")
    .map((l) => l.split(";")[0].trim().toLowerCase());
  for (const lang of preferred) {
    if (lang.startsWith("en")) return "en";
    if (lang.startsWith("ko")) return "ko";
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon\\.ico).*)"],
};

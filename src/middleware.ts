import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REFERRAL_COOKIE_KEY = "ref_code";
const REFERRAL_COOKIE_EXPIRY_DAYS = 30;

export function middleware(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");

  if (!ref) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  // Set referral cookie if missing or different
  const existing = req.cookies.get(REFERRAL_COOKIE_KEY)?.value;
  if (!existing || existing !== ref) {
    const expires = new Date();
    expires.setDate(expires.getDate() + REFERRAL_COOKIE_EXPIRY_DAYS);
    res.cookies.set(REFERRAL_COOKIE_KEY, ref, {
      expires,
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Fire-and-forget tracking so redirects don't drop the click
  void fetch(new URL("/api/referral/track", req.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      referralCode: ref,
      userAgent: req.headers.get("user-agent") ?? undefined,
      referer: req.headers.get("referer") ?? undefined,
    }),
  }).catch(() => {});

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|monitoring|sitemap.xml|robots.txt).*)",
  ],
};

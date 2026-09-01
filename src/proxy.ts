import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Gates the main app only. Tournament pod join links (/t/[token]), the
// tournament round's Live Results (/tournament/[id]/live), and the TV/
// kiosk board (/live) stay open on purpose — they're already gated by
// possessing an unguessable link, and requiring a Google sign-in there
// would break the whole point of those (a friend joining from their own
// phone with zero setup, a TV that just displays with nobody signed in).
export default auth((req) => {
  // Escape hatch: if the login gate ever locks everyone out (a data
  // mismatch, a broken Google OAuth config, etc.), set AUTH_DISABLED=true
  // in Vercel's env vars to restore the pre-login behavior immediately,
  // no code change or redeploy of app code needed.
  if (process.env.AUTH_DISABLED === "true") {
    return NextResponse.next();
  }
  if (!req.auth) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Static files (public/ assets: images, manifest, fonts, etc.) are
    // excluded by extension — without this, an unauthenticated request
    // for e.g. /mtg-logo.png gets redirected to /signin instead of
    // served, which silently breaks the image rather than erroring
    // loudly (a well-known proxy/middleware gotcha).
    "/((?!api|_next/static|_next/image|favicon\\.ico|signin(?:/|$)|t(?:/|$)|tournament(?:/|$)|live(?:/|$)|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest|css|js|txt|xml|json|woff2?|ttf|map)$).*)",
  ],
};

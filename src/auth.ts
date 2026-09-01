import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { players } from "@/db/schema";

// "No expiry until manual sign-out" (per the user's explicit choice) isn't
// literally supported by JWT sessions, so this is the practical stand-in —
// long enough that it never expires in normal use, short of someone
// tapping Sign Out.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Passed explicitly rather than relying on Auth.js's env-var
  // auto-inference (AUTH_SECRET/AUTH_GOOGLE_ID/etc.) — that inference
  // wasn't picking up AUTH_SECRET reliably in this setup (confirmed via
  // a MissingSecret error in production logs despite the var being set),
  // so every value here is read from process.env explicitly instead.
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    // The allowlist: reuses players.email (already collected for daily
    // recap emails) instead of a separate list to maintain — add/remove
    // someone as a player and their login access changes with it.
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.trim().toLowerCase();
      const allPlayers = await db.select().from(players);
      return allPlayers.some((p) => p.email?.trim().toLowerCase() === email);
    },
  },
});

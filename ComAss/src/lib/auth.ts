import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextAuthOptions } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { isGoogleConfigured } from "./config";

/**
 * Central auth configuration.
 *
 * Security model:
 * - The Google access/refresh tokens live ONLY inside NextAuth's encrypted,
 *   httpOnly JWT cookie. They are never copied into the client-visible session.
 * - Server code (API routes) that needs to call Gmail obtains a token through
 *   `getGmailAccessToken()` below and must never return it in a response.
 */

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
// Refresh slightly early so a token doesn't expire mid-request.
const REFRESH_MARGIN_MS = 60_000;

// Placeholder/missing credentials => demo mode: no provider is registered.
const configured = isGoogleConfigured();
const clientId = configured ? process.env.GOOGLE_CLIENT_ID : undefined;
const clientSecret = configured ? process.env.GOOGLE_CLIENT_SECRET : undefined;

if (!configured) {
  console.warn(
    "[auth] Google OAuth is not configured (missing or placeholder values in .env.local). " +
      "Running in demo mode: Google sign-in and real email sending are disabled."
  );
}

/** Optional comma-separated allowlist (ALLOWED_EMAILS). Unset = any Google account. */
function getAllowedEmails(): string[] | null {
  const raw = process.env.ALLOWED_EMAILS;
  if (!raw) return null;
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

export async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken || !clientId || !clientSecret) {
    return { ...token, error: "RefreshAccessTokenError" };
  }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      // Log status only — never the response body or any token material.
      console.error(`[auth] Google token refresh failed (HTTP ${res.status}).`);
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      // Google usually omits a new refresh token; keep the existing one.
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    console.error("[auth] Google token refresh request errored.");
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: configured
    ? [
        GoogleProvider({
          clientId: clientId as string,
          clientSecret: clientSecret as string,
          authorization: {
            params: {
              prompt: "consent", // ensures Google returns a refresh token
              access_type: "offline",
              response_type: "code",
              scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
            },
          },
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  // Use our own login page (also receives ?error=... from failed/denied sign-ins).
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, profile }) {
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (emailVerified === false) return false;

      const allowed = getAllowedEmails();
      if (allowed) {
        const email = user.email?.toLowerCase();
        if (!email || !allowed.includes(email)) return false;
      }
      return true;
    },

    async jwt({ token, account }) {
      // Initial sign-in: capture tokens into the (encrypted, httpOnly) JWT cookie.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
          error: undefined,
        };
      }

      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - REFRESH_MARGIN_MS) {
        return token;
      }
      return refreshGoogleAccessToken(token);
    },

    async session({ session, token }) {
      // Deliberately NOT exposing accessToken/refreshToken to the browser.
      // `error` lets the UI prompt the user to reconnect Gmail.
      session.error = token.error;
      return session;
    },
  },
};

// ---------------------------------------------------------------------------
// Server-side helpers for API route handlers
// ---------------------------------------------------------------------------

type AuthResult = { token: JWT } | { response: NextResponse };

/**
 * Use at the top of every API route handler:
 *
 *   const auth = await requireAuth(req);
 *   if ("response" in auth) return auth.response;
 *
 * The proxy also blocks unauthenticated requests, but that is only an
 * optimistic check — route handlers must enforce auth themselves.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const token = await getToken({ req });
  if (!token) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { token };
}

/**
 * Returns a valid Gmail access token for server-side use only, refreshing it
 * if expired. Returns null if the user must reconnect Gmail.
 */
export async function getGmailAccessToken(token: JWT): Promise<string | null> {
  let current = token;
  if (!current.accessTokenExpires || Date.now() >= current.accessTokenExpires - REFRESH_MARGIN_MS) {
    current = await refreshGoogleAccessToken(current);
  }
  if (current.error || !current.accessToken) return null;
  return current.accessToken;
}

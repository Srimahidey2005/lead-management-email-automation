/**
 * Runtime configuration helpers (server-side).
 *
 * "Demo mode" is active whenever Google OAuth is not properly configured
 * (missing values, or the placeholder values from .env.example). In demo mode
 * the app uses labelled sample data and NEVER sends real email.
 */

type Env = Record<string, string | undefined>;

// Values that look like placeholders rather than real credentials.
const PLACEHOLDER = /^(mock|your[_-]|change[_-]?me|example|placeholder|generate|replace|todo|xxx)/i;

function isRealValue(value: string | undefined): value is string {
  const v = value?.trim();
  return Boolean(v) && !PLACEHOLDER.test(v as string);
}

export function isGoogleConfigured(env: Env = process.env): boolean {
  const secret = env.NEXTAUTH_SECRET;
  return (
    isRealValue(env.GOOGLE_CLIENT_ID) &&
    isRealValue(env.GOOGLE_CLIENT_SECRET) &&
    isRealValue(secret) &&
    secret.trim().length >= 16
  );
}

export function isDemoMode(env: Env = process.env): boolean {
  return !isGoogleConfigured(env);
}

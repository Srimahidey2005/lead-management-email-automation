/**
 * Only allow same-site relative paths as post-login redirect targets.
 * Rejects absolute URLs, protocol-relative ("//evil.com") and backslash tricks
 * to prevent open redirects, and never redirects back into /login (loop).
 */
export function safeCallbackUrl(value: string | null | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (/[\r\n]/.test(value)) return "/";
  if (value === "/login" || value.startsWith("/login/") || value.startsWith("/login?")) return "/";
  return value;
}

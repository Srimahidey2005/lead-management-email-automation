"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { AlertCircle, CheckCircle2, Key } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "This Google account isn't allowed to access this app.",
  Configuration: "Sign-in isn't configured correctly on the server.",
  OAuthSignin: "Google sign-in failed. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthCreateAccount: "Google sign-in failed. Please try again.",
  Callback: "Google sign-in failed. Please try again.",
  SessionRequired: "Please sign in to continue.",
};
const DEFAULT_ERROR = "Something went wrong while signing in. Please try again.";

interface LoginFormProps {
  callbackUrl: string;
  error?: string;
  configured: boolean;
}

export function LoginForm({ callbackUrl, error, configured }: LoginFormProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const sessionExpired = session?.error === "RefreshAccessTokenError";
  const errorMessage = startError ?? (error ? ERROR_MESSAGES[error] ?? DEFAULT_ERROR : null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setStartError(null);
    try {
      // Redirects the browser to Google; only returns if the redirect didn't happen.
      await signIn("google", { callbackUrl });
    } catch {
      setStartError("Could not start Google sign-in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wider text-slate-900">
            LEAD<span className="text-blue-500">MGR</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Lead Management &amp; Email Automation</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
            <h2 className="font-medium text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" />
              Sign in
            </h2>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-500">
              Sign in with your Google account to manage leads and send campaigns from your Gmail.
              We use official Google OAuth 2.0, so we never see or store your password.
            </p>

            {errorMessage && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
                <p>{errorMessage}</p>
              </div>
            )}

            {sessionExpired && (
              <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <p>Your Gmail connection expired. Sign in again to reconnect.</p>
              </div>
            )}

            {!configured && (
              <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <p>
                  Google sign-in isn&apos;t configured, so the app runs in <strong>demo mode</strong> with sample data and no real email
                  sending. See the README to enable Gmail.
                </p>
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={isLoading || !configured}
              className="w-full px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Key className="w-4 h-4" />
              )}
              {isLoading ? "Redirecting to Google..." : "Sign in with Google"}
            </button>

            {!configured && (
              <Link
                href="/"
                className="w-full px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-medium text-sm transition-colors flex items-center justify-center"
              >
                Continue in Demo Mode
              </Link>
            )}

            <ul className="text-sm text-slate-600 space-y-1 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure OAuth 2.0 flow</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Granular send-only permissions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

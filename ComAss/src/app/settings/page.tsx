"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Mail, CheckCircle2, AlertCircle, AlertTriangle, Key } from "lucide-react";
import { useApp } from "@/components/layout/Providers";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { demoMode } = useApp();
  const isLoading = status === "loading";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Settings &amp; Integrations</h2>
        <p className="text-slate-500 text-sm">Manage your connected accounts and application preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <h3 className="font-medium text-slate-800 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />
            Gmail Integration (OAuth 2.0)
          </h3>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse flex gap-4 items-center">
              <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-3 bg-slate-200 rounded w-48"></div>
              </div>
            </div>
          ) : demoMode ? (
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="mt-1 p-2 bg-amber-100 rounded-lg text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-slate-800 mb-1">Demo mode</p>
                <p className="text-sm text-slate-500 mb-3">
                  Google OAuth isn&apos;t configured, so this app runs with sample data and does not send real emails. To enable Gmail:
                </p>
                <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside mb-4">
                  <li>Create OAuth credentials in Google Cloud Console (Gmail API enabled).</li>
                  <li>Copy <code className="bg-slate-100 px-1 rounded">.env.example</code> to <code className="bg-slate-100 px-1 rounded">.env.local</code> and fill in the values.</li>
                  <li>Restart the dev server.</li>
                </ol>
                <button
                  disabled
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-md font-medium text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
                >
                  <Key className="w-4 h-4" />
                  Connect Gmail (unavailable in demo mode)
                </button>
              </div>
            </div>
          ) : session ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full border-2 border-emerald-100" />
                ) : (
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 text-lg">{session.user?.name}</p>
                  <p className="text-slate-500 text-sm">{session.user?.email}</p>
                  {session.error && (
                    <p className="text-amber-700 text-sm mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Connection expired.{" "}
                      <button onClick={() => signIn('google')} className="underline font-medium">Reconnect Gmail</button>
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md font-medium text-sm transition-colors"
              >
                Disconnect Account
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-start gap-4 max-w-lg">
                <div className="mt-1 p-2 bg-slate-100 rounded-lg text-slate-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 mb-1">Not Connected</p>
                  <p className="text-sm text-slate-500 mb-3">
                    Connect your Gmail account to send presentations directly from this dashboard. We use official Google OAuth 2.0, meaning we never see or store your password.
                  </p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure OAuth 2.0 flow</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Granular send-only permissions</li>
                  </ul>
                </div>
              </div>
              <button 
                onClick={() => signIn('google')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <Key className="w-4 h-4" />
                Connect Gmail
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

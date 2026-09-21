"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useApp } from '@/components/layout/Providers';
import { Send, FileText, AlertTriangle, CheckCircle2, UserCheck, Paperclip, AlertCircle } from 'lucide-react';
import {
  MAX_RECIPIENTS,
  composeSchema,
  getSendableLeads,
  validateAttachment,
} from '@/lib/campaign';
import type { SendResponse } from '@/lib/campaign';
import { DEFAULT_BODY, DEFAULT_SUBJECT } from '@/lib/templates';
import { newId } from '@/lib/id';

type Result =
  | { kind: 'demo'; recipients: number }
  | { kind: 'sent' | 'partial' | 'failed'; response: SendResponse }
  | { kind: 'error'; message: string; reconnect?: boolean };

export default function CampaignsPage() {
  const { data: session } = useSession();
  const { leads, demoMode, draft, setDraft, recordCampaign } = useApp();

  const recipients = useMemo(() => getSendableLeads(leads), [leads]);

  // A template picked on the Templates page pre-fills the composer.
  const [subject, setSubject] = useState(() => draft?.subject ?? DEFAULT_SUBJECT);
  const [message, setMessage] = useState(() => draft?.body ?? DEFAULT_BODY);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  // The draft has been applied; clear it so it doesn't reappear on the next visit.
  useEffect(() => {
    if (draft) setDraft(null);
  }, [draft, setDraft]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!selected) return;
    const problem = validateAttachment(selected);
    setFileError(problem);
    if (!problem) setFile(selected);
  };

  const handleSend = async () => {
    setResult(null);

    const errors: string[] = [];
    const parsed = composeSchema.safeParse({ subject, body: message });
    if (!parsed.success) errors.push(...parsed.error.issues.map((i) => i.message));
    if (recipients.length === 0) errors.push('No eligible recipients. Mark leads as Eligible on the Leads page first.');
    if (recipients.length > MAX_RECIPIENTS) {
      errors.push(`A campaign can have at most ${MAX_RECIPIENTS} recipients (you have ${recipients.length}). Mark fewer leads as Eligible and send in batches.`);
    }
    setFormErrors(errors);
    if (errors.length > 0) return;

    const base = {
      id: newId(),
      subject: subject.trim(),
      createdAt: new Date().toISOString(),
      recipients: recipients.length,
      attachmentName: file?.name,
    };

    // Demo mode: nothing is sent, and the UI says so plainly.
    if (demoMode) {
      recordCampaign({ ...base, sent: 0, failed: 0, status: 'Demo', demo: true }, []);
      setResult({ kind: 'demo', recipients: recipients.length });
      return;
    }

    if (!session) {
      setResult({ kind: 'error', message: 'Gmail is not connected. Sign in again to send emails.', reconnect: true });
      return;
    }

    if (!window.confirm(`Send this email to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'} from your Gmail account?`)) {
      return;
    }

    setIsSending(true);
    try {
      const form = new FormData();
      form.append(
        'payload',
        JSON.stringify({
          subject,
          body: message,
          recipients: recipients.map(({ email, name, company }) => ({ email, name, company })),
        })
      );
      if (file) form.append('attachment', file);

      const res = await fetch('/api/campaigns/send', { method: 'POST', body: form });
      const data = (await res.json().catch(() => null)) as (SendResponse & { error?: string; reconnectRequired?: boolean }) | null;

      if (!res.ok || !data || !Array.isArray(data.results)) {
        setResult({
          kind: 'error',
          message: data?.error ?? `The request failed (HTTP ${res.status}).`,
          reconnect: res.status === 401 || Boolean(data?.reconnectRequired),
        });
        return;
      }

      const sentEmails = new Set(data.results.filter((r) => r.status === 'sent').map((r) => r.email.toLowerCase()));
      const sentIds = recipients.filter((l) => sentEmails.has(l.email.toLowerCase())).map((l) => l.id);
      const kind = data.sent === 0 ? 'failed' : data.failed + data.skipped > 0 ? 'partial' : 'sent';

      recordCampaign(
        {
          ...base,
          sent: data.sent,
          failed: data.failed + data.skipped,
          status: kind === 'sent' ? 'Sent' : kind === 'partial' ? 'Partial' : 'Failed',
          demo: false,
        },
        sentIds
      );
      setResult({ kind, response: data });
    } catch {
      setResult({ kind: 'error', message: 'Could not reach the server. Check your connection and try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const failures = result && 'response' in result ? result.response.results.filter((r) => r.status !== 'sent') : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">New Email Campaign</h2>
        <p className="text-slate-500 text-sm">Compose and send your singing bowl presentation to eligible leads.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Composer Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 space-y-4">
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input 
                  id="subject"
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Email subject..."
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                <textarea 
                  id="message"
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none font-sans"
                  placeholder="Write your email here..."
                ></textarea>
                <p className="text-xs text-slate-500 mt-1">
                  Tip: use {'{{name}}'}, {'{{firstName}}'} and {'{{company}}'} to personalize each email.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Presentation Attachment</label>
                <div className="border border-slate-300 rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {file ? file.name : 'No file attached'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF or PowerPoint, max 10 MB (optional)'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {file && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); setFileError(null); }}
                        className="text-slate-500 hover:text-red-600 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                    <input 
                      type="file" 
                      id="presentation-upload" 
                      className="hidden" 
                      accept=".pdf,.ppt,.pptx"
                      onChange={handleFileChange}
                    />
                    <label 
                      htmlFor="presentation-upload"
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Paperclip className="w-4 h-4" /> {file ? 'Change File' : 'Choose File'}
                    </label>
                  </div>
                </div>
                {fileError && <p role="alert" className="text-sm text-red-600 mt-2">{fileError}</p>}
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="text-sm text-slate-500">
                {demoMode ? (
                  <span className="text-amber-600 font-medium">Demo mode: emails will not be sent</span>
                ) : !session ? (
                  <span className="text-red-500 font-medium">Gmail not connected</span>
                ) : null}
              </div>
              <button 
                onClick={handleSend}
                disabled={isSending || recipients.length === 0 || (!demoMode && !session)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSending ? 'Sending...' : demoMode ? 'Send Campaign (Demo)' : 'Send Campaign'}
              </button>
            </div>
          </div>

          {formErrors.length > 0 && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <ul className="space-y-1">
                {formErrors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}

          {result?.kind === 'demo' && (
            <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-medium">Demo run complete: no emails were sent</p>
                <p className="text-sm opacity-90 mt-1">
                  Validated the campaign for {result.recipients} eligible recipient{result.recipients === 1 ? '' : 's'}. Configure Google OAuth in <Link href="/settings" className="underline font-medium">Settings</Link> to send real emails.
                </p>
              </div>
            </div>
          )}

          {result && 'response' in result && (
            <div
              role="status"
              className={`p-4 rounded-lg flex items-start gap-3 border ${result.kind === 'sent' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : result.kind === 'partial' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}
            >
              {result.kind === 'sent' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {result.kind === 'sent' && `Campaign sent: ${result.response.sent} email${result.response.sent === 1 ? '' : 's'} delivered to Gmail`}
                  {result.kind === 'partial' && `Campaign partially sent: ${result.response.sent} sent, ${result.response.failed + result.response.skipped} not sent`}
                  {result.kind === 'failed' && 'Campaign failed: no emails were sent'}
                </p>
                {failures.length > 0 && (
                  <ul className="text-sm mt-2 space-y-1 break-words">
                    {failures.slice(0, 10).map((f) => (
                      <li key={f.email}>{f.email}: {f.error ?? f.status}</li>
                    ))}
                    {failures.length > 10 && <li>…and {failures.length - 10} more</li>}
                  </ul>
                )}
                {result.response.reconnectRequired && (
                  <p className="text-sm mt-2">Your Gmail connection expired. <Link href="/login" className="underline font-medium">Sign in again</Link> and retry.</p>
                )}
              </div>
            </div>
          )}

          {result?.kind === 'error' && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <p>
                {result.message}
                {result.reconnect && <> <Link href="/login" className="underline font-medium">Sign in again</Link>.</>}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              Recipient Targeting
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 text-sm">Total Leads</span>
                <span className="font-medium text-slate-900">{leads.length}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-slate-600 text-sm">Eligible for Outreach</span>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {recipients.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Ineligible / Pending</span>
                <span className="text-slate-500 font-medium">
                  {leads.length - recipients.length}
                </span>
              </div>
            </div>

            {recipients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Recipients (max {MAX_RECIPIENTS} per campaign)</p>
                <ul className="text-xs text-slate-600 space-y-1 break-words">
                  {recipients.slice(0, 5).map((l) => <li key={l.id}>{l.email}</li>)}
                  {recipients.length > 5 && <li className="text-slate-400">+ {recipients.length - 5} more</li>}
                </ul>
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-blue-600" />
              <p>For your safety and anti-spam compliance, emails will <strong>only</strong> be sent to contacts marked as &quot;Eligible&quot;.</p>
            </div>

            {recipients.length === 0 && (
              <p className="mt-4 text-xs text-slate-500">
                No eligible leads yet. <Link href="/leads" className="text-indigo-600 font-medium hover:text-indigo-800">Mark leads as Eligible</Link> to enable sending.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

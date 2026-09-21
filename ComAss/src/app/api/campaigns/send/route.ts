import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getGmailAccessToken, requireAuth } from '@/lib/auth';
import { isDemoMode } from '@/lib/config';
import {
  ATTACHMENT_TYPES,
  attachmentExtension,
  matchesAttachmentSignature,
  sendPayloadSchema,
  validateAttachment,
} from '@/lib/campaign';
import type { RecipientResult, SendResponse } from '@/lib/campaign';
import { buildMimeMessage, toBase64Url } from '@/lib/gmail';
import type { MimeAttachment } from '@/lib/gmail';
import { renderTemplate } from '@/lib/templates';

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const PAUSE_BETWEEN_SENDS_MS = 100;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * POST /api/campaigns/send  (multipart/form-data)
 *   payload:    JSON string { subject, body, recipients: [{ email, name?, company? }] }
 *   attachment: optional PDF / PowerPoint file
 *
 * Sends one real email per recipient through the Gmail API using the signed-in
 * user's OAuth token (kept server-side). Never reports a send that Gmail did
 * not accept, and never returns any token.
 */
export async function POST(req: NextRequest) {
  if (isDemoMode()) {
    return reply(
      { error: 'Gmail is not configured, so the app is in demo mode and cannot send email.' },
      503
    );
  }

  const auth = await requireAuth(req);
  if ('response' in auth) return auth.response;

  const accessToken = await getGmailAccessToken(auth.token);
  if (!accessToken) {
    return reply({ error: 'Your Gmail connection has expired. Please sign in again.', reconnectRequired: true }, 401);
  }

  // ---- Parse + validate input ------------------------------------------------
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reply({ error: 'Invalid request body.' }, 400);
  }

  const rawPayload = form.get('payload');
  if (typeof rawPayload !== 'string') return reply({ error: 'Missing campaign data.' }, 400);

  let json: unknown;
  try {
    json = JSON.parse(rawPayload);
  } catch {
    return reply({ error: 'Campaign data is not valid JSON.' }, 400);
  }

  const parsed = sendPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return reply({ error: parsed.error.issues[0]?.message ?? 'Invalid campaign data.' }, 400);
  }
  const { subject, body } = parsed.data;

  // De-duplicate recipients by email.
  const seen = new Set<string>();
  const recipients = parsed.data.recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let attachment: MimeAttachment | undefined;
  const file = form.get('attachment');
  if (file && typeof file !== 'string' && file.size > 0) {
    const problem = validateAttachment(file);
    if (problem) return reply({ error: problem }, 400);

    const ext = attachmentExtension(file.name) as string;
    const data = Buffer.from(await file.arrayBuffer());
    if (!matchesAttachmentSignature(ext, data)) {
      return reply({ error: `The attachment doesn't look like a valid .${ext} file.` }, 400);
    }
    attachment = { filename: file.name, contentType: ATTACHMENT_TYPES[ext], data };
  }

  // ---- Send one message per recipient ---------------------------------------
  const results: RecipientResult[] = [];
  let stopReason: string | null = null;
  let reconnectRequired = false;

  for (const r of recipients) {
    if (stopReason) {
      results.push({ email: r.email, status: 'skipped', error: stopReason });
      continue;
    }

    try {
      const raw = toBase64Url(
        buildMimeMessage({
          to: r.email,
          subject: renderTemplate(subject, r),
          body: renderTemplate(body, r),
          attachment,
        })
      );

      const res = await fetch(GMAIL_SEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
        cache: 'no-store',
      });

      if (res.ok) {
        results.push({ email: r.email, status: 'sent' });
        await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_SENDS_MS));
        continue;
      }

      const info = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      const message = (info?.error?.message ?? `Gmail API error (${res.status})`).slice(0, 200);
      console.error(`[campaign] Gmail API rejected a message (HTTP ${res.status}).`);
      results.push({ email: r.email, status: 'failed', error: message });

      // Auth, permission and rate-limit errors affect every message: stop here.
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        reconnectRequired = res.status === 401;
        stopReason = 'Not attempted: sending stopped after a Gmail error.';
      }
    } catch {
      console.error('[campaign] Gmail request failed before a response was received.');
      results.push({ email: r.email, status: 'failed', error: 'Could not reach the Gmail API.' });
    }
  }

  const response: SendResponse = {
    sent: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
    ...(reconnectRequired ? { reconnectRequired: true } : {}),
  };
  return reply(response);
}

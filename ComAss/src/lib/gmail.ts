import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

/**
 * Minimal RFC 5322 / MIME builder for the Gmail API (users.messages.send).
 * Server-side only. Header values are stripped of CR/LF to prevent header injection.
 */

export interface MimeAttachment {
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface MimeInput {
  to: string;
  subject: string;
  body: string;
  attachment?: MimeAttachment;
}

const CRLF = '\r\n';

export function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n\u0000]+/g, ' ').trim();
}

/** RFC 2047 encoded-word for non-ASCII header values (kept under 75 chars per word). */
export function encodeHeaderValue(value: string): string {
  const v = sanitizeHeader(value);
  if (/^[\x20-\x7E]*$/.test(v)) return v;

  const words: string[] = [];
  let chunk = '';
  for (const ch of v) {
    if (Buffer.byteLength(chunk + ch, 'utf8') > 42) {
      words.push(chunk);
      chunk = '';
    }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w, 'utf8').toString('base64')}?=`).join(`${CRLF} `);
}

function wrapBase64(b64: string): string {
  return b64.match(/.{1,76}/g)?.join(CRLF) ?? '';
}

function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'attachment';
  const cleaned = base.replace(/[\u0000-\u001F\u007F"]/g, '').trim();
  return cleaned || 'attachment';
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/[\\"]/g, '_');
  let out = `attachment; filename="${ascii}"`;
  if (ascii !== filename) out += `; filename*=UTF-8''${encodeURIComponent(filename)}`;
  return out;
}

export function buildMimeMessage(input: MimeInput): string {
  const to = sanitizeHeader(input.to);
  if (!/^[^\s@<>",;]+@[^\s@<>",;]+$/.test(to)) throw new Error('Invalid recipient address');

  const bodyB64 = wrapBase64(Buffer.from(input.body.replace(/\r?\n/g, CRLF), 'utf8').toString('base64'));
  const headers = [
    `To: ${to}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    'MIME-Version: 1.0',
  ];

  if (!input.attachment) {
    return [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      bodyB64,
    ].join(CRLF);
  }

  const boundary = `----=_Part_${randomUUID()}`;
  const filename = safeFilename(input.attachment.filename);
  const attachB64 = wrapBase64(input.attachment.data.toString('base64'));

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    bodyB64,
    `--${boundary}`,
    `Content-Type: ${input.attachment.contentType}; name="${filename.replace(/[^\x20-\x7E]/g, '_')}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: ${contentDisposition(filename)}`,
    '',
    attachB64,
    `--${boundary}--`,
    '',
  ].join(CRLF);
}

export function toBase64Url(message: string): string {
  return Buffer.from(message, 'utf8').toString('base64url');
}

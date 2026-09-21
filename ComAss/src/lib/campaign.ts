import { z } from 'zod';
import type { Lead } from '@/types';

export const MAX_RECIPIENTS = 100;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed presentation types, keyed by file extension. */
export const ATTACHMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const noLineBreaks = (s: string) => !/[\r\n\u0000]/.test(s);

export const composeSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long (max 200 characters)')
    .refine(noLineBreaks, 'Subject cannot contain line breaks'),
  body: z
    .string()
    .trim()
    .min(1, 'Message body is required')
    .max(20000, 'Message is too long (max 20,000 characters)'),
});

export const recipientSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .refine(noLineBreaks, 'Invalid email address')
    .pipe(z.email('Invalid email address')),
  name: z.string().max(200).optional().default(''),
  company: z.string().max(200).optional().default(''),
});

export const sendPayloadSchema = composeSchema.extend({
  recipients: z
    .array(recipientSchema)
    .min(1, 'No eligible recipients')
    .max(MAX_RECIPIENTS, `A campaign can have at most ${MAX_RECIPIENTS} recipients`),
});

export type SendPayload = z.infer<typeof sendPayloadSchema>;

export type RecipientResult = {
  email: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
};

export type SendResponse = {
  sent: number;
  failed: number;
  skipped: number;
  results: RecipientResult[];
  reconnectRequired?: boolean;
};

export function attachmentExtension(filename: string): string | null {
  const m = /\.([A-Za-z0-9]+)$/.exec(filename);
  const ext = m?.[1].toLowerCase();
  return ext && ext in ATTACHMENT_TYPES ? ext : null;
}

/** Returns an error message, or null if the attachment is acceptable. */
export function validateAttachment(file: { name: string; size: number }): string | null {
  if (!attachmentExtension(file.name)) return 'Attachment must be a PDF or PowerPoint file (.pdf, .ppt, .pptx).';
  if (file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `Attachment is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The maximum is ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/** Checks the file's leading bytes match its extension (defence against mislabelled files). */
export function matchesAttachmentSignature(ext: string, data: Uint8Array): boolean {
  const startsWith = (sig: number[]) => sig.every((b, i) => data[i] === b);
  switch (ext) {
    case 'pdf': {
      // "%PDF" may be preceded by a few junk bytes; the spec allows it within the first 1024 bytes.
      const head = data.subarray(0, 1024);
      for (let i = 0; i + 3 < head.length; i++) {
        if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46) return true;
      }
      return false;
    }
    case 'pptx':
      return startsWith([0x50, 0x4b]); // ZIP container ("PK")
    case 'ppt':
      return startsWith([0xd0, 0xcf, 0x11, 0xe0]); // OLE2 compound file
    default:
      return false;
  }
}

/** Leads that may be emailed: eligible, not invalid / do-not-contact. */
export function getSendableLeads(leads: Lead[]): Lead[] {
  return leads.filter(
    (l) => l.eligibility === 'Eligible' && l.status !== 'Invalid' && l.status !== 'Do Not Contact'
  );
}

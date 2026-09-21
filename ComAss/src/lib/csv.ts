import { z } from 'zod';
import type { Lead } from '@/types';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMPORT_ROWS = 5000;

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/**
 * Escapes one CSV cell. Cells that start with =, +, -, @, tab or CR are
 * prefixed with a single quote so spreadsheet apps don't execute them as
 * formulas (CSV injection).
 */
export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = ['Name', 'Email', 'Company', 'Source', 'Status', 'Eligibility', 'Created At', 'Notes'];
  const rows = leads.map((l) =>
    [l.name, l.email, l.company, l.source, l.status, l.eligibility, l.createdAt, l.notes ?? '']
      .map(escapeCsvCell)
      .join(',')
  );
  return [header.join(','), ...rows].join('\r\n');
}

/* ------------------------------------------------------------------ */
/* Import validation                                                   */
/* ------------------------------------------------------------------ */

export interface NewLeadInput {
  name: string;
  email: string;
  company: string;
  source: string;
}

export interface ImportInvalidRow {
  row: number;
  reason: string;
  data: Record<string, unknown>;
}

export interface ImportDuplicateRow {
  row: number;
  email: string;
  reason: string;
}

export interface ImportResult {
  valid: NewLeadInput[];
  invalid: ImportInvalidRow[];
  duplicates: ImportDuplicateRow[];
  /** Set when the file as a whole can't be imported (e.g. missing columns). */
  fatalError?: string;
}

const HEADER_ALIASES: Record<string, keyof NewLeadInput> = {
  name: 'name',
  fullname: 'name',
  contactname: 'name',
  email: 'email',
  emailaddress: 'email',
  mail: 'email',
  company: 'company',
  organization: 'company',
  organisation: 'company',
  source: 'source',
  leadsource: 'source',
};

/** "E-mail", "  Email Address " and "\uFEFFemail" all normalise to a known key. */
function canonicalHeader(header: string): keyof NewLeadInput | undefined {
  return HEADER_ALIASES[header.replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z]/g, '')];
}

// Strip control characters and collapse whitespace.
const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();

const optionalText = (label: string, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => clean(v ?? ''))
    .pipe(z.string().max(max, `${label} is too long (max ${max} characters)`));

export const importRowSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .transform(clean)
    .pipe(z.string().min(1, 'Name is required').max(200, 'Name is too long (max 200 characters)')),
  email: z
    .string({ error: 'Email is required' })
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.string().min(1, 'Email is required').max(254, 'Email is too long'))
    .pipe(z.email('Invalid email address')),
  company: optionalText('Company', 200),
  source: optionalText('Source', 100),
});

function canonicalizeRow(row: Record<string, unknown>): Partial<Record<keyof NewLeadInput, string>> {
  const out: Partial<Record<keyof NewLeadInput, string>> = {};
  for (const [key, value] of Object.entries(row)) {
    const canon = canonicalHeader(key);
    if (!canon || typeof value !== 'string') continue;
    // First non-empty value wins if a header is repeated/aliased.
    if (out[canon] === undefined || out[canon] === '') out[canon] = value;
  }
  return out;
}

export function validateImportRows(
  rows: Record<string, unknown>[],
  headers: string[],
  existingEmails: Iterable<string>
): ImportResult {
  const result: ImportResult = { valid: [], invalid: [], duplicates: [] };

  const found = new Set(headers.map(canonicalHeader).filter(Boolean));
  const missing = (['name', 'email'] as const).filter((h) => !found.has(h));
  if (missing.length > 0) {
    result.fatalError = `Missing required column${missing.length > 1 ? 's' : ''}: ${missing
      .map((m) => (m === 'name' ? 'Name' : 'Email'))
      .join(', ')}. Add a header row with these column names.`;
    return result;
  }
  if (rows.length === 0) {
    result.fatalError = 'The file has a header but no data rows.';
    return result;
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    result.fatalError = `Too many rows (${rows.length}). The maximum is ${MAX_IMPORT_ROWS} per import.`;
    return result;
  }

  const existing = new Set<string>();
  for (const e of existingEmails) existing.add(e.trim().toLowerCase());
  const seenInFile = new Map<string, number>(); // email -> first row number

  rows.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1
    const parsed = importRowSchema.safeParse(canonicalizeRow(raw));

    if (!parsed.success) {
      result.invalid.push({
        row: rowNumber,
        reason: parsed.error.issues.map((i) => i.message).join(', '),
        data: raw,
      });
      return;
    }

    const { name, email, company, source } = parsed.data;

    if (existing.has(email)) {
      result.duplicates.push({ row: rowNumber, email, reason: 'Duplicate: already in your leads' });
      return;
    }
    const firstRow = seenInFile.get(email);
    if (firstRow !== undefined) {
      result.duplicates.push({ row: rowNumber, email, reason: `Duplicate: same email as row ${firstRow}` });
      return;
    }

    seenInFile.set(email, rowNumber);
    result.valid.push({ name, email, company, source: source || 'CSV Import' });
  });

  return result;
}

import { z } from 'zod';
import { ELIGIBILITY_STATUSES, LEAD_STATUSES } from '@/types';
import type { ActivityItem, Campaign, EligibilityStatus, Lead, LeadStatus } from '@/types';
import type { NewLeadInput } from '@/lib/csv';

/** Pure helpers behind the client-side app state (kept separate so they're easy to test). */

export const STORAGE_KEY = 'leadmgr:v1';
export const MAX_ACTIVITY = 50;

const leadSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  company: z.string(),
  source: z.string(),
  status: z.enum(LEAD_STATUSES),
  eligibility: z.enum(ELIGIBILITY_STATUSES),
  createdAt: z.string(),
  notes: z.string().optional(),
  demo: z.boolean().optional(),
});
const campaignSchema = z.object({
  id: z.string(),
  subject: z.string(),
  createdAt: z.string(),
  recipients: z.number(),
  sent: z.number(),
  failed: z.number(),
  status: z.enum(['Sent', 'Partial', 'Failed', 'Demo']),
  attachmentName: z.string().optional(),
  demo: z.boolean(),
});
const activitySchema = z.object({
  id: z.string(),
  type: z.enum(['import', 'campaign']),
  message: z.string(),
  at: z.string(),
  demo: z.boolean().optional(),
});
const storedSchema = z.object({
  leads: z.array(leadSchema),
  campaigns: z.array(campaignSchema),
  activity: z.array(activitySchema),
});

export interface StoredState {
  leads: Lead[];
  campaigns: Campaign[];
  activity: ActivityItem[];
}

/**
 * Parses saved state. Returns null if missing/corrupt. Sample (demo) leads are
 * dropped when not in demo mode so they can never be emailed by accident.
 */
export function parseStoredState(raw: string | null, demoMode: boolean): StoredState | null {
  if (!raw) return null;
  try {
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { leads, campaigns, activity } = parsed.data;
    return { leads: demoMode ? leads : leads.filter((l) => !l.demo), campaigns, activity };
  } catch {
    return null;
  }
}

export function serializeState(state: StoredState): string {
  return JSON.stringify(state);
}

/** Adds new leads (status New / eligibility Pending), skipping emails that already exist. */
export function mergeNewLeads(
  existing: Lead[],
  input: NewLeadInput[],
  now: string,
  makeId: () => string
): { leads: Lead[]; added: number; skipped: number } {
  const seen = new Set(existing.map((l) => l.email.trim().toLowerCase()));
  const fresh: Lead[] = [];
  for (const item of input) {
    const email = item.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    fresh.push({
      id: makeId(),
      name: item.name,
      email,
      company: item.company,
      source: item.source || 'CSV Import',
      status: 'New',
      eligibility: 'Pending',
      createdAt: now,
    });
  }
  return { leads: [...fresh, ...existing], added: fresh.length, skipped: input.length - fresh.length };
}

export function patchLeads(
  leads: Lead[],
  ids: string[],
  patch: { status?: LeadStatus; eligibility?: EligibilityStatus }
): Lead[] {
  const set = new Set(ids);
  return leads.map((l) => (set.has(l.id) ? { ...l, ...patch } : l));
}

export function removeLeads(leads: Lead[], ids: string[]): Lead[] {
  const set = new Set(ids);
  return leads.filter((l) => !set.has(l.id));
}

/** Stats shown on the dashboard, derived from real data. */
export function computeStats(leads: Lead[], campaigns: Campaign[]) {
  return {
    total: leads.length,
    eligible: leads.filter((l) => l.eligibility === 'Eligible').length,
    pending: leads.filter((l) => l.eligibility === 'Pending').length,
    // Only emails Gmail actually accepted count; demo runs send nothing.
    emailsSent: campaigns.filter((c) => !c.demo).reduce((sum, c) => sum + c.sent, 0),
  };
}

export const PAGE_SIZE = 10;

export interface LeadFilters {
  term: string;
  status: LeadStatus | 'All';
  eligibility: EligibilityStatus | 'All';
}

/** Search (name, email, company, source; case-insensitive) plus status/eligibility filters. */
export function filterLeads(leads: Lead[], { term, status, eligibility }: LeadFilters): Lead[] {
  const q = term.trim().toLowerCase();
  return leads.filter((lead) => {
    if (status !== 'All' && lead.status !== status) return false;
    if (eligibility !== 'All' && lead.eligibility !== eligibility) return false;
    if (!q) return true;
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.company.toLowerCase().includes(q) ||
      lead.source.toLowerCase().includes(q)
    );
  });
}

/** Clamps `page` into range so stale page numbers (after filtering/deleting) never show an empty page. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * size;
  return { totalPages, currentPage, startIndex, pageItems: items.slice(startIndex, startIndex + size) };
}

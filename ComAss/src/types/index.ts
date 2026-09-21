export const LEAD_STATUSES = ['New', 'Reviewed', 'Contacted', 'Invalid', 'Do Not Contact'] as const;
export const ELIGIBILITY_STATUSES = ['Eligible', 'Ineligible', 'Pending'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  source: string;
  status: LeadStatus;
  eligibility: EligibilityStatus;
  createdAt: string;
  notes?: string;
  /** True for built-in sample leads (demo mode only). Never emailed. */
  demo?: boolean;
}

export type CampaignStatus = 'Sent' | 'Partial' | 'Failed' | 'Demo';

export interface Campaign {
  id: string;
  subject: string;
  createdAt: string;
  recipients: number;
  sent: number;
  failed: number;
  status: CampaignStatus;
  attachmentName?: string;
  /** True when no email was actually sent (demo mode). */
  demo: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'import' | 'campaign';
  message: string;
  at: string;
  demo?: boolean;
}

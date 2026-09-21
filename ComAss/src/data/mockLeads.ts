import { Lead } from '../types';

export const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@wellnesscenter.com',
    company: 'Holistic Wellness Center',
    source: 'LinkedIn',
    status: 'New',
    eligibility: 'Pending',
    createdAt: '2023-10-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@soundhealing.org',
    company: 'Sound Healing Org',
    source: 'Website',
    status: 'Reviewed',
    eligibility: 'Eligible',
    createdAt: '2023-10-16T11:30:00Z',
  },
  {
    id: '3',
    name: 'Charlie Davis',
    email: 'charlie.davis@yoga-studio.net',
    company: 'Downtown Yoga',
    source: 'Facebook',
    status: 'Contacted',
    eligibility: 'Eligible',
    createdAt: '2023-10-17T09:15:00Z',
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@fakeemail.xyz',
    company: 'Unknown',
    source: 'Google',
    status: 'Invalid',
    eligibility: 'Ineligible',
    createdAt: '2023-10-18T14:20:00Z',
    notes: 'Bounced email'
  },
  {
    id: '5',
    name: 'Evan Wright',
    email: 'evan@meditationretreat.com',
    company: 'Zen Retreat',
    source: 'Manual Import',
    status: 'New',
    eligibility: 'Pending',
    createdAt: '2023-10-19T16:45:00Z',
  }
];

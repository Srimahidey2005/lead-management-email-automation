"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { mockLeads } from "@/data/mockLeads";
import type { ActivityItem, Campaign, EligibilityStatus, Lead, LeadStatus } from "@/types";
import type { NewLeadInput } from "@/lib/csv";
import { newId } from "@/lib/id";
import {
  MAX_ACTIVITY,
  STORAGE_KEY,
  mergeNewLeads,
  parseStoredState,
  patchLeads,
  removeLeads,
  serializeState,
} from "@/lib/leads-store";

/**
 * App-wide client state (no database): leads, campaigns and activity live here
 * and are persisted to this browser's localStorage. In demo mode the app is
 * seeded with clearly-flagged sample leads; in real mode it starts empty.
 */

const DEMO_SEED: Lead[] = mockLeads.map((l) => ({ ...l, demo: true }));

export interface EmailDraft {
  subject: string;
  body: string;
}

interface AppState {
  demoMode: boolean;
  /** False until saved data has been read from localStorage. */
  ready: boolean;
  leads: Lead[];
  campaigns: Campaign[];
  activity: ActivityItem[];
  addLeads: (input: NewLeadInput[], sourceLabel: string) => { added: number; skipped: number };
  updateLeads: (ids: string[], patch: { status?: LeadStatus; eligibility?: EligibilityStatus }) => void;
  deleteLeads: (ids: string[]) => void;
  recordCampaign: (campaign: Campaign, sentLeadIds: string[]) => void;
  /** Template chosen on the Templates page, consumed by the campaign composer. */
  draft: EmailDraft | null;
  setDraft: (draft: EmailDraft | null) => void;
}

export const AppStateContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}

function AppStateProvider({ demoMode, children }: { demoMode: boolean; children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(demoMode ? DEMO_SEED : []);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);

  // Load saved data once, after mount (localStorage doesn't exist during SSR).
  useEffect(() => {
    let saved = null;
    try {
      saved = parseStoredState(window.localStorage.getItem(STORAGE_KEY), demoMode);
    } catch {
      // Storage unavailable (e.g. blocked): keep the defaults.
    }
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (saved) {
      setLeads(saved.leads);
      setCampaigns(saved.campaigns);
      setActivity(saved.activity);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [demoMode]);

  // Persist changes (only after the initial load, so we never overwrite saved data with defaults).
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeState({ leads, campaigns, activity }));
    } catch {
      // Storage full or unavailable: the app keeps working in memory.
    }
  }, [ready, leads, campaigns, activity]);

  const pushActivity = useCallback((item: Omit<ActivityItem, "id" | "at">) => {
    setActivity((prev) => [{ id: newId(), at: new Date().toISOString(), ...item }, ...prev].slice(0, MAX_ACTIVITY));
  }, []);

  const addLeads = useCallback<AppState["addLeads"]>(
    (input, sourceLabel) => {
      const { leads: next, added, skipped } = mergeNewLeads(leads, input, new Date().toISOString(), newId);
      if (added > 0) {
        setLeads(next);
        pushActivity({
          type: "import",
          message: `Imported ${added} lead${added === 1 ? "" : "s"} from ${sourceLabel}`,
        });
      }
      return { added, skipped };
    },
    [leads, pushActivity]
  );

  const updateLeads = useCallback<AppState["updateLeads"]>((ids, patch) => {
    setLeads((prev) => patchLeads(prev, ids, patch));
  }, []);

  const deleteLeads = useCallback<AppState["deleteLeads"]>((ids) => {
    setLeads((prev) => removeLeads(prev, ids));
  }, []);

  const recordCampaign = useCallback<AppState["recordCampaign"]>(
    (campaign, sentLeadIds) => {
      setCampaigns((prev) => [campaign, ...prev]);
      if (!campaign.demo && sentLeadIds.length > 0) {
        setLeads((prev) => patchLeads(prev, sentLeadIds, { status: "Contacted" }));
      }
      pushActivity({
        type: "campaign",
        demo: campaign.demo,
        message: campaign.demo
          ? `Demo run of "${campaign.subject}" for ${campaign.recipients} recipient${campaign.recipients === 1 ? "" : "s"} (no emails sent)`
          : `Campaign "${campaign.subject}": ${campaign.sent} of ${campaign.recipients} sent (${campaign.status})`,
      });
    },
    [pushActivity]
  );

  const value = useMemo<AppState>(
    () => ({ demoMode, ready, leads, campaigns, activity, addLeads, updateLeads, deleteLeads, recordCampaign, draft, setDraft }),
    [demoMode, ready, leads, campaigns, activity, addLeads, updateLeads, deleteLeads, recordCampaign, draft]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function Providers({ children, demoMode }: { children: React.ReactNode; demoMode: boolean }) {
  // In demo mode there is no auth backend to ask, so start with a known "signed out" session.
  return (
    <SessionProvider session={demoMode ? null : undefined}>
      <AppStateProvider demoMode={demoMode}>{children}</AppStateProvider>
    </SessionProvider>
  );
}

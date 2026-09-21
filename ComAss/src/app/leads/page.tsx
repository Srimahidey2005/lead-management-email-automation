"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/layout/Providers';
import { ELIGIBILITY_STATUSES, LEAD_STATUSES } from '@/types';
import type { EligibilityStatus, LeadStatus } from '@/types';
import { leadsToCsv } from '@/lib/csv';
import { filterLeads, paginate } from '@/lib/leads-store';
import { downloadTextFile } from '@/lib/download';
import { Search, Filter, MoreVertical } from 'lucide-react';

const checkboxClass = 'w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500';

export default function LeadsPage() {
  const { leads, updateLeads, deleteLeads } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityStatus | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);

  const activeFilters = (statusFilter !== 'All' ? 1 : 0) + (eligibilityFilter !== 'All' ? 1 : 0);

  const filteredLeads = useMemo(
    () => filterLeads(leads, { term: searchTerm, status: statusFilter, eligibility: eligibilityFilter }),
    [leads, searchTerm, statusFilter, eligibilityFilter]
  );

  const { totalPages, currentPage, startIndex, pageItems: pageLeads } = paginate(filteredLeads, page);

  // Ignore ids of leads that no longer exist (e.g. deleted).
  const selectedLeads = useMemo(() => leads.filter((l) => selected.has(l.id)), [leads, selected]);
  const allPageSelected = pageLeads.length > 0 && pageLeads.every((l) => selected.has(l.id));
  const somePageSelected = pageLeads.some((l) => selected.has(l.id));

  const menuLead = menu ? leads.find((l) => l.id === menu.id) : undefined;

  // Close the row menu on Escape / scroll / resize.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageLeads.forEach((l) => next.delete(l.id));
      else pageLeads.forEach((l) => next.add(l.id));
      return next;
    });

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu((prev) => (prev?.id === id ? null : { id, top: rect.bottom + 4, right: window.innerWidth - rect.right }));
  };

  const removeLeads = (ids: string[]) => {
    const label = ids.length === 1 ? 'this lead' : `${ids.length} leads`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    deleteLeads(ids);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleExport = () => {
    const rows = selectedLeads.length > 0 ? selectedLeads : filteredLeads;
    if (rows.length === 0) return;
    downloadTextFile(`leads-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCsv(rows));
  };

  const getEligibilityBadge = (status: string) => {
    switch(status) {
      case 'Eligible': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Eligible</span>;
      case 'Ineligible': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Ineligible</span>;
      default: return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'New': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">New</span>;
      case 'Reviewed': return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">Reviewed</span>;
      case 'Contacted': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Contacted</span>;
      case 'Invalid': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Invalid</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const selectClass = 'px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Leads Management</h2>
          <p className="text-slate-500 text-sm">Review, filter, and manage your contacts.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredLeads.length === 0 && selectedLeads.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          Export CSV{selectedLeads.length > 0 ? ` (${selectedLeads.length} selected)` : ''}
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by name, email, or company..." 
              aria-label="Search leads"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-slate-50 ${activeFilters > 0 ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-700'}`}
          >
            <Filter className="w-4 h-4" />
            Filter{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-slate-100">
            <label className="text-sm text-slate-600 flex items-center gap-2">
              Status
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as LeadStatus | 'All'); setPage(1); }}
                className={selectClass}
              >
                <option value="All">All</option>
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600 flex items-center gap-2">
              Eligibility
              <select
                value={eligibilityFilter}
                onChange={(e) => { setEligibilityFilter(e.target.value as EligibilityStatus | 'All'); setPage(1); }}
                className={selectClass}
              >
                <option value="All">All</option>
                {ELIGIBILITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {activeFilters > 0 && (
              <button
                onClick={() => { setStatusFilter('All'); setEligibilityFilter('All'); setPage(1); }}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium text-left"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-indigo-800">{selectedLeads.length} selected</span>
          <button
            onClick={() => updateLeads(selectedLeads.map((l) => l.id), { eligibility: 'Eligible' })}
            className="px-3 py-1 rounded-md bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium"
          >
            Mark Eligible
          </button>
          <button
            onClick={() => updateLeads(selectedLeads.map((l) => l.id), { eligibility: 'Ineligible' })}
            className="px-3 py-1 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            Mark Ineligible
          </button>
          <button
            onClick={() => removeLeads(selectedLeads.map((l) => l.id))}
            className="px-3 py-1 rounded-md bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium"
          >
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-indigo-700 hover:text-indigo-900 font-medium">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
              <tr>
                <th className="pl-6 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all leads on this page"
                    className={checkboxClass}
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                    onChange={togglePage}
                    disabled={pageLeads.length === 0}
                  />
                </th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Eligibility</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pageLeads.map((lead) => (
                <tr key={lead.id} className={selected.has(lead.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}>
                  <td className="pl-6 pr-2 py-4">
                    <input
                      type="checkbox"
                      aria-label={`Select ${lead.name}`}
                      className={checkboxClass}
                      checked={selected.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{lead.name}</div>
                    <div className="text-slate-500 text-xs">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4">{lead.company}</td>
                  <td className="px-6 py-4">{lead.source}</td>
                  <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                  <td className="px-6 py-4">{getEligibilityBadge(lead.eligibility)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => openMenu(e, lead.id)}
                      aria-label={`Actions for ${lead.name}`}
                      aria-haspopup="menu"
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {leads.length === 0 ? (
                      <>No leads yet. <Link href="/import" className="text-indigo-600 hover:text-indigo-800 font-medium">Import a CSV</Link> to get started.</>
                    ) : (
                      'No leads found matching your search.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
          <span>
            {filteredLeads.length === 0
              ? 'Showing 0 leads'
              : `Showing ${startIndex + 1}-${startIndex + pageLeads.length} of ${filteredLeads.length} leads`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-50 enabled:hover:bg-white"
            >
              Prev
            </button>
            <span className="px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-2 py-1 border border-slate-300 rounded disabled:opacity-50 enabled:hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Row action menu (fixed-position so the scrolling table doesn't clip it) */}
      {menu && menuLead && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(null)} />
          <div
            role="menu"
            className="fixed z-30 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-sm"
            style={{ top: menu.top, right: menu.right }}
          >
            <button
              role="menuitem"
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={menuLead.eligibility === 'Eligible'}
              onClick={() => { updateLeads([menuLead.id], { eligibility: 'Eligible' }); setMenu(null); }}
            >
              Mark Eligible
            </button>
            <button
              role="menuitem"
              className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={menuLead.eligibility === 'Ineligible'}
              onClick={() => { updateLeads([menuLead.id], { eligibility: 'Ineligible' }); setMenu(null); }}
            >
              Mark Ineligible
            </button>
            <button
              role="menuitem"
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
              onClick={() => { const id = menuLead.id; setMenu(null); removeLeads([id]); }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo } from 'react';
import { Users, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '@/components/layout/Providers';
import { computeStats } from '@/lib/leads-store';

export default function Home() {
  const { leads, campaigns, activity, demoMode } = useApp();

  // All numbers are derived from the current leads/campaign data (no hard-coded values).
  const stats = useMemo(() => computeStats(leads, campaigns), [leads, campaigns]);

  const cards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Eligible Leads', value: stats.eligible, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    {
      label: 'Emails Sent',
      value: stats.emailsSent,
      icon: Mail,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      hint: demoMode ? 'Demo mode: none sent' : undefined,
    },
    { label: 'Action Required', value: stats.pending, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', hint: 'Leads pending review' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Overview</h2>
        <p className="text-slate-500">Welcome back! Here is what&apos;s happening with your leads today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value.toLocaleString('en-US')}</p>
              {stat.hint && <p className="text-xs text-slate-400">{stat.hint}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm mt-8">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-800">Recent Activity</h3>
        </div>
        {activity.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-slate-500 min-h-[200px]">
            <p>No recent activity. Import some leads to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.slice(0, 8).map((item) => (
              <li key={item.id} className="px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                <span className="text-slate-700">
                  {item.demo && (
                    <span className="mr-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Demo</span>
                  )}
                  {item.message}
                </span>
                <span className="text-xs text-slate-400 flex-shrink-0">{new Date(item.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

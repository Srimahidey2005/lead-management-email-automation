"use client";

import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { useApp } from '@/components/layout/Providers';
import { EMAIL_TEMPLATES } from '@/lib/templates';

export default function TemplatesPage() {
  const router = useRouter();
  const { setDraft } = useApp();

  const applyTemplate = (subject: string, body: string) => {
    setDraft({ subject, body });
    router.push('/campaigns');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Email Templates</h2>
        <p className="text-slate-500 text-sm">
          Start a campaign from a ready-made message. Placeholders like {'{{firstName}}'}, {'{{name}}'} and {'{{company}}'} are filled in for each recipient.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EMAIL_TEMPLATES.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="font-medium text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              {t.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{t.description}</p>
            <div className="mt-4 flex-1">
              <p className="text-xs font-medium text-slate-500">Subject</p>
              <p className="text-sm text-slate-800 mb-3">{t.subject}</p>
              <p className="text-xs font-medium text-slate-500">Message</p>
              <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-6">{t.body}</p>
            </div>
            <button
              onClick={() => applyTemplate(t.subject, t.body)}
              className="mt-5 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors"
            >
              Use in Campaign
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Menu, UserCircle, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { navItems } from './Sidebar';
import { useApp } from './Providers';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  const { demoMode } = useApp();
  const pathname = usePathname();

  const current = navItems.find((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)));
  const title = current?.name ?? 'Dashboard';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="md:hidden text-slate-500 hover:text-slate-700"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="font-semibold text-slate-800 text-lg truncate">
          {title}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {session ? (
          <div className="flex items-center gap-3">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-slate-700">{session.user?.name}</p>
              <p className="text-xs text-slate-500">{session.user?.email}</p>
            </div>
            {session.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200" />
            ) : (
              <UserCircle className="w-8 h-8 text-slate-400" />
            )}
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className="text-slate-400 hover:text-red-500 transition-colors ml-2"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : demoMode ? (
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <span>Demo mode</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <UserCircle className="w-5 h-5" />
            <span>Not connected</span>
          </div>
        )}
      </div>
    </header>
  );
}

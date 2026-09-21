import Link from 'next/link';
import { Home, Users, UploadCloud, Mail, FileText, Settings } from 'lucide-react';

export const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Import Leads', href: '/import', icon: UploadCloud },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  /** Render as the mobile slide-over drawer instead of the desktop sidebar. */
  mobile?: boolean;
  /** Called when a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  return (
    <aside
      className={
        mobile
          ? "w-64 max-w-[80vw] bg-slate-900 text-slate-300 h-full flex flex-col"
          : "w-64 bg-slate-900 text-slate-300 h-screen flex-shrink-0 flex flex-col hidden md:flex"
      }
    >
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-white text-lg font-bold tracking-wider">LEAD<span className="text-blue-500">MGR</span></h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        Internship Project &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}

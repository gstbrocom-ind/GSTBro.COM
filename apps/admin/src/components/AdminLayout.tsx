import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api, clearToken, getToken } from '../lib/api';
import { adminPath } from '../lib/routes';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type NavItem = {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  external?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// Crisp SVG Icons
function DashboardIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function TeamOverviewIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LeadsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function ClientsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
    </svg>
  );
}

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function FeesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TeamIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DriveIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChatIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SettingsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SocialIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function SeoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <path d="m11 8 3 3-3 3" />
    </svg>
  );
}

function ActivityIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function LogoutIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ContentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function WelcomeCodesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

function ShieldIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IncidentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function RetentionIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

const navGroups: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { to: '/', label: 'Overview', icon: DashboardIcon },
      { to: '/clients', label: 'Client Accounts', icon: ClientsIcon },
      { to: '/welcome-codes', label: 'Welcome Codes', icon: WelcomeCodesIcon },
      { to: '/messages', label: 'Client Communications', icon: ChatIcon },
      { to: '/activity-logs', label: 'Activity Log', icon: ActivityIcon },
      { to: '/leads', label: 'Inward Inquiries', icon: LeadsIcon },
    ],
  },
  {
    title: 'Compliance & Practice',
    items: [
      { to: '/client/invoices', label: 'GST Invoices Hub', icon: FeesIcon, external: true },
      { to: '/due-dates', label: 'Statutory Deadlines', icon: CalendarIcon },
      { to: '/fees', label: 'Billing & Invoices', icon: FeesIcon },
      { to: '/team', label: 'Staff & Roles', icon: TeamIcon },
      { to: '/drive', label: 'Drive File Vault', icon: DriveIcon },
      { to: '/team', label: 'Practice Workbench', icon: TeamOverviewIcon, external: true },
    ],
  },
  {
    title: 'DPDP Privacy Governance',
    items: [
      { to: '/privacy/requests', label: 'Rights Request Queue', icon: ShieldIcon },
      { to: '/privacy/governance', label: 'Consent & Breach Register', icon: IncidentIcon },
      { to: '/privacy/retention', label: 'Retention & Erasure', icon: RetentionIcon },
    ],
  },
  {
    title: 'Portal Settings',
    items: [
      { to: '/settings/brand-intro', label: 'Brand Intro & Themes', icon: SparklesIcon },
      { to: '/settings/content', label: 'Website CMS Editor', icon: ContentIcon },
      { to: '/settings/site', label: 'Site Profile', icon: SettingsIcon },
      { to: '/settings/social', label: 'Social Channels', icon: SocialIcon },
      { to: '/settings/seo', label: 'SEO Metadata', icon: SeoIcon },
    ],
  },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }
    api<{ user: { role: string; name?: string; must_reset_password?: boolean } }>('/api/auth/me')
      .then((data) => {
        if (data.user.must_reset_password) {
          navigate(adminPath('/force-reset'));
          return;
        }
        if (data.user.role === 'TEAM') {
          window.location.href = '/team';
          return;
        }
        setRole(data.user.role);
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, [navigate, location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {}
    clearToken();
    window.location.href = '/login';
  };

  if (!getToken()) {
    window.location.href = '/login';
    return null;
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-semibold tracking-wide">
            Verifying administrator session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* High-Contrast Obsidian Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'admin-sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black tracking-tight text-lg select-none">
                GST<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bro</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/20">
                Console
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Compliance Practice OS</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>


        {/* Navigation Sections */}
        <div className="admin-sidebar-scroll space-y-5">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter(() => {
              if (role === 'TEAM') {
                return false;
              }
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title}>
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    if (item.external) {
                      return (
                        <a
                          key={item.to}
                          href={item.to}
                          className="admin-nav-item"
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </a>
                      );
                    }
                    return (
                      <NavLink
                        key={item.to}
                        to={adminPath(item.to)}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          `admin-nav-item ${isActive ? 'active' : ''}`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-1.5">
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              API Services
            </span>
            <span className="text-emerald-400 font-semibold text-[10px]">Operational</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogoutIcon className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="admin-main">
        {/* Mobile-Only Header (Hidden on Desktop) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0b1120] border-b border-slate-800 text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Open Navigation"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <span className="font-black text-sm tracking-tight text-white select-none">
              GST<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bro</span> Console
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-slate-400 hover:text-rose-400 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Page Content Viewport */}
        <div className="admin-page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

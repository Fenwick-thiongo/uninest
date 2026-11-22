import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Calendar,
  Compass,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Users,
  X,
  Heart,
  ClipboardCheck,
  AlertTriangle,
  History,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function UniNestLogo({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 font-extrabold text-xl tracking-tight whitespace-nowrap shrink-0 ${
        dark ? 'text-[#effdf1]' : 'text-[#002517]'
      }`}
    >
      <span
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
          dark ? 'bg-[#c5f176] text-[#002517]' : 'bg-[#002517] text-[#c5f176]'
        }`}
        aria-hidden="true"
      >
        <Home className="w-4 h-4 stroke-[2.4]" />
      </span>
      <span>UniNest</span>
    </Link>
  );
}

export function getDashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'owner':
      return '/host';
    case 'caretaker':
      return '/caretaker';
    case 'admin':
      return '/admin';
    default:
      return '/student';
  }
}

export function PublicNavbar() {
  const { user, unreadNotifications, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#effdf1]/95 backdrop-blur border-b border-[#c1c8c2]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <UniNestLogo />

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#414844]">
          <NavLink
            to="/find-a-house"
            className={({ isActive }) =>
              `whitespace-nowrap shrink-0 transition-colors hover:text-[#002517] ${
                isActive ? 'text-[#002517] font-semibold underline underline-offset-8 decoration-[#296a46] decoration-2' : ''
              }`
            }
          >
            Find a House
          </NavLink>
          <NavLink
            to="/discover"
            className={({ isActive }) =>
              `whitespace-nowrap shrink-0 transition-colors hover:text-[#002517] ${
                isActive ? 'text-[#002517] font-semibold underline underline-offset-8 decoration-[#296a46] decoration-2' : ''
              }`
            }
          >
            Discover
          </NavLink>
          <NavLink
            to="/community"
            className={({ isActive }) =>
              `whitespace-nowrap shrink-0 transition-colors hover:text-[#002517] ${
                isActive ? 'text-[#002517] font-semibold underline underline-offset-8 decoration-[#296a46] decoration-2' : ''
              }`
            }
          >
            Community
          </NavLink>
          <NavLink
            to="/apply-host"
            className={({ isActive }) =>
              `whitespace-nowrap shrink-0 transition-colors hover:text-[#002517] ${
                isActive ? 'text-[#002517] font-semibold underline underline-offset-8 decoration-[#296a46] decoration-2' : ''
              }`
            }
          >
            List Property
          </NavLink>
          {user && (
            <NavLink
              to={getDashboardPathForRole(user.role)}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 transition-colors hover:text-[#002517] ${
                  isActive ? 'text-[#002517] font-semibold underline underline-offset-8 decoration-[#296a46] decoration-2' : ''
                }`
              }
            >
              Dashboard
            </NavLink>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {!user ? (
            <Link
              to="/get-started"
              className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold hover:bg-[#123b2a] transition-colors whitespace-nowrap shrink-0"
            >
              Get Started
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/notifications"
                aria-label="Notifications"
                className="relative p-2 rounded-lg border border-[#c1c8c2] bg-white text-[#121e17] hover:bg-[#effdf1] transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#296a46] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                to={getDashboardPathForRole(user.role)}
                className="px-4 py-2 rounded-lg bg-[#002517] text-[#effdf1] text-sm font-semibold hover:bg-[#123b2a] transition-colors whitespace-nowrap shrink-0"
              >
                {user.full_name.split(' ')[0]} Workspace
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 rounded-lg border border-[#c1c8c2] bg-white text-[#002517]"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#c1c8c2] bg-white px-4 py-4 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-[#121e17]">
            <Link to="/find-a-house" onClick={() => setMobileOpen(false)} className="py-2">
              Find a House
            </Link>
            <Link to="/discover" onClick={() => setMobileOpen(false)} className="py-2">
              Discover
            </Link>
            <Link to="/community" onClick={() => setMobileOpen(false)} className="py-2">
              Community
            </Link>
            <Link to="/apply-host" onClick={() => setMobileOpen(false)} className="py-2">
              List Property
            </Link>
            {user ? (
              <>
                <Link
                  to={getDashboardPathForRole(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className="py-2 font-semibold text-[#296a46]"
                >
                  Open Workspace ({user.role})
                </Link>
                <Link to="/messages" onClick={() => setMobileOpen(false)} className="py-2">
                  Messages
                </Link>
                <Link to="/notifications" onClick={() => setMobileOpen(false)} className="py-2">
                  Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left py-2 text-red-700 font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 text-center rounded-lg border border-[#c1c8c2] text-[#121e17] font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  to="/get-started"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 text-center rounded-lg bg-[#002517] text-[#effdf1] font-semibold"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[#002517] text-[#effdf1] mt-16 border-t border-[#123b2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[#123b2a]">
          <div className="space-y-3">
            <UniNestLogo dark />
            <p className="text-sm text-[#abefc1]/90 leading-relaxed max-w-xs">
              Find your space. Start your next chapter. Built for Kenyan university and college students.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Accommodation</h3>
            <ul className="space-y-2 text-sm text-[#abefc1]/85">
              <li><Link to="/find-a-house" className="hover:text-[#c5f176]">Browse Listings</Link></li>
              <li><Link to="/find-a-house?town=Juja" className="hover:text-[#c5f176]">Juja Housing</Link></li>
              <li><Link to="/find-a-house?town=Ruiru" className="hover:text-[#c5f176]">Ruiru Hostels</Link></li>
              <li><Link to="/find-a-house?town=Kilimani" className="hover:text-[#c5f176]">Kilimani Studios</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Campus Life</h3>
            <ul className="space-y-2 text-sm text-[#abefc1]/85">
              <li><Link to="/discover" className="hover:text-[#c5f176]">Discover Tours</Link></li>
              <li><Link to="/community" className="hover:text-[#c5f176]">Student Community</Link></li>
              <li><Link to="/register" className="hover:text-[#c5f176]">Student Sign Up</Link></li>
              <li><Link to="/login" className="hover:text-[#c5f176]">Member Sign In</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">For Hosts</h3>
            <ul className="space-y-2 text-sm text-[#abefc1]/85">
              <li><Link to="/apply-host" className="hover:text-[#c5f176]">Property Owner Application</Link></li>
              <li><Link to="/apply-host" className="hover:text-[#c5f176]">Resident Caretaker Application</Link></li>
              <li><Link to="/get-started" className="hover:text-[#c5f176]">How Verification Works</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#abefc1]/75">
          <p>© {new Date().getFullYear()} UniNest Kenya. Student accommodation marketplace and community.</p>
          <p>Demo listings are clearly marked as Sample Listings until verified by UniNest.</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#effdf1] text-[#121e17]">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

function getSidebarLinks(role: UserRole): { title: string; links: SidebarLink[] } {
  if (role === 'student') {
    return {
      title: 'Student Workspace',
      links: [
        { to: '/student', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/find-a-house', label: 'Find a House', icon: Search },
        { to: '/student/saved', label: 'Saved Properties', icon: Heart },
        { to: '/student/enquiries', label: 'My Enquiries', icon: FileText },
        { to: '/student/viewings', label: 'My Viewings', icon: Calendar },
        { to: '/messages', label: 'Messages', icon: MessageSquare },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/student/profile', label: 'Profile & Campus', icon: Users },
        { to: '/student/settings', label: 'Settings & Consent', icon: Settings },
      ],
    };
  }
  if (role === 'owner') {
    return {
      title: 'Property Owner',
      links: [
        { to: '/host', label: 'Owner Dashboard', icon: LayoutDashboard, end: true },
        { to: '/host/properties', label: 'My Properties', icon: Building2 },
        { to: '/host/properties/new', label: 'Add Property', icon: Home },
        { to: '/host/enquiries', label: 'Enquiries', icon: FileText },
        { to: '/host/viewings', label: 'Viewing Requests', icon: Calendar },
        { to: '/messages', label: 'Messages', icon: MessageSquare },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/host/profile', label: 'Host Profile', icon: UserCheck },
        { to: '/host/settings', label: 'Settings', icon: Settings },
      ],
    };
  }
  if (role === 'caretaker') {
    return {
      title: 'Resident Caretaker',
      links: [
        { to: '/caretaker', label: 'Caretaker Dashboard', icon: LayoutDashboard, end: true },
        { to: '/caretaker/properties', label: 'Assigned Properties', icon: Building2 },
        { to: '/caretaker/enquiries', label: 'Assigned Enquiries', icon: FileText },
        { to: '/caretaker/viewings', label: 'Viewing Requests', icon: Calendar },
        { to: '/messages', label: 'Messages', icon: MessageSquare },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/caretaker/profile', label: 'Caretaker Profile', icon: UserCheck },
      ],
    };
  }
  return {
    title: 'Administration',
    links: [
      { to: '/admin', label: 'Platform Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/applications', label: 'Host Applications', icon: UserCheck },
      { to: '/admin/properties', label: 'Property Verification', icon: ClipboardCheck },
      { to: '/admin/users', label: 'User Management', icon: Users },
      { to: '/admin/moderation', label: 'Reports & Moderation', icon: AlertTriangle },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
      { to: '/admin/settings', label: 'Platform Settings', icon: Settings },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  };
}

export function WorkspaceShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, unreadNotifications, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;
  const navConfig = getSidebarLinks(user.role);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#123b2a] flex items-center justify-between">
        <UniNestLogo dark />
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden text-[#abefc1] p-1"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold tracking-wide text-[#abefc1]/80">{navConfig.title}</p>
        <p className="text-sm font-semibold text-white truncate mt-0.5">{user.full_name}</p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navConfig.links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#c5f176] text-[#002517] font-semibold'
                    : 'text-[#effdf1]/85 hover:bg-[#123b2a] hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </span>
              {item.to === '/notifications' && unreadNotifications > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] rounded bg-[#296a46] text-white tabular-nums">
                  {unreadNotifications}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[#123b2a] space-y-1">
          <Link
            to="/discover"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#abefc1]/90 hover:bg-[#123b2a]"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Feed</span>
          </Link>
          <Link
            to="/community"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#abefc1]/90 hover:bg-[#123b2a]"
          >
            <Users className="w-4 h-4" />
            <span>Student Community</span>
          </Link>
          {user.role === 'student' && (
            <Link
              to="/apply-host"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#c5f176] hover:bg-[#123b2a]"
            >
              <Shield className="w-4 h-4" />
              <span>Become a Host</span>
            </Link>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-[#123b2a]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#abefc1] hover:bg-[#123b2a] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#effdf1] text-[#121e17]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#002517] text-[#effdf1] sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-[#002517] text-[#effdf1] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#c1c8c2]/70 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open workspace menu"
              className="lg:hidden p-2 rounded-lg border border-[#c1c8c2] text-[#002517]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[#002517] truncate">{title}</h1>
              {subtitle && <p className="text-xs text-[#414844] truncate hidden sm:block">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

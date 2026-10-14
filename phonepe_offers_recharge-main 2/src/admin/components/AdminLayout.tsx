import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Clock,
  FileText,
  Users,
  BarChart3,
  History,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Shield,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PhonePeLogo } from '../../components/PhonePeLogo';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: ('owner' | 'manager' | 'viewer')[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Recharge Orders', path: '/admin/orders', icon: CreditCard },
  { label: 'Network Providers', path: '/admin/providers', icon: Radio },
  { label: 'Special Offers & Timers', path: '/admin/offers', icon: Clock },
  { label: 'Website Content', path: '/admin/content', icon: FileText },
  { label: 'Customer Submissions', path: '/admin/submissions', icon: Users },
  { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
  { label: 'Admin Activity Log', path: '/admin/audit-logs', icon: History },
  { label: 'Settings & Roles', path: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to end your administrative session?')) {
      setIsLoggingOut(true);
      await logout();
      navigate('/admin/login');
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#1E1136] text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center p-1 border border-white/20">
            <PhonePeLogo className="text-white" size={18} />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide">PhonePe Recharge</span>
            <span className="text-[10px] text-purple-300 block -mt-0.5">Admin Workspace</span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-[#140A26] text-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-purple-900/40 shadow-xl`}
      >
        {/* Top Branding */}
        <div>
          <div className="p-5 border-b border-purple-900/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#6426AD] flex items-center justify-center shadow-md border border-purple-400/30">
                <PhonePeLogo className="text-white" size={22} />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  PhonePe
                  <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    Admin
                  </span>
                </h1>
                <p className="text-[11px] text-purple-300/80 font-medium">Control Center</p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-purple-300 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] scrollbar-thin">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#6426AD] to-[#8035D4] text-white shadow-md shadow-purple-950/50'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-purple-300'}`} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Footer Actions */}
        <div className="p-3 border-t border-purple-900/40 bg-black/20">
          {/* Admin User Profile */}
          <div className="bg-white/5 rounded-2xl p-3 mb-2.5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-400/40 flex items-center justify-center text-purple-200 flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.username || 'Administrator'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(
                      user?.role
                    )}`}
                  >
                    {user?.role || 'Admin'}
                  </span>
                </div>
              </div>
            </div>

            <Shield className="w-3.5 h-3.5 text-purple-400/60" />
          </div>

          {/* Customer Website View & Logout */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-200 hover:text-white transition-colors border border-white/10 font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Customer</span>
            </a>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-colors border border-red-500/20 font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? '...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

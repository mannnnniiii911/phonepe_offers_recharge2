import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Layers,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  TrendingUp,
  History,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  CreditCard,
} from 'lucide-react';
import { adminApi } from '../api';

interface DashboardStats {
  totalProviders: number;
  activeProviders: number;
  totalPlans: number;
  publishedPlans: number;
  hiddenPlans: number;
  archivedPlans: number;
  activeOffers: number;
  totalSubmissions: number;
  submissionsToday: number;
  submissions7Days: number;
}

interface RecentActivity {
  id: string;
  adminUsername: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboardStats();
      if (data.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ENABLED') || action.includes('INIT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (action.includes('REVEAL') || action.includes('DELETE') || action.includes('DISABLED')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time database statistics and activity monitoring for PhonePe Recharges
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/orders"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-[#6426AD] text-xs font-bold transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Orders & UPI</span>
          </Link>

          <Link
            to="/admin/plans"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6426AD] hover:bg-[#521E90] text-white text-xs font-bold shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Manage Plans</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Network Providers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Providers</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6426AD] flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.activeProviders ?? '--'}
              <span className="text-xs font-medium text-slate-400 ml-1.5">
                / {stats?.totalProviders ?? '--'} total
              </span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{stats?.activeProviders ?? 0} Active on Customer Portal</span>
            </p>
          </div>
        </div>

        {/* Recharge Plans */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recharge Plans</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.publishedPlans ?? '--'}
              <span className="text-xs font-medium text-slate-400 ml-1.5">
                / {stats?.totalPlans ?? '--'} total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
              <span>{stats?.hiddenPlans ?? 0} hidden</span>
              <span>•</span>
              <span>{stats?.archivedPlans ?? 0} archived</span>
            </p>
          </div>
        </div>

        {/* Customer Submissions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Submissions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.totalSubmissions ?? '--'}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats?.submissionsToday ?? 0} submitted today</span>
            </p>
          </div>
        </div>

        {/* Active Special Offers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Offers</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.activeOffers ?? '--'}
            </div>
            <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              <span>Synced with Customer Timers</span>
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-900 to-[#481272] text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-200 uppercase tracking-wider">7-Day Activity</span>
            <h3 className="text-2xl font-black mt-1">{stats?.submissions7Days ?? 0} Submissions</h3>
            <p className="text-[11px] text-purple-200/80 mt-0.5">Recorded with customer privacy consent</p>
          </div>
          <Link
            to="/admin/submissions"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
            title="View submissions"
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Network Providers</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.totalProviders ?? 0} Configured</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Jio, Airtel, Vi, BSNL & custom</p>
          </div>
          <Link
            to="/admin/providers"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700"
            title="Configure providers"
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recharge Plans</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats?.publishedPlans ?? 0} Active</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Published across active operators</p>
          </div>
          <Link
            to="/admin/plans"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700"
            title="Manage plans"
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Administrative Activity</h2>
              <p className="text-xs text-slate-500">Audited configuration changes and operational events</p>
            </div>
          </div>

          <Link
            to="/admin/audit-logs"
            className="text-xs font-bold text-[#6426AD] hover:underline flex items-center gap-1"
          >
            <span>View Full Audit Log</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <FileCheck2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <span>No administrative activity recorded yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {recentActivity.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.adminUsername}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

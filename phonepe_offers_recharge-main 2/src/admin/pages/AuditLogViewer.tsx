import React, { useState, useEffect } from 'react';
import {
  History,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { adminApi } from '../api';

interface AuditLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  ipAddress: string;
  createdAt: string;
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entityType: entityFilter !== 'all' ? entityFilter : undefined,
        page,
        limit: 25,
      });

      if (res.success) {
        setLogs(res.logs || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, page]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('INIT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('UPDATE') || action.includes('CHANGE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (action.includes('REVEAL') || action.includes('DELETE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Admin Activity Audit Log
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Immutable, read-only audit log recording administrative changes, number reveals, and logins
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security notice */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600">
        <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>
          Audit logs are permanently write-only and cannot be altered or rewritten by administrators.
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="ADMIN_LOGIN">Admin Login</option>
            <option value="ADMIN_LOGOUT">Admin Logout</option>
            <option value="PROVIDER_CREATE">Provider Create</option>
            <option value="PROVIDER_UPDATE">Provider Update</option>
            <option value="PLAN_CREATE">Plan Create</option>
            <option value="PLAN_UPDATE">Plan Update</option>
            <option value="REVEAL_PHONE_NUMBER">Reveal Phone Number</option>
            <option value="SETTINGS_UPDATE">Settings Update</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Entities</option>
            <option value="provider">Provider</option>
            <option value="plan">Plan</option>
            <option value="offer">Offer</option>
            <option value="submission">Submission</option>
            <option value="order">Order</option>
            <option value="settings">Settings</option>
            <option value="auth">Auth</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Admin User</th>
                <th className="py-3.5 px-4">Action Event</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Change Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>{log.adminUsername}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                    {log.entityType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">
                    {log.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800">
                    {log.summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} ({totalCount} total audit events)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

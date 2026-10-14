import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  Eye,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { adminApi } from '../api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface Submission {
  id: string;
  maskedMobile: string;
  providerId: string;
  providerName: string;
  providerLogo: string;
  planId: string | null;
  status: string;
  consentVersion: string;
  createdAt: string;
  revealedMobile?: string;
}

export const SubmissionsManager: React.FC = () => {
  const { user } = useAdminAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Reveal Modal State
  const [revealTarget, setRevealTarget] = useState<Submission | null>(null);
  const [revealedNumber, setRevealedNumber] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      const res = await adminApi.getProviders();
      if (res.success) {
        setProviders(res.providers || []);
      }
    } catch (err: any) {
      console.error('Failed to load providers:', err);
    }
  };

  const fetchSubmissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSubmissions({
        search: search.trim() || undefined,
        providerId: providerFilter !== 'all' ? providerFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 200,
      });

      if (res.success) {
        setSubmissions(res.submissions || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [providerFilter, startDate, endDate, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleRevealClick = (sub: Submission) => {
    setRevealTarget(sub);
    setRevealedNumber(null);
    setError(null);
  };

  const confirmReveal = async () => {
    if (!revealTarget) return;
    setIsRevealing(true);
    try {
      const res = await adminApi.revealSubmissionMobile(revealTarget.id);
      if (res.success) {
        setRevealedNumber(res.mobileNumber);
        // Also update local list so the unmasked number is visible in this session
        setSubmissions((prev) =>
          prev.map((s) => (s.id === revealTarget.id ? { ...s, revealedMobile: res.mobileNumber } : s))
        );
        setSuccessMsg(`Confidential mobile number revealed and logged to audit trail.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reveal number. Check authorization.');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    if (providerFilter !== 'all') q.set('providerId', providerFilter);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    if (user?.role === 'owner') {
      const includeFull = confirm('Do you want to export unmasked phone numbers in this CSV? (Requires Owner role; will be recorded in audit log)');
      if (includeFull) {
        q.set('includeFullNumbers', 'true');
      }
    }

    const token = localStorage.getItem('admin_session_token');
    window.open(`/api/admin/submissions/export?${q.toString()}&token=${token}`, '_blank');
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Customer Submissions Database
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Authorized operational records of submitted numbers and chosen telecom operators
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            title="Export CSV with formula injection defense"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Privacy Notice Reminder */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">Privacy & Compliance Guard:</strong> Customer mobile numbers are masked by default (e.g. <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono">98******42</code>). Submissions represent deliberate customer form entries with privacy consent, and are never fabricated or marked as verified payments. All number reveal operations are permanently logged to the administrator activity audit log.
        </div>
      </div>

      {/* Search and Date Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by 10-digit number or submission ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Operator dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Operator:</span>
            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Operators</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <span className="font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Mobile Number</th>
                <th className="py-3.5 px-4">Selected Operator</th>
                <th className="py-3.5 px-4">Plan Selected</th>
                <th className="py-3.5 px-4">Operational Status</th>
                <th className="py-3.5 px-4">Consent</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customer submissions found matching the criteria.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(sub.createdAt)}
                    </td>

                    {/* Masked / Revealed Number */}
                    <td className="py-3.5 px-4">
                      {sub.revealedMobile ? (
                        <span className="font-mono font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                          +91 {sub.revealedMobile}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-700 text-xs">
                            +91 {sub.maskedMobile}
                          </span>
                          <Lock className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                    </td>

                    {/* Operator */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {sub.providerName}
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4 text-slate-600">
                      {sub.planId ? (
                        <span className="text-xs bg-purple-50 text-[#6426AD] px-2 py-0.5 rounded font-bold border border-purple-200">
                          {sub.planId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Operator Only</span>
                      )}
                    </td>

                    {/* Operational Status (distinguished from paid) */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Form Submitted
                      </span>
                    </td>

                    {/* Consent version */}
                    <td className="py-3.5 px-4 text-slate-500 text-xs font-mono">
                      {sub.consentVersion}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {!sub.revealedMobile && (
                        <button
                          onClick={() => handleRevealClick(sub)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6426AD] text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                          title="Reveal full number (audited action)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Reveal</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing page {page} of {totalPages} ({totalCount} total submissions)
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

      {/* Reveal Confirmation Modal */}
      {revealTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Reveal Confidential Customer Number
                </h2>
                <p className="text-xs text-slate-500">
                  Submission ID: <code className="font-mono">{revealTarget.id}</code>
                </p>
              </div>
            </div>

            {revealedNumber ? (
              <div className="my-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-xs text-emerald-700 block font-semibold mb-1">
                  Full Customer Mobile Number:
                </span>
                <span className="text-2xl font-black font-mono text-emerald-950 tracking-wider">
                  +91 {revealedNumber}
                </span>
              </div>
            ) : (
              <div className="my-4 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <p className="font-semibold text-slate-800 mb-1">Audit Notice:</p>
                In compliance with customer data protection rules, unmasking this confidential number will be permanently recorded in the administrator audit log with your account name (<strong>{user?.username}</strong>), timestamp, and client IP.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRevealTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer"
              >
                {revealedNumber ? 'Close' : 'Cancel'}
              </button>

              {!revealedNumber && (
                <button
                  type="button"
                  disabled={isRevealing}
                  onClick={confirmReveal}
                  className="px-5 py-2 rounded-xl bg-[#6426AD] hover:bg-[#521E90] text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isRevealing ? 'Revealing...' : 'Confirm & Log Audit'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

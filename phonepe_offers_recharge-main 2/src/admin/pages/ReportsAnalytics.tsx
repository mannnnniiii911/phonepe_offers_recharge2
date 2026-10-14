import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Radio,
  Layers,
  History,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../api';

interface OperatorStat {
  name: string;
  brandColor: string;
  count: number;
}

interface DayStat {
  date: string;
  count: number;
}

interface PlanProviderStat {
  name: string;
  brandColor: string;
  totalPlans: number;
  publishedPlans: number;
  hiddenPlans: number;
}

interface AuditStat {
  action: string;
  count: number;
}

export const ReportsAnalytics: React.FC = () => {
  const [reports, setReports] = useState<{
    submissionsByOperator: OperatorStat[];
    submissionsByDay: DayStat[];
    plansByProvider: PlanProviderStat[];
    auditEvents: AuditStat[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getReports();
      if (res.success && res.reports) {
        setReports(res.reports);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const totalSubmissions =
    reports?.submissionsByOperator.reduce((acc, curr) => acc + curr.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Reports & Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Operational metrics, telecom operator market shares, and administrative audit trends
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Grid of Report Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Submissions by Operator */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#6426AD]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Submissions by Telecom Operator
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500">{totalSubmissions} Total</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {reports?.submissionsByOperator.map((op) => {
              const pct = totalSubmissions > 0 ? Math.round((op.count / totalSubmissions) * 100) : 0;
              return (
                <div key={op.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{op.name}</span>
                    <span className="text-slate-500">
                      {op.count} submissions ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(pct, op.count > 0 ? 5 : 0)}%`,
                        backgroundColor: op.brandColor || '#6426AD',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Submissions Trend (Last 14 Days) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Submission Volume Trend
              </h2>
            </div>
            <span className="text-xs text-slate-400">Past 14 Days</span>
          </div>

          {reports?.submissionsByDay && reports.submissionsByDay.length > 0 ? (
            <div className="space-y-2 pt-2">
              {reports.submissionsByDay.map((d) => (
                <div key={d.date} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-mono">{d.date}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(d.count * 15, 120)}px` }}
                    />
                    <span className="font-bold text-slate-900 w-6 text-right">{d.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No daily customer submissions recorded in this window yet.
            </div>
          )}
        </div>

        {/* 3. Published Plans Distribution */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Carrier Plans by Operator
              </h2>
            </div>
            <span className="text-xs text-slate-400">Catalog Health</span>
          </div>

          <div className="space-y-3 pt-2">
            {reports?.plansByProvider.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.brandColor || '#6426AD' }}
                  />
                  <span className="font-bold text-slate-900">{p.name}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {p.publishedPlans} Published
                  </span>
                  <span className="text-slate-500 font-medium">
                    {p.totalPlans} Total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Administrative Audit Events Distribution */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Top Administrative Audit Actions
              </h2>
            </div>
            <span className="text-xs text-slate-400">Security & Integrity</span>
          </div>

          <div className="space-y-2 pt-2">
            {reports?.auditEvents.map((a) => (
              <div key={a.action} className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {a.action}
                </span>
                <span className="font-bold text-slate-900">{a.count} events</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

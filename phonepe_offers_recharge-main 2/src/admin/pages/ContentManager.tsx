import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { adminApi } from '../api';

export const ContentManager: React.FC = () => {
  const [settings, setSettings] = useState({
    site_title: 'PhonePe Recharges',
    banner_headline: 'BEST SAVINGS OFFERS!',
    banner_subtitle: 'Save up to 80% on annual & 5G recharge packs',
    countdown_label: 'Special Offer Ends In',
    countdown_visible: 'true',
    banner_visible: 'true',
    announcement_bar: 'Special Festive Recharge Discount Active',
    privacy_notice_text: 'By entering your number, you consent to processing your mobile number and selected operator solely for mobile recharge service estimation and verification.',
    privacy_notice_version: 'v1.0',
    retention_days: '90',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSettings();
      if (res.success && res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load content settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await adminApi.updateSettings(settings);
      setSuccessMsg('Website content and promotional settings saved persistently.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Website Content Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Customize promotional banners, headlines, notice messages, and section visibility
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Promotional Banner Controls */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-[#6426AD]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Promotional Banner Configuration
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Banner Headline *
              </label>
              <input
                type="text"
                required
                value={settings.banner_headline}
                onChange={(e) => setSettings({ ...settings, banner_headline: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Banner Subtitle
              </label>
              <input
                type="text"
                value={settings.banner_subtitle}
                onChange={(e) => setSettings({ ...settings, banner_subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.banner_visible === 'true'}
                  onChange={(e) => setSettings({ ...settings, banner_visible: e.target.checked ? 'true' : 'false' })}
                  className="w-4 h-4 text-[#6426AD] rounded accent-[#6426AD]"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Show Offer Banner</span>
                  <span className="text-[11px] text-slate-500">Enable promotional banner on landing page</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.countdown_visible === 'true'}
                  onChange={(e) => setSettings({ ...settings, countdown_visible: e.target.checked ? 'true' : 'false' })}
                  className="w-4 h-4 text-[#6426AD] rounded accent-[#6426AD]"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Show Countdown Timer</span>
                  <span className="text-[11px] text-slate-500">Display persistent timer above plans</span>
                </div>
              </label>
            </div>
          </div>

          {/* Privacy Notice & Consent Settings */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Customer Privacy & Consent Notice
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Privacy Notice Text (Displayed under mobile input)
              </label>
              <textarea
                rows={3}
                value={settings.privacy_notice_text}
                onChange={(e) => setSettings({ ...settings, privacy_notice_text: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Consent Version
                </label>
                <input
                  type="text"
                  value={settings.privacy_notice_version}
                  onChange={(e) => setSettings({ ...settings, privacy_notice_version: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer Data Retention (Days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.retention_days}
                  onChange={(e) => setSettings({ ...settings, retention_days: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#6426AD] hover:bg-[#521E90] text-white py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Website Settings'}</span>
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Eye className="w-4 h-4 text-[#6426AD]" />
              <span>Live Customer Banner Preview</span>
            </div>

            {/* Banner card preview */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#2A0845] via-[#481272] to-[#2B0847] p-4 text-white shadow-md border border-purple-900/50 text-center">
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-purple-200 mb-1.5 border border-white/15">
                PhonePe Recharges
              </div>
              <h3 className="text-base font-black tracking-tight uppercase text-white drop-shadow">
                {settings.banner_headline || 'BEST SAVINGS OFFERS!'}
              </h3>
              <p className="text-[11px] text-purple-200/90 mt-1">
                {settings.banner_subtitle || 'Save up to 80% with PhonePe Recharge Bonus'}
              </p>

              <div className="mt-3 p-2 bg-purple-950/60 rounded-xl border border-purple-500/30 text-xs">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  2GB/DAY • 84 DAYS • UNLIMITED
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Changes reflect immediately on the customer-facing website once saved.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

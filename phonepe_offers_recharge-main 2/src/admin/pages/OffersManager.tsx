import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../api';

interface SpecialOffer {
  id: string;
  title: string;
  message: string;
  subtitle: string;
  bannerUrl: string;
  providerId: string | null;
  providerName: string | null;
  timerMode: 'duration' | 'fixed';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'active' | 'paused' | 'expired';
  displayOrder: number;
  createdAt: string;
}

export const OffersManager: React.FC = () => {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [formData, setFormData] = useState({
    title: 'BEST SAVINGS OFFERS!',
    message: 'Special 5G Unlimited Recharge Flash Sale',
    subtitle: 'Save up to 80% with PhonePe Recharge Bonus',
    bannerUrl: '',
    providerId: '',
    timerMode: 'duration' as 'duration' | 'fixed',
    durationMinutes: 30,
    startTime: '',
    endTime: '',
    status: 'active' as 'active' | 'paused' | 'expired',
    displayOrder: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOffers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOffers();
      if (res.success) {
        setOffers(res.offers || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const openAddModal = () => {
    setEditingOffer(null);
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 60 * 1000);

    setFormData({
      title: 'BEST SAVINGS OFFERS!',
      message: 'Special 5G Unlimited Recharge Flash Sale',
      subtitle: 'Save up to 80% with PhonePe Recharge Bonus',
      bannerUrl: '',
      providerId: '',
      timerMode: 'duration',
      durationMinutes: 30,
      startTime: now.toISOString().slice(0, 16),
      endTime: future.toISOString().slice(0, 16),
      status: 'active',
      displayOrder: offers.length + 1,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      message: offer.message,
      subtitle: offer.subtitle || '',
      bannerUrl: offer.bannerUrl || '',
      providerId: offer.providerId || '',
      timerMode: offer.timerMode,
      durationMinutes: offer.durationMinutes || 30,
      startTime: offer.startTime ? offer.startTime.slice(0, 16) : '',
      endTime: offer.endTime ? offer.endTime.slice(0, 16) : '',
      status: offer.status,
      displayOrder: offer.displayOrder,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Title and promotional message are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingOffer) {
        await adminApi.updateOffer(editingOffer.id, formData);
        setSuccessMsg(`Offer '${formData.title}' updated successfully.`);
      } else {
        await adminApi.createOffer(formData);
        setSuccessMsg(`Offer '${formData.title}' created and synced with server timer.`);
      }
      setIsModalOpen(false);
      fetchOffers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (offer: SpecialOffer, newStatus: string) => {
    try {
      await adminApi.setOfferStatus(offer.id, newStatus);
      setSuccessMsg(`Offer '${offer.title}' status set to ${newStatus}.`);
      fetchOffers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change status');
    }
  };

  const handleDelete = async (offer: SpecialOffer) => {
    if (confirm(`Are you sure you want to delete offer '${offer.title}'?`)) {
      try {
        await adminApi.deleteOffer(offer.id);
        setSuccessMsg(`Offer deleted.`);
        fetchOffers();
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to delete offer');
      }
    }
  };

  const formatRemaining = (endTimeStr: string) => {
    try {
      const end = new Date(endTimeStr).getTime();
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if (diff === 0) return 'Expired';
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      return `${m}m ${s}s remaining`;
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Special Offers & Countdown Timers
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Configure promotional flash sales and persistent server-backed countdown timers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOffers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6426AD] hover:bg-[#521E90] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Offer</span>
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
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Offers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => {
          const isActive = offer.status === 'active';
          const remainingText = formatRemaining(offer.endTime);

          return (
            <div
              key={offer.id}
              className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
                isActive ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : offer.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {offer.status}
                  </span>

                  <span className="text-xs text-slate-400 font-mono">
                    Mode: {offer.timerMode === 'duration' ? `${offer.durationMinutes}m Campaign` : 'Fixed Deadline'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{offer.title}</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">{offer.message}</p>
                {offer.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{offer.subtitle}</p>
                )}

                {/* Live synchronized countdown box */}
                <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold">Server Deadline:</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {new Date(offer.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    <span className="text-purple-600 font-normal ml-2">({remainingText})</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Order #{offer.displayOrder}</span>

                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <button
                      onClick={() => handleStatusChange(offer, 'paused')}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(offer, 'active')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Activate</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleStatusChange(offer, 'expired')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="End Campaign Early"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => openEditModal(offer)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#6426AD] hover:bg-purple-50 transition-colors cursor-pointer"
                    title="Edit Campaign"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(offer)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Offer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingOffer ? 'Edit Special Offer' : 'Create Special Offer'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Configure promotional message and synchronized campaign deadline
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Offer Headline *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. BEST SAVINGS OFFERS!"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Supporting Message *
                </label>
                <input
                  type="text"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="e.g. Special 5G Unlimited Recharge Flash Sale"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Save up to 80% with PhonePe Recharge Bonus"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              {/* Timer Mode Selection */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                <span className="block text-xs font-bold text-purple-900 uppercase">
                  Countdown Timer Mode
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      formData.timerMode === 'duration'
                        ? 'bg-white border-[#6426AD] text-[#6426AD] font-bold shadow-sm'
                        : 'border-slate-200 text-slate-600 bg-white/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="timerMode"
                      value="duration"
                      checked={formData.timerMode === 'duration'}
                      onChange={() => setFormData({ ...formData, timerMode: 'duration' })}
                      className="hidden"
                    />
                    <span>Duration Campaign (e.g. 30 min)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      formData.timerMode === 'fixed'
                        ? 'bg-white border-[#6426AD] text-[#6426AD] font-bold shadow-sm'
                        : 'border-slate-200 text-slate-600 bg-white/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="timerMode"
                      value="fixed"
                      checked={formData.timerMode === 'fixed'}
                      onChange={() => setFormData({ ...formData, timerMode: 'fixed' })}
                      className="hidden"
                    />
                    <span>Fixed Deadline (Date & Time)</span>
                  </label>
                </div>

                {formData.timerMode === 'duration' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campaign Duration (Minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      {[15, 20, 30, 60, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setFormData({ ...formData, durationMinutes: mins })}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            formData.durationMinutes === mins
                              ? 'bg-[#6426AD] text-white border-[#6426AD]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fixed End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Offer Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  >
                    <option value="active">Active (Synced to visitors)</option>
                    <option value="paused">Paused</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Display Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#6426AD] hover:bg-[#521E90] text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingOffer ? 'Update Campaign' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '../api';
import { OperatorLogo } from '../../components/OperatorLogo';

interface Provider {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
  badgeBg: string;
  textColor: string;
  tagline: string;
  logoUrl: string;
  description: string;
  isActive: number;
  displayOrder: number;
  planCount: number;
  createdAt: string;
  updatedAt: string;
}

export const ProvidersManager: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    brandColor: '#6426AD',
    badgeBg: '#F2EAFE',
    textColor: '#FFFFFF',
    tagline: '',
    logoUrl: '',
    description: '',
    isActive: true,
    displayOrder: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);

  const fetchProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getProviders();
      if (res.success) {
        setProviders(res.providers || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const openAddModal = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      slug: '',
      brandColor: '#6426AD',
      badgeBg: '#F2EAFE',
      textColor: '#FFFFFF',
      tagline: '',
      logoUrl: '',
      description: '',
      isActive: true,
      displayOrder: providers.length + 1,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Provider) => {
    setEditingProvider(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      brandColor: p.brandColor,
      badgeBg: p.badgeBg,
      textColor: p.textColor,
      tagline: p.tagline,
      logoUrl: p.logoUrl,
      description: p.description,
      isActive: p.isActive === 1,
      displayOrder: p.displayOrder,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError('Provider name and slug identifier are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingProvider) {
        await adminApi.updateProvider(editingProvider.id, formData);
        setSuccessMsg(`Provider '${formData.name}' updated successfully.`);
      } else {
        await adminApi.createProvider(formData);
        setSuccessMsg(`Provider '${formData.name}' created successfully.`);
      }
      setIsModalOpen(false);
      fetchProviders();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (p: Provider) => {
    try {
      const res = await adminApi.toggleProvider(p.id);
      setSuccessMsg(res.message);
      fetchProviders();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await adminApi.deleteProvider(deleteTarget.id);
      setSuccessMsg(res.message);
      setDeleteTarget(null);
      fetchProviders();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete provider');
      setDeleteTarget(null);
    }
  };

  const filteredProviders = providers.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-[#6426AD] flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Network Providers
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage telecom operators, brand assets, active visibility, and display priority
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProviders}
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
            <span>Add Network Provider</span>
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

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search provider name or slug..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredProviders.length} of {providers.length} providers
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Identifier / Slug</th>
                <th className="py-3.5 px-4">Brand Accent</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Plans</th>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProviders.map((p) => {
                const isActive = p.isActive === 1;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Operator logo & name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 flex-shrink-0">
                          {p.logoUrl ? (
                            <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <OperatorLogo id={p.slug as any} size={28} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.tagline || 'No tagline'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4">
                      <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono">
                        {p.slug}
                      </code>
                    </td>

                    {/* Color badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full border border-slate-300 shadow-inner"
                          style={{ backgroundColor: p.brandColor }}
                        />
                        <span className="text-xs font-mono text-slate-600">{p.brandColor}</span>
                      </div>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to toggle status on customer website"
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Plans count */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">{p.planCount}</span>
                      <span className="text-slate-400 text-xs ml-1">plans</span>
                    </td>

                    {/* Order */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      #{p.displayOrder}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title={isActive ? 'Disable Provider' : 'Enable Provider'}
                        >
                          <Power className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </button>

                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#6426AD] hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Edit Provider"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Provider"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingProvider ? 'Edit Network Provider' : 'Add Network Provider'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Configure telecom operator details, brand colors, and customer visibility
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Jio, Airtel, Vi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unique Slug *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProvider}
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    placeholder="e.g. jio, airtel, bsnl"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD] disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? '1' : '0'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === '1' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  >
                    <option value="1">Active</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. True 5G Network / Connecting India"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Logo Asset URL
                </label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="/assets/logos/jio.svg or official CDN URL"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Description / Company
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Reliance Jio Infocomm Limited"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
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
                  {isSubmitting ? 'Saving...' : editingProvider ? 'Update Provider' : 'Create Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Delete Provider '{deleteTarget.name}'?
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Permanent deletion is only allowed if this provider has no associated recharge plans and no historical customer submissions.
              <br /><br />
              <strong className="text-slate-800">Recommended:</strong> If you simply want to hide this operator from visitors, use <strong>Disable</strong> instead so past records remain preserved.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Archive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '../api';

interface Plan {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo: string;
  price: number;
  originalPrice: number;
  validity: string;
  dataAllowance: string;
  voice: string;
  sms: string;
  tag: string;
  category: string;
  description: string;
  status: 'draft' | 'published' | 'hidden' | 'archived';
  displayOrder: number;
  createdAt: string;
}

interface ProviderSummary {
  id: string;
  name: string;
}

export const PlansManager: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    providerId: '',
    price: 299,
    originalPrice: 1499,
    validity: '84 Days',
    dataAllowance: '2GB/day',
    voice: 'Unlimited',
    sms: '100/day',
    tag: 'UNLIMITED TRUE 5G DATA',
    category: 'popular',
    description: '',
    status: 'published',
    displayOrder: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProviders = async () => {
    try {
      const res = await adminApi.getProviders();
      if (res.success) {
        setProviders(res.providers || []);
        if (res.providers?.length > 0 && !formData.providerId) {
          setFormData((prev) => ({ ...prev, providerId: res.providers[0].id }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load providers:', err);
    }
  };

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getPlans({
        search: search.trim() || undefined,
        providerId: providerFilter !== 'all' ? providerFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res.success) {
        setPlans(res.plans || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [providerFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlans();
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      providerId: providers[0]?.id || 'jio',
      price: 299,
      originalPrice: 1499,
      validity: '84 Days',
      dataAllowance: '2GB/day',
      voice: 'Unlimited',
      sms: '100/day',
      tag: 'UNLIMITED TRUE 5G DATA',
      category: 'popular',
      description: '',
      status: 'published',
      displayOrder: plans.length + 1,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setFormData({
      providerId: p.providerId,
      price: p.price,
      originalPrice: p.originalPrice,
      validity: p.validity,
      dataAllowance: p.dataAllowance,
      voice: p.voice,
      sms: p.sms,
      tag: p.tag || '',
      category: p.category || 'popular',
      description: p.description || '',
      status: p.status,
      displayOrder: p.displayOrder,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.providerId || formData.price <= 0 || !formData.validity || !formData.dataAllowance) {
      setError('Please fill in provider, non-negative price, validity, and data allowance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, formData);
        setSuccessMsg(`Plan ₹${formData.price} updated successfully.`);
      } else {
        await adminApi.createPlan(formData);
        setSuccessMsg(`Plan ₹${formData.price} created successfully.`);
      }
      setIsModalOpen(false);
      fetchPlans();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (plan: Plan, newStatus: string) => {
    try {
      await adminApi.setPlanStatus(plan.id, newStatus);
      setSuccessMsg(`Plan ₹${plan.price} marked as ${newStatus}.`);
      fetchPlans();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update plan status');
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (confirm(`Are you sure you want to remove plan ₹${plan.price}? If customer records reference it, it will be safely archived instead.`)) {
      try {
        const res = await adminApi.deletePlan(plan.id);
        setSuccessMsg(res.message);
        fetchPlans();
        setTimeout(() => setSuccessMsg(null), 4000);
      } catch (err: any) {
        setError(err.message || 'Failed to delete plan');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'hidden':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'draft':
        return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'archived':
        return 'bg-slate-100 text-slate-500 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Recharge Plans
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage carrier plan bundles, prices, validity, 5G tags, and publication states
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlans}
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
            <span>Add Plan</span>
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

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by price, data, tag..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
          />
        </form>

        <div className="flex items-center gap-2.5 overflow-x-auto text-xs">
          {/* Provider Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 whitespace-nowrap">Operator:</span>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Validity</th>
                <th className="py-3.5 px-4">Data Allowance</th>
                <th className="py-3.5 px-4">Special Tag</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 capitalize">
                    {p.providerName || p.providerId}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-black text-slate-900 text-sm">₹{p.price}</span>
                    <span className="text-slate-400 line-through text-xs ml-1.5">₹{p.originalPrice}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {p.validity}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800">
                    {p.dataAllowance}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.tag ? (
                      <span className="bg-purple-50 text-[#6426AD] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                        {p.tag}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${getStatusBadge(
                        p.status
                      )}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    #{p.displayOrder}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === 'published' ? (
                        <button
                          onClick={() => handleStatusChange(p, 'hidden')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Hide Plan from Customer Website"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(p, 'published')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Publish Plan to Customer Website"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#6426AD] hover:bg-purple-50 transition-colors cursor-pointer"
                        title="Edit Plan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleStatusChange(p, 'archived')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Archive Plan"
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingPlan ? 'Edit Recharge Plan' : 'Add New Plan'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Configure plan benefits, pricing, and customer publication status
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Network Provider *
                  </label>
                  <select
                    value={formData.providerId}
                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  >
                    {providers.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category Tab
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  >
                    <option value="popular">Popular</option>
                    <option value="5g">5G Unlimited</option>
                    <option value="validity">Validity</option>
                    <option value="data">Data Add-on</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Offer Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Validity *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.validity}
                    onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                    placeholder="e.g. 84 Days, 365 Days"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Data Allowance *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dataAllowance}
                    onChange={(e) => setFormData({ ...formData, dataAllowance: e.target.value })}
                    placeholder="e.g. 2GB/day, 3GB/day"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Voice Benefits
                  </label>
                  <input
                    type="text"
                    value={formData.voice}
                    onChange={(e) => setFormData({ ...formData, voice: e.target.value })}
                    placeholder="e.g. Unlimited"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    SMS Benefits
                  </label>
                  <input
                    type="text"
                    value={formData.sms}
                    onChange={(e) => setFormData({ ...formData, sms: e.target.value })}
                    placeholder="e.g. 100/day"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Special Tag (Badge)
                </label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="e.g. UNLIMITED TRUE 5G DATA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Publication Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                  >
                    <option value="published">Published (Visible to Visitors)</option>
                    <option value="hidden">Hidden</option>
                    <option value="draft">Draft (Admin Only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Display Order
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
                  {isSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

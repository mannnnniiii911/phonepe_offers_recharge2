import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  DollarSign,
  Smartphone,
} from 'lucide-react';
import { adminApi } from '../api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface RechargeOrder {
  id: string;
  order_ref: string;
  masked_mobile: string;
  provider_id: string;
  provider_name: string;
  plan_id: string | null;
  plan_price: number;
  plan_snapshot: string;
  planSnapshot?: {
    price?: number;
    validity?: string;
    data?: string;
    voice?: string;
    sms?: string;
  };
  payment_method: string;
  upi_id: string;
  payment_status: 'pending_verification' | 'pending' | 'submitted_for_review' | 'paid' | 'failed' | 'cancelled';
  payment_started_at?: string | null;
  customer_confirmed_at: string | null;
  admin_verified_by: string | null;
  admin_verified_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderStats {
  total: number;
  pending_verification: number;
  paid: number;
  failed: number;
  cancelled: number;
  totalRevenue: number;
}

export const OrdersManager: React.FC = () => {
  const { user } = useAdminAuth();
  const canModify = user?.role === 'owner' || user?.role === 'manager';

  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Action / Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<RechargeOrder | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getOrders({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: 15,
      });
      if (data.success) {
        setOrders(data.orders || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await adminApi.getOrderStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Failed to fetch order stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleStatusUpdate = async (newStatus: 'paid' | 'failed' | 'cancelled') => {
    if (!selectedOrder || !canModify) return;
    setUpdatingStatus(true);
    setActionSuccess(null);
    try {
      await adminApi.updateOrderStatus(selectedOrder.id, {
        status: newStatus,
        notes: adminNote.trim() || undefined,
      });

      setActionSuccess(`Order updated to ${newStatus.toUpperCase()}`);
      // Refresh list & stats
      fetchOrders();
      fetchStats();
      // Update local selectedOrder
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              payment_status: newStatus,
              admin_notes: adminNote.trim() || prev.admin_notes,
              admin_verified_by: user?.username || prev.admin_verified_by,
              admin_verified_at: new Date().toISOString(),
            }
          : null
      );
    } catch (err: any) {
      alert(`Error updating order: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Paid
          </span>
        );
      case 'pending_verification':
      case 'submitted_for_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Verification
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Payment Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejected / Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-[#6426AD]" />
            Recharge Orders & UPI Payments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tracking of UPI payment requests, manual verification, and customer transactions.
          </p>
        </div>

        <button
          onClick={() => {
            fetchOrders();
            fetchStats();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6426AD] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {statsLoading ? '...' : stats?.total || 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">All created intents</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Needs Verification</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">
            {statsLoading ? '...' : (stats?.pending_verification ?? 0)}
          </p>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">Awaiting manual check</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Verified Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">
            {statsLoading ? '...' : stats?.paid || 0}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">Approved & completed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ₹{statsLoading ? '...' : (stats?.totalRevenue || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">From verified payments</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order Ref, Masked Mobile, Operator..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6426AD] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6426AD] transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="pending_verification">Awaiting Manual Verification</option>
              <option value="paid">Verified Paid</option>
              <option value="failed">Rejected / Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-[#6426AD]" />
            <p className="text-sm font-medium">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">No Orders Found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search filters'
                : 'Orders created by customers will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Operator & Plan</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Method / UPI</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#6426AD]">
                      {order.order_ref}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.masked_mobile}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{order.provider_name}</div>
                      {order.planSnapshot?.validity && (
                        <div className="text-[11px] text-slate-400">
                          {order.planSnapshot.validity} • {order.planSnapshot.data || ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      ₹{order.plan_price}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold capitalize text-slate-700">
                        {order.payment_method}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate max-w-[120px]">
                        {order.upi_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(order.payment_status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setAdminNote(order.admin_notes || '');
                          setActionSuccess(null);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#6426AD] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-700">{orders.length}</span> of{' '}
              <span className="font-bold text-slate-700">{totalCount}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail & Management Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6426AD] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Order {selectedOrder.order_ref}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Created on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {actionSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-600">Current Status:</span>
                <div>{getStatusBadge(selectedOrder.payment_status)}</div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Customer Mobile</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedOrder.masked_mobile}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Recharge Amount</span>
                  <span className="font-black text-[#6426AD] text-lg">
                    ₹{selectedOrder.plan_price}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Operator</span>
                  <span className="font-bold text-slate-800">
                    {selectedOrder.provider_name}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block mb-1">Payment Method</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {selectedOrder.payment_method}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Configured UPI ID:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedOrder.upi_id}
                  </span>
                </div>
                {selectedOrder.payment_started_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Window Started:</span>
                    <span className="font-medium text-purple-800">
                      {new Date(selectedOrder.payment_started_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {selectedOrder.admin_verified_by && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verified By Admin:</span>
                    <span className="font-medium text-slate-700">
                      @{selectedOrder.admin_verified_by}{' '}
                      {selectedOrder.admin_verified_at &&
                        `(${new Date(selectedOrder.admin_verified_at).toLocaleDateString('en-IN')})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Plan Snapshot */}
              {selectedOrder.planSnapshot && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="font-bold text-slate-700 mb-1">Selected Plan Benefits:</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400">Validity: </span>
                      <span className="font-medium">{selectedOrder.planSnapshot.validity || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Data: </span>
                      <span className="font-medium">{selectedOrder.planSnapshot.data || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Voice: </span>
                      <span className="font-medium">{selectedOrder.planSnapshot.voice || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">SMS: </span>
                      <span className="font-medium">{selectedOrder.planSnapshot.sms || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes Field */}
              {canModify && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Notes / UTR / Reference Info:
                  </label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="e.g. Bank statement matched, UTR: 123456789012, or reason for rejection"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6426AD] transition-all"
                  />
                </div>
              )}

              {/* Action Buttons for Owner / Manager */}
              {canModify ? (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-700">Update Order Status:</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      disabled={updatingStatus || selectedOrder.payment_status === 'paid'}
                      onClick={() => handleStatusUpdate('paid')}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve (Paid)
                    </button>

                    <button
                      disabled={updatingStatus || selectedOrder.payment_status === 'failed'}
                      onClick={() => handleStatusUpdate('failed')}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject (Failed)
                    </button>

                    <button
                      disabled={updatingStatus || selectedOrder.payment_status === 'cancelled'}
                      onClick={() => handleStatusUpdate('cancelled')}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  Viewer mode: You do not have permissions to modify payment statuses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

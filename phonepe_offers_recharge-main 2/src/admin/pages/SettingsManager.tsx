import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Headphones,
  QrCode,
} from 'lucide-react';
import { adminApi } from '../api';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminAccount {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'manager' | 'viewer';
  status: 'active' | 'inactive';
  createdAt: string;
}

export const SettingsManager: React.FC = () => {
  const { user } = useAdminAuth();
  const [adminUsers, setAdminUsers] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Customer Support Contact
  const [supportContact, setSupportContact] = useState('');
  const [isSavingSupport, setIsSavingSupport] = useState(false);

  // Payment Settings (QR Code only; receiver UPI ID is hardcoded in src/config/payment.ts)
  const [currentQrUrl, setCurrentQrUrl] = useState('/assets/upi-qr.jpg');
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Add User Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'manager' | 'viewer'>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      if (res.success && res.settings) {
        setSupportContact(res.settings.customer_support_contact || res.settings.support_contact || '');
        if (res.settings.qr_code_url) {
          setCurrentQrUrl(res.settings.qr_code_url);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'owner') return;
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers();
      if (res.success) {
        setAdminUsers(res.users || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, [user]);

  const handleSaveSupportContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSupport(true);
    setError(null);
    try {
      await adminApi.updateSettings({ customer_support_contact: supportContact.trim() });
      setSuccessMsg('Customer support contact updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update customer support contact.');
    } finally {
      setIsSavingSupport(false);
    }
  };

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type (JPEG, PNG, WebP)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPaymentError('Invalid file format. Please upload a JPEG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setPaymentError('Image size exceeds 2MB limit. Please choose an image smaller than 2MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewQrUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setPaymentError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(null);

    setIsSavingPayment(true);
    try {
      const payload: Record<string, string> = {};
      if (previewQrUrl) {
        payload.qr_code_url = previewQrUrl;
      }

      await adminApi.updateSettings(payload);

      if (previewQrUrl) {
        setCurrentQrUrl(previewQrUrl);
        setPreviewQrUrl(null);
      }
      setPaymentSuccess('QR code updated successfully. The receiver UPI ID remains hardcoded in the application.');
      setTimeout(() => setPaymentSuccess(null), 5000);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to update payment settings.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newEmail || !newPassword) {
      setError('Username, email, and password are required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await adminApi.createUser({
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });

      setSuccessMsg(`Administrator '${newUsername}' created with role '${newRole}'.`);
      setIsAddUserModalOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUser: AdminAccount, role: string) => {
    try {
      await adminApi.updateUserRole(targetUser.id, { role });
      setSuccessMsg(`Role for '${targetUser.username}' updated to '${role}'.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (targetUser: AdminAccount) => {
    if (confirm(`Are you sure you want to delete administrator '${targetUser.username}'?`)) {
      try {
        await adminApi.deleteUser(targetUser.id);
        setSuccessMsg(`Administrator '${targetUser.username}' deleted.`);
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-purple-100 text-[#6426AD] flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Settings & Access Control
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Role-Based Access Control (RBAC), administrative accounts, and system configuration
            </p>
          </div>
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

      {/* Payment Settings Configuration */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#6426AD]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Payment Settings
            </h2>
          </div>
          <span className="text-[11px] font-semibold bg-purple-50 text-[#6426AD] px-2.5 py-0.5 rounded-full border border-purple-200">
            QR Code Management
          </span>
        </div>

        {paymentSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{paymentSuccess}</span>
          </div>
        )}

        {paymentError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        <form onSubmit={handleSavePaymentSettings} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload and manage the QR code displayed on checkout. The receiver UPI ID is hardcoded in the application and cannot be changed from the admin panel.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* QR Code Upload Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Upload New QR Code Image
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleQrFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-[#6426AD] hover:file:bg-purple-200 file:cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Supported formats: PNG, JPEG, WebP. Maximum file size: 2MB.
              </p>
            </div>
          </div>

          {/* QR Code Preview Card */}
          <div className="pt-1">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-32 h-32 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2 flex-shrink-0 shadow-sm">
                <img
                  src={previewQrUrl || currentQrUrl}
                  alt="Payment QR Code Preview"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {previewQrUrl ? 'New QR Code Selected (Unsaved Preview)' : 'Current Active QR Code'}
                  </span>
                  {previewQrUrl && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Pending Save
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {previewQrUrl
                    ? 'Click "Save QR Code" below to persist this QR code and immediately update the checkout page.'
                    : 'This QR code is currently visible to customers on the checkout page.'}
                </p>
                {previewQrUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewQrUrl(null)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
                  >
                    Discard selection and keep current QR
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingPayment}
              className="px-6 py-2.5 bg-[#6426AD] hover:bg-[#521E90] text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSavingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving QR Code...</span>
                </>
              ) : (
                <span>Save Payment Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Customer Support Contact Configuration */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Headphones className="w-4 h-4 text-[#6426AD]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Customer Support & 24-Hour Notice Configuration
          </h2>
        </div>

        <form onSubmit={handleSaveSupportContact} className="space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            Configure the official customer support channel (e.g., support email or helpline). This will be shown to customers on checkout notices and when the 2-minute payment guidance window expires:
            <span className="block italic mt-1 text-slate-500 font-medium">
              "Recharge not completed within 24 hours? Please contact customer support for assistance."
            </span>
            If left blank, only the general text notice is shown without inventing any contact details.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <input
              type="text"
              value={supportContact}
              onChange={(e) => setSupportContact(e.target.value)}
              placeholder="e.g. support@domain.com or +91-XXXXX-XXXXX"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
            />
            <button
              type="submit"
              disabled={isSavingSupport}
              className="px-5 py-2.5 bg-[#6426AD] hover:bg-[#521E90] text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSavingSupport ? 'Saving...' : 'Save Support Contact'}
            </button>
          </div>
        </form>
      </div>

      {/* Role Descriptions Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Shield className="w-4 h-4 text-[#6426AD]" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Role-Based Access Control (RBAC) Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-900 uppercase tracking-wide">Owner</span>
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">Full Access</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Full administrative access. Manages administrator accounts, security settings, providers, plans, offers, customer records, and data retention policies.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-purple-900 uppercase tracking-wide">Content Manager</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold text-[10px]">Content & Plans</span>
            </div>
            <p className="text-purple-800 leading-relaxed">
              Manages telecom providers, recharge plans, promotional banners, and offers. Cannot manage administrator accounts or delete historical submissions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-900 uppercase tracking-wide">Support Viewer</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold text-[10px]">Read Only</span>
            </div>
            <p className="text-blue-800 leading-relaxed">
              Views permitted operational information and metrics. Sees masked customer numbers by default. Cannot alter system settings or export bulk customer records.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Accounts Table (Owner Only) */}
      {user?.role === 'owner' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#6426AD]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Administrator Accounts ({adminUsers.length})
              </h2>
            </div>

            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6426AD] hover:bg-[#521E90] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Administrator</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Loading administrator accounts...
                    </td>
                  </tr>
                ) : adminUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.username}
                      {u.id === user.id && (
                        <span className="text-[10px] ml-1.5 text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded font-bold">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        disabled={u.id === user.id}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Content Manager</option>
                        <option value="viewer">Support Viewer</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Administrator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-500">
          User account management is restricted to the platform Owner role.
        </div>
      )}

      {/* Add Administrator Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Add Administrator
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Create a new authenticated administrator with specific RBAC role
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. manager_sarah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. sarah@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6426AD]"
                >
                  <option value="viewer">Support Viewer (Read-only, masked numbers)</option>
                  <option value="manager">Content Manager (Providers, plans & offers)</option>
                  <option value="owner">Owner (Full administrative access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#6426AD] hover:bg-[#521E90] text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

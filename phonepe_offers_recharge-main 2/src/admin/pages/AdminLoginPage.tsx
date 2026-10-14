import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { PhonePeLogo } from '../../components/PhonePeLogo';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to admin dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both username/email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(identifier.trim(), password);
      if (result.success) {
        navigate('/admin', { replace: true });
      } else {
        setError(result.error || 'Invalid credentials.');
      }
    } catch {
      setError('Failed to communicate with authentication service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#120726] via-[#1E0E3D] to-[#2B0E52] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6426AD] to-[#8035D4] text-white shadow-lg mb-3 border border-purple-300/30">
            <PhonePeLogo className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-[#151B2B] tracking-tight">Admin Portal</h1>
          <p className="text-xs sm:text-sm text-[#71809A] mt-1 font-medium">
            Secure administrative control center for PhonePe Recharges
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs sm:text-sm animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username or Email field */}
          <div>
            <label className="block text-xs font-bold text-[#151B2B] uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                placeholder="admin or admin@phonepe-recharge.local"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6426AD] focus:bg-white transition-all"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-[#151B2B] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter administrator password"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6426AD] focus:bg-white transition-all"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-[#6426AD] to-[#7D2ECF] text-white py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-900/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign in to Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge and hint */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-center text-xs text-[#71809A]">
          <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-semibold border border-green-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted Session • Rate-Limit Protected</span>
          </div>

          <div className="text-[11px] text-slate-400 mt-1">
            Authorized administrative personnel only. All access attempts are audited.
          </div>
        </div>
      </div>
    </div>
  );
};

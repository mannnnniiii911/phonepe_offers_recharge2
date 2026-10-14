import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { CountdownCard } from '../components/CountdownCard';
import { OfferBanner } from '../components/OfferBanner';
import { OperatorSelector } from '../components/OperatorSelector';
import { MobileNumberInput } from '../components/MobileNumberInput';
import { TrustFooter } from '../components/TrustFooter';
import { useRecharge } from '../context/RechargeContext';

export const RechargePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedOperator, mobileNumber, validateMobileNumber } = useRecharge();
  const [error, setError] = useState<string>('');
  const [verificationState, setVerificationState] = useState<'idle' | 'verifying' | 'verified'>('idle');

  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleRechargeNow = (e: React.FormEvent) => {
    e.preventDefault();

    // Requirement 5: Validate operator selection first
    if (!selectedOperator) {
      setError('Please select your SIM operator first.');
      return;
    }

    const validation = validateMobileNumber(mobileNumber);

    if (!validation.isValid) {
      setError(validation.message);
      const inputEl = document.getElementById('mobile-number-input');
      inputEl?.focus();
      return;
    }

    setError('');

    // Record submission securely to backend database with explicit consent
    fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber,
        providerId: selectedOperator,
        consentVersion: 'v1.0',
      }),
    }).catch((err) => console.warn('Submission recording notice:', err));

    // Step A: Start purple verification animation
    setVerificationState('verifying');

    // Simulate verification delay (1.2s)
    verifyTimerRef.current = setTimeout(() => {
      // Step B: Transition to green verified state
      setVerificationState('verified');

      // Keep verified state visible briefly (0.9s), then navigate to Recharge Plans
      successTimerRef.current = setTimeout(() => {
        navigate('/plans');
      }, 900);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F1F3F9] pb-12">
      {/* Header */}
      <AppHeader
        title="Mobile Recharge"
        subtitle="Fast • Secure • Simple"
      />

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Countdown Timer */}
        <CountdownCard />

        {/* Promotional Offers Banner */}
        <OfferBanner />

        {/* Recharge Form Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E7E8EF] shadow-sm">
          {/* Card Title Row */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#E7E8EF]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2EAFE] text-[#6426AD] flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#151B2B]">
                  Recharge your mobile
                </h2>
                <p className="text-xs text-[#71809A]">
                  Select operator and enter number
                </p>
              </div>
            </div>

            {/* SECURE badge */}
            <div className="flex items-center gap-1 bg-green-50 text-[#16A34A] border border-green-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SECURE</span>
            </div>
          </div>

          <form onSubmit={handleRechargeNow} className="space-y-4">
            {/* Operator Selection */}
            <OperatorSelector onSelect={() => setError('')} />

            {/* Mobile Number Input */}
            <MobileNumberInput
              error={error}
              onErrorChange={(err) => {
                setError(err);
                setVerificationState('idle');
              }}
            />

            {/* Privacy & Consent Notice */}
            <div className="flex items-start gap-1.5 px-1 py-0.5 text-[11px] text-[#71809A] leading-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0 mt-0.5" />
              <span>
                By continuing, you agree that your mobile number and operator will be processed securely for recharge services under our{' '}
                <span className="text-[#6426AD] font-semibold underline">Privacy Notice</span>.
              </span>
            </div>

            {/* Step A: Purple Verification Status Banner */}
            {verificationState === 'verifying' && (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F2EAFE]/70 border border-purple-200 animate-in fade-in zoom-in-95 duration-200 text-center">
                <div className="w-9 h-9 rounded-full border-3 border-purple-200 border-t-[#6426AD] animate-spin mb-2" />
                <span className="text-sm font-bold text-[#6426AD]">
                  Verifying Mobile Number...
                </span>
                <span className="text-[11px] text-[#71809A] mt-0.5">
                  Simulating operator validation check
                </span>
              </div>
            )}

            {/* Step B: Green Verified State Banner */}
            {verificationState === 'verified' && (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-green-50 border border-green-200 animate-in fade-in zoom-in-95 duration-200 text-center">
                <div className="w-9 h-9 rounded-full border-2 border-[#16A34A] bg-white flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                  <Check className="w-5 h-5 text-[#16A34A] stroke-[3]" />
                </div>
                <span className="text-sm font-bold text-[#16A34A]">
                  Mobile Number Verified
                </span>
                <span className="text-[11px] text-green-700/80 mt-0.5">
                  Demo Check Complete • Opening Plans...
                </span>
              </div>
            )}

            {/* Recharge Now Button */}
            <button
              type="submit"
              disabled={verificationState !== 'idle'}
              className={`w-full mt-2 bg-phonepe-btn text-white py-3.5 sm:py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all ${
                verificationState !== 'idle'
                  ? 'opacity-70 cursor-not-allowed'
                  : 'active:scale-[0.99] cursor-pointer'
              }`}
            >
              {verificationState === 'verifying' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : verificationState === 'verified' ? (
                <>
                  <Check className="w-5 h-5 text-white stroke-[3]" />
                  <span>Verified</span>
                </>
              ) : (
                <>
                  <span>Recharge Now</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Trust Footer */}
          <div className="mt-4 pt-2">
            <TrustFooter />
          </div>
        </div>
      </main>
    </div>
  );
};

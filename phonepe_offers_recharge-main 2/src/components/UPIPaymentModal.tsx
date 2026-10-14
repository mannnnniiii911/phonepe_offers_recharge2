import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
  QrCode,
  Headphones,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useRecharge } from '../context/RechargeContext';
import { OPERATORS } from '../data/operators';
import { PAYMENT_CONFIG, generateAppDeepLink, generateOrderId } from '../config/payment';
import { QRPaymentPanel } from './QRPaymentPanel';
import { trackPaymentClick, type TrackablePaymentOption } from '../utils/trackPaymentClick';

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UPIPaymentModal: React.FC<UPIPaymentModalProps> = ({ isOpen, onClose }) => {
  const {
    selectedOperator,
    mobileNumber,
    selectedPlan,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    resetRecharge,
  } = useRecharge();

  // Active view: 'qr' or 'app'
  const [activeMode, setActiveMode] = useState<'qr' | 'app'>('app');

  const [orderRef, setOrderRef] = useState<string>('');
  const [, setOrderCreated] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string>('');
  const [supportContact, setSupportContact] = useState<string>('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [activeUpiId] = useState<string>(PAYMENT_CONFIG.upiId);
  const [activeQrCodeUrl, setActiveQrCodeUrl] = useState<string>(PAYMENT_CONFIG.qrCodePath);

  // App Payment Flow: 3.5-minute (210s) countdown state (starts ONLY when button is clicked)
  const [appPaymentStarted, setAppPaymentStarted] = useState(false);
  const [appSecondsRemaining, setAppSecondsRemaining] = useState<number>(210);
  const appTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const operator = (selectedOperator && OPERATORS[selectedOperator]) || OPERATORS.jio;
  const amount = selectedPlan ? selectedPlan.price : 0;

  // Refs for race-condition prevention, deduplication, and stale closure mitigation
  const orderCreatedRef = useRef<string | null>(null);
  const inFlightPromiseRef = useRef<Promise<boolean> | null>(null);
  const latestParamsRef = useRef({
    mobileNumber,
    selectedOperator,
    providerName: operator.name,
    selectedPlan,
    amount,
    activeMode,
    selectedPaymentMethod,
    activeUpiId,
    orderRef,
  });

  latestParamsRef.current = {
    mobileNumber,
    selectedOperator,
    providerName: operator.name,
    selectedPlan,
    amount,
    activeMode,
    selectedPaymentMethod,
    activeUpiId,
    orderRef,
  };

  // Sync mode with selectedPaymentMethod on open
  useEffect(() => {
    if (isOpen) {
      if (selectedPaymentMethod === 'qr') {
        setActiveMode('qr');
      } else {
        setActiveMode('app');
      }
    }
  }, [isOpen, selectedPaymentMethod]);

  // Fetch website settings for support contact, upiId, and qrCodeUrl
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          if (data.settings.customerSupportContact) {
            setSupportContact(data.settings.customerSupportContact);
          }
          // UPI ID is intentionally hardcoded in PAYMENT_CONFIG; API settings must not override it.
          if (data.settings.qrCodeUrl) {
            setActiveQrCodeUrl(data.settings.qrCodeUrl);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Initialize order reference
  useEffect(() => {
    if (isOpen) {
      const existingRef = sessionStorage.getItem('current_active_order_ref');
      const targetRef = existingRef || generateOrderId();
      if (!existingRef) {
        sessionStorage.setItem('current_active_order_ref', targetRef);
      }
      setOrderRef(targetRef);

      // Check if app payment timer has already started for this order
      const storedAppStartTime = localStorage.getItem(`app_payment_start_${targetRef}`);
      if (storedAppStartTime) {
        const startTime = parseInt(storedAppStartTime, 10);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 210 - elapsed);
        setAppPaymentStarted(true);
        setAppSecondsRemaining(remaining);
      } else {
        setAppPaymentStarted(false);
        setAppSecondsRemaining(210);
      }

      setError('');
    }

    return () => {
      if (appTimerIntervalRef.current) clearInterval(appTimerIntervalRef.current);
    };
  }, [isOpen]);

  // Active 2-minute countdown timer for app payments
  useEffect(() => {
    if (appPaymentStarted && orderRef) {
      const storedAppStartTime = localStorage.getItem(`app_payment_start_${orderRef}`);
      const startTime = storedAppStartTime ? parseInt(storedAppStartTime, 10) : Date.now();

      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 210 - elapsed);
        setAppSecondsRemaining(remaining);
      };

      updateTimer();
      appTimerIntervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (appTimerIntervalRef.current) clearInterval(appTimerIntervalRef.current);
      };
    }
  }, [appPaymentStarted, orderRef]);

  // Create order in backend (idempotent, guarded against duplicate requests, loops & race conditions)
  const ensureOrderCreated = useCallback(async (customOrderRef?: string): Promise<boolean> => {
    const params = latestParamsRef.current;
    const targetRef = customOrderRef || params.orderRef;

    if (!targetRef) return false;
    if (orderCreatedRef.current === targetRef) return true;

    // If an order-creation request is already in-flight for this order, safely await the same promise
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    setIsCreatingOrder(true);
    setError('');

    const createPromise = (async () => {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            mobileNumber: params.mobileNumber,
            providerId: params.selectedOperator,
            providerName: params.providerName,
            planId: params.selectedPlan?.id,
            planPrice: params.amount,
            planSnapshot: params.selectedPlan
              ? {
                  price: params.selectedPlan.price,
                  validity: params.selectedPlan.validity,
                  data: params.selectedPlan.data,
                  voice: params.selectedPlan.voice,
                  sms: params.selectedPlan.sms,
                }
              : {},
            paymentMethod: params.activeMode === 'qr' ? 'qr' : params.selectedPaymentMethod,
            upiId: params.activeUpiId,
            orderRef: targetRef,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize payment order');
        }

        orderCreatedRef.current = targetRef;
        setOrderCreated(true);
        return true;
      } catch (err: any) {
        setError(err.message || 'Could not record order. Please try again.');
        return false;
      } finally {
        inFlightPromiseRef.current = null;
        setIsCreatingOrder(false);
      }
    })();

    inFlightPromiseRef.current = createPromise;
    return createPromise;
  }, []);

  // Automatically ensure order is recorded when payment modal opens (both App and QR modes)
  useEffect(() => {
    if (isOpen && orderRef && orderCreatedRef.current !== orderRef) {
      ensureOrderCreated(orderRef);
    }
  }, [isOpen, orderRef, ensureOrderCreated]);

  // Open App Button Handler: launches app AND starts 3.5-minute countdown
  const handleOpenUPIApp = () => {
    // Record order in backend in background if not already recorded
    ensureOrderCreated(orderRef).catch((err) => console.warn('Order record notice:', err));

    // Track app payment click immediately
    const trackingOpt: TrackablePaymentOption | null = selectedPaymentMethod === 'paytm' ? 'paytm' : selectedPaymentMethod === 'gpay' ? 'google_pay' : selectedPaymentMethod === 'phonepe' ? 'phonepe' : null;
    if (trackingOpt) trackPaymentClick(trackingOpt, orderRef);

    // Start 3.5-minute (210s) countdown only when clicked
    const now = Date.now();
    localStorage.setItem(`app_payment_start_${orderRef}`, String(now));
    setAppPaymentStarted(true);
    setAppSecondsRemaining(210);

    // Generate targeted deep link for PhonePe / Paytm on Android & iOS
    const appType: 'phonepe' | 'paytm' | 'gpay' | 'navi' | 'axis' | 'bhim' = selectedPaymentMethod === 'paytm' ? 'paytm' : selectedPaymentMethod === 'gpay' ? 'gpay' : selectedPaymentMethod === 'navi' ? 'navi' : selectedPaymentMethod === 'axis' ? 'axis' : selectedPaymentMethod === 'bhim' ? 'bhim' : 'phonepe';
    const appDeepLink = generateAppDeepLink(appType, {
      amount,
      orderId: orderRef,
      note: `${operator.name} Recharge`,
      upiId: activeUpiId,
    });

    // Launch target UPI app directly within user gesture
    window.location.href = appDeepLink;
  };

  // Copy UPI ID
  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(activeUpiId);
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2500);
    } catch {
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2500);
    }
  };

  const handleStartNewOrder = () => {
    sessionStorage.removeItem('current_active_order_ref');
    if (orderRef) {
      localStorage.removeItem(`app_payment_start_${orderRef}`);
      localStorage.removeItem(`qr_session_start_${orderRef}`);
    }
    orderCreatedRef.current = null;
    inFlightPromiseRef.current = null;
    setOrderCreated(false);
    onClose();
    resetRecharge();
  };

  if (!isOpen) return null;

  const appName = selectedPaymentMethod === 'paytm' ? 'Paytm' : selectedPaymentMethod === 'gpay' ? 'Google Pay' : selectedPaymentMethod === 'navi' ? 'Navi' : selectedPaymentMethod === 'axis' ? 'Axis Bank' : selectedPaymentMethod === 'bhim' ? 'BHIM UPI' : 'PhonePe';
  const formatAppTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isAppTimerExpired = appPaymentStarted && appSecondsRemaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-purple-100 relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer z-10"
          aria-label="Close Payment Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Payment Method Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => {
                setActiveMode('app');
                if (selectedPaymentMethod === 'qr') {
                  setSelectedPaymentMethod('phonepe');
                }
                const opt: TrackablePaymentOption | null = selectedPaymentMethod === 'paytm' ? 'paytm' : selectedPaymentMethod === 'gpay' ? 'google_pay' : selectedPaymentMethod === 'phonepe' ? 'phonepe' : null;
                if (opt) trackPaymentClick(opt, orderRef);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'app'
                  ? 'bg-white text-[#6426AD] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {appName} App
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('qr');
                setSelectedPaymentMethod('qr');
                trackPaymentClick('qr_code', orderRef);
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeMode === 'qr'
                  ? 'bg-white text-[#6426AD] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION A: DEDICATED QR PAYMENT PANEL (MATCHES SCREENSHOT) */}
          {/* ======================================================== */}
          {activeMode === 'qr' ? (
            <div className="space-y-4">
              <QRPaymentPanel
                amount={amount}
                orderRef={orderRef}
                supportContact={supportContact}
                qrCodeUrl={activeQrCodeUrl}
              />

              {/* UPI ID Copy for flexibility */}
              <div className="flex items-center justify-between bg-slate-50 rounded-2xl border border-slate-200 p-3 text-xs">
                <div>
                  <div className="text-[10px] text-[#71809A] font-semibold uppercase tracking-wider">UPI ID</div>
                  <div className="font-mono font-bold text-slate-800">{activeUpiId}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUPI}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    upiCopied
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-purple-100 text-[#6426AD] hover:bg-purple-200'
                  }`}
                >
                  {upiCopied ? <Check className="w-3.5 h-3.5 inline mr-1" /> : <Copy className="w-3.5 h-3.5 inline mr-1" />}
                  {upiCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* SECTION B: UPI APP PAYMENT FLOW                         */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Plan & Amount Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Order Reference:</span>
                  <span className="font-mono font-bold text-[#6426AD]">{orderRef}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Operator & Number:</span>
                  <span className="font-bold text-slate-800">{operator.name} • +91 {mobileNumber}</span>
                </div>
                <hr className="border-slate-200 my-1" />
                <div className="flex justify-between items-baseline pt-0.5">
                  <span className="font-bold text-slate-800">Amount to Pay:</span>
                  <span className="text-xl font-extrabold text-[#6426AD]">₹{amount}</span>
                </div>
              </div>

              {/* Action Button: "Open PhonePe to Pay ₹X" / "Open Paytm to Pay ₹X" */}
              <button
                type="button"
                onClick={handleOpenUPIApp}
                disabled={isCreatingOrder}
                className="w-full bg-phonepe-btn text-white py-3.5 sm:py-4 px-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5" />
                    <span>Open {appName} to Pay ₹{amount}</span>
                  </>
                )}
              </button>

              {/* Once clicked: Show ONLY the simple, professional message + 2-minute countdown */}
              {appPaymentStarted && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* Simple professional message (NO stickers, NO false completion graphics) */}
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium text-center">
                    Payment link opened. Complete your payment in your UPI app.
                  </div>

                  {/* Clean 2-Minute Timer Box */}
                  <div
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      isAppTimerExpired
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-purple-50/70 border-purple-200 text-[#6426AD]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {isAppTimerExpired ? 'Payment Window Status' : 'Payment Guidance Window'}
                      </span>
                    </div>

                    <div className="font-mono font-black text-2xl mt-1 tracking-wider">
                      {isAppTimerExpired ? '00:00' : formatAppTimer(appSecondsRemaining)}
                    </div>

                    {isAppTimerExpired ? (
                      <div className="mt-2 text-xs text-rose-800 space-y-1">
                        <p className="font-bold text-rose-950">
                          Payment window ended. Payment has not been verified.
                        </p>
                        <p className="text-[11px] text-rose-700">
                          This countdown is for guidance and does not automatically verify payment. If you have completed payment, it remains recorded for manual administrative review.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-purple-800/80">
                        Please finish your recharge payment in your {appName} app within this window.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Switch to QR option */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('qr');
                    setSelectedPaymentMethod('qr');
                    trackPaymentClick('qr_code', orderRef);
                  }}
                  className="text-xs font-bold text-[#6426AD] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Prefer to scan QR Code instead?</span>
                </button>
              </div>

              {/* 24-Hour Customer Support Notice — ONLY displayed after 210s timer expires */}
              {isAppTimerExpired && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <Headphones className="w-4 h-4 text-[#6426AD] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        Recharge not completed within 24 hours? Please contact customer support for assistance.
                      </p>
                      {supportContact && (
                        <p className="text-slate-600 mt-1 font-medium">
                          Support Contact: <span className="font-bold text-[#6426AD]">{supportContact}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleStartNewOrder}
              className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              New Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

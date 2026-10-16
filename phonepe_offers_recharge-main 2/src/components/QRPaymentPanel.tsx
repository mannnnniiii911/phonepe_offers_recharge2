import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, AlertTriangle, Headphones } from 'lucide-react';
import { PAYMENT_CONFIG } from '../config/payment';

interface QRPaymentPanelProps {
  amount: number;
  orderRef: string;
  supportContact?: string;
  qrCodeUrl?: string;
}

export const QRPaymentPanel: React.FC<QRPaymentPanelProps> = ({ amount, orderRef, supportContact, qrCodeUrl }) => {
  const activeQrPath = qrCodeUrl || PAYMENT_CONFIG.qrCodePath;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    const stored = localStorage.getItem(`qr_session_start_${orderRef}`);
    return stored ? parseInt(stored, 10) : Date.now();
  });
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize or resume persistent 5-minute countdown (300 seconds) for this order
  useEffect(() => {
    const storageKey = `qr_session_start_${orderRef}`;
    const storedTime = localStorage.getItem(storageKey);

    let startTime: number;
    if (storedTime) {
      startTime = parseInt(storedTime, 10);
    } else {
      startTime = Date.now();
      localStorage.setItem(storageKey, String(startTime));
    }
    setSessionStartTime(startTime);

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setSecondsRemaining(remaining);
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [orderRef, sessionStartTime]);

  // Restart 5-minute session on explicit user action
  const handleRestartSession = () => {
    const newStartTime = Date.now();
    localStorage.setItem(`qr_session_start_${orderRef}`, String(newStartTime));
    setSessionStartTime(newStartTime);
    setSecondsRemaining(300);
  };

  // Format countdown in MM:SS format (e.g. "Expires in 4:59")
  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Save/Download QR image
  const handleSaveQR = () => {
    const anchor = document.createElement('a');
    anchor.href = activeQrPath;
    anchor.download = `recharge-qr-₹${amount}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const isExpired = secondsRemaining <= 0;

  return (
    <div className="w-full max-w-sm mx-auto rounded-3xl bg-[#FAF5FF] border-2 border-dashed border-[#8B5CF6]/60 p-5 sm:p-6 text-center space-y-3.5 shadow-sm">
      {/* 1. Heading */}
      <h3 className="text-xl sm:text-2xl font-black text-[#1E1136] tracking-tight">
        Scan & Pay
      </h3>

      {/* 2. Amount */}
      <div className="text-base sm:text-lg font-extrabold text-[#6426AD]">
        Amount: ₹{amount}
      </div>

      {/* 3. Five-minute countdown */}
      {!isExpired ? (
        <div className="text-xs sm:text-sm font-semibold text-[#6426AD] bg-purple-100/70 inline-block px-3 py-1 rounded-full">
          Expires in {formatCountdown(secondsRemaining)}
        </div>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 space-y-2.5">
          <div className="flex items-center justify-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>QR session expired. Please reopen the QR code to start a new session.</span>
          </div>

          <button
            type="button"
            onClick={handleRestartSession}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#6426AD] hover:bg-[#521E90] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reopen QR Code</span>
          </button>

          {/* Delayed 24-Hour Customer Support Notice — ONLY displayed after QR timer expires */}
          <div className="pt-2 border-t border-rose-200/60 text-left">
            <div className="flex items-start gap-2 text-rose-900 font-semibold text-[11px] leading-relaxed">
              <Headphones className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
              <div>
                <p>Recharge not completed within 24 hours? Please contact customer support for assistance.</p>
                {supportContact && (
                  <p className="mt-1 font-bold text-[#6426AD]">
                    Support Contact: {supportContact}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Show a QR only when a valid QR path is configured */}
      {activeQrPath ? (
        <>
          <div className="flex justify-center pt-1 pb-1">
            <div className="p-2.5 bg-white rounded-2xl border border-purple-200/80 shadow-sm flex items-center justify-center">
              <img
                src={activeQrPath}
                alt={`UPI Payment QR Code for ₹${amount}`}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl"
              />
            </div>
          </div>

          {/* 5. Save QR button */}
          <div>
            <button
              type="button"
              onClick={handleSaveQR}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-white hover:bg-purple-50 text-[#6426AD] border border-purple-300 hover:border-[#6426AD] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Save QR</span>
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Payment QR is temporarily unavailable. Please try again later.
        </div>
      )}

      {/* 6. Professional instruction line */}
      <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed px-2">
        Scan & pay with Google Pay, PhonePe, Paytm, or any UPI app.
      </p>

      {/* 7. Simple status line */}
      <p className="text-[11px] sm:text-xs text-[#71809A] font-medium leading-normal">
        Scan the QR code using your UPI app to make payment.
      </p>
    </div>
  );
};

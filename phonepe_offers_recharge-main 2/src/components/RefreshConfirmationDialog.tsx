import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';

export const RefreshConfirmationDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Only active on the checkout (third) page
  const isOnCheckoutPage = useCallback(() => {
    return location.pathname === '/checkout';
  }, [location.pathname]);

  // Intercept keyboard refresh triggers (F5, Cmd+R, Ctrl+R) on the checkout page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isRefreshKey =
        e.key === 'F5' ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'));

      if (isRefreshKey && isOnCheckoutPage()) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOnCheckoutPage]);

  const isRefreshingRef = React.useRef(false);

  // Browser native beforeunload event listener (for native refresh button clicks)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRefreshingRef.current) return;
      if (isOnCheckoutPage()) {
        e.preventDefault();
        e.returnValue =
          'Your payment session is in progress. Refreshing will reload the checkout page. Your existing order and payment session will be preserved where possible.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOnCheckoutPage]);

  // Cancel action: close dialog, keep the customer on the same page, change nothing
  const handleCancel = () => {
    setIsOpen(false);
  };

  // Confirmed refresh: reload the page at /checkout.
  // Session state (operator, mobile, plan, payment method) is in sessionStorage.
  // Timer timestamps are in localStorage.
  // Both survive a page reload, so the checkout page will restore intact.
  const handleConfirmRefresh = () => {
    isRefreshingRef.current = true;
    setIsOpen(false);
    // Reload the checkout page itself — NOT the first page
    window.location.href = '/checkout';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="refresh-dialog-title"
        aria-describedby="refresh-dialog-message"
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-purple-100 text-center space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* Visual icon */}
        <div className="w-12 h-12 rounded-full bg-purple-100 text-[#6426AD] flex items-center justify-center mx-auto shadow-inner">
          <RotateCcw className="w-6 h-6" />
        </div>

        {/* Title */}
        <h3
          id="refresh-dialog-title"
          className="text-xl font-black text-[#1E1136] tracking-tight"
        >
          Refresh this page?
        </h3>

        {/* Message */}
        <p
          id="refresh-dialog-message"
          className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium"
        >
          Your payment session is in progress. Refreshing will reload the checkout page. Your existing order and payment session will be preserved where possible.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer active:scale-98"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmRefresh}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#6426AD] hover:bg-[#521E90] text-white transition-colors cursor-pointer shadow-md hover:shadow-lg active:scale-98"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

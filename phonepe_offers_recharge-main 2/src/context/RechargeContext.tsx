import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { OperatorId, Operator, RechargePlan, PaymentMethodId, RechargeContextType } from '../types/recharge';
import { OPERATOR_LIST } from '../data/operators';
import { PLANS_DATA } from '../data/plans';

const RechargeContext = createContext<RechargeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  OPERATOR: 'phonepe_operator',
  MOBILE: 'phonepe_mobile',
  PLAN_ID: 'phonepe_plan_id',
  PAYMENT_METHOD: 'phonepe_payment_method',
};

export const RechargeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Restore persisted state from sessionStorage on mount (supports checkout page refresh)
  const [selectedOperator, setSelectedOperatorState] = useState<OperatorId | null>(() => {
    return sessionStorage.getItem(STORAGE_KEYS.OPERATOR) || null;
  });

  const [mobileNumber, setMobileNumberState] = useState<string>(() => {
    return sessionStorage.getItem(STORAGE_KEYS.MOBILE) || '';
  });

  // Selected plan: restore from sessionStorage if available
  const [selectedPlan, setSelectedPlanState] = useState<RechargePlan | null>(() => {
    const storedPlanData = sessionStorage.getItem('phonepe_plan_data');
    if (storedPlanData) {
      try {
        const parsed = JSON.parse(storedPlanData);
        if (parsed && parsed.id) return parsed;
      } catch (e) {}
    }
    const storedPlanId = sessionStorage.getItem(STORAGE_KEYS.PLAN_ID);
    if (storedPlanId) {
      return PLANS_DATA.find((p) => p.id === storedPlanId) || null;
    }
    return null;
  });

  // Selected payment method: restore from sessionStorage if available
  const [selectedPaymentMethod, setSelectedPaymentMethodState] = useState<PaymentMethodId>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEYS.PAYMENT_METHOD);
    if (stored === 'phonepe' || stored === 'paytm' || stored === 'gpay' || stored === 'navi' || stored === 'axis' || stored === 'bhim' || stored === 'qr') return stored;
    return 'phonepe';
  });

  // Dynamic Providers loaded from database (with fallback to default)
  const [providers, setProviders] = useState<Operator[]>(OPERATOR_LIST);

  // Dynamic active offer & server-synced countdown
  const [activeOffer, setActiveOffer] = useState<any>(null);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  // Countdown seconds backed by server deadline
  const [countdownSeconds, setCountdownSeconds] = useState<number>(584);
  const [serverEndTime, setServerEndTime] = useState<number | null>(null);

  // Fetch dynamic data from database
  const refreshDynamicData = useCallback(async () => {
    try {
      // 1. Fetch active providers
      const provRes = await fetch('/api/providers');
      if (provRes.ok) {
        const provData = await provRes.json();
        if (provData.success && Array.isArray(provData.providers) && provData.providers.length > 0) {
          setProviders(provData.providers);
        }
      }

      // 2. Fetch active offer & server deadline
      const offerRes = await fetch('/api/offers/active');
      if (offerRes.ok) {
        const offerData = await offerRes.json();
        if (offerData.success && offerData.offer) {
          setActiveOffer(offerData.offer);
          if (offerData.offer.endTime) {
            const endMs = new Date(offerData.offer.endTime).getTime();
            setServerEndTime(endMs);
            const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
            setCountdownSeconds(remaining);
          }
        }
      }

      // 3. Fetch public settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          setSiteSettings(settingsData.settings);
        }
      }
    } catch (err) {
      console.warn('Backend connection fallback in effect:', err);
    }
  }, []);

  useEffect(() => {
    refreshDynamicData();
  }, [refreshDynamicData]);


  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  // Handle operator selection and clear previously entered mobile number when operator changes
  const setSelectedOperator = (op: OperatorId | null) => {
    setSelectedOperatorState(op);
    setMobileNumberState('');
    sessionStorage.removeItem(STORAGE_KEYS.MOBILE);

    if (op) {
      sessionStorage.setItem(STORAGE_KEYS.OPERATOR, op);
      const matchingPlan =
        PLANS_DATA.find((p) => p.operatorId === op && p.price === selectedPlan?.price) ||
        PLANS_DATA.find((p) => p.operatorId === op);
      if (matchingPlan) {
        setSelectedPlanState(matchingPlan);
        sessionStorage.setItem(STORAGE_KEYS.PLAN_ID, matchingPlan.id);
        try {
          sessionStorage.setItem('phonepe_plan_data', JSON.stringify(matchingPlan));
        } catch (e) {}
      }
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.OPERATOR);
      setSelectedPlanState(null);
      sessionStorage.removeItem(STORAGE_KEYS.PLAN_ID);
      sessionStorage.removeItem('phonepe_plan_data');
    }
  };

  const setMobileNumber = (num: string) => {
    setMobileNumberState(num);
    if (num) {
      sessionStorage.setItem(STORAGE_KEYS.MOBILE, num);
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.MOBILE);
    }
  };

  const setSelectedPlan = (plan: RechargePlan | null) => {
    setSelectedPlanState(plan);
    if (plan) {
      sessionStorage.setItem(STORAGE_KEYS.PLAN_ID, plan.id);
      try {
        sessionStorage.setItem('phonepe_plan_data', JSON.stringify(plan));
      } catch (e) {}
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PLAN_ID);
      sessionStorage.removeItem('phonepe_plan_data');
    }
  };

  const setSelectedPaymentMethod = (pm: PaymentMethodId) => {
    setSelectedPaymentMethodState(pm);
    sessionStorage.setItem(STORAGE_KEYS.PAYMENT_METHOD, pm);
  };

  // Synchronized countdown timer tick: computes from authoritative end timestamp
  useEffect(() => {
    const timer = setInterval(() => {
      if (serverEndTime) {
        const remaining = Math.max(0, Math.floor((serverEndTime - Date.now()) / 1000));
        setCountdownSeconds(remaining);
      } else {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [serverEndTime]);

  const formatCountdown = () => {
    const minutes = Math.floor(countdownSeconds / 60);
    const seconds = countdownSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetRecharge = () => {
    setSelectedOperatorState(null);
    sessionStorage.removeItem(STORAGE_KEYS.OPERATOR);
    setMobileNumberState('');
    sessionStorage.removeItem(STORAGE_KEYS.MOBILE);
    setSelectedPlanState(null);
    sessionStorage.removeItem(STORAGE_KEYS.PLAN_ID);
    sessionStorage.removeItem('phonepe_plan_data');
    sessionStorage.removeItem('current_active_order_ref');
    sessionStorage.removeItem('phonepe_modal_open');
  };

  const validateMobileNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    if (!cleaned) {
      return { isValid: false, message: 'Please enter a 10-digit mobile number' };
    }
    const digitsOnly = cleaned.length === 12 && cleaned.startsWith('91') ? cleaned.slice(2) : cleaned;

    if (digitsOnly.length !== 10) {
      return { isValid: false, message: `Enter all 10 digits (currently ${digitsOnly.length})` };
    }
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return { isValid: false, message: 'Mobile number must start with 6, 7, 8, or 9' };
    }
    return { isValid: true, message: '' };
  };

  const markNotificationsAsRead = () => {
    setUnreadNotifications(0);
  };

  return (
    <RechargeContext.Provider
      value={{
        selectedOperator,
        setSelectedOperator,
        mobileNumber,
        setMobileNumber,
        selectedPlan,
        setSelectedPlan,
        selectedPaymentMethod,
        setSelectedPaymentMethod,
        countdownSeconds,
        formatCountdown,
        resetRecharge,
        validateMobileNumber,
        isHelpOpen,
        setIsHelpOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        unreadNotifications,
        markNotificationsAsRead,
        providers,
        activeOffer,
        siteSettings,
        refreshDynamicData,
      }}
    >
      {children}
    </RechargeContext.Provider>
  );
};

export { RechargeContext };
export { useRecharge } from './useRecharge';

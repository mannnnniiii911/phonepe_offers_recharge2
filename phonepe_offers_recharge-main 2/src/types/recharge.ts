export type OperatorId = string;

export interface Operator {
  id: OperatorId;
  slug?: string;
  name: string;
  brandColor: string;
  badgeBg: string;
  textColor: string;
  tagline: string;
  logoUrl: string;
}

export interface RechargePlan {
  id: string;
  operatorId: OperatorId;
  price: number;
  originalPrice: number;
  validity: string;
  data: string;
  voice: string;
  sms: string;
  isNew?: boolean;
  tag?: string; // e.g. "UNLIMITED TRUE 5G DATA"
  category?: 'popular' | '5g' | 'validity' | 'data';
}

export type PaymentMethodId = 'phonepe' | 'paytm' | 'gpay' | 'navi' | 'axis' | 'bhim' | 'qr';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  subtitle: string;
  recommended?: boolean;
  iconType: 'phonepe' | 'paytm' | 'gpay' | 'navi' | 'axis' | 'bhim' | 'qr';
}

export interface RechargeContextType {
  selectedOperator: OperatorId | null;
  setSelectedOperator: (op: OperatorId | null) => void;
  mobileNumber: string;
  setMobileNumber: (num: string) => void;
  selectedPlan: RechargePlan | null;
  setSelectedPlan: (plan: RechargePlan | null) => void;
  selectedPaymentMethod: PaymentMethodId;
  setSelectedPaymentMethod: (pm: PaymentMethodId) => void;
  countdownSeconds: number;
  formatCountdown: () => string;
  resetRecharge: () => void;
  validateMobileNumber: (num: string) => { isValid: boolean; message: string };
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  unreadNotifications: number;
  markNotificationsAsRead: () => void;
  providers: Operator[];
  activeOffer: any;
  siteSettings: any;
  refreshDynamicData: () => Promise<void>;
}

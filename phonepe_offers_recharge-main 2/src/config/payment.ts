/**
 * Centralized UPI Payment Configuration
 *
 * Update these values in ONE place to change payment details across the entire application.
 * The corrected QR code is stored at: public/assets/upi-qr.jpg
 */

export const PAYMENT_CONFIG = {
  /** The UPI VPA (Virtual Payment Address) to receive payments */
  upiId: '',

  /** Display name for the payee shown in UPI payment apps */
  payeeName: '',

  /** Path to the uploaded UPI QR code image (relative to public/) */
  qrCodePath: '',

  /**
   * Whether the QR code is static (amount not embedded) or dynamic.
   * Static QR: customer must verify/enter the amount in their payment app.
   * Set to true only if the QR contains a fixed amount encoded.
   */
  isQrDynamic: false,

  /** Merchant category code (optional, for UPI URI) */
  merchantCode: '',

  /** Currency code */
  currency: 'INR',
} as const;

/**
 * Generate a standard UPI payment URI.
 * Compatible with PhonePe, Paytm, Google Pay, and other BHIM-UPI apps.
 *
 * @see https://www.npci.org.in/what-we-do/upi/upi-qr-code
 */
export function generateUPIUri(params: {
  amount: number;
  orderId: string;
  note?: string;
  upiId?: string;
}): string {
  const { amount, orderId, note, upiId } = params;

  const upiParams = new URLSearchParams({
    pa: upiId || PAYMENT_CONFIG.upiId,
    pn: PAYMENT_CONFIG.payeeName,
    am: amount.toFixed(2),
    cu: PAYMENT_CONFIG.currency,
    tn: note || `Recharge Order ${orderId}`,
    tr: orderId,
  });

  if (PAYMENT_CONFIG.merchantCode) {
    upiParams.set('mc', PAYMENT_CONFIG.merchantCode);
  }

  const queryString = preserveUpiIdAt(upiParams.toString());
  return `upi://pay?${queryString}`;
}

/**
 * Preserves the literal '@' in the `pa` (payee VPA) parameter of a query string
 * without globally decoding the string or altering any other encoded parameters.
 */
function preserveUpiIdAt(queryString: string): string {
  return queryString.replace(/(^|&)pa=([^&]*)/, (_, prefix, paValue) => {
    return `${prefix}pa=${paValue.replace(/%40/g, '@')}`;
  });
}

/** Detect iOS devices */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Detect Android devices */
export function isAndroid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Generate a deep link for specific payment apps.
 * Explicitly targets PhonePe (com.phonepe.app / phonepe://) and Paytm (net.one97.paytm / paytmmp://)
 * to prevent WhatsApp (which registers generic upi://) from intercepting the link on Android and iOS.
 */
export function generateAppDeepLink(
  app: 'phonepe' | 'paytm' | 'gpay' | 'navi' | 'axis' | 'bhim' | 'generic',
  params: { amount: number; orderId: string; note?: string; upiId?: string }
): string {
  const { amount, orderId, note, upiId } = params;

  const upiParams = new URLSearchParams({
    pa: upiId || PAYMENT_CONFIG.upiId,
    pn: PAYMENT_CONFIG.payeeName,
    am: amount.toFixed(2),
    cu: PAYMENT_CONFIG.currency,
    tn: note || `Recharge Order ${orderId}`,
    tr: orderId,
  });

  if (PAYMENT_CONFIG.merchantCode) {
    upiParams.set('mc', PAYMENT_CONFIG.merchantCode);
  }

  const queryString = preserveUpiIdAt(upiParams.toString());
  const android = isAndroid();

  switch (app) {
    case 'phonepe':
      if (android) {
        // Explicitly targets the PhonePe package on Android to prevent WhatsApp from capturing upi://
        return `intent://pay?${queryString}#Intent;scheme=upi;package=com.phonepe.app;end`;
      }
      // On iOS, PhonePe registers phonepe://; generic upi:// is captured by WhatsApp
      return `phonepe://pay?${queryString}`;

    case 'paytm':
      if (android) {
        // Explicitly targets the Paytm package on Android
        return `intent://pay?${queryString}#Intent;scheme=upi;package=net.one97.paytm;end`;
      }
      // On iOS, Paytm registers paytmmp://
      return `paytmmp://pay?${queryString}`;

    case 'gpay':
      if (android) {
        return `intent://pay?${queryString}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      }
      return `gpay://upi/pay?${queryString}`;

    case 'navi':
      if (android) {
        // Explicitly target Navi so another app registered for generic UPI links
        // (such as WhatsApp) cannot intercept the payment request.
        return `intent://pay?${queryString}#Intent;scheme=navi;package=com.navi.navidotcom;end`;
      }
      return `navi://pay?${queryString}`;

    case 'bhim':
      if (android) {
        // Explicitly target the official BHIM app on Android.
        return `intent://pay?${queryString}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
      }
      // BHIM's iOS payment URL scheme.
      return `bhim://upi/pay?${queryString}`;

    case 'axis':
      if (android) {
        // Explicitly target the Axis Mobile app rather than the generic UPI handler.
        return `intent://pay?${queryString}#Intent;scheme=upi;package=com.axis.mobile;end`;
      }
      // Axis does not have a reliably documented public iOS payment URL scheme.
      // Avoid guessing one; use the standard UPI URI on iOS.
      return `upi://pay?${queryString}`;

    default:
      return `upi://pay?${queryString}`;
  }
}

/** Generate a unique order reference ID */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

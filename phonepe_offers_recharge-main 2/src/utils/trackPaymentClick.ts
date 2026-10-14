/**
 * Client-Side Payment Option Click Tracker
 *
 * Tracks customer clicks on PhonePe, Google Pay, QR Code, and Paytm payment options.
 * - Records immediately upon click; does NOT wait for payment completion.
 * - Uses existing order/session reference without creating duplicate orders.
 * - Fire-and-forget: Failures never block or interrupt customer payment navigation.
 * - Never collects or transmits sensitive PINs or banking credentials.
 */

export type TrackablePaymentOption = 'phonepe' | 'google_pay' | 'qr_code' | 'paytm';

export function getOrCreateSessionId(): string {
  try {
    let sessId = sessionStorage.getItem('recharge_session_id');
    if (!sessId) {
      sessId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('recharge_session_id', sessId);
    }
    return sessId;
  } catch {
    return 'sess_fallback';
  }
}

export function trackPaymentClick(
  paymentOption: TrackablePaymentOption,
  explicitOrderId?: string
): void {
  try {
    const orderId = explicitOrderId || sessionStorage.getItem('current_active_order_ref') || undefined;
    const sessionId = getOrCreateSessionId();

    // Fire-and-forget asynchronous POST to server tracking endpoint
    fetch('/api/payment-clicks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentOption,
        orderId,
        sessionId,
      }),
    }).catch((err) => {
      // Intentionally silent: database/network failures must never disrupt customer flow
      console.warn('[Track Warning]: Tracking event dispatch skipped:', err?.message || err);
    });
  } catch (err) {
    // Fail silently
    console.warn('[Track Error]: Unexpected tracking exception:', err);
  }
}

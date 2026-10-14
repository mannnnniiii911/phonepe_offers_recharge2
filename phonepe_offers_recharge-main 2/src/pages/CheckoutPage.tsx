import React, { useState, useEffect } from 'react';
import { AppHeader } from '../components/AppHeader';
import { SelectedNumberCard } from '../components/SelectedNumberCard';
import { PaymentMethodCard } from '../components/PaymentMethodCard';
import { RechargeSummary } from '../components/RechargeSummary';
import { TrustFooter } from '../components/TrustFooter';
import { UPIPaymentModal } from '../components/UPIPaymentModal';
import { useRecharge } from '../context/RechargeContext';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedOperator, selectedPlan, selectedPaymentMethod } = useRecharge();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(() => {
    return sessionStorage.getItem('phonepe_modal_open') === 'true';
  });

  const handleOpenPaymentModal = () => {
    setIsPaymentModalOpen(true);
    sessionStorage.setItem('phonepe_modal_open', 'true');
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    sessionStorage.removeItem('phonepe_modal_open');
  };

  useEffect(() => {
    if (!selectedOperator || !selectedPlan) {
      navigate('/', { replace: true });
    }
  }, [selectedOperator, selectedPlan, navigate]);

  const price = selectedPlan ? selectedPlan.price : 399;

  const getMethodName = () => {
    switch (selectedPaymentMethod) {
      case 'phonepe':
        return 'PhonePe';
      case 'paytm':
        return 'Paytm';
      case 'gpay':
        return 'Google Pay';
      case 'navi':
        return 'Navi';
      case 'axis':
        return 'Axis Bank';
      case 'bhim':
        return 'BHIM UPI';
      case 'qr':
        return 'UPI QR Code';
      default:
        return 'UPI';
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F9] pb-16">
      {/* Header */}
      <AppHeader
        title="Secure Checkout"
        subtitle="UPI • Verified • Fast"
        showBack={true}
        backTo="/plans"
      />

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Selected Operator and Mobile Card */}
        <SelectedNumberCard variant="page3" />

        {/* UPI Apps Selection Card */}
        <PaymentMethodCard />

        {/* Recharge Summary Card */}
        <RechargeSummary />


        {/* Action Button: Proceed to Pay */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E7E8EF] shadow-sm space-y-3">
          <button
            type="button"
            onClick={handleOpenPaymentModal}
            className="w-full bg-phonepe-btn text-white py-3.5 sm:py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Proceed to Pay ₹{price} via {getMethodName()}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="text-center flex items-center justify-center gap-1.5 text-xs text-[#71809A]">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Secured UPI Payment • 256-bit Encrypted</span>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="pt-2">
          <TrustFooter />
        </div>
      </main>

      {/* UPI Payment Modal */}
      <UPIPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
      />
    </div>
  );
};

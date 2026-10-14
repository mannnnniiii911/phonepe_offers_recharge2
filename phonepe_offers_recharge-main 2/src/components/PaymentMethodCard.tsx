import React from 'react';
import { ChevronRight, QrCode } from 'lucide-react';
import type { PaymentMethodId } from '../types/recharge';
import { useRecharge } from '../context/RechargeContext';
import { trackPaymentClick, type TrackablePaymentOption } from '../utils/trackPaymentClick';

interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  subtitle: string;
  recommended?: boolean;
}

const PAYMENT_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    subtitle: 'Recommended • Fastest',
    recommended: true,
  },
  {
    id: 'paytm',
    name: 'Paytm',
    subtitle: 'One tap pay',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    subtitle: 'Pay with Google Pay',
  },
  {
    id: 'navi',
    name: 'Navi',
    subtitle: 'Pay using UPI',
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    subtitle: 'Pay using UPI',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    subtitle: 'Pay using BHIM',
  },
  {
    id: 'qr',
    name: 'QR Code',
    subtitle: 'Scan in any UPI app',
  },
];

export const PaymentMethodCard: React.FC = () => {
  const { selectedPaymentMethod, setSelectedPaymentMethod } = useRecharge();

  const handleSelectOption = (id: PaymentMethodId) => {
    setSelectedPaymentMethod(id);
    const trackingKey: TrackablePaymentOption | null = id === 'qr' ? 'qr_code' : id === 'phonepe' ? 'phonepe' : id === 'paytm' ? 'paytm' : id === 'gpay' ? 'google_pay' : null;
    if (trackingKey) trackPaymentClick(trackingKey);
  };

  const renderIcon = (id: PaymentMethodId) => {
    switch (id) {
      case 'phonepe':
        return (
          <div className="w-10 h-10 rounded-full bg-[#5f259f] p-1.5 flex items-center justify-center shadow-sm flex-shrink-0">
            <img
              src="/assets/logos/phonepe-icon.svg"
              alt="PhonePe"
              className="w-full h-full object-contain"
            />
          </div>
        );
      case 'paytm':
        return (
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200/80 p-1.5 flex items-center justify-center shadow-sm flex-shrink-0">
            <img
              src="/assets/logos/paytm.svg"
              alt="Paytm"
              className="w-full h-full object-contain"
            />
          </div>
        );
      case 'gpay':
        return <div className="w-10 h-10 rounded-full bg-white border border-slate-200 p-1.5 flex items-center justify-center font-extrabold text-lg text-blue-600">G</div>;
      case 'navi':
        return <div className="w-10 h-10 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-extrabold text-xs">Navi</div>;
      case 'axis':
        return <div className="w-10 h-10 rounded-full bg-white border border-slate-200 text-[#97144D] flex items-center justify-center font-extrabold text-xs">AXIS</div>;
      case 'bhim':
        return <div className="w-10 h-10 rounded-full bg-[#087C45] text-white flex items-center justify-center font-extrabold text-xs">BHIM</div>;
      case 'qr':
        return (
          <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <QrCode className="w-5 h-5 text-white" />
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E7E8EF] shadow-sm">
      <div className="text-xs sm:text-sm font-bold text-[#71809A] uppercase tracking-wider mb-3">
        UPI APPS
      </div>

      <div className="space-y-2.5">
        {PAYMENT_OPTIONS.map((option) => {
          const isSelected = selectedPaymentMethod === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectOption(option.id)}
              className={`w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                isSelected
                  ? 'border-[#6426AD] bg-[#F2EAFE]/30 ring-1 ring-[#6426AD] shadow-sm'
                  : 'border-[#E7E8EF] hover:border-purple-200 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {renderIcon(option.id)}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-[#151B2B]">
                      {option.name}
                    </span>
                    {option.recommended && (
                      <span className="bg-purple-100 text-[#6426AD] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        Fast
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#71809A]">
                    {option.subtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ChevronRight
                  className={`w-5 h-5 transition-transform ${
                    isSelected ? 'text-[#6426AD] translate-x-0.5' : 'text-slate-400'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

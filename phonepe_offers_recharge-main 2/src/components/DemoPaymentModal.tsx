import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, X, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PhonePeLogo } from './PhonePeLogo';
import { useRecharge } from '../context/RechargeContext';
import { OPERATORS } from '../data/operators';
import { useNavigate } from 'react-router-dom';

interface DemoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoPaymentModal: React.FC<DemoPaymentModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { selectedOperator, mobileNumber, selectedPlan, selectedPaymentMethod, resetRecharge } = useRecharge();
  const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');
  const [txnId, setTxnId] = useState(() => `TXN${Math.floor(100000000000 + Math.random() * 900000000000)}`);

  const operator = (selectedOperator && OPERATORS[selectedOperator]) || OPERATORS.jio;
  const amount = selectedPlan ? selectedPlan.price : 499;

  const handleClose = () => {
    setStep('confirm');
    setTxnId(`TXN${Math.floor(100000000000 + Math.random() * 900000000000)}`);
    onClose();
  };

  const handleStartSimulatedPayment = () => {
    setStep('processing');
    // Simulated processing delay
    setTimeout(() => {
      setStep('success');
      // Fire confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6426AD', '#813FC9', '#16A34A', '#FFD700'],
        });
      } catch (e) {
        console.log(e);
      }
    }, 1600);
  };

  const handleFinish = () => {
    onClose();
    resetRecharge();
    navigate('/');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-purple-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        {step !== 'processing' && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Step 1: Confirmation */}
        {step === 'confirm' && (
          <div>
            <div className="flex items-center gap-2 mb-3 text-[#6426AD]">
              <span className="w-8 h-8 rounded-full bg-[#F2EAFE] flex items-center justify-center">
                <PhonePeLogo className="text-[#6426AD]" size={16} />
              </span>
              <span className="font-bold text-sm tracking-wide">PhonePe Demo Simulator</span>
            </div>

            <h3 className="text-xl font-bold text-[#151B2B] mb-1">
              Confirm Demo Payment
            </h3>
            <p className="text-xs text-[#71809A] mb-4">
              Review your recharge details before starting the mock transaction.
            </p>

            {/* Notice banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Demonstration Only:</span> No real payment or telecom recharge will be initiated.
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#71809A]">Mobile Number:</span>
                <span className="font-bold text-[#151B2B]">+91 {mobileNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71809A]">Operator:</span>
                <span className="font-bold text-[#151B2B]">{operator.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71809A]">Selected Payment:</span>
                <span className="font-bold text-[#151B2B] capitalize">{selectedPaymentMethod} UPI</span>
              </div>
              <hr className="border-t border-slate-200 my-1" />
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-[#151B2B]">Recharge Amount:</span>
                <span className="text-xl font-extrabold text-[#6426AD]">₹{amount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartSimulatedPayment}
              className="w-full bg-phonepe-btn text-white py-3.5 px-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span>Simulate Payment of ₹{amount}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#6426AD] animate-spin" />
              </div>
            </div>
            <h4 className="text-lg font-bold text-[#151B2B] mb-1">
              Processing Demo Payment...
            </h4>
            <p className="text-xs text-[#71809A] max-w-xs">
              Connecting with mock UPI payment gateway. Please wait a moment.
            </p>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {step === 'success' && (
          <div className="text-center pt-2">
            <div className="w-16 h-16 rounded-full bg-green-100 text-[#16A34A] flex items-center justify-center mx-auto mb-3 shadow-sm animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-[#16A34A] text-xs font-bold mb-2 border border-green-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulated Recharge Successful</span>
            </div>

            <h3 className="text-2xl font-black text-[#151B2B] mb-1">
              ₹{amount}
            </h3>
            <p className="text-xs text-[#71809A] mb-4">
              Demo confirmation for +91 {mobileNumber} ({operator.name})
            </p>

            {/* Mock Transaction Details */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 mb-4 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-medium text-slate-800">{txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-medium text-slate-800 uppercase">{selectedPaymentMethod} UPI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Validity:</span>
                <span className="font-medium text-slate-800">{selectedPlan?.validity || '365 Days'}</span>
              </div>
            </div>

            <div className="bg-purple-50 text-[#6426AD] text-[11px] font-medium p-2.5 rounded-xl border border-purple-200/60 mb-5 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>DEMO — No actual money was deducted.</span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full bg-phonepe-btn text-white py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Done / Start New Recharge
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { useRecharge } from '../context/RechargeContext';
import { OPERATORS } from '../data/operators';

export const RechargeSummary: React.FC = () => {
  const { selectedOperator, mobileNumber, selectedPlan } = useRecharge();
  const operator = (selectedOperator && OPERATORS[selectedOperator]) || OPERATORS.jio;

  const price = selectedPlan ? selectedPlan.price : 399;
  const validity = selectedPlan ? selectedPlan.validity : '365 Days';
  const data = selectedPlan ? selectedPlan.data : '3GB/day';
  const voice = selectedPlan ? selectedPlan.voice : 'Unlimited';
  const sms = selectedPlan ? selectedPlan.sms : '100/day';

  const planDescription = `${data} Data, ${voice} calls, ${sms} SMS for ${validity}`;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E7E8EF] shadow-sm">
      {/* Title with VERIFIED badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs sm:text-sm font-bold text-[#71809A] uppercase tracking-wider">
          RECHARGE SUMMARY
        </h3>
        <span className="bg-purple-100 text-[#6426AD] text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          VERIFIED
        </span>
      </div>

      <div className="space-y-3 text-xs sm:text-sm">
        {/* Operator Row */}
        <div className="flex items-center justify-between">
          <span className="text-[#71809A] font-medium">Operator</span>
          <span className="text-[#151B2B] font-bold uppercase">{operator.name}</span>
        </div>

        <hr className="border-t border-[#E7E8EF]" />

        {/* Mobile Row */}
        <div className="flex items-center justify-between">
          <span className="text-[#71809A] font-medium">Mobile</span>
          <span className="text-[#151B2B] font-bold font-mono">
            +91 {mobileNumber}
          </span>
        </div>

        <hr className="border-t border-[#E7E8EF]" />

        {/* Plan Row */}
        <div className="flex items-start justify-between gap-4">
          <span className="text-[#71809A] font-medium flex-shrink-0">Plan</span>
          <span className="text-[#151B2B] font-medium text-right text-xs leading-relaxed max-w-[240px]">
            {planDescription}
          </span>
        </div>

        <hr className="border-t border-[#E7E8EF]" />

        {/* Total Amount Row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[#151B2B] font-bold text-sm sm:text-base">
            Total Amount
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[#6426AD]">
            ₹{price}
          </span>
        </div>
      </div>
    </div>
  );
};

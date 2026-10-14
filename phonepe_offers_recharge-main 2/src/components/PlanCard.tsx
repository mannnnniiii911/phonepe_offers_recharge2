import React from 'react';
import { Calendar, Wifi, Phone, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RechargePlan } from '../types/recharge';
import { useRecharge } from '../context/RechargeContext';
import { OPERATORS } from '../data/operators';

interface PlanCardProps {
  plan: RechargePlan;
  isSelected?: boolean;
  onSelect?: (plan: RechargePlan) => void;
  isNavigating?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isSelected = false,
  onSelect,
  isNavigating = false,
}) => {
  const navigate = useNavigate();
  const { setSelectedPlan, selectedOperator } = useRecharge();
  const operator = OPERATORS[plan.operatorId] || (selectedOperator && OPERATORS[selectedOperator]) || OPERATORS.jio;

  const handleSelect = () => {
    if (isNavigating) return;

    if (onSelect) {
      onSelect(plan);
    } else {
      setSelectedPlan(plan);
      navigate('/checkout');
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-sm hover:shadow-md ${
        isSelected
          ? 'border-[#6426AD] ring-2 ring-purple-200'
          : 'border-[#E7E8EF] hover:border-purple-200'
      }`}
    >
      {/* Top Row: NEW Badge & Operator Plan Badge */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          {plan.isNew && (
            <span className="bg-[#FF3448] text-white text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase shadow-sm">
              NEW
            </span>
          )}
        </div>

        <div className="border border-purple-200 bg-purple-50/70 text-[#6426AD] text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full">
          {operator.name} PLAN
        </div>
      </div>

      {/* Price Row: Large Bold Price, Strikethrough Original, Optional Tag */}
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-[#151B2B] tracking-tight">
            ₹{plan.price}
          </span>
          {plan.originalPrice > plan.price && (
            <span className="text-xs sm:text-sm text-slate-400 line-through font-medium">
              ₹{plan.originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {plan.tag && (
          <span className="text-[10px] sm:text-xs font-bold text-[#FF3448] tracking-wider text-right uppercase">
            {plan.tag}
          </span>
        )}
      </div>

      {/* Divider */}
      <hr className="border-t border-[#E7E8EF] mb-3.5" />

      {/* Benefits Grid (4 Equal Columns) */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center mb-4">
        {/* Validity */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F2EAFE] text-[#6426AD] flex items-center justify-center mb-1">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#71809A] uppercase tracking-wider">
            VALIDITY
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#151B2B] mt-0.5 truncate w-full">
            {plan.validity}
          </span>
        </div>

        {/* Data */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F2EAFE] text-[#6426AD] flex items-center justify-center mb-1">
            <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#71809A] uppercase tracking-wider">
            DATA
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#151B2B] mt-0.5 truncate w-full">
            {plan.data}
          </span>
        </div>

        {/* Voice */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F2EAFE] text-[#6426AD] flex items-center justify-center mb-1">
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#71809A] uppercase tracking-wider">
            VOICE
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#151B2B] mt-0.5 truncate w-full">
            {plan.voice}
          </span>
        </div>

        {/* SMS */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F2EAFE] text-[#6426AD] flex items-center justify-center mb-1">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-[#71809A] uppercase tracking-wider">
            SMS
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#151B2B] mt-0.5 truncate w-full">
            {plan.sms}
          </span>
        </div>
      </div>

      {/* Large Purple Gradient Button */}
      <button
        type="button"
        onClick={handleSelect}
        disabled={isNavigating}
        className={`w-full bg-phonepe-btn text-white py-3 sm:py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all ${
          isNavigating ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.99] cursor-pointer'
        }`}
      >
        <span>Recharge for ₹{plan.price}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

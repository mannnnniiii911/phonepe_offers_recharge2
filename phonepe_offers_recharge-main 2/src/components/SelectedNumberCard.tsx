import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecharge } from '../context/RechargeContext';
import { OPERATORS } from '../data/operators';
import { OperatorLogo } from './OperatorLogo';

interface SelectedNumberCardProps {
  className?: string;
  variant?: 'page2' | 'page3';
}

export const SelectedNumberCard: React.FC<SelectedNumberCardProps> = ({
  className = '',
  variant = 'page2',
}) => {
  const navigate = useNavigate();
  const { selectedOperator, mobileNumber } = useRecharge();
  const operator = (selectedOperator && OPERATORS[selectedOperator]) || OPERATORS.jio;

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E7E8EF] shadow-sm flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <OperatorLogo id={selectedOperator || 'jio'} size={42} />

        <div className="min-w-0">
          {variant === 'page2' ? (
            <>
              <div className="text-[10px] sm:text-[11px] font-bold text-[#71809A] tracking-wider uppercase">
                SELECTED NUMBER
              </div>
              <div className="text-sm sm:text-base font-bold text-[#151B2B] truncate">
                {operator.name} • +91 {mobileNumber}
              </div>
            </>
          ) : (
            <div className="text-sm sm:text-base font-bold text-[#151B2B] truncate">
              Recharge for +91 {mobileNumber}
            </div>
          )}
        </div>
      </div>

      {/* Change button */}
      <button
        type="button"
        onClick={() => navigate('/recharge')}
        className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-[#6426AD] hover:bg-purple-50 transition-colors flex-shrink-0 cursor-pointer border border-purple-200/60"
      >
        Change
      </button>
    </div>
  );
};

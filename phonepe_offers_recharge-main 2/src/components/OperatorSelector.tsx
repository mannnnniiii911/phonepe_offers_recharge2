import React from 'react';
import { Check } from 'lucide-react';
import { OperatorLogo } from './OperatorLogo';
import { useRecharge } from '../context/RechargeContext';

interface OperatorSelectorProps {
  onSelect?: () => void;
}

export const OperatorSelector: React.FC<OperatorSelectorProps> = ({ onSelect }) => {
  const { selectedOperator, setSelectedOperator, providers } = useRecharge();

  return (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-[#151B2B] mb-2.5">
        Network provider
      </label>

      <div
        className="grid grid-cols-4 gap-2 sm:gap-3"
        role="radiogroup"
        aria-label="Select Network Operator"
      >
        {providers.map((op) => {
          const isSelected = selectedOperator === op.id;
          return (
            <button
              key={op.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                setSelectedOperator(op.id);
                onSelect?.();
              }}
              className={`relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6426AD] focus:ring-offset-2 ${
                isSelected
                  ? 'border-[#6426AD] bg-[#F2EAFE]/40 shadow-sm'
                  : 'border-[#E7E8EF] bg-white hover:border-purple-200 hover:bg-slate-50/60'
              }`}
            >
              {/* Selected Checkmark Badge on top-right */}
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#6426AD] text-white flex items-center justify-center shadow-sm z-10">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* Official Operator Logo container */}
              <div className="mb-1.5 flex items-center justify-center w-10 h-10">
                {['jio', 'airtel', 'vi', 'bsnl'].includes(op.id) ? (
                  <OperatorLogo id={op.id as any} size={40} />
                ) : op.logoUrl ? (
                  <img src={op.logoUrl} alt={op.name} className="w-10 h-10 object-contain" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: op.brandColor || '#6426AD' }}
                  >
                    {op.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Operator label */}
              <span
                className={`text-xs font-semibold ${
                  isSelected ? 'text-[#6426AD]' : 'text-[#151B2B]'
                }`}
              >
                {op.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

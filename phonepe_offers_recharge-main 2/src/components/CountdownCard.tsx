import React from 'react';
import { Clock } from 'lucide-react';
import { useRecharge } from '../context/RechargeContext';

interface CountdownCardProps {
  className?: string;
}

export const CountdownCard: React.FC<CountdownCardProps> = ({ className = '' }) => {
  const { formatCountdown } = useRecharge();

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-[#E7E8EF] shadow-sm flex items-center justify-between ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Clock icon in light red container */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-50 flex items-center justify-center text-[#FF3448] flex-shrink-0">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-[#151B2B]">
          Special Offer Ends In
        </span>
      </div>

      {/* Red Countdown Display */}
      <div className="bg-red-50/60 px-3 py-1 rounded-xl border border-red-100">
        <span className="text-sm sm:text-base font-bold font-mono tracking-wider text-[#FF3448]">
          {formatCountdown()}
        </span>
      </div>
    </div>
  );
};

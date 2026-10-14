import React from 'react';
import type { OperatorId } from '../types/recharge';

interface OperatorLogoProps {
  id: OperatorId;
  size?: number; // size in px, default 40
  className?: string;
}

export const OperatorLogo: React.FC<OperatorLogoProps> = ({
  id,
  size = 40,
  className = '',
}) => {
  switch (id) {
    case 'jio':
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full overflow-hidden flex items-center justify-center bg-[#0a2885] shadow-sm flex-shrink-0 ${className}`}
          title="Reliance Jio"
        >
          <img
            src="/assets/logos/jio.svg"
            alt="Jio"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 'airtel':
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm p-1.5 flex-shrink-0 ${className}`}
          title="Bharti Airtel"
        >
          <img
            src="/assets/logos/airtel.svg"
            alt="Airtel"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 'vi':
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm p-1.5 flex-shrink-0 ${className}`}
          title="Vodafone Idea (Vi)"
        >
          <img
            src="/assets/logos/vi.svg"
            alt="Vi"
            className="w-full h-full object-contain"
          />
        </div>
      );

    case 'bsnl':
      return (
        <div
          style={{ width: size, height: size }}
          className={`rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-100 shadow-sm p-1 flex-shrink-0 ${className}`}
          title="BSNL"
        >
          <img
            src="/assets/logos/bsnl.svg"
            alt="BSNL"
            className="w-full h-full object-contain"
          />
        </div>
      );

    default:
      return null;
  }
};

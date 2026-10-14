import React from 'react';
import { ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';

export const TrustFooter: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 py-3 text-[#71809A] select-none">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
        <span>Protected</span>
      </div>

      <div className="w-1 h-1 rounded-full bg-[#E7E8EF]" />

      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        <span>Instant plans</span>
      </div>

      <div className="w-1 h-1 rounded-full bg-[#E7E8EF]" />

      <div className="flex items-center gap-1.5 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-[#6426AD]" />
        <span>Verified</span>
      </div>
    </div>
  );
};

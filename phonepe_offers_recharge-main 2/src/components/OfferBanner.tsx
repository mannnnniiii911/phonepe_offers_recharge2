import React from 'react';
import { Sparkles, Flame } from 'lucide-react';
import { PhonePeLogo } from './PhonePeLogo';
import { OperatorLogo } from './OperatorLogo';
import { useRecharge } from '../context/RechargeContext';
import { PLANS_DATA } from '../data/plans';

export const OfferBanner: React.FC = () => {
  const { setSelectedPlan, selectedOperator } = useRecharge();

  const offers = [
    {
      price: 399,
      data: '2GB/DAY',
      validity: '12 MONTHS',
      calls: 'Unlimited Calls',
      planId: selectedOperator ? `${selectedOperator}-399` : 'offer-399',
    },
    {
      price: 349,
      data: '2GB/DAY',
      validity: '6 MONTHS',
      calls: 'Unlimited Calls',
      planId: selectedOperator ? `${selectedOperator}-349` : 'offer-349',
      featured: true,
    },
    {
      price: 299,
      data: '2GB/DAY',
      validity: '84 DAYS',
      calls: 'Unlimited Calls',
      planId: selectedOperator ? `${selectedOperator}-299` : 'offer-299',
    },
  ];

  const handleSelectOffer = (price: number) => {
    if (!selectedOperator) return;
    const plan = PLANS_DATA.find((p) => p.operatorId === selectedOperator && p.price === price) ||
                 PLANS_DATA.find((p) => p.price === price);
    if (plan) {
      setSelectedPlan(plan);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#2A0845] via-[#481272] to-[#2B0847] p-4 sm:p-5 text-white shadow-lg border border-purple-900/50">
      {/* Decorative starry night particles & glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-600/25 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative stars */}
      <div className="absolute top-3 left-4 text-amber-300 opacity-80 animate-pulse pointer-events-none">✦</div>
      <div className="absolute top-6 right-6 text-fuchsia-300 opacity-70 pointer-events-none">✦</div>
      <div className="absolute bottom-10 left-8 text-cyan-200 opacity-60 text-xs pointer-events-none">★</div>
      <div className="absolute bottom-8 right-16 text-yellow-200 opacity-70 text-xs pointer-events-none">✦</div>

      {/* Header of Banner */}
      <div className="relative z-10 text-center mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-purple-200 mb-1.5">
          <span className="w-4 h-4 rounded-full bg-[#6426AD] text-white flex items-center justify-center">
            <PhonePeLogo className="text-white" size={10} />
          </span>
          <span>PhonePe Recharges</span>
          <Sparkles className="w-3 h-3 text-amber-300" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          BEST SAVINGS OFFERS!
        </h2>
      </div>

      {/* 3 Offer Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {offers.map((offer) => (
          <div
            key={offer.price}
            onClick={() => handleSelectOffer(offer.price)}
            className={`group cursor-pointer rounded-2xl p-2.5 sm:p-3 text-center transition-all duration-200 backdrop-blur-sm border flex flex-col justify-between ${
              offer.featured
                ? 'bg-gradient-to-b from-purple-800/80 to-purple-950/90 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/40 hover:scale-[1.03]'
                : 'bg-purple-950/60 hover:bg-purple-900/60 border-purple-500/30 hover:scale-[1.02]'
            }`}
          >
            {/* Price badge */}
            <div className="bg-[#6426AD] text-white font-extrabold text-xs sm:text-sm py-1 px-1.5 rounded-lg mb-2 shadow-sm border border-purple-400/40">
              ₹{offer.price}/-
            </div>

            {/* Benefits */}
            <div className="space-y-0.5 text-[11px] sm:text-xs">
              <div className="font-bold text-white tracking-wide">{offer.data}</div>
              <div className="font-extrabold text-amber-300 text-[10px] sm:text-xs tracking-wider uppercase">
                {offer.validity}
              </div>
              <div className="text-purple-200 text-[9px] sm:text-[11px] leading-tight">
                {offer.calls}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Footer inside banner: HOT DEAL badge & Operators */}
      <div className="relative z-10 flex items-center justify-between pt-1">
        {/* Hot Deal Badge */}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-purple-600 px-3 py-1 rounded-full shadow-md border border-pink-400/40 animate-pulse">
          <Flame className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
          <span className="text-[10px] sm:text-xs font-black tracking-wider text-white uppercase">
            HOT DEAL!
          </span>
        </div>

        {/* Operator Mini Logos */}
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          <span className="text-[10px] text-purple-200/90 font-medium mr-1 hidden sm:inline">Supports:</span>
          <OperatorLogo id="vi" size={20} />
          <OperatorLogo id="bsnl" size={20} />
          <OperatorLogo id="airtel" size={20} />
          <OperatorLogo id="jio" size={20} />
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { SelectedNumberCard } from '../components/SelectedNumberCard';
import { CountdownCard } from '../components/CountdownCard';
import { PlanCard } from '../components/PlanCard';
import { useRecharge } from '../context/RechargeContext';
import { PLANS_DATA } from '../data/plans';
import type { RechargePlan } from '../types/recharge';

export const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedOperator, selectedPlan, setSelectedPlan } = useRecharge();
  const [activeTab, setActiveTab] = useState<'all' | 'popular' | '5g' | 'validity'>('all');
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const checkoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Recharge plan prices are controlled by PLANS_DATA in src/data/plans.ts.
  // The admin/database plans endpoint is intentionally not used here.
  const availablePlans = PLANS_DATA
    .filter((p) => p.operatorId === selectedOperator)
    .slice()
    .sort((a, b) => Number(b.price) - Number(a.price));

  const filteredPlans = activeTab === 'all'
    ? availablePlans
    : availablePlans.filter((p) => p.category === activeTab || (activeTab === '5g' && p.tag?.includes('5G')));

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (checkoutTimerRef.current) clearTimeout(checkoutTimerRef.current);
    };
  }, []);

  // Redirect to home if no operator is selected
  useEffect(() => {
    if (!selectedOperator) {
      navigate('/', { replace: true });
    }
  }, [selectedOperator, navigate]);

  const handleSelectPlan = (plan: RechargePlan) => {
    if (isOpeningCheckout) return;

    // Step A: Capture plan, preserve all details, disable duplicate navigation
    setSelectedPlan(plan);
    setIsOpeningCheckout(true);

    // Step B & C: Show transition, then navigate to Secure Checkout
    checkoutTimerRef.current = setTimeout(() => {
      navigate('/checkout');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F1F3F9] pb-16">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30">
        <AppHeader
          title="Recharge Plans"
          subtitle="Fast • Secure • Simple"
          showBack={true}
          backTo="/"
        />
      </div>

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Selected Mobile Number Card */}
        <SelectedNumberCard variant="page2" />

        {/* Synchronized Special Offer Countdown Card */}
        <CountdownCard />

        {/* Best Plans Section Header */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E7E8EF] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F2EAFE] text-[#6426AD] flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#151B2B]">
                  Best plans for you
                </h2>
                <p className="text-xs text-[#71809A]">
                  Select a plan to continue
                </p>
              </div>
            </div>

            <span className="bg-purple-100 text-[#6426AD] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              SPECIAL
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#6426AD] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Plans ({availablePlans.length})
            </button>
            <button
              onClick={() => setActiveTab('5g')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === '5g'
                  ? 'bg-[#6426AD] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              True 5G Plans
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'popular'
                  ? 'bg-[#6426AD] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Popular Packs
            </button>
            <button
              onClick={() => setActiveTab('validity')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'validity'
                  ? 'bg-[#6426AD] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Validity Specials
            </button>
          </div>
        </div>

        {/* List of Recharge Plan Cards */}
        <div className="space-y-3.5">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={handleSelectPlan}
              isNavigating={isOpeningCheckout}
            />
          ))}
        </div>
      </main>

      {/* Step B: Centered Secure Checkout Transition Overlay */}
      {isOpeningCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xs w-full shadow-2xl border border-purple-100 text-center animate-in zoom-in-95 duration-200">
            {/* Animated purple rotating ring with centered shield icon */}
            <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-purple-100 border-t-[#6426AD] animate-spin" />
              <ShieldCheck className="w-7 h-7 text-[#6426AD]" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#151B2B]">
              Opening Secure Checkout...
            </h3>
            <p className="text-xs text-[#71809A] mt-1">
              Preparing your selected recharge plan
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

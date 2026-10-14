import React from 'react';
import { X, HelpCircle, PhoneCall, ShieldCheck, Zap } from 'lucide-react';
import { useRecharge } from '../context/RechargeContext';

export const HelpModal: React.FC = () => {
  const { isHelpOpen, setIsHelpOpen } = useRecharge();

  if (!isHelpOpen) return null;

  const faqs = [
    {
      q: 'How fast is mobile recharge credited?',
      a: 'Recharges are typically credited within seconds once authorized by the telecom operator network.',
    },
    {
      q: 'Which operators are supported?',
      a: 'Jio, Airtel, Vi, and BSNL prepaid plans across all Indian telecom circles.',
    },
    {
      q: 'What payment modes are accepted?',
      a: 'All standard UPI applications including PhonePe, Paytm, Google Pay, BHIM, and QR scan.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-purple-100 relative">
        <button
          onClick={() => setIsHelpOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 text-[#6426AD]">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#151B2B]">Help & FAQs</h3>
            <p className="text-xs text-[#71809A]">Quick assistance for your recharge</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
              <div className="text-xs font-bold text-[#151B2B] mb-1">{faq.q}</div>
              <div className="text-xs text-[#71809A] leading-relaxed">{faq.a}</div>
            </div>
          ))}
        </div>

        <div className="bg-purple-50 rounded-2xl p-3.5 border border-purple-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#6426AD] font-semibold">
            <PhoneCall className="w-4 h-4" />
            <span>24x7 Customer Support</span>
          </div>
          <span className="text-[11px] bg-[#6426AD] text-white px-2.5 py-1 rounded-full font-bold">
            1800-419-0157
          </span>
        </div>
      </div>
    </div>
  );
};

export const NotificationDrawer: React.FC = () => {
  const { isNotificationOpen, setIsNotificationOpen, markNotificationsAsRead } = useRecharge();

  if (!isNotificationOpen) return null;

  const notifications = [
    {
      id: 1,
      title: 'Mega Savings Offer Active!',
      desc: 'Get annual plans with UNLIMITED TRUE 5G DATA from just ₹299/- for a limited time.',
      time: '10m ago',
      icon: Zap,
      color: 'text-amber-500 bg-amber-50',
    },
    {
      id: 2,
      title: 'Payment Protection Guarantee',
      desc: 'All UPI recharges are 100% covered by PhonePe safe transaction escrow.',
      time: '1h ago',
      icon: ShieldCheck,
      color: 'text-green-600 bg-green-50',
    },
  ];

  const handleClose = () => {
    markNotificationsAsRead();
    setIsNotificationOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-purple-100 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-[#151B2B] mb-1">Notifications</h3>
        <p className="text-xs text-[#71809A] mb-4">Latest updates and promotional alerts</p>

        <div className="space-y-3 mb-5">
          {notifications.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3"
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-xs font-bold text-[#151B2B]">{item.title}</span>
                    <span className="text-[10px] text-slate-400">{item.time}</span>
                  </div>
                  <p className="text-xs text-[#71809A] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleClose}
          className="w-full py-2.5 rounded-xl bg-purple-50 text-[#6426AD] text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
        >
          Mark all as read & close
        </button>
      </div>
    </div>
  );
};

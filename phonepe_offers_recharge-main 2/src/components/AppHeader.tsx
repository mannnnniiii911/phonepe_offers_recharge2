import React from 'react';
import { HelpCircle, Bell, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecharge } from '../context/RechargeContext';

import { PhonePeLogo } from './PhonePeLogo';

interface AppHeaderProps {
  title: string;
  subtitle: string;
  showBack?: boolean;
  backTo?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  backTo = '/',
}) => {
  const navigate = useNavigate();
  const { setIsHelpOpen, setIsNotificationOpen, unreadNotifications } = useRecharge();

  return (
    <header className="bg-phonepe-header text-white pt-6 pb-7 px-4 sm:px-6 shadow-md relative overflow-hidden">
      {/* Subtle decorative glow circles */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-purple-400/20 blur-xl pointer-events-none" />

      <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3.5">
          {/* Official PhonePe Logo */}
          <div 
            onClick={() => navigate('/')} 
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner cursor-pointer hover:bg-white/25 transition-transform active:scale-95"
            title="Go to Home"
          >
            <PhonePeLogo className="text-white" size={24} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              onClick={() => navigate(backTo)}
              aria-label="Go back"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white border border-white/20 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <>
              {/* Help Button */}
              <button
                onClick={() => setIsHelpOpen(true)}
                aria-label="Help and FAQs"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white border border-white/20 transition-all cursor-pointer"
                title="Help"
              >
                <HelpCircle className="w-5 h-5 text-purple-100" />
              </button>

              {/* Notification Button */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                aria-label="Notifications"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white border border-white/20 transition-all relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-purple-100" />
                {unreadNotifications > 0 && (
                  <span className="absolute 1.5 top-1.5 right-1.5 w-2.5 h-2.5 bg-[#FF3448] border-2 border-[#6426AD] rounded-full animate-pulse" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

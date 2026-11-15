import React from 'react';
import { ChevronLeft, Menu, Bell, Settings } from 'lucide-react';
import { useData, ScreenId } from '../../context/DataContext';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showMenu?: boolean;
  onMenuClick?: () => void;
  showLogo?: boolean;
  showNotifications?: boolean;
  onNotificationClick?: () => void;
  showSettings?: boolean;
  onSettingsClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack,
  onBack,
  showMenu,
  onMenuClick,
  showLogo,
  showNotifications,
  onNotificationClick,
  showSettings,
  onSettingsClick
}) => {
  const { setCurrentScreen, unreadNotifCount } = useData();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setCurrentScreen('home');
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-30 bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white shadow-md">
      {/* Top simulated status bar space */}
      <div className="h-6 w-full flex items-center justify-between px-6 text-[10px] text-white/80 font-medium">
        <span>9:41</span>
        <div className="flex items-center space-x-1.5">
          <span className="inline-block w-3 h-2 border border-white/80 rounded-sm relative after:content-[''] after:absolute after:-right-1 after:top-0.5 after:w-0.5 after:h-1 after:bg-white/80" />
          <span>5G</span>
        </div>
      </div>

      <div className="px-4 py-2.5 flex items-center justify-between min-h-[52px]">
        {/* Left Side */}
        <div className="flex items-center w-10">
          {showBack && (
            <button
              onClick={handleBack}
              aria-label="Back"
              className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full active-press transition"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
            </button>
          )}

          {showMenu && (
            <button
              onClick={onMenuClick}
              aria-label="Menu"
              className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full active-press transition"
            >
              <Menu className="w-6 h-6 stroke-[2.2]" />
            </button>
          )}
        </div>

        {/* Center */}
        <div className="flex-1 flex justify-center items-center">
          {showLogo ? (
            <div className="bg-white px-3.5 py-1 rounded-full shadow-sm border border-slate-100 flex items-center justify-center transform scale-95">
              <img
                src="/assets/logo.png"
                alt="Extra Diesel Logo"
                className="h-8 w-auto object-contain max-w-[140px]"
              />
            </div>
          ) : (
            <h1 className="text-base font-bold text-white tracking-wide text-center truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-end w-10">
          {showNotifications && (
            <button
              onClick={onNotificationClick}
              aria-label="Notifications"
              className="p-1.5 text-white hover:bg-white/10 rounded-full relative active-press transition"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand-yellow rounded-full ring-2 ring-brand-red animate-pulse" />
              )}
            </button>
          )}

          {showSettings && (
            <button
              onClick={onSettingsClick}
              aria-label="Settings"
              className="p-1.5 text-white hover:bg-white/10 rounded-full active-press transition"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

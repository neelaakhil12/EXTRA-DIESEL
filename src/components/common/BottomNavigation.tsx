import React from 'react';
import { Home, ClipboardList, MapPin, User as UserIcon } from 'lucide-react';
import { useData, NavTab } from '../../context/DataContext';

export const BottomNavigation: React.FC = () => {
  const { activeNavTab, setActiveNavTab, orders } = useData();

  // Find if there is an active running order
  const hasActiveOrder = orders.some(o => o.status === 'placed' || o.status === 'confirmed' || o.status === 'out_for_delivery' || o.status === 'arriving_soon');

  const navItems: { tab: NavTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    {
      tab: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />
    },
    {
      tab: 'orders',
      label: 'Orders',
      icon: <ClipboardList className="w-5 h-5" />
    },
    {
      tab: 'track',
      label: 'Track',
      icon: <MapPin className="w-5 h-5" />,
      badge: hasActiveOrder
    },
    {
      tab: 'profile',
      label: 'Profile',
      icon: <UserIcon className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200/80 px-4 py-2 z-40 shadow-nav flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = activeNavTab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => setActiveNavTab(item.tab)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 relative active-press ${
              isActive ? 'text-brand-red font-semibold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-yellow rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>
            <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red mt-0.5"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

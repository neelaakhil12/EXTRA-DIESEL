import React from 'react';
import { Box, FileText, Home, CreditCard, BarChart2 } from 'lucide-react';
import { useData, NavTab } from '../../context/DataContext';

export const BottomNavigation: React.FC = () => {
  const { activeNavTab, setActiveNavTab, orders } = useData();

  // Find if there is an active running order
  const hasActiveOrder = orders.some(
    o => o.status === 'placed' || o.status === 'confirmed' || o.status === 'out_for_delivery' || o.status === 'arriving_soon'
  );

  const navItems: { tab: NavTab; label: string; icon: React.ReactNode; isCenter?: boolean }[] = [
    {
      tab: 'cube',
      label: 'Services',
      icon: <Box className="w-5 h-5" />
    },
    {
      tab: 'orders',
      label: 'Orders',
      icon: (
        <div className="relative">
          <FileText className="w-5 h-5" />
          {hasActiveOrder && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-red rounded-full ring-2 ring-white animate-pulse" />
          )}
        </div>
      )
    },
    {
      tab: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5 text-white" />,
      isCenter: true
    },
    {
      tab: 'payments',
      label: 'Payments',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      tab: 'analytics',
      label: 'Analytics',
      icon: <BarChart2 className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200/80 px-2 py-1.5 z-40 shadow-nav flex items-center justify-around select-none">
      {navItems.map((item) => {
        const isActive = activeNavTab === item.tab;

        if (item.isCenter) {
          return (
            <button
              key={item.tab}
              onClick={() => setActiveNavTab(item.tab)}
              className="flex flex-col items-center justify-center -mt-5 relative active-press focus:outline-none"
              aria-label={item.label}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 ${
                  isActive
                    ? 'bg-gradient-to-tr from-brand-darkRed to-brand-red ring-4 ring-red-100 scale-105'
                    : 'bg-brand-red hover:bg-brand-darkRed'
                }`}
              >
                {item.icon}
              </div>
              <span className={`text-[10px] mt-1 font-bold ${isActive ? 'text-brand-red' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.tab}
            onClick={() => setActiveNavTab(item.tab)}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 relative active-press ${
              isActive ? 'text-brand-red font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            {item.icon}
            <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

import React from 'react';
import {
  X,
  Fuel,
  ClipboardList,
  MapPin,
  Calendar,
  Building2,
  ShieldCheck,
  FileText,
  PhoneCall,
  LogOut,
  UserCheck,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose }) => {
  const { user, logout, updateUserRole } = useAuth();
  const { setCurrentScreen, setActiveNavTab } = useData();

  if (!isOpen) return null;

  const navigateTo = (screen: any, navTab?: any) => {
    setCurrentScreen(screen);
    if (navTab) setActiveNavTab(navTab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header with brand gradient */}
        <div className="bg-gradient-to-br from-brand-darkRed to-brand-red p-5 text-white relative">
          <button
            onClick={onClose}
            aria-label="Close Menu"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mt-2">
            <div className="w-12 h-12 rounded-full border-2 border-brand-yellow overflow-hidden bg-white shadow-sm flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-brand-red font-bold text-lg">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">{user?.name || 'Guest User'}</h3>
              <p className="text-xs text-white/80">{user?.phone || '+91 98765 43210'}</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-yellow text-brand-dark mt-1">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> PESO Certified
              </span>
            </div>
          </div>

          {/* Quick role switcher for testing / audit */}
          <div className="mt-4 pt-3 border-t border-white/20">
            <div className="text-[11px] text-white/90 font-medium mb-1.5 flex items-center justify-between">
              <span>Active Role:</span>
              <span className="uppercase text-brand-yellow font-bold text-[10px] bg-black/20 px-1.5 py-0.5 rounded">
                {user?.role || 'customer'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                onClick={() => updateUserRole('customer')}
                className={`py-1 px-1.5 rounded text-center transition font-medium ${
                  user?.role === 'customer'
                    ? 'bg-white text-brand-red font-bold shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Customer
              </button>
              <button
                onClick={() => updateUserRole('b2b')}
                className={`py-1 px-1.5 rounded text-center transition font-medium ${
                  user?.role === 'b2b'
                    ? 'bg-white text-brand-red font-bold shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                B2B Fleet
              </button>
              <button
                onClick={() => updateUserRole('manager')}
                className={`py-1 px-1.5 rounded text-center transition font-medium ${
                  user?.role === 'manager'
                    ? 'bg-white text-brand-red font-bold shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Manager
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <button
            onClick={() => navigateTo('home', 'home')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <Fuel className="w-4 h-4 text-brand-red" />
            <span>Home Dashboard</span>
          </button>

          <button
            onClick={() => navigateTo('order')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <Fuel className="w-4 h-4 text-brand-red" />
            <span>Order Diesel</span>
          </button>

          <button
            onClick={() => navigateTo('orders', 'orders')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <ClipboardList className="w-4 h-4 text-brand-red" />
            <span>My Orders</span>
          </button>

          <button
            onClick={() => navigateTo('track', 'track')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <MapPin className="w-4 h-4 text-brand-red" />
            <span>Track Live Delivery</span>
          </button>

          <button
            onClick={() => navigateTo('subscription')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <Calendar className="w-4 h-4 text-brand-red" />
            <span>Scheduled Subscriptions</span>
          </button>

          <button
            onClick={() => navigateTo('b2b')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <Building2 className="w-4 h-4 text-brand-red" />
            <span>Corporate B2B Portal</span>
          </button>

          <button
            onClick={() => navigateTo('manager')}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
          >
            <Wrench className="w-4 h-4 text-brand-red" />
            <span>Dispatch & Manager Portal</span>
          </button>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => navigateTo('invoices')}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Tax Invoices & GST</span>
            </button>

            <a
              href="tel:+919876543210"
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-red-50 hover:text-brand-red font-medium text-sm transition"
            >
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>24/7 Helpline: 98765 43210</span>
            </a>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              logout();
              navigateTo('login');
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border border-red-200 text-brand-red hover:bg-red-50 text-xs font-semibold active-press"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Session</span>
          </button>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Extra Diesel v2.4 • PESO & ISO 9001 Compliant
          </p>
        </div>
      </div>
    </div>
  );
};

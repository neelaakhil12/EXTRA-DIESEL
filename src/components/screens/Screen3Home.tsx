import React, { useState, useEffect } from 'react';
import {
  Fuel,
  ClipboardList,
  Calendar,
  Building2,
  ChevronRight,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Truck
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { SideDrawer } from '../common/SideDrawer';
import { NotificationModal } from '../common/NotificationModal';

export const Screen3Home: React.FC = () => {
  const { setCurrentScreen, setActiveNavTab, fuelRate } = useData();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      title: 'Fuel Delivered',
      subtitle: 'At Your Doorstep',
      badge: 'Zero Spillage • PESO Approved',
      image: '/assets/hero-banner.png'
    },
    {
      title: 'Smart Metering',
      subtitle: 'Accurate Quantity Assured',
      badge: 'Automated Dispensing System',
      image: '/assets/truck-splash.png'
    },
    {
      title: 'Corporate B2B Fleet',
      subtitle: 'Bulk Discounts & Credit',
      badge: '15-Day Flexible Billing',
      image: '/assets/hero-banner.png'
    }
  ];

  // Auto-scroll slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-20 select-none">
      {/* Top Red Header */}
      <AppHeader
        showMenu
        onMenuClick={() => setIsDrawerOpen(true)}
        showLogo
        showNotifications
        onNotificationClick={() => setIsNotifOpen(true)}
      />

      <div className="p-4 space-y-4">
        {/* Today's Fuel Price & Quality Bar */}
        <div className="bg-white rounded-2xl p-3 shadow-card border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-brand-red flex items-center justify-center font-bold">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Today's Diesel Rate
                </span>
                <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> Best Price
                </span>
              </div>
              <div className="text-base font-extrabold text-slate-900 leading-tight">
                ₹{fuelRate.toFixed(2)} <span className="text-xs font-medium text-slate-500">/ Liter</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentScreen('order')}
            className="px-3.5 py-1.5 rounded-full bg-brand-red text-white text-xs font-bold shadow-sm active-press hover:bg-brand-darkRed transition"
          >
            Order Now
          </button>
        </div>

        {/* Hero Slider Banner */}
        <div className="relative rounded-2xl overflow-hidden shadow-card border border-slate-200/80 bg-slate-900 min-h-[165px]">
          <img
            src={heroSlides[currentSlide].image}
            alt="Hero Banner"
            className="w-full h-[165px] object-cover opacity-90 transition-all duration-700"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-between text-white">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-brand-yellow text-slate-950 uppercase tracking-wider mb-1">
                {heroSlides[currentSlide].badge}
              </span>
              <h3 className="text-lg font-black leading-tight drop-shadow-sm">
                {heroSlides[currentSlide].title}
              </h3>
              <p className="text-lg font-black text-brand-yellow drop-shadow-sm leading-tight">
                {heroSlides[currentSlide].subtitle}
              </p>
            </div>

            {/* Slider Dots */}
            <div className="flex items-center space-x-1.5 pb-1">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentSlide === i ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Four Main Service Cards (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Order Diesel */}
          <button
            onClick={() => setCurrentScreen('order')}
            className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex flex-col items-center justify-center text-center active-press hover:border-brand-red transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Fuel className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              Order<br />Diesel
            </span>
          </button>

          {/* Card 2: My Orders */}
          <button
            onClick={() => {
              setCurrentScreen('orders');
              setActiveNavTab('orders');
            }}
            className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex flex-col items-center justify-center text-center active-press hover:border-brand-red transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <ClipboardList className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              My<br />Orders
            </span>
          </button>

          {/* Card 3: Subscription */}
          <button
            onClick={() => setCurrentScreen('subscription')}
            className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex flex-col items-center justify-center text-center active-press hover:border-brand-red transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Calendar className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              Subscription
            </span>
          </button>

          {/* Card 4: Business (B2B) */}
          <button
            onClick={() => setCurrentScreen('b2b')}
            className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex flex-col items-center justify-center text-center active-press hover:border-brand-red transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center mb-2 group-hover:scale-105 transition">
              <Building2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-900 leading-tight">
              Business<br />(B2B)
            </span>
          </button>
        </div>

        {/* Our Services Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Our Services</h3>
            <button
              onClick={() => setCurrentScreen('order')}
              className="text-xs font-bold text-brand-red flex items-center hover:underline"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Service 1: Residential (B2C) */}
            <div
              onClick={() => setCurrentScreen('order')}
              className="bg-white rounded-2xl overflow-hidden shadow-card border border-slate-200/80 cursor-pointer active-press hover:border-brand-red transition"
            >
              <div className="h-16 w-full overflow-hidden bg-slate-100">
                <img
                  src="/assets/service-residential.png"
                  alt="Residential Service"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <h4 className="text-xs font-bold text-slate-900">Residential (B2C)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  Gated communities &amp; home DG power
                </p>
              </div>
            </div>

            {/* Service 2: Commercial Fleets */}
            <div
              onClick={() => setCurrentScreen('b2b')}
              className="bg-white rounded-2xl overflow-hidden shadow-card border border-slate-200/80 cursor-pointer active-press hover:border-brand-red transition"
            >
              <div className="h-16 w-full overflow-hidden bg-slate-100">
                <img
                  src="/assets/service-commercial.png"
                  alt="Commercial Fleets"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <h4 className="text-xs font-bold text-slate-900">Commercial Fleets</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  Trucks, logistics &amp; site machinery
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Drawer & Notification Modal */}
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

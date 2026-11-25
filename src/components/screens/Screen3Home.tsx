import React, { useState, useEffect } from 'react';
import {
  Fuel,
  MapPin,
  ChevronDown,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Flame,
  TrendingDown,
  Truck,
  Droplets,
  Zap,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { BottomNavigation } from '../common/BottomNavigation';
import { SideDrawer } from '../common/SideDrawer';
import { NotificationModal } from '../common/NotificationModal';

export const Screen3Home: React.FC = () => {
  const { setCurrentScreen, selectedAddress, fuelRate } = useData();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroSlides = [
    {
      title: 'Automated Smart Bowser',
      subtitle: 'Doorstep High-Speed Fueling Fleet',
      badge: 'Legal Metrology Certified • Calibrated Meter',
      image: '/assets/vehicle-bowser-1.jpeg'
    },
    {
      title: 'High-Speed Pure Diesel',
      subtitle: 'Delivered at Doorstep',
      badge: 'Zero Spillage • 100% Quality Assured',
      image: '/assets/hero-slider-1.png'
    },
    {
      title: 'Corporate B2B Fleet',
      subtitle: 'Bulk Slabs & Flexible Credit',
      badge: 'DG Sets • Fleets • Construction',
      image: '/assets/vehicle-bowser-2.jpeg'
    }
  ];

  // Auto-scroll hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Product categories matching reference screenshot
  const productCategories = [
    {
      id: 'emergency',
      name: 'Emergency Diesel',
      badge: '30-Min SLA',
      desc: 'Immediate breakdown support',
      icon: Flame,
      color: 'from-amber-500 to-red-600',
      action: () => setCurrentScreen('order')
    },
    {
      id: 'diesel-delivery',
      name: 'Diesel Delivery',
      badge: 'Best Rate',
      desc: 'Doorstep bowser fueling',
      icon: Fuel,
      color: 'from-red-600 to-rose-700',
      action: () => setCurrentScreen('order')
    },
    {
      id: 'def',
      name: 'Diesel Exhaust Fluid',
      badge: 'BS-VI Ready',
      desc: 'High purity DEF / AdBlue',
      icon: Droplets,
      color: 'from-blue-600 to-indigo-700',
      action: () => setCurrentScreen('order')
    },
    {
      id: 'lubricants',
      name: 'Cooling & Lubes',
      badge: 'Industrial',
      desc: 'Engine coolants & oils',
      icon: Zap,
      color: 'from-emerald-600 to-teal-700',
      action: () => setCurrentScreen('order')
    }
  ];

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-24 select-none">
      {/* Top Address & Profile Bar matching image copy 12.png */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          {/* Location Selector */}
          <button
            onClick={() => setCurrentScreen('edit-location')}
            className="flex items-center space-x-2 text-left group active-press"
          >
            <div className="w-9 h-9 rounded-full bg-red-50 text-brand-red flex items-center justify-center font-bold text-sm border border-red-100 flex-shrink-0">
              J
            </div>
            <div className="max-w-[210px]">
              <div className="flex items-center space-x-1 text-xs font-bold text-slate-900 group-hover:text-brand-red transition">
                <span className="truncate">{selectedAddress.locationName || selectedAddress.label || 'Secunderabad'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:translate-y-0.5 transition" />
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {selectedAddress.street}, {selectedAddress.area}
              </p>
            </div>
          </button>

          {/* Profile Circle Avatar matching reference */}
          <button
            onClick={() => setCurrentScreen('profile')}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-red to-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-red-100 active-press"
            aria-label="Profile"
          >
            N
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Next Available Slot Promotional Banner matching reference */}
        <div className="bg-gradient-to-r from-red-700 via-brand-red to-red-800 text-white rounded-2xl p-3.5 shadow-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-red-100 uppercase tracking-wider">
                Next Available Slot
              </div>
              <div className="text-sm font-extrabold text-white">
                Today, 10:00 PM - 05:00 AM
              </div>
            </div>
          </div>
          <button
            onClick={() => setCurrentScreen('order')}
            className="px-3.5 py-1.5 rounded-full bg-white text-brand-red text-xs font-extrabold shadow-sm active-press hover:bg-red-50 transition"
          >
            Book Slot
          </button>
        </div>

        {/* Hero Showcase with real Mahindra Bolero Bowser */}
        <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-slate-200/80 bg-slate-950 h-[190px]">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center brightness-90 transform scale-100 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-red text-white mb-1 shadow-xs">
                  {slide.badge}
                </span>
                <h2 className="text-base font-extrabold leading-tight text-white drop-shadow-sm">
                  {slide.title}
                </h2>
                <p className="text-xs text-slate-200 font-medium">{slide.subtitle}</p>
              </div>
            </div>
          ))}

          {/* Dots Indicator */}
          <div className="absolute top-3 right-3 z-20 flex space-x-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'bg-brand-red w-4' : 'bg-white/60'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Live Diesel Price Bar */}
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
                ₹{fuelRate.toFixed(2)} <span className="text-xs font-medium text-slate-500">/ 1 Liter</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentScreen('order')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-red to-brand-darkRed text-white text-xs font-bold shadow-sm active-press hover:bg-brand-darkRed transition"
          >
            Order Now
          </button>
        </div>

        {/* Product Categories Horizontal Carousel matching image copy 12.png */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Product Categories
            </h3>
            <span className="text-[11px] font-semibold text-brand-red">All Deliverable</span>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
            {productCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={cat.action}
                className="flex-shrink-0 w-[140px] bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs text-left active-press hover:border-brand-red transition group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.color} text-white flex items-center justify-center mb-2 shadow-xs`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 block w-max mb-1">
                  {cat.badge}
                </span>
                <h4 className="text-xs font-bold text-slate-900 leading-tight group-hover:text-brand-red transition">
                  {cat.name}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Real Vehicle Bowser Card with Grand Look based upon website */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-brand-red uppercase tracking-wider flex items-center space-x-1">
                <Truck className="w-3.5 h-3.5 mr-1" />
                <span>Our Mobile Bowser Fleet</span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Automated Mobile Fueling Bowser Fleet
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              ● Active on Duty
            </span>
          </div>

          {/* Real Vehicle Photos Gallery */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative rounded-xl overflow-hidden h-28 border border-slate-200 bg-slate-100">
              <img
                src="/assets/vehicle-bowser-1.jpeg"
                alt="Extra Diesel Smart Bowser"
                className="w-full h-full object-cover object-center"
              />
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                Smart Dispenser
              </span>
            </div>
            <div className="relative rounded-xl overflow-hidden h-28 border border-slate-200 bg-slate-100">
              <img
                src="/assets/vehicle-bowser-2.jpeg"
                alt="Extra Diesel Fleet"
                className="w-full h-full object-cover object-center"
              />
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                GPS Bowser
              </span>
            </div>
          </div>

          {/* Bowser Specs Badges */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold">Meter Type</div>
              <div className="text-xs font-bold text-slate-800">Calibrated Digital</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold">Certification</div>
              <div className="text-xs font-bold text-slate-800">PESO / ATEX</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
              <div className="text-[10px] text-slate-500 font-semibold">Accuracy</div>
              <div className="text-xs font-bold text-slate-800">±0.1% Zero Loss</div>
            </div>
          </div>

          <button
            onClick={() => setCurrentScreen('order')}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs active-press transition flex items-center justify-center space-x-1.5"
          >
            <span>Request This Bowser to Site</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Quick Order Now Promo Card */}
        <div className="rounded-2xl p-4 bg-gradient-to-tr from-brand-darkRed via-brand-red to-orange-600 text-white shadow-elevated relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 backdrop-blur-md uppercase tracking-wider">
              Express Doorstep Delivery
            </span>
            <h3 className="text-lg font-black leading-tight text-white">
              Need Pure Fuel Instantly?
            </h3>
            <p className="text-xs text-red-100 max-w-[240px]">
              No more jerry cans or drum spillage. Order pure diesel delivered directly into your generator, trucks or equipment.
            </p>
            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={() => setCurrentScreen('order')}
                className="px-4 py-2.5 rounded-xl bg-white text-brand-red text-xs font-extrabold shadow-sm active-press hover:bg-slate-50 transition"
              >
                Place Order Now
              </button>
              <a
                href="tel:+919848020940"
                className="p-2.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition flex items-center justify-center"
                aria-label="Call Helpline"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Tab Bottom Navigation matching image copy 12.png */}
      <BottomNavigation />

      {/* Side Drawer & Notification Modal */}
      <SideDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
};

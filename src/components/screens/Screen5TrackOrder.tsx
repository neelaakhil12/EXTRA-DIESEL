import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Check,
  Truck,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';

export const Screen5TrackOrder: React.FC = () => {
  const {
    setCurrentScreen,
    orders,
    activeTrackingOrder,
    setActiveNavTab,
    updateOrderStatus
  } = useData();

  // Pick order to track
  const order = activeTrackingOrder || orders[0];

  // Animated truck position simulation
  const [truckPos, setTruckPos] = useState(45); // percentage along route

  useEffect(() => {
    const interval = setInterval(() => {
      setTruckPos((prev) => (prev >= 75 ? 35 : prev + 2));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!order) {
    return (
      <div className="min-h-full flex flex-col bg-[#F7F8FA] pb-10">
        <AppHeader title="Track Order" showBack onBack={() => setCurrentScreen('home')} />
        <div className="p-8 text-center my-auto">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Active Order Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            You don't have any ongoing diesel dispatches right now.
          </p>
          <button
            onClick={() => setCurrentScreen('order')}
            className="px-6 py-2.5 rounded-full bg-brand-red text-white text-xs font-bold"
          >
            Order Diesel
          </button>
        </div>
      </div>
    );
  }

  const driverPhone = order.driver?.phone || '+919876543210';
  const driverName = order.driver?.name || 'Ramesh Kumar';

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] select-none pb-8">
      {/* Red Header */}
      <AppHeader
        title="Track Order"
        showBack
        onBack={() => {
          setCurrentScreen('home');
          setActiveNavTab('home');
        }}
      />

      <div className="p-4 space-y-4">
        {/* Green Success Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950 leading-tight">
              Order Placed Successfully!
            </h3>
            <p className="text-xs font-semibold text-emerald-800 mt-0.5">
              Order ID: #{order.id}
            </p>
          </div>
        </div>

        {/* Vertical Delivery Timeline */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80">
          <div className="relative pl-6 space-y-5">
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200" />

            {/* Step 1: Order Confirmed */}
            <div className="relative flex items-start space-x-3">
              <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center ring-4 ring-white">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="pl-3">
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Order Confirmed
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  14 Nov, 2026 • 10:15 AM
                </p>
              </div>
            </div>

            {/* Step 2: Out for Delivery */}
            <div className="relative flex items-start space-x-3">
              <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center ring-4 ring-white">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="pl-3">
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Out for Delivery
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  14 Nov, 2026 • 10:40 AM
                </p>
              </div>
            </div>

            {/* Step 3: Arriving Soon */}
            <div className="relative flex items-start space-x-3">
              <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center ring-4 ring-white animate-pulse">
                <Truck className="w-3.5 h-3.5" />
              </div>
              <div className="pl-3">
                <h4 className="text-xs font-bold text-slate-900 leading-tight flex items-center space-x-1.5">
                  <span>Arriving Soon</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </h4>
                <p className="text-[11px] font-bold text-brand-red mt-0.5">
                  ETA: 15 mins
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grand Interactive GPS Map Section */}
        <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-slate-200/90 bg-[#F1F5F9] h-[210px]">
          {/* Detailed SVG Map Surface */}
          <svg className="w-full h-full" viewBox="0 0 360 210" preserveAspectRatio="none">
            {/* Background Base */}
            <rect width="360" height="210" fill="#F8FAFC" />

            {/* Green Parks & Landscaping */}
            <path d="M 0,0 L 90,0 C 80,40 50,70 0,90 Z" fill="#E2FBE8" />
            <path d="M 260,140 Q 310,120 360,150 L 360,210 L 250,210 Z" fill="#DCFCE7" />
            <path d="M 140,20 Q 180,10 210,45 Q 170,80 130,50 Z" fill="#E8FDF0" />

            {/* Water Canal / Lake */}
            <path d="M 180,170 Q 210,165 240,195 Q 220,210 180,210 Z" fill="#E0F2FE" />

            {/* City Road Network Grid */}
            <line x1="0" y1="50" x2="360" y2="50" stroke="#E2E8F0" strokeWidth="4" />
            <line x1="0" y1="110" x2="360" y2="110" stroke="#E2E8F0" strokeWidth="6" />
            <line x1="0" y1="165" x2="360" y2="165" stroke="#E2E8F0" strokeWidth="3" />
            <line x1="70" y1="0" x2="70" y2="210" stroke="#E2E8F0" strokeWidth="4" />
            <line x1="160" y1="0" x2="160" y2="210" stroke="#E2E8F0" strokeWidth="5" />
            <line x1="270" y1="0" x2="270" y2="210" stroke="#E2E8F0" strokeWidth="4" />

            {/* Diagonal Highway Expressway */}
            <path
              d="M -20,180 Q 80,130 180,110 T 380,40"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M -20,180 Q 80,130 180,110 T 380,40"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Active GPS Delivery Route Path */}
            <path
              d="M 50,155 L 120,130 L 190,108 L 275,70 L 310,55"
              fill="none"
              stroke="#D50000"
              strokeWidth="4"
              strokeDasharray="6 3"
              strokeLinecap="round"
              className="animate-pulse"
            />

            {/* Street Names */}
            <text x="12" y="44" fill="#94A3B8" fontSize="8" fontWeight="600">Outer Ring Rd</text>
            <text x="170" y="104" fill="#94A3B8" fontSize="8" fontWeight="600">Hitech City Main Rd</text>
            <text x="250" y="45" fill="#DC2626" fontSize="8" fontWeight="700">Green Park Colony</text>
          </svg>

          {/* Animated Moving Bowser Truck Overlay */}
          <div
            className="absolute transition-all duration-1000 ease-in-out pointer-events-none"
            style={{
              left: `${truckPos}%`,
              top: `${155 - truckPos * 1.3}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Radar wave rings around truck */}
            <div className="absolute -inset-2 rounded-full bg-red-500/20 animate-ping" />
            <div className="relative bg-white p-1.5 rounded-2xl shadow-xl border border-slate-200 flex items-center space-x-1.5">
              <div className="w-7 h-7 rounded-xl bg-brand-red text-white flex items-center justify-center shadow-sm">
                <Truck className="w-4 h-4" />
              </div>
              <div className="pr-1">
                <span className="text-[10px] font-black text-slate-900 block leading-tight">
                  Bowser TS 09
                </span>
                <span className="text-[9px] font-bold text-brand-red leading-none">
                  ETA: 15 mins
                </span>
              </div>
            </div>
          </div>

          {/* Destination House Pin */}
          <div className="absolute right-5 top-7 pointer-events-none">
            <div className="relative flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center shadow-xl border-2 border-white ring-4 ring-red-500/30 animate-bounce">
                <MapPin className="w-6 h-6 fill-white stroke-brand-red" />
              </div>
              <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow mt-1">
                Site Destination
              </span>
            </div>
          </div>

          {/* Bottom Live Telematics HUD */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-800 flex items-center space-x-1.5 shadow-sm border border-slate-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Telematics: 42 km/h • GPS Calibrated</span>
            </div>
            <div className="bg-brand-red text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl shadow-sm">
              Live Dispatch
            </div>
          </div>
        </div>

        {/* Driver Details Card */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-brand-yellow shadow-md bg-white flex-shrink-0 flex items-center justify-center">
              <img
                src="/assets/driver-avatar.png"
                alt={driverName}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {driverName}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {driverPhone}
              </p>
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-emerald-200/60">
                Bowser: TS 09 ED 7721
              </span>
            </div>
          </div>

          {/* Action Buttons: Phone & WhatsApp */}
          <div className="flex items-center space-x-2.5">
            {/* Phone Button */}
            <a
              href={`tel:${driverPhone}`}
              aria-label="Call Driver"
              className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center shadow-sm active-press hover:bg-brand-darkRed transition"
            >
              <Phone className="w-4 h-4 fill-white" />
            </a>

            {/* WhatsApp Support Button */}
            <a
              href={`https://wa.me/919876543210?text=Hello%20Extra%20Diesel,%20inquiring%20about%20Order%20${order.id}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Support"
              className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center shadow-sm active-press hover:bg-brand-darkRed transition"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
            </a>
          </div>
        </div>

        {/* Quick Order Info summary */}
        <div className="bg-slate-100/70 rounded-xl p-3 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Fuel Quantity:</span>
            <strong className="text-slate-900 font-bold">{order.liters} Liters</strong>
          </div>
          <div className="flex justify-between">
            <span>Destination:</span>
            <strong className="text-slate-900 font-medium truncate max-w-[200px]">
              {order.address.street}, {order.address.city}
            </strong>
          </div>
          <div className="flex justify-between">
            <span>Total Value:</span>
            <strong className="text-brand-red font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

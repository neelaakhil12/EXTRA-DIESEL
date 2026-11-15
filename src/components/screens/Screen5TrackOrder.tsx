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

        {/* Map Section */}
        <div className="relative rounded-2xl overflow-hidden shadow-card border border-slate-200/80 bg-slate-100 min-h-[190px]">
          <img
            src="/assets/map-track.png"
            alt="Live GPS Navigation Map"
            className="w-full h-[190px] object-cover"
          />

          {/* Simulated live GPS route marker overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Live moving tanker truck marker */}
            <div
              className="absolute transition-all duration-1000 ease-in-out"
              style={{
                left: `${truckPos}%`,
                top: `${80 - truckPos * 0.45}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="bg-white p-1 rounded-xl shadow-lg border border-slate-200 flex items-center space-x-1">
                <div className="w-6 h-6 rounded-lg bg-brand-red text-white flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-extrabold text-slate-800 pr-1">
                  15m
                </span>
              </div>
            </div>

            {/* Destination House Pin */}
            <div className="absolute right-6 top-10">
              <div className="w-9 h-9 rounded-full bg-brand-red text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-red-400/50">
                <MapPin className="w-5 h-5 fill-white stroke-brand-red" />
              </div>
            </div>
          </div>

          {/* Live GPS badge */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 flex items-center space-x-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live GPS Bowser Telematics</span>
          </div>
        </div>

        {/* Driver Details Card */}
        <div className="bg-white rounded-2xl p-3.5 shadow-card border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-yellow shadow-sm bg-slate-100 flex-shrink-0">
              <img
                src="/assets/driver-avatar.png"
                alt={driverName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                {driverName}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {driverPhone}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                Bowser: TS 09 ED 7721
              </span>
            </div>
          </div>

          {/* Action Buttons: Phone & WhatsApp */}
          <div className="flex items-center space-x-2">
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

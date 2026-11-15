import React from 'react';
import { ShieldCheck, Zap, Handshake, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export const Screen1Splash: React.FC = () => {
  const { setCurrentScreen } = useData();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('login');
    }
  };

  return (
    <div className="relative min-h-full flex flex-col justify-between bg-white overflow-hidden select-none">
      {/* Top Left Yellow & Red Curved Decorative Graphic */}
      <div className="absolute -top-12 -left-12 w-48 h-48 pointer-events-none z-0">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <path
            d="M 0,0 L 160,0 C 130,70 60,130 0,160 Z"
            fill="#FFD600"
          />
          <path
            d="M 0,0 L 120,0 C 95,55 45,95 0,120 Z"
            fill="#D50000"
          />
        </svg>
      </div>

      {/* Top: Brand Logo */}
      <div className="relative z-10 pt-8 px-6 flex flex-col items-center">
        <div className="w-full max-w-[260px] flex items-center justify-center">
          <img
            src="/assets/logo.png"
            alt="Extra Diesel - Reliable Diesel Right To Your Site"
            className="w-full h-auto object-contain drop-shadow-sm"
          />
        </div>
      </div>

      {/* Center: Diesel Bowser Truck with City Backdrop */}
      <div className="relative z-10 px-4 my-auto flex flex-col items-center">
        <div className="w-full max-w-[320px] rounded-2xl overflow-hidden shadow-sm bg-white p-1">
          <img
            src="/assets/truck-splash.png"
            alt="Extra Diesel Delivery Bowser Truck"
            className="w-full h-auto object-cover rounded-xl"
          />
        </div>

        {/* Headline */}
        <div className="text-center mt-5">
          <h2 className="text-2xl font-extrabold text-[#171717] tracking-tight">
            Fuel Delivered
          </h2>
          <h3 className="text-2xl font-black text-brand-red italic tracking-tight -mt-0.5">
            At Your Doorstep
          </h3>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[330px] mt-6 px-2">
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 mb-1.5 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-slate-900 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Safe &amp;<br />Secure
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 mb-1.5 shadow-sm">
              <Zap className="w-5 h-5 text-slate-900 fill-slate-900" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              On-Time<br />Delivery
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 mb-1.5 shadow-sm">
              <Handshake className="w-5 h-5 text-slate-900 stroke-[2.2]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Trusted<br />Partner
            </span>
          </div>
        </div>
      </div>

      {/* Bottom CTA & Decorative Wave */}
      <div className="relative z-10 px-6 pb-6 pt-4">
        <button
          onClick={handleGetStarted}
          className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white font-bold text-base shadow-elevated flex items-center justify-center space-x-2 active-press transition hover:brightness-105"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Bottom Yellow & Red Wave SVG Graphic */}
        <div className="w-full h-8 mt-4 relative overflow-hidden">
          <svg viewBox="0 0 320 40" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M 0,25 Q 90,5 180,25 T 320,15 L 320,40 L 0,40 Z"
              fill="#FFD600"
            />
            <path
              d="M 0,32 Q 100,18 200,32 T 320,24 L 320,40 L 0,40 Z"
              fill="#D50000"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

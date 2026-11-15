import React, { useState } from 'react';
import { Smartphone, Monitor, RotateCcw, ShieldCheck, Sparkles, Sliders } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { viewMode, toggleViewMode, currentScreen, setCurrentScreen } = useData();
  const [deviceWidth, setDeviceWidth] = useState<number>(390);

  const devicePresets = [
    { name: '360px', width: 360, label: 'Small Android' },
    { name: '390px', width: 390, label: 'iPhone 15' },
    { name: '414px', width: 414, label: 'iPhone Plus' },
    { name: '430px', width: 430, label: 'iPhone Pro Max' }
  ];

  return (
    <div className="min-h-screen bg-[#111622] text-slate-100 flex flex-col font-sans">
      {/* Top Professional Control Ribbon (visible on larger screens for reviewing responsive screens & role testing) */}
      <header className="hidden lg:flex items-center justify-between px-6 py-2.5 bg-[#0A0D14] border-b border-slate-800 text-xs z-50">
        <div className="flex items-center space-x-3">
          <img src="/assets/logo.png" alt="Logo" className="h-6 w-auto object-contain bg-white px-2 py-0.5 rounded" />
          <span className="font-bold text-white text-sm tracking-wide">Extra Diesel</span>
          <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-semibold">
            Mobile-First Architecture
          </span>
          <span className="text-slate-400 text-[11px]">| Current Screen: <strong className="text-amber-400 capitalize">{currentScreen}</strong></span>
        </div>

        {/* Device Switcher Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
            <button
              onClick={() => toggleViewMode()}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition ${
                viewMode === 'mobile' ? 'bg-brand-red text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Simulation</span>
            </button>
            <button
              onClick={() => toggleViewMode()}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition ${
                viewMode === 'desktop' ? 'bg-brand-red text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Desktop</span>
            </button>
          </div>

          {viewMode === 'mobile' && (
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
              {devicePresets.map((p) => (
                <button
                  key={p.width}
                  onClick={() => setDeviceWidth(p.width)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition ${
                    deviceWidth === p.width ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={p.label}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Quick jump to any of the 8 screens for testing */}
          <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
            <span className="text-slate-400 text-[10px] mr-1">Screens:</span>
            {[
              { id: 'splash', label: '1. Splash' },
              { id: 'login', label: '2. Login' },
              { id: 'home', label: '3. Home' },
              { id: 'order', label: '4. Order' },
              { id: 'track', label: '5. Track' },
              { id: 'orders', label: '6. Orders' },
              { id: 'subscription', label: '7. Sub' },
              { id: 'profile', label: '8. Profile' },
              { id: 'b2b', label: 'B2B' },
              { id: 'manager', label: 'Dispatch' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentScreen(s.id as any)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                  currentScreen === s.id
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex justify-center items-center lg:py-6 overflow-y-auto">
        {viewMode === 'mobile' ? (
          <div
            className="w-full relative bg-[#F7F8FA] text-[#171717] min-h-screen lg:min-h-[844px] lg:max-h-[890px] shadow-2xl lg:rounded-[44px] border-0 lg:border-[8px] lg:border-[#222838] flex flex-col overflow-hidden transition-all duration-200"
            style={{ maxWidth: `${deviceWidth}px` }}
          >
            {/* Simulated iPhone Dynamic Island notch on desktop preview */}
            <div className="hidden lg:flex justify-center pt-2 pb-1 bg-transparent absolute top-0 left-0 right-0 z-40 pointer-events-none">
              <div className="w-24 h-4 bg-black rounded-full shadow-inner flex items-center justify-between px-2">
                <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>
            </div>

            {/* Screen Content */}
            <div className="flex-1 flex flex-col overflow-y-auto relative">
              {children}
            </div>

            {/* Mobile Home Bar indicator on desktop frame */}
            <div className="hidden lg:flex justify-center pb-2 pt-1 bg-white border-t border-slate-100 z-40">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl bg-[#F7F8FA] text-[#171717] min-h-screen shadow-2xl flex flex-col">
            {children}
          </div>
        )}
      </main>
    </div>
  );
};

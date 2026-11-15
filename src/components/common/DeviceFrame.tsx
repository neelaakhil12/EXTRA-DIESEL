import React from 'react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-start sm:py-0 font-sans antialiased text-[#171717]">
      {/* Mobile-first centered application container */}
      <div className="w-full max-w-md min-h-screen bg-[#F7F8FA] shadow-xl flex flex-col relative overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

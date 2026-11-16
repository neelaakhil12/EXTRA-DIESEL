import React, { useState } from 'react';
import { ChevronLeft, Info, Check, MapPin, Building, Home, Briefcase, Factory } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Address } from '../../types';

export const ScreenEditLocation: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { selectedAddress, addOrUpdateAddress, setSelectedAddress, setCurrentScreen } = useData();

  const [street, setStreet] = useState(selectedAddress.street || '12-13-339');
  const [area, setArea] = useState(selectedAddress.area || 'Street Number 7, Tarnaka');
  const [city, setCity] = useState(selectedAddress.city || 'Secunderabad');
  const [state, setState] = useState(selectedAddress.state || 'Telangana');
  const [country, setCountry] = useState(selectedAddress.country || 'India');
  const [pincode, setPincode] = useState(selectedAddress.pincode || '500017');
  const [notes, setNotes] = useState(selectedAddress.notes || 'Near Gate 3, Electrical Substation road. Security check required.');
  const [saveAs, setSaveAs] = useState<string>(selectedAddress.label || 'Site');
  const [locationName, setLocationName] = useState(selectedAddress.locationName || 'Fab city');
  const [customerName] = useState(selectedAddress.contactName || 'Nagesh');
  const [isSuccess, setIsSuccess] = useState(false);

  const saveAsOptions = [
    { id: 'Home', label: 'Home', icon: Home },
    { id: 'Office', label: 'Office', icon: Briefcase },
    { id: 'Site', label: 'Site', icon: Factory },
    { id: 'Other', label: 'Other', icon: MapPin }
  ];

  const handleUpdate = async () => {
    const updated: Address = {
      ...selectedAddress,
      street,
      area,
      city,
      state,
      country,
      pincode,
      label: saveAs,
      locationName,
      notes,
      contactName: customerName
    };

    await addOrUpdateAddress(updated);
    setSelectedAddress(updated);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      if (onBack) {
        onBack();
      } else {
        setCurrentScreen('order');
      }
    }, 600);
  };

  const handleBackAction = () => {
    if (onBack) {
      onBack();
    } else {
      setCurrentScreen('order');
    }
  };

  return (
    <div className="relative min-h-full flex flex-col bg-white pb-28 select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center shadow-xs">
        <button
          onClick={handleBackAction}
          className="p-1 -ml-1 text-slate-800 hover:bg-slate-100 rounded-full transition active-press"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 ml-2">Edit Location</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Notice Banner matching reference screenshot */}
        <div className="bg-[#FFF9E6] border border-[#FFE7A3] rounded-xl p-3 flex items-start space-x-2.5 text-[#855B00]">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#D48806]" />
          <p className="text-xs font-medium leading-relaxed">
            A detailed address will help our Delivery Partner reach your location easily.
          </p>
        </div>

        {/* Address Form */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Flat / House / Building / Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="e.g. 12-13-339, Fab City Gate 2"
              className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Area / Sector / Locality / Street <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Street Number 7, Tarnaka"
              className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Secunderabad"
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Telangana"
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="India"
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Pin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="500017"
                maxLength={6}
                className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Add Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Near Gate 3, Electrical Substation road. Call site engineer before entry."
              className="w-full px-3.5 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition resize-none"
            />
          </div>
        </div>

        {/* Save As Selection */}
        <div className="pt-2">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Save As
          </label>
          <div className="flex items-center space-x-2">
            {saveAsOptions.map((opt) => {
              const isSelected = saveAs.toLowerCase() === opt.id.toLowerCase();
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSaveAs(opt.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition active-press ${
                    isSelected
                      ? 'border-brand-red bg-red-50 text-brand-red shadow-xs ring-1 ring-brand-red'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Name for this Location */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Add Name for this Location
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Fab city / Site Office"
            className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition"
          />
        </div>

        {/* Customer Row */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500">Customer</div>
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
            <span>{customerName}</span>
            <span className="text-slate-400 font-normal">&gt;</span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-slate-100 z-40">
        <button
          onClick={handleUpdate}
          disabled={!street || !area || !city || !pincode}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-red to-brand-darkRed text-white font-bold text-sm shadow-md active-press transition disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isSuccess ? (
            <>
              <Check className="w-5 h-5 text-white" />
              <span>Location Updated!</span>
            </>
          ) : (
            <span>Update Location</span>
          )}
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ChevronLeft,
  MapPin,
  Check,
  Calendar,
  Repeat,
  Truck,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  Plus,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { Address } from '../../types';

export const Screen4OrderDiesel: React.FC = () => {
  const {
    setCurrentScreen,
    addresses,
    selectedAddress,
    setSelectedAddress,
    fuelRate,
    createNewOrder
  } = useData();

  const [quantity, setQuantity] = useState<number>(200);
  const [deliveryType, setDeliveryType] = useState<'one-time' | 'subscription'>('one-time');
  const [vehicleType, setVehicleType] = useState<string>('Delivery Truck');
  const [slot, setSlot] = useState<string>('Express Immediate (Within 2 Hours)');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI (GPay / PhonePe)');

  // Modals
  const [isChangeAddressOpen, setIsChangeAddressOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Address form states
  const [showAddAddrForm, setShowAddAddrForm] = useState(false);
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrArea, setNewAddrArea] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('Hyderabad');

  // Pricing calculations
  const subtotal = Math.round(quantity * fuelRate);
  const tax = Math.round(subtotal * 0.05); // 5% GST on fuel
  const deliveryFee = quantity >= 200 ? 0 : 250;
  const totalAmount = subtotal + tax + deliveryFee;

  const vehicleOptions = [
    { id: 'Delivery Truck', label: 'Delivery Truck (Bowser direct to tanks)' },
    { id: 'Diesel Generator (DG Set)', label: 'Diesel Generator (DG Set)' },
    { id: 'Commercial Fleet (Buses & Trucks)', label: 'Commercial Fleet (Buses & Trucks)' },
    { id: 'Heavy Construction Machinery', label: 'Heavy Construction Machinery' },
    { id: 'On-site Static Storage Tank', label: 'On-site Static Storage Tank' }
  ];

  const timeSlots = [
    'Express Immediate (Within 2 Hours)',
    'Morning (08:00 AM - 11:00 AM)',
    'Afternoon (12:00 PM - 03:00 PM)',
    'Evening (04:00 PM - 07:00 PM)'
  ];

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    try {
      const order = await createNewOrder({
        liters: quantity,
        address: selectedAddress,
        deliveryType,
        vehicleType,
        slot,
        paymentMethod
      });

      // Fire celebratory confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      setIsConfirmModalOpen(false);
      setCurrentScreen('track');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] select-none pb-24">
      {/* Red Header */}
      <AppHeader
        title="Order Diesel"
        showBack
        onBack={() => setCurrentScreen('home')}
      />

      <div className="p-4 space-y-4">
        {/* 1. Delivery Location Card */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
              <MapPin className="w-4 h-4 text-brand-red flex-shrink-0" />
              <span>Delivery Location</span>
            </div>
            <button
              onClick={() => setIsChangeAddressOpen(true)}
              className="text-xs font-bold text-brand-red hover:underline active-press"
            >
              Change
            </button>
          </div>
          <p className="text-xs font-medium text-slate-700 pl-6 leading-relaxed">
            {selectedAddress ? (
              <>
                <strong className="text-slate-900 font-semibold">{selectedAddress.label}: </strong>
                {selectedAddress.street}, {selectedAddress.area}, {selectedAddress.city} - {selectedAddress.pincode}
              </>
            ) : (
              '12-5-67, Green Park Colony, Hyderabad'
            )}
          </p>
        </div>

        {/* 2. Select Quantity Cards */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-900">Select Quantity</h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Rate: ₹{fuelRate.toFixed(2)}/L
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 200 Liters Card */}
            <button
              type="button"
              onClick={() => setQuantity(200)}
              className={`relative rounded-2xl p-4 flex flex-col items-center justify-center border-2 transition active-press ${
                quantity === 200
                  ? 'border-brand-red bg-red-50/40 text-brand-red'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {quantity === 200 && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-red text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Jerry can / canister icon */}
              <div className="w-12 h-12 flex items-center justify-center mb-1 text-inherit">
                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current stroke-current" strokeWidth="0.5">
                  <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 2v14h10V6H7zm2 2h6v2H9V8zm0 4h6v2H9v-2z" />
                </svg>
              </div>

              <span className="text-xl font-black leading-none mt-1">200</span>
              <span className="text-xs font-semibold mt-0.5">Liters</span>
            </button>

            {/* 300 Liters Card */}
            <button
              type="button"
              onClick={() => setQuantity(300)}
              className={`relative rounded-2xl p-4 flex flex-col items-center justify-center border-2 transition active-press ${
                quantity === 300
                  ? 'border-brand-red bg-red-50/40 text-brand-red'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {quantity === 300 && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-brand-red text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Jerry can / canister icon */}
              <div className="w-12 h-12 flex items-center justify-center mb-1 text-inherit">
                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-current stroke-current" strokeWidth="0.5">
                  <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 2v14h10V6H7zm2 2h6v2H9V8zm0 4h6v2H9v-2z" />
                </svg>
              </div>

              <span className="text-xl font-black leading-none mt-1">300</span>
              <span className="text-xs font-semibold mt-0.5">Liters</span>
            </button>
          </div>

          {/* Custom Liters selector */}
          <div className="mt-2.5 bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Custom Liters:</span>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="100"
                max="10000"
                step="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(50, Number(e.target.value)))}
                className="w-24 text-center font-bold text-sm border border-slate-300 rounded-lg py-1 px-2 focus:border-brand-red focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-800">Liters</span>
            </div>
          </div>
        </div>

        {/* 3. Delivery Type */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Delivery Type</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryType('one-time')}
              className={`py-3 px-3 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold transition active-press border ${
                deliveryType === 'one-time'
                  ? 'bg-brand-red text-white border-brand-red shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>One-Time Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryType('subscription')}
              className={`py-3 px-3 rounded-2xl flex items-center justify-center space-x-2 text-xs font-bold transition active-press border ${
                deliveryType === 'subscription'
                  ? 'bg-brand-red text-white border-brand-red shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Repeat className="w-4 h-4 flex-shrink-0" />
              <span>Subscription Delivery</span>
            </button>
          </div>
        </div>

        {/* 4. Select Vehicle / Equipment */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Select Vehicle / Equipment</h3>
          <div className="relative">
            <div className="absolute left-3.5 top-3.5 text-slate-600 pointer-events-none">
              <Truck className="w-5 h-5 text-brand-red" />
            </div>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-white border border-slate-200/90 rounded-2xl py-3.5 pl-12 pr-10 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-red/30 shadow-card"
            >
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Price Breakdown Preview */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Diesel Fuel ({quantity}L × ₹{fuelRate.toFixed(2)})</span>
            <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Applicable GST (5%)</span>
            <span className="font-semibold text-slate-900">₹{tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Doorstep Delivery Bowser Fee</span>
            <span className="font-semibold text-emerald-600">
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-900">Total Payable Amount</span>
            <span className="text-base font-black text-brand-red">
              ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Continue CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 z-30">
        <button
          type="button"
          onClick={() => setIsConfirmModalOpen(true)}
          className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white font-bold text-base shadow-elevated flex items-center justify-center space-x-2 active-press transition hover:brightness-105"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Change Address Modal */}
      {isChangeAddressOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Select Delivery Address</h3>
              <button
                onClick={() => setIsChangeAddressOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddress(addr);
                    setIsChangeAddressOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-2 ${
                    selectedAddress?.id === addr.id
                      ? 'border-brand-red bg-red-50/40 text-brand-red'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">{addr.label}</span>
                    <p className="text-[11px] text-slate-500">
                      {addr.street}, {addr.area}, {addr.city}
                    </p>
                  </div>
                  {selectedAddress?.id === addr.id && (
                    <Check className="w-4 h-4 text-brand-red" />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIsChangeAddressOpen(false);
                setCurrentScreen('addresses');
              }}
              className="w-full py-2.5 rounded-xl border border-dashed border-brand-red text-brand-red text-xs font-bold flex items-center justify-center space-x-1 hover:bg-red-50"
            >
              <Plus className="w-4 h-4" />
              <span>Manage / Add New Address</span>
            </button>
          </div>
        </div>
      )}

      {/* Order Review & Payment Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Diesel Order</h3>
                <p className="text-xs text-slate-500">Review delivery details &amp; payment</p>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Delivery Slot
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-medium focus:outline-none"
              >
                {timeSlots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Options */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Payment Method
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'UPI (GPay / PhonePe / Paytm)', icon: <Zap className="w-4 h-4 text-emerald-600" /> },
                  { id: 'Corporate Diesel Credit Line', icon: <Building className="w-4 h-4 text-brand-red" /> },
                  { id: 'Credit / Debit Card', icon: <CreditCard className="w-4 h-4 text-blue-600" /> },
                  { id: 'Cash On Delivery / Spot Cheque', icon: <Check className="w-4 h-4 text-slate-600" /> }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPaymentMethod(p.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                      paymentMethod === p.id
                        ? 'border-brand-red bg-red-50/50 font-bold text-brand-red'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {p.icon}
                      <span>{p.id}</span>
                    </div>
                    {paymentMethod === p.id && <Check className="w-4 h-4 text-brand-red" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center space-x-2 text-[11px] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Calibrated automated dispenser with geo-fenced delivery security.</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white font-bold text-sm shadow-elevated flex items-center justify-center space-x-2 active-press transition disabled:opacity-70"
            >
              <span>{isSubmitting ? 'Placing Order...' : `Pay & Confirm ₹${totalAmount.toLocaleString('en-IN')}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Minus,
  Check,
  FileText,
  ShieldCheck,
  Zap,
  CreditCard,
  Truck,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { calculateOrderPricing, formatINR } from '../../services/pricing';
import { storage } from '../../services/storage';
import { ScreenEditLocation } from './ScreenEditLocation';

export const Screen4OrderDiesel: React.FC = () => {
  const { user } = useAuth();
  const {
    setCurrentScreen,
    selectedAddress,
    fuelRate,
    createNewOrder
  } = useData();

  // Form states
  const [quantity, setQuantity] = useState<number>(1); // Default 1 L matching reference screenshot
  const [selectedAssetId, setSelectedAssetId] = useState<string>('ast_1');
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 pm - 05:00 am');
  const [notes, setNotes] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [proformaRef, setProformaRef] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Razorpay / UPI');

  // Accordion toggle states
  const [isAssetsExpanded, setIsAssetsExpanded] = useState<boolean>(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState<boolean>(false);
  const [isPoExpanded, setIsPoExpanded] = useState<boolean>(false);

  // Bottom Sheet expansion state
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState<boolean>(false);

  // Modals
  const [isEditLocationOpen, setIsEditLocationOpen] = useState<boolean>(false);
  const [isPaymentSelectionOpen, setIsPaymentSelectionOpen] = useState<boolean>(false);
  const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] = useState<boolean>(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [customCalendarDate, setCustomCalendarDate] = useState<string>('');

  // Assets list from storage
  const availableAssets = storage.getB2BAssets();

  // Dates for Horizontal Carousel
  const datesList = [
    { day: 'Thu', date: '19 Nov', slots: '5 Slots', fullDate: 'Thu 19 Nov 2026' },
    { day: 'Fri', date: '20 Nov', slots: '4 Slots', fullDate: 'Fri 20 Nov 2026' },
    { day: 'Sat', date: '21 Nov', slots: '6 Slots', fullDate: 'Sat 21 Nov 2026' },
    { day: 'Sun', date: '22 Nov', slots: '3 Slots', fullDate: 'Sun 22 Nov 2026' },
    { day: 'Mon', date: '23 Nov', slots: '5 Slots', fullDate: 'Mon 23 Nov 2026' }
  ];

  // Time Slots matching reference screenshot
  const timeSlots = [
    '06:00 am - 12:00 pm',
    '12:00 pm - 04:00 pm',
    '04:00 pm - 10:00 pm',
    '10:00 pm - 05:00 am'
  ];

  // Shared dynamic pricing calculation
  const pricing = calculateOrderPricing(quantity, fuelRate || 104.47, 'Diesel');

  // Quantity steppers
  const handleQuantityChange = (val: number) => {
    const valid = Math.max(1, Math.min(10000, val));
    setQuantity(valid);
  };

  // Payment methods list
  const paymentMethodsList = [
    { id: 'Razorpay / UPI', label: 'UPI (GPay, PhonePe, Paytm, BHIM)', badge: 'Instant Confirmation' },
    { id: 'Razorpay Online Gateway', label: 'Cards / NetBanking / Wallets', badge: 'Secure 256-bit' },
    { id: 'Corporate Diesel Credit', label: 'Diesel Credit Line (15-Day Billing)', badge: 'B2B Verified' },
    { id: 'Cash / Cheque on Delivery', label: 'Pay on Bowser Delivery', badge: 'On Site' }
  ];

  // Main Checkout Action
  const handleConfirmOrder = async () => {
    setIsSubmitting(true);

    const selectedAsset = availableAssets.find(a => a.id === selectedAssetId);
    const selectedDateObj = datesList[selectedDateIndex];
    const deliveryDateStr = customCalendarDate || selectedDateObj.date;

    const orderPayload = {
      productName: 'Diesel',
      liters: quantity,
      address: selectedAddress,
      deliveryType: 'one-time' as const,
      vehicleType: 'Mahindra Bolero Bowser TG 07 W 3015',
      selectedAssetId: selectedAsset?.id,
      selectedAssetName: selectedAsset?.name,
      slot: selectedSlot,
      deliveryDate: deliveryDateStr,
      customerNotes: notes,
      poNumber: poNumber,
      proformaUrl: proformaRef,
      paymentMethod
    };

    if (paymentMethod.includes('Credit') || paymentMethod.includes('Cash')) {
      // Credit or Cash Order
      const newOrder = await createNewOrder(orderPayload);
      setConfirmedOrder(newOrder);
      setIsSubmitting(false);
      setIsPaymentSuccessModalOpen(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else {
      // Razorpay Online Flow
      api.initiateRazorpayPayment({
        amount: pricing.totalPayable,
        customerName: user?.name || selectedAddress.contactName || 'Nagesh',
        customerPhone: user?.phone || selectedAddress.contactPhone || '9848020940',
        customerEmail: user?.email || 'nagesh.tadur@gmail.com',
        onSuccess: async (paymentId: string) => {
          const newOrder = await createNewOrder({
            ...orderPayload,
            paymentTransactionId: paymentId
          });
          setConfirmedOrder(newOrder);
          setIsSubmitting(false);
          setIsPaymentSuccessModalOpen(true);
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        },
        onFailure: (err) => {
          console.warn('Razorpay failed or dismissed, fallback order creation', err);
          setIsSubmitting(false);
        }
      });
    }
  };

  // If user opened Edit Location modal
  if (isEditLocationOpen) {
    return <ScreenEditLocation onBack={() => setIsEditLocationOpen(false)} />;
  }

  return (
    <div className="relative min-h-full flex flex-col bg-[#F8F9FA] pb-36 select-none">
      {/* Header matching image copy 13.png */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 py-3.5 flex items-center shadow-xs">
        <button
          onClick={() => setCurrentScreen('home')}
          className="p-1 -ml-1 text-slate-800 hover:bg-slate-100 rounded-full transition active-press"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 ml-2">Place Order</h1>
      </header>

      <div className="p-4 space-y-3.5">
        {/* A. Delivery Address Card matching reference screenshot */}
        <div
          onClick={() => setIsEditLocationOpen(true)}
          className="bg-white rounded-2xl p-3.5 shadow-card border border-slate-200/80 flex items-center justify-between active-press hover:border-brand-red transition cursor-pointer"
        >
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-full bg-red-50 text-brand-red font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-100">
              J
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Deliver at
              </div>
              <div className="text-sm font-extrabold text-slate-900">
                {selectedAddress.contactName || 'Nagesh'}
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                {selectedAddress.street}, {selectedAddress.area}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
        </div>

        {/* B. Select Quantity Card matching reference screenshot */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-3">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Select Quantity
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 p-2 flex items-center justify-center">
                <img
                  src="/assets/vehicle-bolero-side.jpg"
                  alt="Diesel"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Diesel</h3>
                <div className="text-xs font-semibold text-slate-500">
                  Price - ₹{pricing.ratePerLiter.toFixed(2)} / 1 Liter
                </div>
              </div>
            </div>

            {/* Stepper + Input */}
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                className="w-8 h-8 rounded-lg bg-white text-slate-700 flex items-center justify-center shadow-xs hover:bg-slate-100 active-press font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(Number(e.target.value))}
                  className="w-14 text-center font-extrabold text-sm bg-transparent outline-none text-slate-900"
                />
                <span className="text-xs font-bold text-slate-500 pr-1">L</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-brand-red text-white flex items-center justify-center shadow-xs hover:bg-brand-darkRed active-press font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Quantity Chips */}
          <div className="flex items-center space-x-2 pt-1 overflow-x-auto scrollbar-none">
            {[1, 50, 100, 200, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuantityChange(preset)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition active-press flex-shrink-0 ${
                  quantity === preset
                    ? 'bg-brand-red text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset} L
              </button>
            ))}
          </div>
        </div>

        {/* C. Select Assets (Optional) Accordion */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAssetsExpanded(!isAssetsExpanded)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active-press"
          >
            <div>
              <span className="text-sm font-bold text-slate-900">Select Assets</span>
              <span className="text-xs font-medium text-slate-400 ml-1.5">(Optional)</span>
            </div>
            {isAssetsExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {isAssetsExpanded && (
            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Tag the generator, machinery, or vehicle to be refueled:
              </p>
              {availableAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(isSelected ? '' : asset.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-brand-red bg-red-50/60 ring-1 ring-brand-red'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      {asset.image ? (
                        <img
                          src={asset.image}
                          alt={asset.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {asset.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {asset.identifier} • {asset.category} ({asset.capacityLiters}L)
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-brand-red border-brand-red text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* D. Select Time Slot (Required) matching image copy 13.png */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-900">Select Time Slot</span>
              <span className="text-xs font-semibold text-brand-red ml-1.5">(Required)</span>
            </div>
            <label className="cursor-pointer p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                className="sr-only"
                onChange={(e) => setCustomCalendarDate(e.target.value)}
              />
            </label>
          </div>

          {/* Horizontal Date Carousel */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            {datesList.map((item, idx) => {
              const isSelected = selectedDateIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDateIndex(idx);
                    setCustomCalendarDate('');
                  }}
                  className={`flex-shrink-0 w-24 py-2.5 px-2 rounded-xl text-center border transition active-press ${
                    isSelected
                      ? 'border-brand-red bg-brand-red text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${isSelected ? 'text-red-100' : 'text-slate-500'}`}>
                    {item.day}
                  </div>
                  <div className="text-xs font-extrabold mt-0.5">{item.date}</div>
                  <div className={`text-[10px] mt-1 font-semibold ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                    {item.slots}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Time Slot Pills */}
          <div className="space-y-2 pt-1">
            {timeSlots.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition active-press ${
                    isSelected
                      ? 'border-brand-red bg-red-50/70 text-brand-red ring-1 ring-brand-red'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Clock className={`w-4 h-4 ${isSelected ? 'text-brand-red' : 'text-slate-400'}`} />
                    <span>{slot}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-brand-red bg-brand-red text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* E. Add Notes (Optional) Accordion */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active-press"
          >
            <div>
              <span className="text-sm font-bold text-slate-900">Add notes</span>
              <span className="text-xs font-medium text-slate-400 ml-1.5">(Optional)</span>
            </div>
            {isNotesExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {isNotesExpanded && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-2">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special driver instructions (e.g. call before arriving, enter via Gate 3)..."
                className="w-full p-2.5 text-xs text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red resize-none"
              />
            </div>
          )}
        </div>

        {/* F. Add PO Number & Proforma (Optional) Accordion */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsPoExpanded(!isPoExpanded)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left active-press"
          >
            <div>
              <span className="text-sm font-bold text-slate-900">Add PO number & Proforma</span>
              <span className="text-xs font-medium text-slate-400 ml-1.5">(Optional)</span>
            </div>
            {isPoExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {isPoExpanded && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-2 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Purchase Order (PO) Number
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-NAG-081"
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Proforma Reference / Notes
                </label>
                <input
                  type="text"
                  value={proformaRef}
                  onChange={(e) => setProformaRef(e.target.value)}
                  placeholder="e.g. Proforma #PRF-8821 verified by site engineer"
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXPANDABLE ORDER DETAILS BOTTOM SHEET (MATCHING IMAGE COPY 13 & 14) */}
      {/* ========================================================================= */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 z-40 transition-all duration-300 ease-in-out ${
          isBottomSheetExpanded ? 'max-h-[85vh] pb-6' : 'max-h-[165px] pb-3'
        }`}
      >
        {/* Drag Handle Bar */}
        <div
          onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
          className="pt-2.5 pb-1 flex justify-center cursor-pointer active:opacity-70"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-300"></div>
        </div>

        <div className="px-4 space-y-2">
          {/* Proceed to Pay Using row matching reference */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setIsPaymentSelectionOpen(true)}
              className="flex items-center space-x-1.5 text-slate-700 hover:text-brand-red font-semibold transition"
            >
              <span>Proceed to Pay Using</span>
              <span className="font-extrabold text-brand-red">{paymentMethod}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="flex items-center space-x-1 text-emerald-600 font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Instant Confirmation</span>
            </div>
          </div>

          {/* Payment breakdown toggle link matching image copy 13.png */}
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
              className="text-xs font-bold text-slate-800 hover:text-brand-red flex items-center space-x-1"
            >
              <span>Payment breakdown</span>
              {isBottomSheetExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <span className="text-xs font-extrabold text-slate-900">
              {pricing.formatted.totalPayable}
            </span>
          </div>

          {/* Expanded Receipt Breakdown matching image copy 14.png */}
          {isBottomSheetExpanded && (
            <div className="pt-2 pb-3 border-t border-dashed border-slate-200 overflow-y-auto max-h-[45vh] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
                  ORDER DETAILS
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified Pricing
                </span>
              </div>

              {/* Receipt Table matching exact reference screenshot columns */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Product</span>
                  <span className="font-bold text-slate-900">{pricing.productName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Quantity</span>
                  <span className="font-bold text-slate-900">{pricing.quantity} Liter{pricing.quantity > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Rate / Liter</span>
                  <span className="font-bold text-slate-900">{pricing.formatted.ratePerLiter} / 1 Liter</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200">
                  <span>Product Value</span>
                  <span className="font-bold text-slate-900">{pricing.formatted.productValue}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{pricing.handlingFeeSlabLabel}</span>
                  <span className="font-bold text-slate-900">{pricing.formatted.handlingFee}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>GST - 18%</span>
                  <span className="font-bold text-slate-900">{pricing.formatted.gstAmount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-300">
                  <span>Grand Total</span>
                  <span className="text-brand-red">{pricing.formatted.grandTotal}</span>
                </div>
                <div className="flex items-center justify-between text-slate-900 font-black text-sm pt-1">
                  <span>Total Payable Amount</span>
                  <span className="text-brand-red text-base">{pricing.formatted.totalPayable}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-snug">
                * Zero delivery charges on bulk orders above 500 Liters. Bowser arrives with PESO certified automated flow meter.
              </div>
            </div>
          )}

          {/* Confirm Order Instantly Button matching image copy 13 & 14 */}
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-red to-brand-darkRed hover:from-brand-darkRed hover:to-brand-red text-white font-extrabold text-sm shadow-md active-press transition flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span>Processing Payment Gateway...</span>
            ) : (
              <span>Confirm Order Instantly - {pricing.formatted.totalPayable}</span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAYMENT METHOD SELECTION MODAL */}
      {/* ========================================================================= */}
      {isPaymentSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Select Payment Method</h3>
              <button
                onClick={() => setIsPaymentSelectionOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {paymentMethodsList.map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id);
                      setIsPaymentSelectionOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-brand-red bg-red-50/70 ring-1 ring-brand-red'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{m.label}</div>
                      <div className="text-[10px] font-semibold text-slate-500">{m.badge}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-brand-red border-brand-red text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAYMENT CONFIRMATION SUCCESS MODAL */}
      {/* ========================================================================= */}
      {isPaymentSuccessModalOpen && confirmedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Payment Verified • Order Placed
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                Order Confirmed!
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Ref: {confirmedOrder.id}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-bold text-slate-800">{confirmedOrder.productName} ({confirmedOrder.liters} L)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Slot:</span>
                <span className="font-bold text-slate-800">{confirmedOrder.slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">{confirmedOrder.address.locationName || confirmedOrder.address.street}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Assigned Bowser:</span>
                <span className="font-bold text-brand-red">Mahindra Bolero (TG 07 W 3015)</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>Amount Paid:</span>
                <span className="text-brand-red">{formatINR(confirmedOrder.totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentSuccessModalOpen(false);
                  setCurrentScreen('track');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-darkRed text-white font-extrabold text-sm shadow-md active-press"
              >
                Track Bowser Live
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentSuccessModalOpen(false);
                  setCurrentScreen('orders');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs active-press"
              >
                View My Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

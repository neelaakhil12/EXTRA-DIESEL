import React, { useState } from 'react';
import {
  ChevronLeft,
  Calendar,
  Fuel,
  Info,
  Check,
  Pause,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';

export const Screen7Subscription: React.FC = () => {
  const {
    setCurrentScreen,
    subscriptions,
    selectedAddress,
    createSubscription,
    cancelSubscription,
    fuelRate
  } = useData();

  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'selected-days'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon']);
  const [liters, setLiters] = useState<number>(200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleStartSubscription = async () => {
    setIsSubmitting(true);
    try {
      await createSubscription({
        frequency,
        preferredDays: selectedDays,
        liters,
        address: selectedAddress,
        vehicleType: 'Delivery Truck'
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSuccessNotice(`Active subscription scheduled! Next delivery on ${selectedDays[0] || 'Monday'}.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-12 select-none">
      {/* Red Header */}
      <AppHeader
        title="Subscription Delivery"
        showBack
        onBack={() => setCurrentScreen('home')}
      />

      <div className="p-4 space-y-4">
        {/* Highlight Card: Never run out of diesel again! */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
              Never run out of diesel again!
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Automated scheduled bowser visits right to your site generator or fleet.
            </p>
          </div>
        </div>

        {/* Success Notice if created */}
        {successNotice && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-800 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* 1. Select Frequency */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Select Frequency</h3>
          <div className="flex items-center space-x-2">
            {[
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'selected-days', label: 'Selected Days' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrequency(f.id as any)}
                className={`flex-1 py-2.5 px-2 rounded-full text-xs font-bold transition active-press border ${
                  frequency === f.id
                    ? 'bg-brand-red text-white border-brand-red shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Preferred Days */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Preferred Days</h3>
          <div className="flex items-center justify-between gap-1.5">
            {daysOfWeek.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition active-press border ${
                    isSelected
                      ? 'bg-brand-red text-white border-brand-red shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Quantity Selector */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 mb-2">Quantity</h3>
          <div className="relative">
            <div className="absolute left-3.5 top-3.5 text-brand-red pointer-events-none">
              <Fuel className="w-5 h-5" />
            </div>
            <select
              value={liters}
              onChange={(e) => setLiters(Number(e.target.value))}
              className="w-full bg-white border border-slate-200/90 rounded-2xl py-3.5 pl-12 pr-10 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-red/30 shadow-card"
            >
              {[100, 200, 300, 500, 1000, 2000].map((qty) => (
                <option key={qty} value={qty}>
                  {qty} Liters (Approx ₹{(qty * fuelRate).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Start Subscription Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleStartSubscription}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white font-bold text-sm shadow-elevated flex items-center justify-center space-x-2 active-press transition disabled:opacity-70 mt-2"
        >
          <span>{isSubmitting ? 'Scheduling...' : 'Start Subscription'}</span>
        </button>

        {/* Info text */}
        <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500 pt-1">
          <Info className="w-4 h-4 text-slate-400" />
          <span>You can modify or cancel anytime</span>
        </div>

        {/* Active Subscriptions List Section */}
        {subscriptions.length > 0 && (
          <div className="pt-4 border-t border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Active Subscriptions
            </h4>
            <div className="space-y-2.5">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl p-3.5 shadow-card border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {sub.frequency} ({sub.preferredDays.join(', ')})
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          sub.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sub.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sub.liters}L / delivery • Next: {sub.nextDeliveryDate}
                    </p>
                  </div>

                  {sub.status === 'active' && (
                    <button
                      onClick={() => cancelSubscription(sub.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50"
                      title="Cancel Subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

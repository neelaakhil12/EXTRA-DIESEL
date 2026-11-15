import React, { useState } from 'react';
import {
  Wrench,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  TrendingUp,
  Fuel,
  Users,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { OrderStatus } from '../../types';

export const ManagerDashboard: React.FC = () => {
  const { orders, updateOrderStatus, setCurrentScreen } = useData();
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [updating, setUpdating] = useState(false);

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!activeOrder) return;
    setUpdating(true);
    try {
      await updateOrderStatus(activeOrder.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-12 select-none">
      {/* Red Header */}
      <AppHeader
        title="Operations & Dispatch"
        showBack
        onBack={() => setCurrentScreen('home')}
      />

      <div className="p-4 space-y-4">
        {/* Hub Overview Stats */}
        <div className="bg-gradient-to-br from-brand-darkRed to-brand-red text-white rounded-2xl p-4 shadow-elevated">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Hub: Hyderabad South Depot
              </span>
              <h3 className="text-base font-extrabold leading-tight">Live Dispatch Terminal</h3>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/20 text-xs">
            <div>
              <span className="text-base font-black block">3</span>
              <span className="text-[10px] text-white/80">Active Bowsers</span>
            </div>
            <div>
              <span className="text-base font-black block">12,400 L</span>
              <span className="text-[10px] text-white/80">Stock Available</span>
            </div>
            <div>
              <span className="text-base font-black block">₹2.85 L</span>
              <span className="text-[10px] text-white/80">Today Dispatched</span>
            </div>
          </div>
        </div>

        {/* Live Orders to Dispatch / Manage */}
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
            Active Dispatches ({orders.length})
          </h3>

          <div className="space-y-2.5">
            {orders.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                  selectedOrderId === o.id
                    ? 'bg-white border-brand-red shadow-sm ring-1 ring-brand-red/30'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">#{o.id}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {o.liters} Liters
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      o.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>{o.address.label} • {o.address.area}</span>
                  <span className="font-semibold text-slate-900">₹{o.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Order Controller */}
        {activeOrder && (
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold text-slate-900">
                Update Status for #{activeOrder.id}
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                Driver: {activeOrder.driver?.name}
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Advance the live tracking status visible to the customer:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { status: 'confirmed', label: '1. Confirm Order' },
                { status: 'out_for_delivery', label: '2. Out for Delivery' },
                { status: 'arriving_soon', label: '3. Arriving Soon' },
                { status: 'delivered', label: '4. Delivered' }
              ].map((s) => (
                <button
                  key={s.status}
                  disabled={updating}
                  onClick={() => handleStatusChange(s.status as any)}
                  className={`py-2 px-2.5 rounded-xl text-center font-bold text-[11px] transition active-press border ${
                    activeOrder.status === s.status
                      ? 'bg-brand-red text-white border-brand-red shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bowser Telematics Health */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80">
          <h4 className="text-xs font-bold text-slate-900 mb-2">Fleet Telematics &amp; Safety</h4>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Bowser TS 09 ED 7721 (Ramesh)</span>
              <span className="font-bold text-emerald-600">Live GPS Signal Active</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>W&amp;M Digital Meter Seal</span>
              <span className="font-bold text-emerald-600">Valid till Dec 2027</span>
            </div>
            <div className="flex justify-between py-1">
              <span>PESO License # PESO/HYD/2026/881</span>
              <span className="font-bold text-slate-900">Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  ArrowRight,
  FileText,
  DollarSign,
  Tag
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { OrderStatus } from '../../types';
import { formatINR } from '../../services/pricing';

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
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-24 select-none">
      {/* Red Header */}
      <AppHeader
        title="Admin & Dispatch Operations"
        showBack
        onBack={() => setCurrentScreen('home')}
      />

      <div className="p-4 space-y-4">
        {/* Hub Overview Stats */}
        <div className="bg-gradient-to-br from-brand-darkRed to-brand-red text-white rounded-2xl p-4 shadow-elevated">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Hub: Secunderabad / Hyderabad Central Depot
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
            Customer Orders ({orders.length})
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
                  <span>
                    {o.address.contactName || 'Customer'} • {o.address.locationName || o.address.area}
                  </span>
                  <span className="font-semibold text-slate-900">₹{o.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Order Complete Details (Section 5 Requirement) */}
        {activeOrder && (
          <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">
                  Order Inspector
                </span>
                <h4 className="text-sm font-black text-slate-900">
                  #{activeOrder.id}
                </h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {activeOrder.paymentStatus?.toUpperCase() || 'PAID'} ({activeOrder.paymentMethod})
              </span>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                <span className="font-bold text-slate-800">{activeOrder.address.contactName || 'Nagesh'}</span>
                <span className="text-slate-500 block text-[11px]">{activeOrder.address.contactPhone || '+91 98480 20940'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Site</span>
                <span className="font-bold text-slate-800">{activeOrder.address.locationName || 'Fab city'}</span>
                <span className="text-slate-500 block text-[11px] truncate">{activeOrder.address.street}, {activeOrder.address.city}</span>
              </div>
            </div>

            {/* Slot & Asset Info */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Time Slot</span>
                <span className="font-bold text-slate-800">{activeOrder.slot || '10:00 pm - 05:00 am'}</span>
                <span className="text-slate-500 block text-[11px]">{activeOrder.deliveryDate || 'Today'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Bowser</span>
                <span className="font-bold text-slate-800">Mahindra Bolero</span>
                <span className="text-brand-red block text-[11px] font-bold">TG 07 W 3015</span>
              </div>
            </div>

            {/* Complete Receipt & Tax Breakdown */}
            <div className="space-y-1.5 text-xs border-t pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Financial Breakdown
              </span>
              <div className="flex justify-between text-slate-600">
                <span>Product Value ({activeOrder.liters} L @ ₹{activeOrder.ratePerLiter.toFixed(2)})</span>
                <span className="font-bold text-slate-900">₹{(activeOrder.productValue || activeOrder.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Fuel Handling Fee (Up to 500)</span>
                <span className="font-bold text-slate-900">₹{(activeOrder.handlingFee ?? 499.00).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST - 18%</span>
                <span className="font-bold text-slate-900">₹{(activeOrder.gstAmount ?? 89.82).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t">
                <span>Grand Total / Payable</span>
                <span className="text-brand-red">₹{activeOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Advance Status Controls */}
            <div className="pt-2 border-t space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Update Order & Dispatch Lifecycle:
              </span>
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
          </div>
        )}

        {/* Bowser Telematics Health */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80">
          <h4 className="text-xs font-bold text-slate-900 mb-2">Fleet Telematics &amp; Safety Compliance</h4>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Mahindra Bolero Bowser TG 07 W 3015 (Ramesh)</span>
              <span className="font-bold text-emerald-600">Live GPS Active</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>W&amp;M Calibrated Digital Flow Meter</span>
              <span className="font-bold text-emerald-600">Valid till Dec 2027</span>
            </div>
            <div className="flex justify-between py-1">
              <span>PESO License # PESO/HYD/2026/881</span>
              <span className="font-bold text-slate-900">Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Tab Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

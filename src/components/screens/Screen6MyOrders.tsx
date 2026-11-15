import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock,
  Download,
  X,
  Share2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { Order } from '../../types';

export const Screen6MyOrders: React.FC = () => {
  const { orders, setCurrentScreen, setActiveTrackingOrderId } = useData();
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'delivered') return o.status === 'delivered';
    if (filter === 'pending') {
      return (
        o.status === 'placed' ||
        o.status === 'confirmed' ||
        o.status === 'out_for_delivery' ||
        o.status === 'arriving_soon'
      );
    }
    return true;
  });

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-24 select-none">
      {/* Red Header */}
      <AppHeader
        title="My Orders"
        showBack
        onBack={() => setCurrentScreen('home')}
      />

      <div className="p-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'delivered', label: 'Delivered' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition active-press border ${
                filter === tab.id
                  ? 'bg-brand-red text-white border-brand-red shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Order Cards List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-card border border-slate-200/80">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No orders found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                There are no orders matching this filter.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDelivered = order.status === 'delivered';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-3.5 shadow-card border border-slate-200/80 flex items-center justify-between transition hover:border-slate-300"
                >
                  <div className="flex items-center space-x-3">
                    {/* Truck Thumbnail with Clean Grand Look */}
                    <div className="w-16 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center p-0.5">
                      <img
                        src="/assets/order-truck-thumb.png"
                        alt="Bowser Truck"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    {/* Order Details */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        #{order.id}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {order.createdAt}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[11px] font-extrabold text-slate-800">
                          {order.liters} Liters
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isDelivered
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white animate-pulse'
                          }`}
                        >
                          {isDelivered ? 'Delivered' : 'In Transit'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <div className="flex flex-col items-end space-y-2">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-xs font-bold text-slate-800 hover:text-brand-red flex items-center space-x-0.5 active-press"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    {!isDelivered && (
                      <button
                        onClick={() => {
                          setActiveTrackingOrderId(order.id);
                          setCurrentScreen('track');
                        }}
                        className="text-[10px] font-bold text-brand-red bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full transition"
                      >
                        Track Live
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Order Details #{selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500">{selectedOrder.createdAt}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Delivery Status Badge */}
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Current Status:</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                {selectedOrder.status.replace('_', ' ')}
              </span>
            </div>

            {/* Itemized Fuel Bill */}
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Itemized Invoice
              </h4>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Diesel Quantity</span>
                <span className="font-bold text-slate-900">{selectedOrder.liters} Liters</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Fuel Rate</span>
                <span className="font-bold text-slate-900">₹{selectedOrder.ratePerLiter.toFixed(2)}/L</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>GST (5%)</span>
                <span className="font-semibold text-slate-900">₹{selectedOrder.tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Delivery Bowser Service</span>
                <span className="font-semibold text-emerald-600">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t">
                <span>Total Amount</span>
                <span className="text-brand-red">₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Destination Address */}
            <div className="border-t pt-3 text-xs">
              <h4 className="font-bold text-slate-900 mb-1">Delivery Destination</h4>
              <p className="text-slate-600 leading-relaxed">
                {selectedOrder.address.label}: {selectedOrder.address.street}, {selectedOrder.address.area}, {selectedOrder.address.city} - {selectedOrder.address.pincode}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t">
              <button
                onClick={() => {
                  alert(`Downloading Digital Tax Invoice for #${selectedOrder.id}`);
                }}
                className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download Official Tax Invoice</span>
              </button>

              {selectedOrder.status !== 'delivered' && (
                <button
                  onClick={() => {
                    setActiveTrackingOrderId(selectedOrder.id);
                    setSelectedOrder(null);
                    setCurrentScreen('track');
                  }}
                  className="w-full py-2.5 rounded-xl bg-brand-red text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm active-press hover:bg-brand-darkRed transition"
                >
                  <Truck className="w-4 h-4" />
                  <span>Open Live GPS Tracking</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

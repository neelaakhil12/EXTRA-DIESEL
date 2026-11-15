import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  Truck,
  Plus,
  ArrowRight,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wrench,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { storage } from '../../services/storage';
import { B2BAsset } from '../../types';

export const B2BPortal: React.FC = () => {
  const { user } = useAuth();
  const { setCurrentScreen, fuelRate } = useData();

  const [assets, setAssets] = useState<B2BAsset[]>(() => storage.getB2BAssets());
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<'DG Set' | 'Commercial Fleet' | 'Heavy Machinery' | 'Storage Tank'>('DG Set');
  const [assetCapacity, setAssetCapacity] = useState(500);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) return;

    const newAsset: B2BAsset = {
      id: `ast_${Date.now()}`,
      name: assetName,
      category: assetCategory,
      identifier: `AST-${Math.floor(100 + Math.random() * 900)}`,
      capacityLiters: Number(assetCapacity),
      locationId: 'addr_1'
    };

    const updated = [...assets, newAsset];
    setAssets(updated);
    storage.setB2BAssets(updated);
    setIsAddAssetOpen(false);
    setAssetName('');
  };

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-12 select-none">
      {/* Red Header */}
      <AppHeader
        title="B2B Corporate Portal"
        showBack
        onBack={() => setCurrentScreen('home')}
      />

      <div className="p-4 space-y-4">
        {/* Company Card & KYB Badge */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-elevated">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Corporate Account
              </span>
              <h3 className="text-base font-extrabold mt-1.5 leading-tight">
                {user?.companyName || 'Kumar Infra & Logistics Pvt Ltd'}
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                GSTIN: {user?.gstin || '36AAACK1234F1Z5'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-red text-white flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          {/* KYB Status pill */}
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>KYB Verified &amp; Approved</span>
            </div>
            <span className="text-[11px] text-slate-400">Net 15 Days Billing</span>
          </div>
        </div>

        {/* Corporate Diesel Credit Limit Meter */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Diesel Credit Line</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-slate-900">
                ₹{(user?.availableCredit || 412500).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-slate-500 font-medium">Available Fuel Credit</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700">
                ₹{(user?.creditLimit || 500000).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-slate-400">Total Approved Limit</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-brand-red h-full rounded-full" style={{ width: '82%' }} />
          </div>

          <p className="text-[10px] text-slate-400">
            Next settlement invoice cycle generates on 30th of this month.
          </p>
        </div>

        {/* Quick Bulk Reorder CTA */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-brand-darkRed">
              Need Bulk Fuel Dispatch?
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Instant site tank refill for multiple vehicles &amp; generators.
            </p>
          </div>
          <button
            onClick={() => setCurrentScreen('order')}
            className="px-3.5 py-2 rounded-xl bg-brand-red text-white text-xs font-bold shadow-sm active-press flex items-center space-x-1"
          >
            <span>Dispatch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Registered Site Assets & Machinery */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Site Equipment &amp; Assets ({assets.length})
            </h3>
            <button
              onClick={() => setIsAddAssetOpen(true)}
              className="text-xs font-bold text-brand-red flex items-center space-x-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Equipment</span>
            </button>
          </div>

          <div className="space-y-2">
            {assets.map((ast) => (
              <div
                key={ast.id}
                className="bg-white rounded-2xl p-3.5 shadow-card border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-brand-red" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {ast.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Tag: <span className="font-mono font-semibold">{ast.identifier}</span> • Cap: {ast.capacityLiters}L
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                  {ast.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fuel Consumption Reports preview */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-900">Monthly Consumption Analytics</h4>
            <span className="text-[10px] font-bold text-emerald-600">+12% vs last month</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-xs font-black text-slate-900 block">1,850 L</span>
              <span className="text-[10px] text-slate-500">Total Lifted</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-xs font-black text-slate-900 block">₹1,74,825</span>
              <span className="text-[10px] text-slate-500">Expenditure</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <span className="text-xs font-black text-emerald-700 block">100% BS-VI</span>
              <span className="text-[10px] text-slate-500">Fuel Grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {isAddAssetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleAddAsset} className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Add Equipment / Generator</h3>
              <button type="button" onClick={() => setIsAddAssetOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Equipment Name / Make</label>
              <input
                type="text"
                placeholder="e.g. Kirloskar 320 kVA DG Set"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-red focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-red focus:outline-none bg-white"
              >
                <option value="DG Set">Diesel Generator (DG Set)</option>
                <option value="Commercial Fleet">Commercial Fleet (Trucks/Buses)</option>
                <option value="Heavy Machinery">Heavy Machinery (Excavator, Cranes)</option>
                <option value="Storage Tank">Static Storage Tank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tank Capacity (Liters)</label>
              <input
                type="number"
                value={assetCapacity}
                onChange={(e) => setAssetCapacity(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-red focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-brand-red text-white text-xs font-bold shadow-sm"
            >
              Save Asset to Fleet
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

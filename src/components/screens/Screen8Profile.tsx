import React, { useState } from 'react';
import {
  Settings,
  MapPin,
  ClipboardList,
  Calendar,
  FileText,
  CreditCard,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building,
  PhoneCall,
  User as UserIcon,
  X,
  Plus,
  Trash2,
  Check,
  Edit2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { AppHeader } from '../common/AppHeader';
import { BottomNavigation } from '../common/BottomNavigation';
import { Address } from '../../types';

export const Screen8Profile: React.FC = () => {
  const { user, logout, updateUserProfile } = useAuth();
  const {
    setCurrentScreen,
    setActiveNavTab,
    addresses,
    addOrUpdateAddress,
    deleteAddress,
    invoices,
    fuelRate
  } = useData();

  // Active modal
  const [activeModal, setActiveModal] = useState<
    'settings' | 'addresses' | 'invoices' | 'payments' | 'support' | 'about' | 'edit-profile' | null
  >(null);

  // Address form modal states
  const [addrLabel, setAddrLabel] = useState('New Site');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrCity, setAddrCity] = useState('Hyderabad');
  const [addrPin, setAddrPin] = useState('500016');

  // Profile edit states
  const [editName, setEditName] = useState(user?.name || 'Hemanth Kumar');
  const [editEmail, setEditEmail] = useState(user?.email || 'hemanth.kumar@example.com');

  const menuItems = [
    {
      id: 'addresses',
      label: 'My Addresses',
      icon: <MapPin className="w-5 h-5 text-brand-red" />,
      action: () => setActiveModal('addresses')
    },
    {
      id: 'orders',
      label: 'My Orders',
      icon: <ClipboardList className="w-5 h-5 text-brand-red" />,
      action: () => {
        setCurrentScreen('orders');
        setActiveNavTab('orders');
      }
    },
    {
      id: 'subscriptions',
      label: 'Subscription Plans',
      icon: <Calendar className="w-5 h-5 text-brand-red" />,
      action: () => setCurrentScreen('subscription')
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <FileText className="w-5 h-5 text-brand-red" />,
      action: () => setActiveModal('invoices')
    },
    {
      id: 'payments',
      label: 'Payment Methods',
      icon: <CreditCard className="w-5 h-5 text-brand-red" />,
      action: () => setActiveModal('payments')
    },
    {
      id: 'support',
      label: 'Help & Support',
      icon: <HelpCircle className="w-5 h-5 text-brand-red" />,
      action: () => setActiveModal('support')
    },
    {
      id: 'about',
      label: 'About Us',
      icon: <Info className="w-5 h-5 text-brand-red" />,
      action: () => setActiveModal('about')
    }
  ];

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet.trim()) return;

    const newAddr: Address = {
      id: `addr_${Date.now()}`,
      label: addrLabel,
      street: addrStreet,
      area: addrArea || 'Industrial Area',
      city: addrCity,
      state: 'Telangana',
      pincode: addrPin,
      isDefault: false
    };

    await addOrUpdateAddress(newAddr);
    setAddrStreet('');
    setAddrArea('');
    alert('Address added successfully!');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name: editName, email: editEmail });
    setActiveModal(null);
  };

  return (
    <div className="relative min-h-full flex flex-col bg-[#F7F8FA] pb-24 select-none">
      {/* Red Header with Settings Icon */}
      <AppHeader
        title="My Profile"
        showSettings
        onSettingsClick={() => setActiveModal('settings')}
      />

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-full border-2 border-brand-yellow overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-7 h-7 text-brand-red" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {user?.name || 'Hemanth Kumar'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {user?.phone || '+91 98765 43210'}
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 mt-1">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Verified Customer
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('edit-profile')}
            className="p-2 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-full transition active-press"
            title="Edit Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Menu Cards */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition active-press text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-6 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2.2]" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            onClick={() => {
              logout();
              setCurrentScreen('login');
            }}
            className="w-full py-3 px-4 rounded-2xl border border-red-200 bg-white hover:bg-red-50 text-brand-red font-bold text-xs flex items-center justify-center space-x-2 active-press transition shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Bottom Decorative Yellow & Red Curve Graphic */}
        <div className="w-full h-8 relative overflow-hidden mt-3">
          <svg viewBox="0 0 320 40" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M 0,25 Q 90,5 180,25 T 320,15 L 320,40 L 0,40 Z"
              fill="#FFD600"
            />
            <path
              d="M 0,32 Q 100,18 200,32 T 320,24 L 320,40 L 0,40 Z"
              fill="#D50000"
            />
          </svg>
        </div>
      </div>

      {/* MODAL: My Addresses */}
      {activeModal === 'addresses' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Manage Delivery Addresses</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="p-3 rounded-xl border border-slate-200 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <strong className="text-xs font-bold text-slate-900">{addr.label}</strong>
                      {addr.isDefault && (
                        <span className="text-[9px] bg-red-100 text-brand-red font-bold px-1.5 py-0.2 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {addr.street}, {addr.area}, {addr.city} - {addr.pincode}
                    </p>
                  </div>
                  {addresses.length > 1 && (
                    <button
                      onClick={() => deleteAddress(addr.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Address Form */}
            <form onSubmit={handleSaveAddress} className="pt-2 border-t space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Add New Delivery Location</h4>
              <input
                type="text"
                placeholder="Label (e.g. Site Office, Factory DG Set)"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-brand-red focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Street / Plot / Survey No."
                value={addrStreet}
                onChange={(e) => setAddrStreet(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-brand-red focus:outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Area / Locality"
                  value={addrArea}
                  onChange={(e) => setAddrArea(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-brand-red focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={addrPin}
                  onChange={(e) => setAddrPin(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:border-brand-red focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-brand-red text-white text-xs font-bold shadow-sm"
              >
                Save New Address
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Invoices */}
      {activeModal === 'invoices' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tax Invoices &amp; Receipts</h3>
                <p className="text-[11px] text-slate-500">Official GST Compliant Fuel Bills</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        PAID
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {inv.date} • {inv.liters}L @ ₹{inv.ratePerLiter.toFixed(2)}/L
                    </p>
                    <p className="text-xs font-extrabold text-brand-red mt-0.5">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <button
                    onClick={() => alert(`Downloading official PDF for ${inv.invoiceNumber}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-brand-red text-xs font-bold shadow-sm"
                  >
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Payment Methods */}
      {activeModal === 'payments' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Supported Payment Methods</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">UPI AutoPay &amp; Instant Pay</span>
                  <span className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm, BHIM</span>
                </div>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Corporate Diesel Credit</span>
                  <span className="text-[11px] text-slate-500">
                    Available: ₹{user?.availableCredit?.toLocaleString('en-IN') || '4,12,500'}
                  </span>
                </div>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Credit &amp; Debit Cards</span>
                  <span className="text-[11px] text-slate-500">Visa, Mastercard, RuPay, Amex</span>
                </div>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Spot Cheque / Cash On Delivery</span>
                  <span className="text-[11px] text-slate-500">Direct receipt against delivery token</span>
                </div>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Help & Support */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Help &amp; Support</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <a
                href="tel:+919876543210"
                className="w-full p-3.5 rounded-2xl bg-red-50 border border-red-200 text-brand-red flex items-center space-x-3 active-press"
              >
                <PhoneCall className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Call 24/7 Bowser Dispatch Desk</span>
                  <span className="text-[11px] font-semibold text-slate-700">+91 98765 43210</span>
                </div>
              </a>

              <a
                href="https://wa.me/919876543210?text=Hello%20Extra%20Diesel%20Support"
                target="_blank"
                rel="noreferrer"
                className="w-full p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3 active-press"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  W
                </div>
                <div>
                  <span className="text-xs font-bold block">Chat with WhatsApp Support</span>
                  <span className="text-[11px] text-emerald-700">Immediate response under 3 mins</span>
                </div>
              </a>

              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-bold text-slate-800">Frequently Asked Questions</h4>
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-800">Is Extra Diesel PESO approved?</p>
                  <p className="text-[11px] text-slate-600">
                    Yes, all our mobile refuelers operate under statutory approvals from Petroleum and Explosives Safety Organization (PESO).
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-800">How is fuel density &amp; quantity measured?</p>
                  <p className="text-[11px] text-slate-600">
                    Dispensing bowsers are equipped with government Weights &amp; Measures calibrated flow meters with digital thermal density printouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: About Us */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">About Extra Diesel</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2">
              <img src="/assets/logo.png" alt="Logo" className="h-10 mx-auto object-contain mb-2" />
              <p className="text-xs font-bold text-slate-900">Reliable Diesel Right To Your Site</p>
            </div>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                Extra Diesel is India's leading on-demand doorstep diesel delivery platform serving residential societies, corporate IT parks, infrastructure developers, commercial vehicle fleets, and healthcare facilities.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-[11px]">
                <p><strong>Licensing:</strong> PESO Licensed Mobile Fuel Dispenser</p>
                <p><strong>Quality Standard:</strong> Bharat Stage VI (BS-VI) Ultra-Low Sulfur Diesel</p>
                <p><strong>Metering:</strong> W&amp;M Verified Micro-Motion Flow Meters</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Profile */}
      {activeModal === 'edit-profile' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSaveProfile} className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Edit Profile</h3>
              <button type="button" onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-red focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-red focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-brand-red text-white text-xs font-bold shadow-sm"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* MODAL: Settings */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Settings</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Push Notifications</span>
                <span className="font-bold text-emerald-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>SMS Delivery Alerts</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Language</span>
                <span className="font-bold text-slate-800">English (India)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>App Version</span>
                <span className="font-bold text-slate-500">v2.4.1 (Stable)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export type UserRole = 'customer' | 'b2b' | 'manager' | 'admin' | 'driver';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  isB2BVerified?: boolean;
  companyName?: string;
  gstin?: string;
  creditLimit?: number;
  availableCredit?: number;
}

export type AddressType = 'Home' | 'Office' | 'Site' | 'Other';

export interface Address {
  id: string;
  label: string; // 'Home' | 'Office' | 'Site' | 'Other'
  street: string; // Flat / House / Building
  area: string; // Area / Sector / Street
  city: string;
  state: string;
  country?: string;
  pincode: string;
  isDefault: boolean;
  contactName?: string;
  contactPhone?: string;
  locationName?: string; // e.g. "Fab city"
  notes?: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'arriving_soon' | 'delivered' | 'cancelled';

export interface Order {
  id: string; // e.g. "ED20261116-8941"
  createdAt: string; // e.g. "16 Nov, 2026 • 10:15 PM"
  status: OrderStatus;
  productName: string; // e.g. "Diesel"
  liters: number;
  ratePerLiter: number;
  productValue: number;
  handlingFee: number;
  gstAmount: number;
  gstRate?: number; // 18%
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  grandTotal: number;
  deliveryType: 'one-time' | 'subscription';
  vehicleType: string;
  selectedAssetId?: string;
  selectedAssetName?: string;
  address: Address;
  slot: string; // e.g. "10:00 pm - 05:00 am"
  deliveryDate?: string; // e.g. "Thu 19 Nov"
  customerNotes?: string;
  poNumber?: string;
  proformaUrl?: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'credit';
  paymentTransactionId?: string;
  driver?: {
    name: string;
    phone: string;
    avatar: string;
    vehicleNo: string;
    vehicleImage?: string;
    etaMinutes: number;
    currentLat?: number;
    currentLng?: number;
  };
  timeline: {
    status: OrderStatus;
    title: string;
    time: string;
    completed: boolean;
  }[];
}

export type SubscriptionFrequency = 'weekly' | 'monthly' | 'selected-days';

export interface Subscription {
  id: string;
  frequency: SubscriptionFrequency;
  preferredDays: string[];
  liters: number;
  deliveryAddress: Address;
  vehicleType: string;
  startDate: string;
  nextDeliveryDate: string;
  status: 'active' | 'paused' | 'cancelled';
  ratePerLiter: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  liters: number;
  ratePerLiter: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  pdfUrl?: string;
  status: 'paid' | 'pending';
}

export interface B2BAsset {
  id: string;
  name: string;
  category: 'DG Set' | 'Commercial Fleet' | 'Heavy Machinery' | 'Storage Tank' | 'Bowser Vehicle';
  identifier: string;
  capacityLiters: number;
  locationId: string;
  image?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'promo' | 'system';
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  available: boolean;
  badge?: string;
}

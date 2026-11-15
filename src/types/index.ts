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

export interface Address {
  id: string;
  label: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  contactName?: string;
  contactPhone?: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'arriving_soon' | 'delivered' | 'cancelled';

export interface Order {
  id: string; // e.g. "ED20261114"
  createdAt: string; // e.g. "14 Nov, 2026 • 10:15 AM"
  status: OrderStatus;
  liters: number;
  ratePerLiter: number;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  deliveryType: 'one-time' | 'subscription';
  vehicleType: string;
  address: Address;
  slot: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'credit';
  driver?: {
    name: string;
    phone: string;
    avatar: string;
    vehicleNo: string;
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
  preferredDays: string[]; // e.g. ['Mon', 'Thu']
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
  category: 'DG Set' | 'Commercial Fleet' | 'Heavy Machinery' | 'Storage Tank';
  identifier: string;
  capacityLiters: number;
  locationId: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'promo' | 'system';
}

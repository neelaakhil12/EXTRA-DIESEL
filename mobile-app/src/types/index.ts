export type UserRole = 'customer' | 'b2b' | 'manager' | 'admin' | 'driver';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar?: string;
  profileImage?: string;
  isB2BVerified?: boolean;
  companyName?: string;
  gstin?: string;
  creditLimit?: number;
  availableCredit?: number;
}

export type AddressType = 'Home' | 'Office' | 'Site' | 'Other';

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
  locationName?: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'arriving_soon' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  productName: string;
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
  driver?: {
    name: string;
    phone: string;
    vehicleNo: string;
  };
}

export interface Subscription {
  id: string;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  liters: number;
  nextDelivery: string;
  status: 'active' | 'paused' | 'cancelled';
  address: Address;
}

export type ScreenName = 
  | 'splash' 
  | 'login' 
  | 'home' 
  | 'order' 
  | 'track' 
  | 'orders' 
  | 'subscription' 
  | 'profile' 
  | 'b2b';

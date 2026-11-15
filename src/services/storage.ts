import { User, Address, Order, Subscription, Invoice, B2BAsset, NotificationItem } from '../types';

const STORAGE_KEYS = {
  USER: 'extra_diesel_user',
  ADDRESSES: 'extra_diesel_addresses',
  ORDERS: 'extra_diesel_orders',
  SUBSCRIPTIONS: 'extra_diesel_subscriptions',
  INVOICES: 'extra_diesel_invoices',
  NOTIFICATIONS: 'extra_diesel_notifications',
  B2B_ASSETS: 'extra_diesel_b2b_assets',
  FUEL_RATE: 'extra_diesel_fuel_rate',
  VIEW_MODE: 'extra_diesel_view_mode' // 'mobile' | 'desktop'
};

export const INITIAL_USER: User = {
  id: 'usr_001',
  name: 'Hemanth Kumar',
  phone: '+91 98765 43210',
  email: 'hemanth.kumar@example.com',
  role: 'customer',
  avatar: '/assets/driver-avatar.png',
  isB2BVerified: true,
  companyName: 'Kumar Infra & Logistics Pvt Ltd',
  gstin: '36AAACK1234F1Z5',
  creditLimit: 500000,
  availableCredit: 412500
};

export const INITIAL_ADDRESSES: Address[] = [
  {
    id: 'addr_1',
    label: 'Home',
    street: '12-5-67, Green Park Colony',
    area: 'Green Park Colony',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500016',
    isDefault: true,
    contactName: 'Hemanth Kumar',
    contactPhone: '+91 98765 43210'
  },
  {
    id: 'addr_2',
    label: 'Site Office',
    street: 'Plot No. 42, Phase 2, Hitech City',
    area: 'Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    isDefault: false,
    contactName: 'Site Supervisor Rao',
    contactPhone: '+91 98480 22334'
  },
  {
    id: 'addr_3',
    label: 'Factory / Plant',
    street: 'Shed 12, Industrial Development Area',
    area: 'Patancheru',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '502319',
    isDefault: false,
    contactName: 'Plant Incharge Reddy',
    contactPhone: '+91 99887 76655'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ED20261114',
    createdAt: '14 Nov, 2026 • 10:15 AM',
    status: 'arriving_soon',
    liters: 200,
    ratePerLiter: 94.50,
    subtotal: 18900,
    deliveryFee: 0,
    tax: 945,
    totalAmount: 19845,
    deliveryType: 'one-time',
    vehicleType: 'Delivery Truck',
    address: INITIAL_ADDRESSES[0],
    slot: '10:00 AM - 12:00 PM',
    paymentMethod: 'UPI / Online',
    paymentStatus: 'paid',
    driver: {
      name: 'Ramesh Kumar',
      phone: '+91 98765 43210',
      avatar: '/assets/driver-avatar.png',
      vehicleNo: 'TS 09 ED 7721',
      etaMinutes: 15,
      currentLat: 17.4435,
      currentLng: 78.3842
    },
    timeline: [
      { status: 'placed', title: 'Order Placed', time: '14 Nov, 2026 • 10:00 AM', completed: true },
      { status: 'confirmed', title: 'Order Confirmed', time: '14 Nov, 2026 • 10:15 AM', completed: true },
      { status: 'out_for_delivery', title: 'Out for Delivery', time: '14 Nov, 2026 • 10:40 AM', completed: true },
      { status: 'arriving_soon', title: 'Arriving Soon', time: 'ETA: 15 mins', completed: true },
      { status: 'delivered', title: 'Delivered', time: 'Expected 11:15 AM', completed: false }
    ]
  },
  {
    id: 'ED20261110',
    createdAt: '10 Nov, 2026 • 11:20 AM',
    status: 'delivered',
    liters: 300,
    ratePerLiter: 94.20,
    subtotal: 28260,
    deliveryFee: 0,
    tax: 1413,
    totalAmount: 29673,
    deliveryType: 'one-time',
    vehicleType: 'Delivery Truck',
    address: INITIAL_ADDRESSES[0],
    slot: '11:00 AM - 01:00 PM',
    paymentMethod: 'UPI',
    paymentStatus: 'paid',
    driver: {
      name: 'Suresh Varma',
      phone: '+91 98451 12345',
      avatar: '/assets/driver-avatar.png',
      vehicleNo: 'TS 07 ED 4511',
      etaMinutes: 0
    },
    timeline: [
      { status: 'placed', title: 'Order Placed', time: '10 Nov, 2026 • 11:00 AM', completed: true },
      { status: 'confirmed', title: 'Order Confirmed', time: '10 Nov, 2026 • 11:20 AM', completed: true },
      { status: 'out_for_delivery', title: 'Out for Delivery', time: '10 Nov, 2026 • 11:45 AM', completed: true },
      { status: 'arriving_soon', title: 'Arriving Soon', time: '10 Nov, 2026 • 12:10 PM', completed: true },
      { status: 'delivered', title: 'Delivered', time: '10 Nov, 2026 • 12:25 PM', completed: true }
    ]
  },
  {
    id: 'ED20261105',
    createdAt: '05 Nov, 2026 • 04:30 PM',
    status: 'delivered',
    liters: 200,
    ratePerLiter: 94.80,
    subtotal: 18960,
    deliveryFee: 0,
    tax: 948,
    totalAmount: 19908,
    deliveryType: 'subscription',
    vehicleType: 'Delivery Truck',
    address: INITIAL_ADDRESSES[1],
    slot: '04:00 PM - 06:00 PM',
    paymentMethod: 'Diesel Corporate Credit',
    paymentStatus: 'paid',
    driver: {
      name: 'Ramesh Kumar',
      phone: '+91 98765 43210',
      avatar: '/assets/driver-avatar.png',
      vehicleNo: 'TS 09 ED 7721',
      etaMinutes: 0
    },
    timeline: [
      { status: 'placed', title: 'Order Placed', time: '05 Nov, 2026 • 04:15 PM', completed: true },
      { status: 'confirmed', title: 'Order Confirmed', time: '05 Nov, 2026 • 04:30 PM', completed: true },
      { status: 'out_for_delivery', title: 'Out for Delivery', time: '05 Nov, 2026 • 04:50 PM', completed: true },
      { status: 'arriving_soon', title: 'Arriving Soon', time: '05 Nov, 2026 • 05:15 PM', completed: true },
      { status: 'delivered', title: 'Delivered', time: '05 Nov, 2026 • 05:35 PM', completed: true }
    ]
  }
];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'SUB-2026-001',
    frequency: 'weekly',
    preferredDays: ['Mon', 'Thu'],
    liters: 200,
    deliveryAddress: INITIAL_ADDRESSES[0],
    vehicleType: 'Delivery Truck',
    startDate: '01 Nov, 2026',
    nextDeliveryDate: '17 Nov, 2026',
    status: 'active',
    ratePerLiter: 94.50
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-114',
    orderId: 'ED20261114',
    invoiceNumber: 'ED-INV-9941',
    date: '14 Nov, 2026',
    customerName: 'Hemanth Kumar',
    customerPhone: '+91 98765 43210',
    liters: 200,
    ratePerLiter: 94.50,
    baseAmount: 18900,
    gstAmount: 945,
    totalAmount: 19845,
    status: 'paid'
  },
  {
    id: 'INV-2026-110',
    orderId: 'ED20261110',
    invoiceNumber: 'ED-INV-9820',
    date: '10 Nov, 2026',
    customerName: 'Hemanth Kumar',
    customerPhone: '+91 98765 43210',
    liters: 300,
    ratePerLiter: 94.20,
    baseAmount: 28260,
    gstAmount: 1413,
    totalAmount: 29673,
    status: 'paid'
  },
  {
    id: 'INV-2026-105',
    orderId: 'ED20261105',
    invoiceNumber: 'ED-INV-9705',
    date: '05 Nov, 2026',
    customerName: 'Hemanth Kumar',
    customerPhone: '+91 98765 43210',
    liters: 200,
    ratePerLiter: 94.80,
    baseAmount: 18960,
    gstAmount: 948,
    totalAmount: 19908,
    status: 'paid'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Bowser Arriving Soon!',
    message: 'Bowser TS 09 ED 7721 driven by Ramesh Kumar is 15 minutes away from your location.',
    time: '5 mins ago',
    read: false,
    type: 'order'
  },
  {
    id: 'notif_2',
    title: 'Order Confirmed',
    message: 'Your diesel delivery order #ED20261114 for 200 Liters has been confirmed.',
    time: '25 mins ago',
    read: false,
    type: 'order'
  },
  {
    id: 'notif_3',
    title: 'Daily Fuel Price Update',
    message: 'High-speed diesel rate is ₹94.50/L today. Order now for zero delivery fees on orders above 200L.',
    time: 'Today 06:00 AM',
    read: true,
    type: 'promo'
  }
];

export const INITIAL_B2B_ASSETS: B2BAsset[] = [
  {
    id: 'ast_1',
    name: 'Cummins 250 kVA Prime Generator',
    category: 'DG Set',
    identifier: 'DG-SITE-A1',
    capacityLiters: 450,
    locationId: 'addr_2'
  },
  {
    id: 'ast_2',
    name: 'CAT 320D Hydraulic Excavator',
    category: 'Heavy Machinery',
    identifier: 'EXC-CAT-09',
    capacityLiters: 400,
    locationId: 'addr_2'
  },
  {
    id: 'ast_3',
    name: 'Ashok Leyland 16-Wheel Dumper Fleet',
    category: 'Commercial Fleet',
    identifier: 'FLEET-DUMP-04',
    capacityLiters: 350,
    locationId: 'addr_3'
  }
];

// Helper functions for LocalStorage
export const getStorageItem = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error', e);
  }
};

export const storage = {
  getUser: (): User => getStorageItem(STORAGE_KEYS.USER, INITIAL_USER),
  setUser: (u: User) => setStorageItem(STORAGE_KEYS.USER, u),

  getAddresses: (): Address[] => getStorageItem(STORAGE_KEYS.ADDRESSES, INITIAL_ADDRESSES),
  setAddresses: (a: Address[]) => setStorageItem(STORAGE_KEYS.ADDRESSES, a),

  getOrders: (): Order[] => getStorageItem(STORAGE_KEYS.ORDERS, INITIAL_ORDERS),
  setOrders: (o: Order[]) => setStorageItem(STORAGE_KEYS.ORDERS, o),

  getSubscriptions: (): Subscription[] => getStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, INITIAL_SUBSCRIPTIONS),
  setSubscriptions: (s: Subscription[]) => setStorageItem(STORAGE_KEYS.SUBSCRIPTIONS, s),

  getInvoices: (): Invoice[] => getStorageItem(STORAGE_KEYS.INVOICES, INITIAL_INVOICES),
  setInvoices: (i: Invoice[]) => setStorageItem(STORAGE_KEYS.INVOICES, i),

  getNotifications: (): NotificationItem[] => getStorageItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
  setNotifications: (n: NotificationItem[]) => setStorageItem(STORAGE_KEYS.NOTIFICATIONS, n),

  getB2BAssets: (): B2BAsset[] => getStorageItem(STORAGE_KEYS.B2B_ASSETS, INITIAL_B2B_ASSETS),
  setB2BAssets: (a: B2BAsset[]) => setStorageItem(STORAGE_KEYS.B2B_ASSETS, a),

  getFuelRate: (): number => getStorageItem(STORAGE_KEYS.FUEL_RATE, 94.50),
  setFuelRate: (rate: number) => setStorageItem(STORAGE_KEYS.FUEL_RATE, rate),

  getViewMode: (): 'mobile' | 'desktop' => getStorageItem(STORAGE_KEYS.VIEW_MODE, 'mobile'),
  setViewMode: (m: 'mobile' | 'desktop') => setStorageItem(STORAGE_KEYS.VIEW_MODE, m)
};

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

// Default Customer matching reference screenshots ("Nagesh")
export const INITIAL_USER: User = {
  id: 'usr_001',
  name: 'Nagesh',
  phone: '+91 98480 20940',
  email: 'nagesh.tadur@gmail.com',
  role: 'customer',
  avatar: '/assets/driver-avatar.png',
  isB2BVerified: true,
  companyName: 'Nagesh Infrastructure & Power Projects',
  gstin: '36AAATN2094F1Z5',
  creditLimit: 500000,
  availableCredit: 425000
};

// Customer Addresses matching image copy 10 & 11 reference ("Fab city", Secunderabad)
export const INITIAL_ADDRESSES: Address[] = [
  {
    id: 'addr_1',
    label: 'Site',
    street: '12-13-339',
    area: 'Street Number 7, Tarnaka',
    city: 'Secunderabad',
    state: 'Telangana',
    country: 'India',
    pincode: '500017',
    isDefault: true,
    contactName: 'Nagesh',
    contactPhone: '+91 98480 20940',
    locationName: 'Fab city',
    notes: 'Near Gate 3, Electrical Substation road. Security check required.'
  },
  {
    id: 'addr_2',
    label: 'Office',
    street: 'Plot No. 42, Phase 2',
    area: 'Hitech City, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    pincode: '500081',
    isDefault: false,
    contactName: 'Site Supervisor Rao',
    contactPhone: '+91 98480 22334',
    locationName: 'Corporate Office',
    notes: 'Basement parking entrance for diesel generator filling.'
  },
  {
    id: 'addr_3',
    label: 'Home',
    street: 'Villa 14, Green Meadows',
    area: 'Jubilee Hills Checkpost',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    pincode: '500033',
    isDefault: false,
    contactName: 'Nagesh',
    contactPhone: '+91 98480 20940',
    locationName: 'Residence'
  }
];

export const INITIAL_B2B_ASSETS: B2BAsset[] = [
  {
    id: 'ast_1',
    name: 'Mahindra Bolero Mobile Bowser',
    category: 'Bowser Vehicle',
    identifier: 'TG 07 W 3015',
    capacityLiters: 1500,
    locationId: 'addr_1',
    image: '/assets/vehicle-bolero-side.jpg'
  },
  {
    id: 'ast_2',
    name: 'Cummins 250 kVA Prime Generator',
    category: 'DG Set',
    identifier: 'DG-SITE-A1',
    capacityLiters: 450,
    locationId: 'addr_1'
  },
  {
    id: 'ast_3',
    name: 'CAT 320D Hydraulic Excavator',
    category: 'Heavy Machinery',
    identifier: 'EXC-CAT-09',
    capacityLiters: 400,
    locationId: 'addr_1'
  },
  {
    id: 'ast_4',
    name: 'Ashok Leyland 16-Wheel Dumper Fleet',
    category: 'Commercial Fleet',
    identifier: 'FLEET-DUMP-04',
    capacityLiters: 350,
    locationId: 'addr_2'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ED20261116-8941',
    createdAt: '16 Nov, 2026 • 10:15 PM',
    status: 'arriving_soon',
    productName: 'Diesel',
    liters: 1,
    ratePerLiter: 104.47,
    productValue: 104.47,
    handlingFee: 499.00,
    gstAmount: 89.82,
    gstRate: 18,
    subtotal: 603.47,
    deliveryFee: 499.00,
    tax: 89.82,
    totalAmount: 693.29,
    grandTotal: 693.29,
    deliveryType: 'one-time',
    vehicleType: 'Mahindra Bolero Bowser TG 07 W 3015',
    selectedAssetId: 'ast_1',
    selectedAssetName: 'Mahindra Bolero Mobile Bowser (TG 07 W 3015)',
    address: INITIAL_ADDRESSES[0],
    slot: '10:00 pm - 05:00 am',
    deliveryDate: 'Thu 19 Nov',
    customerNotes: 'Deliver near DG room 2 at Fab city site.',
    poNumber: 'PO-2026-NAG-081',
    paymentMethod: 'Razorpay UPI / Online',
    paymentStatus: 'paid',
    paymentTransactionId: 'pay_rzp_test_9841',
    driver: {
      name: 'Ramesh Kumar',
      phone: '+91 98765 43210',
      avatar: '/assets/driver-avatar.png',
      vehicleNo: 'TG 07 W 3015',
      vehicleImage: '/assets/vehicle-bolero-side.jpg',
      etaMinutes: 15,
      currentLat: 17.4435,
      currentLng: 78.3842
    },
    timeline: [
      { status: 'placed', title: 'Order Placed', time: '16 Nov • 10:00 PM', completed: true },
      { status: 'confirmed', title: 'Order Confirmed', time: '16 Nov • 10:05 PM', completed: true },
      { status: 'out_for_delivery', title: 'Out for Delivery', time: '16 Nov • 10:15 PM', completed: true },
      { status: 'arriving_soon', title: 'Arriving Soon (ETA: 15 mins)', time: 'En route to Fab city', completed: true },
      { status: 'delivered', title: 'Delivered', time: 'Expected 10:35 PM', completed: false }
    ]
  },
  {
    id: 'ED20261112-7420',
    createdAt: '12 Nov, 2026 • 11:20 AM',
    status: 'delivered',
    productName: 'Diesel',
    liters: 200,
    ratePerLiter: 104.47,
    productValue: 20894.00,
    handlingFee: 499.00,
    gstAmount: 89.82,
    gstRate: 18,
    subtotal: 21393.00,
    deliveryFee: 499.00,
    tax: 89.82,
    totalAmount: 21482.82,
    grandTotal: 21482.82,
    deliveryType: 'one-time',
    vehicleType: 'Mahindra Bolero Bowser TG 07 W 3015',
    selectedAssetId: 'ast_2',
    selectedAssetName: 'Cummins 250 kVA Prime Generator',
    address: INITIAL_ADDRESSES[0],
    slot: '10:00 pm - 05:00 am',
    deliveryDate: 'Wed 12 Nov',
    paymentMethod: 'UPI / Razorpay',
    paymentStatus: 'paid',
    paymentTransactionId: 'pay_rzp_test_7420',
    driver: {
      name: 'Ramesh Kumar',
      phone: '+91 98765 43210',
      avatar: '/assets/driver-avatar.png',
      vehicleNo: 'TG 07 W 3015',
      vehicleImage: '/assets/vehicle-bolero-side.jpg',
      etaMinutes: 0
    },
    timeline: [
      { status: 'placed', title: 'Order Placed', time: '12 Nov • 11:00 AM', completed: true },
      { status: 'confirmed', title: 'Order Confirmed', time: '12 Nov • 11:15 AM', completed: true },
      { status: 'out_for_delivery', title: 'Out for Delivery', time: '12 Nov • 11:30 AM', completed: true },
      { status: 'arriving_soon', title: 'Arriving Soon', time: '12 Nov • 11:50 AM', completed: true },
      { status: 'delivered', title: 'Delivered Successfully', time: '12 Nov • 12:05 PM', completed: true }
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
    vehicleType: 'Mahindra Bolero Bowser TG 07 W 3015',
    startDate: '01 Nov, 2026',
    nextDeliveryDate: '19 Nov, 2026',
    status: 'active',
    ratePerLiter: 104.47
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-116',
    orderId: 'ED20261116-8941',
    invoiceNumber: 'ED-INV-9941',
    date: '16 Nov, 2026',
    customerName: 'Nagesh',
    customerPhone: '+91 98480 20940',
    liters: 1,
    ratePerLiter: 104.47,
    baseAmount: 104.47,
    gstAmount: 89.82,
    totalAmount: 693.29,
    status: 'paid'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Bowser Arriving Soon!',
    message: 'Bowser TG 07 W 3015 driven by Ramesh Kumar is 15 minutes away from Fab city.',
    time: '5 mins ago',
    read: false,
    type: 'order'
  },
  {
    id: 'notif_2',
    title: 'Order Confirmed',
    message: 'Your diesel delivery order #ED20261116-8941 has been confirmed for slot 10:00 pm - 05:00 am.',
    time: '25 mins ago',
    read: false,
    type: 'order'
  },
  {
    id: 'notif_3',
    title: 'Daily Fuel Price Update',
    message: 'High-speed diesel rate is ₹104.47/L today in Secunderabad / Hyderabad.',
    time: 'Today 06:00 AM',
    read: true,
    type: 'promo'
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

  getFuelRate: (): number => getStorageItem(STORAGE_KEYS.FUEL_RATE, 104.47),
  setFuelRate: (rate: number) => setStorageItem(STORAGE_KEYS.FUEL_RATE, rate),

  getViewMode: (): 'mobile' | 'desktop' => getStorageItem(STORAGE_KEYS.VIEW_MODE, 'mobile'),
  setViewMode: (m: 'mobile' | 'desktop') => setStorageItem(STORAGE_KEYS.VIEW_MODE, m)
};

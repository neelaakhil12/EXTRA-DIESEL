import { storage } from './storage';
import { User, Address, Order, Subscription, Invoice, OrderStatus } from '../types';
import { calculateOrderPricing, FUEL_RATE_PER_LITER } from './pricing';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  // S3 File Upload helper (Invoices, KYB Docs, Driver Verification)
  uploadDocumentToS3: async (file: File): Promise<{ success: boolean; fileUrl: string }> => {
    if (BACKEND_URL) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BACKEND_URL}/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Backend S3 upload failed, falling back to local URL', e);
      }
    }
    return {
      success: true,
      fileUrl: URL.createObjectURL(file)
    };
  },

  // Razorpay Official Checkout Integration
  initiateRazorpayPayment: async ({
    amount,
    customerName,
    customerPhone,
    customerEmail,
    onSuccess,
    onFailure
  }: {
    amount: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    onSuccess: (paymentId: string) => void;
    onFailure: (err: any) => void;
  }) => {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_U0oP5sFk81MJMT';

    if (typeof (window as any).Razorpay === 'undefined') {
      console.warn('Razorpay SDK not loaded, proceeding with simulated instant gateway');
      onSuccess(`pay_test_${Date.now()}`);
      return;
    }

    const options = {
      key: keyId,
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      name: 'Extra Diesel',
      description: 'Doorstep Diesel Refueling Order',
      image: '/assets/logo.png',
      handler: function (response: any) {
        onSuccess(response.razorpay_payment_id || `pay_${Date.now()}`);
      },
      prefill: {
        name: customerName,
        contact: customerPhone.replace(/\D/g, '').slice(-10),
        email: customerEmail || 'nagesh.tadur@gmail.com'
      },
      notes: {
        service: 'Doorstep High-Speed Diesel Bowser'
      },
      theme: {
        color: '#D50000'
      },
      modal: {
        ondismiss: function () {
          onFailure(new Error('Payment window closed by user'));
        }
      }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        onFailure(response.error);
      });
      rzp.open();
    } catch (e) {
      console.error('Razorpay open error:', e);
      onSuccess(`pay_fallback_${Date.now()}`);
    }
  },

  // Auth
  sendOtp: async (phone: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    await new Promise(r => setTimeout(r, 400));
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }
    const mockOtp = '123456';
    return {
      success: true,
      message: `OTP sent successfully to +91 ${cleanPhone.slice(-10)}`,
      otp: mockOtp
    };
  },

  verifyOtp: async (phone: string, otp: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 500));
    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid verification code. Please enter 123456 to test.');
    }
    let user = storage.getUser();
    if (!user || user.phone !== phone) {
      user = {
        id: `usr_${Date.now()}`,
        name: 'Nagesh',
        phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
        role: 'customer',
        avatar: '/assets/driver-avatar.png'
      };
      storage.setUser(user);
    }
    return user;
  },

  googleSignIn: async (): Promise<User> => {
    await new Promise(r => setTimeout(r, 500));
    const user: User = {
      id: `usr_g_${Date.now()}`,
      name: 'Nagesh (Google)',
      phone: '+91 98480 20940',
      email: 'nagesh.tadur@gmail.com',
      role: 'customer',
      avatar: '/assets/driver-avatar.png'
    };
    storage.setUser(user);
    return user;
  },

  register: async (name: string, phone: string, email?: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 500));
    const user: User = {
      id: `usr_${Date.now()}`,
      name,
      phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
      email,
      role: 'customer',
      avatar: '/assets/driver-avatar.png'
    };
    storage.setUser(user);
    return user;
  },

  logout: async (): Promise<void> => {
    await new Promise(r => setTimeout(r, 200));
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    return storage.getOrders();
  },

  getOrderById: async (id: string): Promise<Order | undefined> => {
    const orders = storage.getOrders();
    return orders.find(o => o.id === id);
  },

  createOrder: async (data: {
    productName?: string;
    liters: number;
    address: Address;
    deliveryType?: 'one-time' | 'subscription';
    vehicleType?: string;
    selectedAssetId?: string;
    selectedAssetName?: string;
    slot: string;
    deliveryDate?: string;
    customerNotes?: string;
    poNumber?: string;
    proformaUrl?: string;
    paymentMethod: string;
    paymentTransactionId?: string;
  }): Promise<Order> => {
    await new Promise(r => setTimeout(r, 400));
    const rate = storage.getFuelRate() || FUEL_RATE_PER_LITER;
    const productName = data.productName || 'Diesel';
    const pricing = calculateOrderPricing(data.liters, rate, productName);

    const newId = `ED${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newOrder: Order = {
      id: newId,
      createdAt: `${dateStr} • ${timeStr}`,
      status: 'placed',
      productName,
      liters: pricing.quantity,
      ratePerLiter: pricing.ratePerLiter,
      productValue: pricing.productValue,
      handlingFee: pricing.handlingFee,
      gstAmount: pricing.gstAmount,
      gstRate: pricing.gstRate,
      subtotal: pricing.subtotal,
      deliveryFee: pricing.handlingFee,
      tax: pricing.gstAmount,
      totalAmount: pricing.grandTotal,
      grandTotal: pricing.grandTotal,
      deliveryType: data.deliveryType || 'one-time',
      vehicleType: data.vehicleType || 'Mahindra Bolero Bowser TG 07 W 3015',
      selectedAssetId: data.selectedAssetId,
      selectedAssetName: data.selectedAssetName,
      address: data.address,
      slot: data.slot || '10:00 pm - 05:00 am',
      deliveryDate: data.deliveryDate || 'Today',
      customerNotes: data.customerNotes,
      poNumber: data.poNumber,
      proformaUrl: data.proformaUrl,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod.includes('Credit') ? 'credit' : 'paid',
      paymentTransactionId: data.paymentTransactionId || `pay_${Date.now()}`,
      driver: {
        name: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        avatar: '/assets/driver-avatar.png',
        vehicleNo: 'TG 07 W 3015',
        vehicleImage: '/assets/vehicle-bolero-side.jpg',
        etaMinutes: 20,
        currentLat: 17.4435,
        currentLng: 78.3842
      },
      timeline: [
        { status: 'placed', title: 'Order Placed', time: `${dateStr} • ${timeStr}`, completed: true },
        { status: 'confirmed', title: 'Order Confirmed', time: 'Pending', completed: false },
        { status: 'out_for_delivery', title: 'Out for Delivery', time: 'Pending', completed: false },
        { status: 'arriving_soon', title: 'Arriving Soon', time: 'ETA: 20 mins', completed: false },
        { status: 'delivered', title: 'Delivered', time: 'Estimated delivery today', completed: false }
      ]
    };

    const currentOrders = storage.getOrders();
    const updated = [newOrder, ...currentOrders];
    storage.setOrders(updated);

    // Auto-generate invoice
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      orderId: newOrder.id,
      invoiceNumber: `ED-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: dateStr,
      customerName: storage.getUser().name,
      customerPhone: storage.getUser().phone,
      liters: newOrder.liters,
      ratePerLiter: rate,
      baseAmount: pricing.productValue,
      gstAmount: pricing.gstAmount,
      totalAmount: pricing.grandTotal,
      status: 'paid'
    };
    storage.setInvoices([newInvoice, ...storage.getInvoices()]);

    return newOrder;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
    await new Promise(r => setTimeout(r, 200));
    const orders = storage.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found');

    const order = { ...orders[idx], status };
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    order.timeline = order.timeline.map(step => {
      if (step.status === status) {
        return { ...step, completed: true, time: `Today • ${timeStr}` };
      }
      return step;
    });

    orders[idx] = order;
    storage.setOrders(orders);
    return order;
  },

  // Subscriptions
  getSubscriptions: async (): Promise<Subscription[]> => {
    return storage.getSubscriptions();
  },

  createSubscription: async (data: {
    frequency: 'weekly' | 'monthly' | 'selected-days';
    preferredDays: string[];
    liters: number;
    address: Address;
    vehicleType: string;
  }): Promise<Subscription> => {
    await new Promise(r => setTimeout(r, 400));
    const now = new Date();
    const startDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const nextDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newSub: Subscription = {
      id: `SUB-${Date.now()}`,
      frequency: data.frequency,
      preferredDays: data.preferredDays,
      liters: data.liters,
      deliveryAddress: data.address,
      vehicleType: data.vehicleType || 'Mahindra Bolero Bowser TG 07 W 3015',
      startDate,
      nextDeliveryDate: nextDate,
      status: 'active',
      ratePerLiter: storage.getFuelRate()
    };

    const subs = [newSub, ...storage.getSubscriptions()];
    storage.setSubscriptions(subs);
    return newSub;
  },

  cancelSubscription: async (id: string): Promise<void> => {
    const subs = storage.getSubscriptions();
    const updated = subs.map(s => s.id === id ? { ...s, status: 'cancelled' as const } : s);
    storage.setSubscriptions(updated);
  },

  // Addresses
  getAddresses: async (): Promise<Address[]> => {
    return storage.getAddresses();
  },

  saveAddress: async (addr: Address): Promise<Address[]> => {
    await new Promise(r => setTimeout(r, 200));
    const list = storage.getAddresses();
    let updated: Address[];
    if (addr.isDefault) {
      list.forEach(a => a.isDefault = false);
    }
    const idx = list.findIndex(a => a.id === addr.id);
    if (idx >= 0) {
      list[idx] = addr;
      updated = [...list];
    } else {
      updated = [...list, addr];
    }
    storage.setAddresses(updated);
    return updated;
  },

  deleteAddress: async (id: string): Promise<Address[]> => {
    const list = storage.getAddresses().filter(a => a.id !== id);
    if (list.length > 0 && !list.some(a => a.isDefault)) {
      list[0].isDefault = true;
    }
    storage.setAddresses(list);
    return list;
  },

  // Invoices
  getInvoices: async (): Promise<Invoice[]> => {
    return storage.getInvoices();
  }
};

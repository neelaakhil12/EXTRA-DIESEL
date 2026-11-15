import { storage } from './storage';
import { User, Address, Order, Subscription, Invoice, OrderStatus } from '../types';

export const api = {
  // Auth
  sendOtp: async (phone: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    // Simulate real SMS gateway call
    await new Promise(r => setTimeout(r, 600));
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number');
    }
    // Return mock OTP for developer test convenience, but also log in console
    const mockOtp = '123456';
    return {
      success: true,
      message: `OTP sent successfully to +91 ${cleanPhone.slice(-10)}`,
      otp: mockOtp
    };
  },

  verifyOtp: async (phone: string, otp: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 700));
    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid verification code. Please enter 123456 to test.');
    }
    let user = storage.getUser();
    if (!user || user.phone !== phone) {
      user = {
        id: `usr_${Date.now()}`,
        name: 'Hemanth Kumar',
        phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
        role: 'customer',
        avatar: '/assets/driver-avatar.png'
      };
      storage.setUser(user);
    }
    return user;
  },

  googleSignIn: async (): Promise<User> => {
    await new Promise(r => setTimeout(r, 800));
    const user: User = {
      id: `usr_g_${Date.now()}`,
      name: 'Hemanth Kumar (Google)',
      phone: '+91 98765 43210',
      email: 'hemanth.kumar@gmail.com',
      role: 'customer',
      avatar: '/assets/driver-avatar.png'
    };
    storage.setUser(user);
    return user;
  },

  register: async (name: string, phone: string, email?: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 700));
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
    await new Promise(r => setTimeout(r, 300));
    // Keep seed data but clear active session state if needed
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 300));
    return storage.getOrders();
  },

  getOrderById: async (id: string): Promise<Order | undefined> => {
    await new Promise(r => setTimeout(r, 200));
    const orders = storage.getOrders();
    return orders.find(o => o.id === id);
  },

  createOrder: async (data: {
    liters: number;
    address: Address;
    deliveryType: 'one-time' | 'subscription';
    vehicleType: string;
    slot: string;
    paymentMethod: string;
  }): Promise<Order> => {
    await new Promise(r => setTimeout(r, 800));
    const rate = storage.getFuelRate();
    const subtotal = Math.round(data.liters * rate);
    const tax = Math.round(subtotal * 0.05); // 5% GST on fuel
    const total = subtotal + tax;

    const newId = `ED${new Date().getFullYear()}${String(Date.now()).slice(-4)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newOrder: Order = {
      id: newId,
      createdAt: `${dateStr} • ${timeStr}`,
      status: 'placed',
      liters: data.liters,
      ratePerLiter: rate,
      subtotal,
      deliveryFee: 0,
      tax,
      totalAmount: total,
      deliveryType: data.deliveryType,
      vehicleType: data.vehicleType,
      address: data.address,
      slot: data.slot || 'Express Immediate (Within 2 Hours)',
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod.includes('Credit') ? 'credit' : 'paid',
      driver: {
        name: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        avatar: '/assets/driver-avatar.png',
        vehicleNo: 'TS 09 ED 7721',
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

    // Also auto-generate invoice
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      orderId: newOrder.id,
      invoiceNumber: `ED-INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: dateStr,
      customerName: storage.getUser().name,
      customerPhone: storage.getUser().phone,
      liters: newOrder.liters,
      ratePerLiter: rate,
      baseAmount: subtotal,
      gstAmount: tax,
      totalAmount: total,
      status: 'paid'
    };
    storage.setInvoices([newInvoice, ...storage.getInvoices()]);

    return newOrder;
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<Order> => {
    await new Promise(r => setTimeout(r, 300));
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
    await new Promise(r => setTimeout(r, 300));
    return storage.getSubscriptions();
  },

  createSubscription: async (data: {
    frequency: 'weekly' | 'monthly' | 'selected-days';
    preferredDays: string[];
    liters: number;
    address: Address;
    vehicleType: string;
  }): Promise<Subscription> => {
    await new Promise(r => setTimeout(r, 600));
    const now = new Date();
    const startDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const nextDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newSub: Subscription = {
      id: `SUB-${Date.now()}`,
      frequency: data.frequency,
      preferredDays: data.preferredDays,
      liters: data.liters,
      deliveryAddress: data.address,
      vehicleType: data.vehicleType || 'Delivery Truck',
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
    await new Promise(r => setTimeout(r, 400));
    const subs = storage.getSubscriptions();
    const updated = subs.map(s => s.id === id ? { ...s, status: 'cancelled' as const } : s);
    storage.setSubscriptions(updated);
  },

  // Addresses
  getAddresses: async (): Promise<Address[]> => {
    return storage.getAddresses();
  },

  saveAddress: async (addr: Address): Promise<Address[]> => {
    await new Promise(r => setTimeout(r, 300));
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
    await new Promise(r => setTimeout(r, 300));
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

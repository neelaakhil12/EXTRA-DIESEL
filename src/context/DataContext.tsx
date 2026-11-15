import React, { createContext, useContext, useState, useEffect } from 'react';
import { Order, Subscription, Address, Invoice, NotificationItem, OrderStatus } from '../types';
import { storage } from '../services/storage';
import { api } from '../services/api';

export type ScreenId =
  | 'splash'
  | 'login'
  | 'home'
  | 'order'
  | 'track'
  | 'orders'
  | 'subscription'
  | 'profile'
  | 'b2b'
  | 'manager'
  | 'order-details'
  | 'addresses'
  | 'invoices';

export type NavTab = 'home' | 'orders' | 'track' | 'profile';

interface DataContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  activeNavTab: NavTab;
  setActiveNavTab: (tab: NavTab) => void;
  orders: Order[];
  activeTrackingOrder: Order | null;
  setActiveTrackingOrderId: (id: string) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  subscriptions: Subscription[];
  addresses: Address[];
  selectedAddress: Address;
  setSelectedAddress: (addr: Address) => void;
  invoices: Invoice[];
  notifications: NotificationItem[];
  unreadNotifCount: number;
  markNotifsRead: () => void;
  fuelRate: number;
  createNewOrder: (params: {
    liters: number;
    address: Address;
    deliveryType: 'one-time' | 'subscription';
    vehicleType: string;
    slot: string;
    paymentMethod: string;
  }) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  createSubscription: (params: {
    frequency: 'weekly' | 'monthly' | 'selected-days';
    preferredDays: string[];
    liters: number;
    address: Address;
    vehicleType: string;
  }) => Promise<Subscription>;
  cancelSubscription: (id: string) => Promise<void>;
  addOrUpdateAddress: (addr: Address) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  refreshData: () => void;
  viewMode: 'mobile' | 'desktop';
  toggleViewMode: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('splash');
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('home');
  const [orders, setOrders] = useState<Order[]>(() => storage.getOrders());
  const [activeTrackingOrderId, setActiveTrackingOrderIdState] = useState<string>('ED20261114');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>('ED20261114');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => storage.getSubscriptions());
  const [addresses, setAddresses] = useState<Address[]>(() => storage.getAddresses());
  const [selectedAddress, setSelectedAddress] = useState<Address>(() => {
    const list = storage.getAddresses();
    return list.find(a => a.isDefault) || list[0];
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => storage.getInvoices());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => storage.getNotifications());
  const [fuelRate] = useState<number>(() => storage.getFuelRate());
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>(() => storage.getViewMode());

  const refreshData = () => {
    setOrders(storage.getOrders());
    setSubscriptions(storage.getSubscriptions());
    setAddresses(storage.getAddresses());
    setInvoices(storage.getInvoices());
    setNotifications(storage.getNotifications());
  };

  const activeTrackingOrder = orders.find(o => o.id === activeTrackingOrderId) || orders[0] || null;

  const setActiveTrackingOrderId = (id: string) => {
    setActiveTrackingOrderIdState(id);
    setCurrentScreen('track');
    setActiveNavTab('track');
  };

  const createNewOrder = async (params: {
    liters: number;
    address: Address;
    deliveryType: 'one-time' | 'subscription';
    vehicleType: string;
    slot: string;
    paymentMethod: string;
  }) => {
    const newOrder = await api.createOrder(params);
    refreshData();
    setActiveTrackingOrderIdState(newOrder.id);
    setSelectedOrderId(newOrder.id);
    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await api.updateOrderStatus(orderId, status);
    refreshData();
  };

  const createSubscription = async (params: {
    frequency: 'weekly' | 'monthly' | 'selected-days';
    preferredDays: string[];
    liters: number;
    address: Address;
    vehicleType: string;
  }) => {
    const sub = await api.createSubscription(params);
    refreshData();
    return sub;
  };

  const cancelSubscription = async (id: string) => {
    await api.cancelSubscription(id);
    refreshData();
  };

  const addOrUpdateAddress = async (addr: Address) => {
    const updated = await api.saveAddress(addr);
    setAddresses(updated);
    if (addr.isDefault) {
      setSelectedAddress(addr);
    }
  };

  const deleteAddress = async (id: string) => {
    const updated = await api.deleteAddress(id);
    setAddresses(updated);
    if (selectedAddress.id === id && updated.length > 0) {
      setSelectedAddress(updated[0]);
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const markNotifsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    storage.setNotifications(updated);
  };

  const toggleViewMode = () => {
    const next = viewMode === 'mobile' ? 'desktop' : 'mobile';
    setViewMode(next);
    storage.setViewMode(next);
  };

  // Sync nav tab with screen changes
  const handleSetCurrentScreen = (screen: ScreenId) => {
    setCurrentScreen(screen);
    if (screen === 'home') setActiveNavTab('home');
    else if (screen === 'orders') setActiveNavTab('orders');
    else if (screen === 'track') setActiveNavTab('track');
    else if (screen === 'profile') setActiveNavTab('profile');
  };

  const handleSetActiveNavTab = (tab: NavTab) => {
    setActiveNavTab(tab);
    if (tab === 'home') setCurrentScreen('home');
    else if (tab === 'orders') setCurrentScreen('orders');
    else if (tab === 'track') setCurrentScreen('track');
    else if (tab === 'profile') setCurrentScreen('profile');
  };

  return (
    <DataContext.Provider
      value={{
        currentScreen,
        setCurrentScreen: handleSetCurrentScreen,
        activeNavTab,
        setActiveNavTab: handleSetActiveNavTab,
        orders,
        activeTrackingOrder,
        setActiveTrackingOrderId,
        selectedOrderId,
        setSelectedOrderId,
        subscriptions,
        addresses,
        selectedAddress,
        setSelectedAddress,
        invoices,
        notifications,
        unreadNotifCount,
        markNotifsRead,
        fuelRate,
        createNewOrder,
        updateOrderStatus,
        createSubscription,
        cancelSubscription,
        addOrUpdateAddress,
        deleteAddress,
        refreshData,
        viewMode,
        toggleViewMode
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};

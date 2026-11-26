import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  BackHandler,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './src/constants/theme';
import { ScreenName } from './src/types';
import { DeviceFrame } from './src/components/DeviceFrame';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { SplashScreen } from './src/screens/SplashScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from './src/screens/HomeScreen';
import { OrderDieselScreen } from './src/screens/OrderDieselScreen';
import { TrackOrderScreen } from './src/screens/TrackOrderScreen';
import { MyOrdersScreen } from './src/screens/MyOrdersScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { DeliveryDashboardScreen } from './src/screens/DeliveryDashboardScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { LocationModal, SavedLocation } from './src/components/LocationModal';
import { initNotifications } from './src/services/notificationService';
import { APP_CONFIG } from './src/constants/config';

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  // Determine initial screen based on Web URL path (e.g. /admin -> 'admin', /delivery -> 'delivery')
  const getInitialScreen = (): ScreenName => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
      if (path === '/admin' || path.startsWith('/admin')) {
        return 'admin';
      }
      if (path === '/delivery' || path.startsWith('/delivery')) {
        return 'delivery';
      }
      if (path === '/orders' || path.startsWith('/orders')) {
        return 'orders';
      }
      if (path === '/order' || path.startsWith('/order')) {
        return 'order';
      }
      if (path === '/track' || path.startsWith('/track')) {
        return 'track';
      }
      if (path === '/profile' || path.startsWith('/profile')) {
        return 'profile';
      }
      if (path === '/login' || path.startsWith('/login')) {
        return 'login';
      }
      return 'home';
    }
    return 'splash';
  };

  // Navigation stack: Web supports direct URL routes like domain/admin, mobile starts at splash
  const [screenStack, setScreenStack] = useState<ScreenName[]>([getInitialScreen()]);
  const currentScreen = screenStack[screenStack.length - 1];

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>('ED20261116-8941');
  const [liveFuelRate, setLiveFuelRate] = useState<number>(94.50);

  // Delivery Location State (Modal popup appears ONLY after login on the Home screen)
  const [deliveryLocation, setDeliveryLocation] = useState<SavedLocation>({
    siteName: 'Current Delivery Site',
    plotNo: '',
    street: '',
    landmark: '',
    area: '',
    city: 'Hyderabad',
    pincode: '',
    fullAddress: 'Tap to Pin Delivery Location',
    shortAddress: 'Pin Delivery Site',
  });
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    phone: string;
    role?: string;
    vehicleNumber?: string;
    profileImage?: string;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    profileImage: undefined,
  });

  // Restore persistent login session from AsyncStorage / localStorage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        let stored: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          stored = localStorage.getItem('ed_user_session');
        }
        if (!stored) {
          stored = await AsyncStorage.getItem('ed_user_session');
        }

        if (stored) {
          const user = JSON.parse(stored);
          if (user && user.email) {
            let phone = user.phone || '';
            if (!phone) {
              const savedPhone = await AsyncStorage.getItem('ed_user_phone');
              if (savedPhone) phone = savedPhone;
            }
            setCurrentUser((prev) => ({ ...prev, ...user, phone: phone || prev.phone }));
            setIsLoggedIn(true);
          }
        }
      } catch (err) {
        console.warn('Session restore error:', err);
      } finally {
        setSessionChecked(true);
      }
    };

    restoreSession();
  }, []);

  // Fetch live fuel rate for header
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
        const res = await fetch(`${baseUrl}/api/fuel-rate`);
        const data = await res.json();
        if (data.rate && !isNaN(Number(data.rate))) {
          setLiveFuelRate(Number(data.rate));
        }
      } catch (e) {}
    };
    fetchRate();
  }, []);

  // Sync fresh profile from database whenever user email or login status changes
  useEffect(() => {
    const syncProfile = async () => {
      try {
        if (!currentUser.email) return;
        const baseUrl = APP_CONFIG.LIVE_API_BASE_URL || 'https://extradiesel.in';
        const res = await fetch(`${baseUrl}/api/user/profile?email=${encodeURIComponent(currentUser.email)}`);
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser((prev) => ({
            ...prev,
            name: data.user.name || prev.name,
            phone: data.user.phone || prev.phone,
            role: data.user.role || prev.role,
            vehicleNumber: data.user.vehicleNumber || prev.vehicleNumber,
            profileImage: data.user.profileImage || prev.profileImage,
          }));
        }
      } catch (e) {}
    };

    syncProfile();
  }, [currentUser.email, isLoggedIn]);

  const handleUpdateUser = (updatedData: { name?: string; phone?: string; profileImage?: string }) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        ...updatedData,
      };
      AsyncStorage.setItem('ed_user_session', JSON.stringify(updated)).catch(() => {});
      if (updatedData.phone) {
        AsyncStorage.setItem('ed_user_phone', updatedData.phone).catch(() => {});
      }
      return updated;
    });
  };

  // Navigate forward with history tracking
  const navigateTo = (screen: ScreenName) => {
    setScreenStack((prev) => {
      // Do not duplicate the current screen on top of the stack
      if (prev[prev.length - 1] === screen) {
        return prev;
      }
      // When entering home from splash or login, reset stack to ['home']
      if (screen === 'home' && (prev.includes('splash') || prev.includes('login'))) {
        return ['home'];
      }
      return [...prev, screen];
    });
  };

  // Navigate back one step in history stack
  const goBack = (): boolean => {
    if (screenStack.length > 1) {
      setScreenStack((prev) => {
        if (prev.length > 1) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      return true;
    }
    return false;
  };

  // Android Hardware Back Button & Gesture Navigation Handler
  useEffect(() => {
    const handleBackPress = () => {
      if (screenStack.length > 1) {
        // If at root 'home' screen, don't trap; let system handle exit
        if (currentScreen === 'home') {
          return false;
        }
        goBack();
        return true; // handled
      }
      return false; // let Android default exit behavior happen
    };

    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backSubscription.remove();
  }, [screenStack, currentScreen]);

  // Web Browser URL synchronization (Keeps address bar in sync: /admin, /orders, /delivery, etc.)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const targetPath = currentScreen === 'home' ? '/' : `/${currentScreen}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [currentScreen]);

  // Web Browser Back & Forward URL Navigation
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handlePopState = () => {
        const path = (window.location.pathname || '').toLowerCase().replace(/\/+$/, '');
        let targetScreen: ScreenName = 'home';
        if (path === '/admin' || path.startsWith('/admin')) targetScreen = 'admin';
        else if (path === '/delivery' || path.startsWith('/delivery')) targetScreen = 'delivery';
        else if (path === '/orders' || path.startsWith('/orders')) targetScreen = 'orders';
        else if (path === '/order' || path.startsWith('/order')) targetScreen = 'order';
        else if (path === '/track' || path.startsWith('/track')) targetScreen = 'track';
        else if (path === '/profile' || path.startsWith('/profile')) targetScreen = 'profile';
        else if (path === '/login' || path.startsWith('/login')) targetScreen = 'login';

        setScreenStack((prev) => {
          if (prev[prev.length - 1] === targetScreen) return prev;
          return [...prev, targetScreen];
        });
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // Handle splash completion with guaranteed session restore (prevents auto-logout on restart/reopen)
  const handleSplashFinish = async () => {
    try {
      let stored: string | null = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        stored = localStorage.getItem('ed_user_session');
      }
      if (!stored) {
        stored = await AsyncStorage.getItem('ed_user_session');
      }

      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.email) {
          let phone = user.phone || '';
          if (!phone) {
            const savedPhone = await AsyncStorage.getItem('ed_user_phone');
            if (savedPhone) phone = savedPhone;
          }
          setCurrentUser((prev) => ({ ...prev, ...user, phone: phone || prev.phone }));
          setIsLoggedIn(true);

          // If logged in as delivery partner, ALWAYS keep them on captain dashboard (never customer screen or location modal)
          if (user.role === 'delivery') {
            setShowLocationModal(false);
            setScreenStack(['delivery']);
            return;
          }

          if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin')) &&
            user.role === 'admin'
          ) {
            setScreenStack(['admin']);
            return;
          }

          // Customer role -> Home screen & prompt delivery location
          setScreenStack(['home']);
          setTimeout(() => setShowLocationModal(true), 600);
          setTimeout(() => setShowLocationModal(true), 600);
          return;
        }
      }
    } catch (e) {
      console.warn('Splash session check error:', e);
    }

    if (isLoggedIn) {
      setScreenStack(['home']);
      setTimeout(() => setShowLocationModal(true), 600);
    } else {
      setScreenStack(['welcome']);
    }
  };

  // Handle successful login / signup (Routes Customer to Home, Delivery Boy to Fleet, and only Web /admin to Admin)
  const handleLoginSuccess = async (userData: {
    name: string;
    email: string;
    phone: string;
    role?: string;
    vehicleNumber?: string;
    profileImage?: string;
  }) => {
    setCurrentUser((prev) => ({ ...prev, ...userData }));
    setIsLoggedIn(true);

    try {
      await AsyncStorage.setItem('ed_user_session', JSON.stringify(userData));
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        localStorage.setItem('ed_user_session', JSON.stringify(userData));
      }
    } catch (e) {}

    if (userData.role === 'delivery') {
      setShowLocationModal(false);
      setScreenStack(['delivery']);
    } else if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      (window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin')) &&
      userData.role === 'admin'
    ) {
      setScreenStack(['admin']);
    } else {
      // In Mobile App and Main Website: Always route users to Customer Home Screen
      setScreenStack(['home']);
      // Prompt for delivery location ONLY after landing on Home
      setTimeout(() => setShowLocationModal(true), 600);
    }
  };

  // Handle guest mode / skip login
  const handleSkipLogin = () => {
    setScreenStack(['home']);
    // Prompt for delivery location after entering Home as guest
    setTimeout(() => setShowLocationModal(true), 600);
  };

  // Handle order placed
  const handleOrderSuccess = (orderId: string) => {
    setActiveTrackingOrderId(orderId);
    navigateTo('track');
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('ed_user_session');
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              localStorage.removeItem('ed_user_session');
            }
            if (Platform.OS !== 'web') {
              const { GoogleSignin } = require('@react-native-google-signin/google-signin');
              await GoogleSignin.signOut();
            }
          } catch (e) {}
          setIsLoggedIn(false);
          setScreenStack(['welcome']);
        },
      },
    ]);
  };

  const getHeaderTitle = (): string | undefined => {
    switch (currentScreen) {
      case 'order':
        return 'Order Diesel';
      case 'track':
        return 'Live Bowser Track';
      case 'orders':
        return 'My Orders';
      case 'invoices':
        return 'Tax Invoices';
      case 'notifications':
        return 'Notifications';
      case 'subscription':
        return 'Subscriptions';
      case 'profile':
        return 'My Account';
      case 'admin':
        return 'Admin Control Center';
      case 'delivery':
        return 'Bowser Delivery Portal';
      default:
        return undefined; // shows brand home bar
    }
  };

  const showHeader = currentScreen !== 'splash' && currentScreen !== 'welcome' && currentScreen !== 'login' && currentScreen !== 'admin' && currentScreen !== 'delivery';
  const showBottomNav = currentScreen !== 'splash' && currentScreen !== 'welcome' && currentScreen !== 'login' && currentScreen !== 'admin' && currentScreen !== 'delivery';
  // No back arrow buttons in header; app relies on Android nav buttons & system swipe gestures
  const showBackBtn = false;

  // Initialize System Status Bar Push Notifications
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    const init = async () => {
      cleanupFn = await initNotifications(() => {
        // Tapping status bar notification navigates to full Notifications Screen
        navigateTo('notifications');
      });
    };
    init();
    return () => {
      cleanupFn?.();
    };
  }, []);

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 28)
    : insets.top;

  useEffect(() => {
    if (Platform.OS === 'android') {
      (StatusBar as any).setBackgroundColor?.('#FFFFFF');
      (StatusBar as any).setBarStyle?.('dark-content');
      (StatusBar as any).setTranslucent?.(false);
    }
  }, []);

  return (
    <DeviceFrame>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Top Status Bar Spacer - Keeps status bar in standard phone color (#FFFFFF) and prevents red bleed */}
        {(showHeader || currentScreen === 'delivery' || currentScreen === 'admin') && topInset > 0 && (
          <View style={{ height: topInset, backgroundColor: '#FFFFFF', width: '100%' }} />
        )}

        {/* Header */}
        {showHeader && (
          <Header
            title={getHeaderTitle()}
            userName={currentUser.name}
            userAvatar={currentUser.profileImage}
            userRole={currentUser.role}
            liveFuelRate={liveFuelRate}
            showBack={showBackBtn}
            onBack={goBack}
            onNotificationPress={() => navigateTo('notifications')}
            onProfilePress={() => navigateTo('profile')}
            currentScreen={currentScreen}
            onNavigate={(screen) => navigateTo(screen)}
            isLoggedIn={isLoggedIn}
            onLoginPress={() => navigateTo('login')}
            onLogout={handleLogout}
            currentLocationText={deliveryLocation.shortAddress || deliveryLocation.fullAddress}
            onLocationPress={() => setShowLocationModal(true)}
          />
        )}

        {/* Main Screen Content */}
        <View style={styles.screenContent}>
          {currentScreen === 'splash' && (
            <SplashScreen onFinish={handleSplashFinish} />
          )}

          {currentScreen === 'welcome' && (
            <WelcomeScreen
              onLoginPress={() => navigateTo('login')}
            />
          )}

          {currentScreen === 'login' && (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
            />
          )}

          {currentScreen === 'home' && (
            <HomeScreen onNavigate={(screen) => navigateTo(screen)} />
          )}

          {currentScreen === 'order' && (
            <OrderDieselScreen
              onOrderSuccess={handleOrderSuccess}
              onNavigate={(screen) => navigateTo(screen)}
              currentUser={currentUser}
              deliveryLocation={deliveryLocation}
              onOpenLocationModal={() => setShowLocationModal(true)}
            />
          )}

          {currentScreen === 'track' && (
            <TrackOrderScreen
              orderId={activeTrackingOrderId}
              onNavigate={(screen) => navigateTo(screen)}
            />
          )}

          {currentScreen === 'orders' && (
            <MyOrdersScreen
              mode="orders"
              currentUser={currentUser}
              onNavigate={(screen) => navigateTo(screen)}
              onSelectOrder={(id) => {
                setActiveTrackingOrderId(id);
                navigateTo('track');
              }}
            />
          )}

          {currentScreen === 'invoices' && (
            <MyOrdersScreen
              mode="invoices"
              currentUser={currentUser}
              onNavigate={(screen) => navigateTo(screen)}
              onSelectOrder={(id) => {
                setActiveTrackingOrderId(id);
                navigateTo('track');
              }}
            />
          )}

          {currentScreen === 'notifications' && (
            <NotificationsScreen
              onNavigate={(screen) => navigateTo(screen)}
              onSelectOrder={(id) => {
                setActiveTrackingOrderId(id);
                navigateTo('track');
              }}
            />
          )}

          {currentScreen === 'subscription' && (
            <SubscriptionScreen
              onNavigate={(screen) => navigateTo(screen)}
              userEmail={currentUser.email}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onLogout={handleLogout}
              onNavigate={(screen) => navigateTo(screen)}
              onUpdateUser={handleUpdateUser}
            />
          )}

          {currentScreen === 'admin' && Platform.OS === 'web' && (
            <AdminScreen
              onNavigate={(screen) => navigateTo(screen)}
              currentUser={currentUser}
            />
          )}

          {currentScreen === 'delivery' && (
            <DeliveryDashboardScreen
              onNavigate={(screen) => navigateTo(screen)}
              onLogout={handleLogout}
              currentUser={currentUser}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        {showBottomNav && (
          <BottomNav
            currentScreen={currentScreen}
            onNavigate={(screen) => navigateTo(screen)}
          />
        )}
        {/* Global Delivery Location Pin Modal (Prompts ONLY on Customer Home screen after login, NEVER for delivery partner) */}
        <LocationModal
          visible={showLocationModal && currentScreen === 'home' && currentUser?.role !== 'delivery'}
          onClose={() => setShowLocationModal(false)}
          onSaveLocation={(loc) => {
            setDeliveryLocation(loc);
            setShowLocationModal(false);
          }}
          currentLocation={deliveryLocation}
        />
      </View>
    </DeviceFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
  },
  screenContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notifCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  notifTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
  },
  notifCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  notifCountText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  clearAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyNotifBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 10,
  },
  emptyNotifSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  notifTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  notifDeleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
  notifClose: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 2,
  },
  notifItemBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

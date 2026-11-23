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
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './src/constants/theme';
import { ScreenName } from './src/types';
import { DeviceFrame } from './src/components/DeviceFrame';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OrderDieselScreen } from './src/screens/OrderDieselScreen';
import { TrackOrderScreen } from './src/screens/TrackOrderScreen';
import { MyOrdersScreen } from './src/screens/MyOrdersScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { DeliveryDashboardScreen } from './src/screens/DeliveryDashboardScreen';
import { LocationModal, SavedLocation } from './src/components/LocationModal';
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

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(Platform.OS === 'web');
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>('ED20261116-8941');
  const [liveFuelRate, setLiveFuelRate] = useState<number>(94.50);

  // Delivery Location State (Modal popup appears ONLY after login on the Home screen)
  const [deliveryLocation, setDeliveryLocation] = useState<SavedLocation>({
    siteName: 'Plot 42, Hitech City',
    plotNo: 'Plot 42',
    street: 'Survey 42, Phase 2, Near Mindspace',
    landmark: 'Opposite Mindspace West Gate',
    area: 'Madhapur',
    city: 'Hyderabad',
    pincode: '500081',
    fullAddress: 'Plot 42, Survey 42, Phase 2, Near Mindspace, Madhapur, Hyderabad - 500081',
    shortAddress: 'Plot 42, Hitech City, Madhapur',
    siteType: 'dg_set',
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
    name: 'Akhil Kumar',
    email: 'aadhyafuels9@gmail.com',
    phone: '+91 98765 43210',
    role: 'customer',
    profileImage: undefined,
  });

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
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedData,
    }));
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

  // Handle splash completion (revealed Login button pressed)
  const handleGetStarted = () => {
    if (isLoggedIn) {
      setScreenStack(['home']);
    } else {
      setScreenStack(['login']);
    }
  };

  // Handle successful login / signup (Routes Customer to Home, Delivery Boy to Fleet, and only Web /admin to Admin)
  const handleLoginSuccess = (userData: {
    name: string;
    email: string;
    phone: string;
    role?: string;
    vehicleNumber?: string;
    profileImage?: string;
  }) => {
    setCurrentUser((prev) => ({ ...prev, ...userData }));
    setIsLoggedIn(true);

    if (userData.role === 'delivery') {
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
            if (Platform.OS !== 'web') {
              const { GoogleSignin } = require('@react-native-google-signin/google-signin');
              await GoogleSignin.signOut();
            }
          } catch (e) {}
          setIsLoggedIn(false);
          setScreenStack(['login']);
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
        return 'Order History';
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

  const showHeader = currentScreen !== 'splash' && currentScreen !== 'login' && currentScreen !== 'admin' && currentScreen !== 'delivery';
  const showBottomNav = currentScreen !== 'splash' && currentScreen !== 'login' && currentScreen !== 'admin' && currentScreen !== 'delivery';
  // Show header back button whenever there is a previous screen to go back to and we are not on root home
  const showBackBtn = screenStack.length > 1 && currentScreen !== 'home';

  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      (StatusBar as any).setBackgroundColor?.('transparent');
      (StatusBar as any).setBarStyle?.('dark-content');
      (StatusBar as any).setTranslucent?.(true);
    }
  }, []);

  return (
    <DeviceFrame>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

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
            onNotificationPress={() => setShowNotifications(true)}
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
            <SplashScreen onGetStarted={handleGetStarted} />
          )}

          {currentScreen === 'login' && (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
              onSkip={handleSkipLogin}
            />
          )}

          {currentScreen === 'home' && (
            <HomeScreen onNavigate={(screen) => navigateTo(screen)} />
          )}

          {currentScreen === 'order' && (
            <OrderDieselScreen
              onOrderSuccess={handleOrderSuccess}
              onNavigate={(screen) => navigateTo(screen)}
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
        {/* Notifications In-App Modal */}
        <Modal
          visible={showNotifications}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowNotifications(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="notifications" size={20} color={COLORS.primary} />
                  <Text style={styles.notifTitle}>Notifications</Text>
                </View>
                <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.notifClose}>
                  <Ionicons name="close" size={20} color={COLORS.dark} />
                </TouchableOpacity>
              </View>

              <View style={styles.notifItem}>
                <View style={[styles.notifIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="trending-down" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifItemTitle}>Today's Diesel Rate Updated</Text>
                  <Text style={styles.notifItemBody}>High-speed diesel updated to ₹94.50/L today.</Text>
                </View>
              </View>

              <View style={styles.notifItem}>
                <View style={[styles.notifIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="navigate" size={18} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifItemTitle}>Bowser Out for Delivery</Text>
                  <Text style={styles.notifItemBody}>Delivery #ED20261116-8941 is arriving in ~25 mins.</Text>
                </View>
              </View>

              <View style={[styles.notifItem, { borderBottomWidth: 0 }]}>
                <View style={[styles.notifIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="calendar" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifItemTitle}>Scheduled Generator Refill</Text>
                  <Text style={styles.notifItemBody}>Weekly 500L refill scheduled for Thursday 10:00 AM.</Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Global Delivery Location Pin Modal (Prompts only on Home screen after login, and accessible via Header pill) */}
        <LocationModal
          visible={showLocationModal && currentScreen === 'home'}
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

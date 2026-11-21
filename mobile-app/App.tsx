import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  Alert,
  BackHandler,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

export default function App() {
  // Navigation stack state for seamless back button & gesture navigation history
  const [screenStack, setScreenStack] = useState<ScreenName[]>(['splash']);
  const currentScreen = screenStack[screenStack.length - 1];

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>('ED20261116-8941');
  const [currentUser, setCurrentUser] = useState({
    name: 'Akhil Kumar',
    email: 'akhil@extradiesel.com',
    phone: '+91 98765 43210',
  });

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

  // Web Browser Back Button Compatibility
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handlePopState = () => {
        if (screenStack.length > 1) {
          setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [screenStack]);

  // Handle splash completion (revealed Login button pressed)
  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigateTo('home');
    } else {
      navigateTo('login');
    }
  };

  // Handle successful login / signup
  const handleLoginSuccess = (userData: { name: string; email: string; phone: string }) => {
    setCurrentUser(userData);
    setIsLoggedIn(true);
    setScreenStack(['home']);
  };

  // Handle guest mode / skip login
  const handleSkipLogin = () => {
    setScreenStack(['home']);
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
      default:
        return undefined; // shows brand home bar
    }
  };

  const showHeader = currentScreen !== 'splash' && currentScreen !== 'login';
  const showBottomNav = currentScreen !== 'splash' && currentScreen !== 'login';
  // Show header back button whenever there is a previous screen to go back to and we are not on root home
  const showBackBtn = screenStack.length > 1 && currentScreen !== 'home';

  return (
    <DeviceFrame>
      <SafeAreaView style={styles.container}>
        <StatusBar style={currentScreen === 'splash' ? 'dark' : 'light'} />

        {/* Header */}
        {showHeader && (
          <Header
            title={getHeaderTitle()}
            showBack={showBackBtn}
            onBack={goBack}
            onNotificationPress={() =>
              Alert.alert(
                'Notifications',
                '• Today\'s rate updated: ₹94.50/L\n• Delivery #ED20261116-8941 is out for delivery\n• Scheduled refill arriving Thursday'
              )
            }
            onProfilePress={() => navigateTo('profile')}
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
            <SubscriptionScreen onNavigate={(screen) => navigateTo(screen)} />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onLogout={handleLogout}
              onNavigate={(screen) => navigateTo(screen)}
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
      </SafeAreaView>
    </DeviceFrame>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    // Android safe top padding to prevent notch & status bar clipping
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  screenContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

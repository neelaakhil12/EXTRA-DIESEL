import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Alert } from 'react-native';
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
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('splash');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>('ED20261116-8941');
  const [currentUser, setCurrentUser] = useState({
    name: 'Akhil Kumar',
    email: 'akhil@extradiesel.com',
    phone: '+91 98765 43210',
  });

  // Handle splash completion
  const handleGetStarted = () => {
    if (isLoggedIn) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('login');
    }
  };

  // Handle successful login / signup
  const handleLoginSuccess = (userData: { name: string; email: string; phone: string }) => {
    setCurrentUser(userData);
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  // Handle guest mode / skip login
  const handleSkipLogin = () => {
    setCurrentScreen('home');
  };

  // Handle order placed
  const handleOrderSuccess = (orderId: string) => {
    setActiveTrackingOrderId(orderId);
    setCurrentScreen('track');
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          setIsLoggedIn(false);
          setCurrentScreen('login');
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
        return undefined; // shows brand logo
    }
  };

  const showHeader = currentScreen !== 'splash' && currentScreen !== 'login';
  const showBottomNav = currentScreen !== 'splash' && currentScreen !== 'login';

  return (
    <DeviceFrame>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        {showHeader && (
          <Header
            title={getHeaderTitle()}
            showBack={currentScreen === 'order'}
            onBack={() => setCurrentScreen('home')}
            onNotificationPress={() =>
              Alert.alert(
                'Notifications',
                '• Today\'s rate updated: ₹94.50/L\n• Delivery #ED20261116-8941 is out for delivery\n• Scheduled refill arriving Thursday'
              )
            }
            onProfilePress={() => setCurrentScreen('profile')}
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
            <HomeScreen onNavigate={(screen) => setCurrentScreen(screen)} />
          )}

          {currentScreen === 'order' && (
            <OrderDieselScreen
              onOrderSuccess={handleOrderSuccess}
              onNavigate={(screen) => setCurrentScreen(screen)}
            />
          )}

          {currentScreen === 'track' && (
            <TrackOrderScreen
              orderId={activeTrackingOrderId}
              onNavigate={(screen) => setCurrentScreen(screen)}
            />
          )}

          {currentScreen === 'orders' && (
            <MyOrdersScreen
              onNavigate={(screen) => setCurrentScreen(screen)}
              onSelectOrder={(id) => setActiveTrackingOrderId(id)}
            />
          )}

          {currentScreen === 'subscription' && (
            <SubscriptionScreen onNavigate={(screen) => setCurrentScreen(screen)} />
          )}

          {currentScreen === 'profile' && (
            <ProfileScreen
              user={currentUser}
              onLogout={handleLogout}
              onNavigate={(screen) => setCurrentScreen(screen)}
            />
          )}
        </View>

        {/* Bottom Navigation */}
        {showBottomNav && (
          <BottomNav
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
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
  },
  screenContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

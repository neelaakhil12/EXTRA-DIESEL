import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { DeviceFrame } from './components/common/DeviceFrame';

// 8 Screens
import { Screen1Splash } from './components/screens/Screen1Splash';
import { Screen2Login } from './components/screens/Screen2Login';
import { Screen3Home } from './components/screens/Screen3Home';
import { Screen4OrderDiesel } from './components/screens/Screen4OrderDiesel';
import { Screen5TrackOrder } from './components/screens/Screen5TrackOrder';
import { Screen6MyOrders } from './components/screens/Screen6MyOrders';
import { Screen7Subscription } from './components/screens/Screen7Subscription';
import { Screen8Profile } from './components/screens/Screen8Profile';

// Business & Manager Modules
import { B2BPortal } from './components/b2b/B2BPortal';
import { ManagerDashboard } from './components/manager/ManagerDashboard';

const AppContent: React.FC = () => {
  const { currentScreen } = useData();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <Screen1Splash />;
      case 'login':
        return <Screen2Login />;
      case 'home':
        return <Screen3Home />;
      case 'order':
        return <Screen4OrderDiesel />;
      case 'track':
        return <Screen5TrackOrder />;
      case 'orders':
        return <Screen6MyOrders />;
      case 'subscription':
        return <Screen7Subscription />;
      case 'profile':
      case 'addresses':
      case 'invoices':
        return <Screen8Profile />;
      case 'b2b':
        return <B2BPortal />;
      case 'manager':
        return <ManagerDashboard />;
      default:
        return <Screen3Home />;
    }
  };

  return <DeviceFrame>{renderScreen()}</DeviceFrame>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
};

export default App;

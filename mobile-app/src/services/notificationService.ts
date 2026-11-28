import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  type: 'order' | 'driver' | 'subscription' | 'rate';
  read: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'ed_user_notifications_v1';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

// Initialize Notification Channels and Permissions
export const initNotifications = async (onNotificationClicked?: () => void) => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Extra Diesel Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DC2626',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Response Listener: Called when user taps notification in system status bar
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (onNotificationClicked) {
        onNotificationClicked();
      }
    });

    return () => {
      responseSub.remove();
    };
  } catch (e) {
    console.warn('Notifications init failed:', e);
  }
};

// Deduplication helper to prevent repeating the exact same notification
const SENT_KEYS_PREFIX = 'ed_sent_notif_fingerprint_';

// Send Immediate Status Bar Notification (Inside & Outside the App)
export const sendSystemNotification = async (
  title: string,
  body: string,
  type: 'order' | 'driver' | 'subscription' | 'rate' = 'order',
  bypassDeduplication: boolean = false
): Promise<AppNotification | null> => {
  // Generate a fingerprint based on title + body to guarantee no duplicate re-triggers
  const fingerprint = `${title.trim()}_${body.trim()}`.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  const sentKey = `${SENT_KEYS_PREFIX}${fingerprint}`;

  if (!bypassDeduplication) {
    try {
      const alreadySent = await AsyncStorage.getItem(sentKey);
      if (alreadySent) {
        // Notification already sent once; do not re-trigger!
        return null;
      }
      // Mark as sent immediately
      await AsyncStorage.setItem(sentKey, Date.now().toString());
    } catch (e) {}
  }

  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    body,
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type,
    read: false,
  };

  try {
    // 1. Trigger System Status Bar Notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { notifId: newNotif.id, screen: 'notifications' },
      },
      trigger: null, // triggers immediately
    });
  } catch (err) {
    console.warn('Could not schedule system notification:', err);
  }

  // 2. Persist to In-App Notification Center
  await addStoredNotification(newNotif);
  return newNotif;
};

// Storage Helpers
export const getStoredNotifications = async (): Promise<AppNotification[]> => {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

export const addStoredNotification = async (notif: AppNotification): Promise<AppNotification[]> => {
  try {
    const current = await getStoredNotifications();
    const updated = [notif, ...current.filter((n) => n.id !== notif.id)];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
    return updated;
  } catch (e) {
    return [];
  }
};

export const deleteStoredNotification = async (id: string): Promise<AppNotification[]> => {
  try {
    const current = await getStoredNotifications();
    const updated = current.filter((n) => n.id !== id);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};

export const clearAllStoredNotifications = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  } catch (e) {}
};

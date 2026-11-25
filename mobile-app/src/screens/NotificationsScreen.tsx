import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName } from '../types';
import {
  AppNotification,
  getStoredNotifications,
  deleteStoredNotification,
  clearAllStoredNotifications,
} from '../services/notificationService';

interface NotificationsScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onSelectOrder?: (orderId: string) => void;
}

interface SwipeableNotificationItemProps {
  item: AppNotification;
  onPress: () => void;
  onDelete: () => void;
  iconMeta: { name: keyof typeof Ionicons.glyphMap; color: string; bg: string };
}

const SwipeableNotificationItem: React.FC<SwipeableNotificationItemProps> = ({
  item,
  onPress,
  onDelete,
  iconMeta,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const isSwipingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dy) < 12;
      },
      onPanResponderGrant: () => {
        isSwipingRef.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        setTimeout(() => {
          isSwipingRef.current = false;
        }, 50);

        if (Math.abs(gestureState.dx) > 85) {
          const toX = gestureState.dx > 0 ? 500 : -500;
          Animated.timing(pan, {
            toValue: { x: toX, y: 0 },
            duration: 180,
            useNativeDriver: Platform.OS !== 'web',
          }).start(() => {
            onDelete();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 40,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.swipeBackground}>
        <View style={styles.swipeActionLeft}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Clear</Text>
        </View>
        <View style={styles.swipeActionRight}>
          <Text style={styles.swipeActionText}>Clear</Text>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
        </View>
      </View>

      <Animated.View
        style={[
          styles.notifCard,
          {
            transform: [{ translateX: pan.x }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.notifCardTouch}
          onPress={() => {
            if (!isSwipingRef.current) onPress();
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.notifIconWrap, { backgroundColor: iconMeta.bg }]}>
            <Ionicons name={iconMeta.name} size={20} color={iconMeta.color} />
          </View>

          <View style={styles.notifBody}>
            <View style={styles.titleRow}>
              <Text style={styles.notifTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notifTime}>{item.date}</Text>
            </View>
            <Text style={styles.notifDesc}>{item.body}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={17} color="#94A3B8" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onNavigate,
  onSelectOrder,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const list = await getStoredNotifications();
      setNotifications(list);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDelete = async (id: string) => {
    const updated = await deleteStoredNotification(id);
    setNotifications(updated);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to clear all notifications?')) {
        clearAllStoredNotifications().then(() => setNotifications([]));
      }
      return;
    }

    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all your notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllStoredNotifications();
            setNotifications([]);
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notif: AppNotification) => {
    // If it's an order notification, extract order ID if present and navigate
    const match = notif.body.match(/#([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      if (onSelectOrder) onSelectOrder(match[1]);
      onNavigate('track');
      return;
    }

    if (notif.type === 'order') {
      onNavigate('orders');
    } else if (notif.type === 'subscription') {
      onNavigate('subscription');
    } else {
      onNavigate('home');
    }
  };

  const getNotifIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order':
        return { name: 'cart' as const, color: '#DC2626', bg: '#FEE2E2' };
      case 'driver':
        return { name: 'navigate' as const, color: '#0284C7', bg: '#E0F2FE' };
      case 'subscription':
        return { name: 'calendar' as const, color: '#7C3AED', bg: '#EDE9FE' };
      case 'rate':
        return { name: 'flame' as const, color: '#EA580C', bg: '#FFEDD5' };
      default:
        return { name: 'notifications' as const, color: '#DC2626', bg: '#FEE2E2' };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isDesktop && { maxWidth: 840, width: '100%', alignSelf: 'center', paddingVertical: 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Banner / Actions Bar */}
      <View style={styles.topBar}>
        <View style={styles.countBadgeWrap}>
          <View style={styles.bellCircle}>
            <Ionicons name="notifications" size={18} color="#DC2626" />
          </View>
          <View>
            <Text style={styles.topBarTitle}>Notification Center</Text>
            <Text style={styles.topBarSub}>
              {notifications.length} {notifications.length === 1 ? 'Alert' : 'Alerts'} Available
            </Text>
          </View>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={handleClearAll}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={15} color="#DC2626" />
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List with Left/Right Swipe to Clear */}
      {notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyCircle}>
            <Ionicons name="notifications-off-outline" size={44} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySub}>
            You are all caught up! Real-time alerts about your diesel bowser deliveries, meter readings, and status will appear here.
          </Text>
          <TouchableOpacity
            style={styles.orderDieselBtn}
            onPress={() => onNavigate('order')}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.orderDieselBtnText}>Order Diesel Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.swipeHintText}>👈 Swipe left or right to clear notification 👉</Text>
          {notifications.map((item) => {
            const iconMeta = getNotifIcon(item.type);
            return (
              <SwipeableNotificationItem
                key={item.id}
                item={item}
                onPress={() => handleNotificationPress(item)}
                onDelete={() => handleDelete(item.id)}
                iconMeta={iconMeta}
              />
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 95 : 85,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  clearAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  orderDieselBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  orderDieselBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeHintText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  swipeActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notifCardTouch: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  notifDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignSelf: 'center',
  },
});

import { NativeModules, Platform } from 'react-native';

export interface FloatingOrderPayload {
  id: string;
  name: string;
  status: string;
  etaMins: string | number;
  distanceKm: string | number;
  baseUrl: string;
}

const NativeFloatingOverlay =
  Platform.OS === 'android' ? NativeModules.FloatingOverlay : null;

export const floatingOverlayService = {
  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeFloatingOverlay?.hasPermission) {
      return false;
    }
    try {
      return await NativeFloatingOverlay.hasPermission();
    } catch {
      return false;
    }
  },

  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !NativeFloatingOverlay?.requestPermission) {
      return false;
    }
    try {
      return await NativeFloatingOverlay.requestPermission();
    } catch {
      return false;
    }
  },

  show(order: FloatingOrderPayload): void {
    if (Platform.OS !== 'android' || !NativeFloatingOverlay?.show) return;
    try {
      NativeFloatingOverlay.show(JSON.stringify(order));
    } catch {}
  },

  update(order: FloatingOrderPayload): void {
    if (Platform.OS !== 'android' || !NativeFloatingOverlay?.update) return;
    try {
      NativeFloatingOverlay.update(JSON.stringify(order));
    } catch {}
  },

  hide(): void {
    if (Platform.OS !== 'android' || !NativeFloatingOverlay?.hide) return;
    try {
      NativeFloatingOverlay.hide();
    } catch {}
  },
};

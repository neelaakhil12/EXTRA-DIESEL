import React from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Text,
  StatusBar,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 520;

  if (!isDesktop) {
    return <View style={styles.nativeContainer}>{children}</View>;
  }

  return (
    <View style={styles.desktopBackdrop}>
      {/* Hide desktop browser scrollbars & remove default browser input focus black outline and autofill styling */}
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
              * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
              input, textarea, select {
                outline: none !important;
                outline-width: 0 !important;
                box-shadow: none !important;
                -webkit-tap-highlight-color: transparent !important;
              }
              input:focus, textarea:focus, select:focus {
                outline: none !important;
                outline-width: 0 !important;
                box-shadow: none !important;
              }
              /* Completely override Chrome autofill background and font styling */
              input:-webkit-autofill,
              input:-webkit-autofill:hover, 
              input:-webkit-autofill:focus, 
              input:-webkit-autofill:active {
                -webkit-box-shadow: 0 0 0 1000px #F8FAFC inset !important;
                -webkit-text-fill-color: #0F172A !important;
                caret-color: #0F172A !important;
                background-color: #F8FAFC !important;
                transition: background-color 9999999s ease-in-out 0s !important;
              }
            `,
          }}
        />
      )}
      {/* Realistic Smartphone Chassis Frame */}
      <View style={styles.phoneFrame}>
        {/* Dynamic Island / Speaker Pill */}
        <View style={styles.dynamicIslandContainer}>
          <View style={styles.dynamicIsland}>
            <View style={styles.cameraLens} />
          </View>
        </View>

        {/* Screen Content Inside Mobile Bezel */}
        <View style={styles.phoneScreen}>
          {children}
        </View>

        {/* Home Indicator Bar */}
        <View style={styles.homeIndicatorContainer}>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  desktopBackdrop: {
    flex: 1,
    minHeight: '100%' as any,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  desktopHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  desktopLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopBrand: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  previewBadge: {
    backgroundColor: 'rgba(213, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  previewBadgeText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
  },
  desktopSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  phoneFrame: {
    width: 412,
    height: 850,
    maxHeight: '88vh' as any,
    backgroundColor: '#1E293B',
    borderRadius: 50,
    padding: 10,
    borderWidth: 4,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  dynamicIslandContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  dynamicIsland: {
    width: 90,
    height: 20,
    backgroundColor: '#000000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 40,
    overflow: 'hidden',
  },
  homeIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  homeIndicator: {
    width: 130,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 2,
  },
  desktopFooter: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 14,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/theme';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Global Web Styling: Fullscreen background, clean scrollbars, and modern UI focus styles */}
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                width: 100%;
                margin: 0;
                padding: 0;
                background-color: #F8FAFC;
                overflow-x: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              ::-webkit-scrollbar-track {
                background: #F1F5F9;
              }
              ::-webkit-scrollbar-thumb {
                background: #CBD5E1;
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: #94A3B8;
              }
              input, textarea, select, button {
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
              /* Clean autofill overrides */
              input:-webkit-autofill,
              input:-webkit-autofill:hover, 
              input:-webkit-autofill:focus, 
              input:-webkit-autofill:active {
                -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
                -webkit-text-fill-color: #0F172A !important;
                caret-color: #0F172A !important;
                transition: background-color 9999999s ease-in-out 0s !important;
              }
            `,
          }}
        />
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: '100%' as any,
    backgroundColor: COLORS.background,
  },
});

export const APP_CONFIG = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000',
  LIVE_API_BASE_URL: process.env.EXPO_PUBLIC_LIVE_API_BASE_URL || 'https://gtmining.xyz',
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '818952981825-0rcecfahu2vqunp0pjc6ufep70oknq35.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '818952981825-h4ftr3pot9hkc8tspbi6tct2cvpgb4uc.apps.googleusercontent.com',
  MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
};

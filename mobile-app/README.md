# Extra Diesel — Mobile App (React Native / Expo)

This is the dedicated mobile application codebase for **Extra Diesel**, developed with React Native, Expo, and TypeScript. It features the exact same brand theme, colors, screens, and assets as the web application.

---

## 🎨 Brand Theme & Colors

- **Primary Red:** `#D50000`
- **Deep Red:** `#B90000`
- **Secondary Yellow:** `#FFD600`
- **Amber:** `#FFB300`
- **Dark Text:** `#171717`
- **Light Background:** `#F7F8FA`
- **Soft Gray:** `#E9EDF2`
- **Green (Verified/Delivered):** `#10B981`

---

## 📱 Implemented Screens

1. **Splash Screen (`SplashScreen.tsx`):**
   - Brand logo, Legal Metrology certified badges, and "Get Started" action.
2. **Login Screen (`LoginScreen.tsx`):**
   - Indian (+91) phone input, 6-digit OTP verification, guest mode option.
3. **Home Dashboard (`HomeScreen.tsx`):**
   - Live daily diesel price ticker (₹94.50/L), doorstep delivery hero card, 2x2 services grid (Order Diesel, My Orders, Subscriptions, Track Bowser).
4. **Order Diesel Screen (`OrderDieselScreen.tsx`):**
   - Delivery site selector, quick liter presets (100L, 200L, 500L, 1000L), custom stepper, vehicle type (DG set, excavator, fleet), delivery slots, and dynamic price breakdown with GST.
5. **Live Tracking Screen (`TrackOrderScreen.tsx`):**
   - Real-time milestone tracker, route map preview, driver profile (Ramesh Kumar, Bowser TS 09 ED 7721), and direct phone/WhatsApp calling.
6. **My Orders Screen (`MyOrdersScreen.tsx`):**
   - Filter tabs (All, Pending, Delivered), order status badges, itemized cost details, digital GST invoice access, repeat order button.
7. **Subscription Screen (`SubscriptionScreen.tsx`):**
   - Scheduled recurring diesel delivery (weekly, bi-weekly, monthly), preferred day picker, active subscription manager.
8. **Profile & Account Center (`ProfileScreen.tsx`):**
   - B2B Corporate Credit line (₹5,00,000 limit), delivery sites, GSTIN management, 24/7 support hotline, session logout.

---

## 🚀 How to Run the Mobile App

Navigate into the `mobile-app` directory:

```bash
cd mobile-app
```

### 1. Start the Expo Development Server:
```bash
npm start
# or
npx expo start
```

### 2. Run on Your Phone:
- Download the **Expo Go** app from the Google Play Store or Apple App Store.
- Scan the QR code displayed in your terminal using the Expo Go app (on Android) or the Camera app (on iOS).

### 3. Run on Android Emulator or iOS Simulator:
```bash
npm run android   # For Android emulator
npm run ios       # For iOS simulator (macOS required)
```

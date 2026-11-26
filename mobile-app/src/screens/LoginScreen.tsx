import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  StatusBar,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

const API_BASE = APP_CONFIG.LIVE_API_BASE_URL || APP_CONFIG.API_BASE_URL || 'https://extradiesel.in';

interface UserData {
  name: string;
  email: string;
  phone: string;
  role?: string;
  vehicleNumber?: string;
  profileImage?: string;
  authProvider?: string;
}

interface LoginScreenProps {
  onLoginSuccess: (userData: UserData) => void;
  onSkip?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSkip }) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const insets = useSafeAreaInsets();
  const topSafeHeight = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 28) + 8
    : Math.max(insets.top, 20);

  // Screen state: 'login' or 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  // Role tab state: 'customer' | 'delivery'
  const [userRoleTab, setUserRoleTab] = useState<'customer' | 'delivery'>('customer');

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Virtual Keyboard tracking for Android / iOS modals
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates ? e.endCoordinates.height : 280);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Login inputs (Empty by default)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginPasswordFocused, setLoginPasswordFocused] = useState(false);

  // Autofill shield: delay making inputs editable until initial browser autofill pass finishes
  const [isFormReady, setIsFormReady] = useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsFormReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Configure Native Google Play Services Sign-In on mount
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      try {
        GoogleSignin.configure({
          webClientId: APP_CONFIG.GOOGLE_CLIENT_ID,
          offlineAccess: true,
          scopes: ['profile', 'email'],
        });
      } catch (e) {
        console.warn('GoogleSignin configure error:', e);
      }
    }
  }, []);

  // Dynamically load Google Identity Services (GIS) on mount to fetch real device Google accounts
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const scriptId = 'google-gsi-client';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          try {
            if ((window as any).google?.accounts?.id) {
              (window as any).google.accounts.id.initialize({
                client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
                callback: (res: any) => {
                  if (res?.credential) {
                    try {
                      const payload = JSON.parse(
                        decodeURIComponent(
                          atob(res.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
                            .split('')
                            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                            .join('')
                        )
                      );
                      if (payload?.email) {
                        handleSelectGoogleAccount({
                          name: payload.name || payload.email.split('@')[0],
                          email: payload.email,
                        });
                      }
                    } catch (e) {}
                  }
                },
                auto_select: false,
                cancel_on_tap_outside: true,
              });
            }
          } catch (e) {}
        };
        document.head.appendChild(script);
      }
    }
  }, []);

  // Google Auth Bridge Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isCheckingGoogleAuth, setIsCheckingGoogleAuth] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // Premium App Alert Dialog State (Replaces ugly dark browser-like native OS alerts)
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'error' | 'warning' | 'info' | 'success';
    primaryText?: string;
    onPrimary?: () => void;
    secondaryText?: string;
    onSecondary?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    primaryText: 'OK',
  });

  const showAppAlert = (
    title: string,
    message: string,
    options?: {
      type?: 'error' | 'warning' | 'info' | 'success';
      primaryText?: string;
      onPrimary?: () => void;
      secondaryText?: string;
      onSecondary?: () => void;
    }
  ) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type: options?.type || (title.toLowerCase().includes('success') ? 'success' : 'error'),
      primaryText: options?.primaryText || 'OK',
      onPrimary: options?.onPrimary,
      secondaryText: options?.secondaryText,
      onSecondary: options?.onSecondary,
    });
  };

  const hideAppAlert = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  // Signup inputs
  const [fullName, setFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupPasswordFocused, setSignupPasswordFocused] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 1. Handle Email/Password Login (Differentiates Delivery Partner and Customer)
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      showAppAlert('Invalid Email', 'Please enter a valid email address.', { type: 'warning' });
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      showAppAlert('Invalid Password', 'Password must be at least 6 characters.', { type: 'warning' });
      return;
    }

    try {
      setIsLoggingIn(true);
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          loginRole: userRoleTab,
        }),
      });

      const data = await res.json();
      setIsLoggingIn(false);

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        const isNotFound = data.error?.toLowerCase().includes('account not found');
        showAppAlert(
          isNotFound ? 'Account Not Found' : 'Login Failed',
          data.error || 'Invalid credentials. Please check your email and password.',
          {
            type: 'error',
            primaryText: isNotFound && userRoleTab === 'customer' ? 'Sign Up' : 'OK',
            onPrimary: isNotFound && userRoleTab === 'customer' ? () => setAuthMode('signup') : undefined,
          }
        );
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      showAppAlert('Connection Error', 'Unable to reach the authentication server. Please check your internet connection.', { type: 'warning' });
    }
  };

  // Forgot Password: Send OTP to user's registered email
  const handleSendForgotOtp = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      showAppAlert('Invalid Email', 'Please enter your registered email address.', { type: 'warning' });
      return;
    }
    try {
      setIsSendingForgotOtp(true);
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      setIsSendingForgotOtp(false);
      if (data.success) {
        setForgotOtpSent(true);
        showAppAlert('Code Sent', `A 6-digit password reset code has been sent to ${forgotEmail.trim()}.`, { type: 'success' });
      } else {
        showAppAlert('Reset Failed', data.error || 'No account registered with this email.', { type: 'error' });
      }
    } catch (e) {
      setIsSendingForgotOtp(false);
      showAppAlert('Connection Error', 'Unable to reach the server. Please check your internet connection.', { type: 'warning' });
    }
  };

  // Forgot Password: Submit OTP and update new password
  const handleResetPasswordSubmit = async () => {
    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      showAppAlert('Enter OTP', 'Please enter the 6-digit code sent to your email.', { type: 'warning' });
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      showAppAlert('Password Length', 'New password must be at least 6 characters.', { type: 'warning' });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      showAppAlert('Password Mismatch', 'Passwords do not match. Please re-enter.', { type: 'warning' });
      return;
    }

    try {
      setIsResettingPassword(true);
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      setIsResettingPassword(false);
      if (data.success) {
        setLoginEmail(forgotEmail.trim());
        setShowForgotModal(false);
        setForgotOtpSent(false);
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        showAppAlert('Success', 'Password reset successfully! You can now log in with your new password.', { type: 'success' });
      } else {
        showAppAlert('Verification Failed', data.error || 'Invalid or expired OTP.', { type: 'error' });
      }
    } catch (e) {
      setIsResettingPassword(false);
      showAppAlert('Connection Error', 'Unable to reach the server. Please check your internet connection.', { type: 'warning' });
    }
  };

  // 2. Open Official Google Native Account Chooser (Google Play Services)
  const handleGoogleSignIn = async () => {
    // 1. Web Platform handler (Google Identity Services GIS)
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        try {
          const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            prompt: 'select_account',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.access_token) {
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const userInfo = await res.json();
                  if (userInfo?.email) {
                    await handleSelectGoogleAccount({
                      name: userInfo.name || userInfo.email.split('@')[0],
                      email: userInfo.email,
                    });
                    return;
                  }
                } catch (err) {}
              }
            },
          });
          tokenClient.requestAccessToken();
          return;
        } catch (err) {}
      }

      setShowGoogleModal(true);
      setCustomGoogleEmail('');
      return;
    }

    // 2. Native Android / iOS: Official Google Play Services Account Chooser
    try {
      setIsCheckingGoogleAuth(true);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Always clear cached session so the Google Account Picker dialog displays with all emails every time
      try {
        await GoogleSignin.signOut();
      } catch (signOutErr) {
        // Ignore if no prior session was active
      }
      const response = await GoogleSignin.signIn();
      setIsCheckingGoogleAuth(false);

      if (response && response.type === 'success' && response.data?.user) {
        const { user } = response.data;
        if (user.email) {
          handleSelectGoogleAccount({
            name: user.name || user.email.split('@')[0],
            email: user.email,
          });
        }
      } else if ((response as any)?.user) {
        const user = (response as any).user;
        if (user.email) {
          handleSelectGoogleAccount({
            name: user.name || user.email.split('@')[0],
            email: user.email,
          });
        }
      }
    } catch (error: any) {
      setIsCheckingGoogleAuth(false);
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        // User dismissed the Google dialog
        return;
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        return;
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAppAlert('Play Services Unavailable', 'Google Play Services is not available or outdated.', { type: 'warning' });
      } else {
        console.warn('Native Google Sign-In error:', error);
        setShowGoogleModal(true);
        setCustomGoogleEmail('');
      }
    }
  };

  // 3. Handle Google Account Selection - Only permits login if account exists on backend
  const handleSelectGoogleAccount = async (account: { name: string; email: string }) => {
    const cleanEmail = account.email.toLowerCase().trim();
    const cleanName = (account.name && account.name.trim()) || cleanEmail.split('@')[0];

    try {
      setIsCheckingGoogleAuth(true);
      const res = await fetch(`${API_BASE}/api/auth/google-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: cleanName }),
      });
      const data = await res.json();
      setIsCheckingGoogleAuth(false);
      setShowGoogleModal(false);

      if (data?.success && data?.user) {
        if (userRoleTab === 'delivery') {
          if (data.user.role !== 'delivery') {
            showAppAlert(
              'Access Denied',
              'This Google account is not registered as an authorized Delivery Partner. Please contact Extra Diesel admin for driver credentials.',
              { type: 'error' }
            );
            return;
          }
        }
        if (data.user.phone) {
          AsyncStorage.setItem('ed_user_phone', data.user.phone).catch(() => {});
        }
        onLoginSuccess(data.user);
      } else {
        showAppAlert(
          'Account Not Found',
          data?.error || 'No Extra Diesel account found with this Google ID. Please click Sign Up to create your Extra Diesel account.',
          {
            type: 'error',
            primaryText: userRoleTab === 'customer' ? 'Sign Up' : 'OK',
            onPrimary: userRoleTab === 'customer' ? () => setAuthMode('signup') : undefined,
          }
        );
      }
    } catch (err) {
      setIsCheckingGoogleAuth(false);
      setShowGoogleModal(false);
      showAppAlert('Sign-In Error', 'Unable to verify account with server. Please check your internet connection.', { type: 'warning' });
    }
  };

  // 3. Handle Send OTP to Email via SMTP Backend
  const handleSendEmailOtp = async () => {
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      showAppAlert('Invalid Email', 'Please enter a valid email address to receive OTP.', { type: 'warning' });
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim() }),
      });
      const data = await res.json();
      setIsSendingOtp(false);

      if (data.success) {
        setOtpSent(true);
        setIsEmailVerified(false);
        setEmailOtp('');
      } else {
        showAppAlert('Unable to Send OTP', data.error || 'Could not send verification email. Please check your email address.', { type: 'error' });
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      showAppAlert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection.',
        { type: 'warning' }
      );
    }
  };

  // 4. Handle Verify Inline OTP via Backend
  const handleVerifyInlineOtp = async () => {
    if (!emailOtp || emailOtp.trim().length !== 6) {
      showAppAlert('Enter OTP', 'Please enter the 6-digit code sent to your email.', { type: 'warning' });
      return;
    }

    try {
      setIsVerifyingOtp(true);
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim(), otp: emailOtp.trim() }),
      });
      const data = await res.json();
      setIsVerifyingOtp(false);

      if (data.success && data.verified) {
        setIsEmailVerified(true);
      } else {
        showAppAlert('Incorrect OTP', data.error || 'Please check the 6-digit code in your email and try again.', { type: 'error' });
      }
    } catch (err) {
      setIsVerifyingOtp(false);
      showAppAlert('Verification Failed', 'Unable to verify OTP with server. Please check your internet connection.', { type: 'warning' });
    }
  };

  // 5. Handle Final Create Account Submit
  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      showAppAlert('Name Required', 'Please enter your full name or company name.', { type: 'warning' });
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      showAppAlert('Email Required', 'Please enter a valid email address.', { type: 'warning' });
      return;
    }
    if (!otpSent) {
      showAppAlert('Verify Email', 'Please click "Send OTP" to verify your email address first.', { type: 'warning' });
      return;
    }
    if (!isEmailVerified) {
      showAppAlert(
        'Email Verification Required',
        'Please enter the 6-digit OTP sent to your email and click "Verify" before proceeding.',
        { type: 'warning' }
      );
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      showAppAlert('Password Required', 'Password must be at least 6 characters.', { type: 'warning' });
      return;
    }
    if (signupPassword !== confirmPassword) {
      showAppAlert('Password Mismatch', 'Passwords do not match. Please re-enter.', { type: 'warning' });
      return;
    }

    const cleanPhone = signupPhone.trim()
      ? signupPhone.trim().startsWith('+91')
        ? signupPhone.trim()
        : `+91 ${signupPhone.trim()}`
      : '';

    const userData = {
      name: fullName.trim(),
      email: signupEmail.trim().toLowerCase(),
      phone: cleanPhone,
    };

    if (cleanPhone) {
      AsyncStorage.setItem('ed_user_phone', cleanPhone).catch(() => {});
    }

    try {
      // Register in backend database and wait for persistent save
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        onLoginSuccess(userData);
      }
    } catch (e) {
      onLoginSuccess(userData);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Safe Area Header to prevent scrolled content from overlapping the notch */}
      <View style={[styles.topSafeAreaBar, { height: topSafeHeight }]} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && { maxWidth: 460, width: '100%', alignSelf: 'center', paddingVertical: 40 },
        ]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        keyboardDismissMode="on-drag"
      >
        {/* App Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Top Segmented Role Tabs: Customer Login vs Delivery Partner Login */}
        <View style={styles.roleTabsContainer}>
          <TouchableOpacity
            style={[styles.roleTab, userRoleTab === 'customer' && styles.roleTabActive]}
            onPress={() => {
              setUserRoleTab('customer');
              setAuthMode('login');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person"
              size={15}
              color={userRoleTab === 'customer' ? COLORS.white : '#64748B'}
            />
            <Text style={[styles.roleTabText, userRoleTab === 'customer' && styles.roleTabTextActive]}>
              Customer Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, userRoleTab === 'delivery' && styles.roleTabActive]}
            onPress={() => {
              setUserRoleTab('delivery');
              setAuthMode('login');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="car"
              size={15}
              color={userRoleTab === 'delivery' ? COLORS.white : '#64748B'}
            />
            <Text style={[styles.roleTabText, userRoleTab === 'delivery' && styles.roleTabTextActive]}>
              Delivery Partner
            </Text>
          </TouchableOpacity>
        </View>

        {userRoleTab === 'delivery' ? (
          /* =========================================================================
             DELIVERY PARTNER LOGIN (Bowser Captains - Registered by Admin Only)
             ========================================================================= */
          <View style={styles.card}>
            <View style={styles.deliveryCardHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.cardHeading}>Delivery Partner Sign In</Text>
                <Text style={styles.cardSub} numberOfLines={2}>Authorized Bowser Drivers • Enter admin credentials</Text>
              </View>
              <View style={[styles.captainBadgePill, { flexShrink: 0 }]}>
                <Ionicons name="shield-checkmark" size={13} color="#D97706" />
                <Text style={styles.captainBadgePillText}>Captain</Text>
              </View>
            </View>

            {/* Admin Registered Notice Banner */}
            <View style={styles.deliveryShieldBox}>
              <Ionicons name="information-circle" size={18} color="#B45309" />
              <Text style={styles.deliveryShieldText}>
                Only delivery partners registered by Extra Diesel Admin can log in. If you don't have credentials, please contact the dispatch admin.
              </Text>
            </View>

            {/* Email Input */}
            <Text style={styles.inputLabel}>Delivery Partner Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="captain@extradiesel.in"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="none"
                importantForAutofill="no"
                readOnly={!isFormReady}
                value={loginEmail}
                onChangeText={setLoginEmail}
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter captain password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={(loginPasswordFocused || loginPassword.length > 0) && !showLoginPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="none"
                importantForAutofill="no"
                readOnly={!isFormReady}
                onFocus={() => setLoginPasswordFocused(true)}
                value={loginPassword}
                onChangeText={(val) => {
                  setLoginPasswordFocused(true);
                  setLoginPassword(val);
                }}
              />
              <TouchableOpacity
                onPress={() => setShowLoginPassword(!showLoginPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => {
                setForgotEmail(loginEmail.trim());
                setForgotOtpSent(false);
                setForgotOtp('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setShowForgotModal(true);
              }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Delivery Partner Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#1E293B', marginTop: 8 }]}
              onPress={handleLogin}
              disabled={isLoggingIn}
              activeOpacity={0.85}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="car" size={18} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Sign In as Delivery Partner</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In for Delivery Partner */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isCheckingGoogleAuth}
              activeOpacity={0.85}
            >
              {isCheckingGoogleAuth ? (
                <ActivityIndicator size="small" color="#EA4335" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : authMode === 'login' ? (
          /* =========================================================================
             CUSTOMER SIGN IN PAGE (Email + Password -> Login Button -> Google -> Sign Up)
             ========================================================================= */
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Sign In to Your Account</Text>
            <Text style={styles.cardSub}>Enter your registered email and password</Text>

            {/* Email Input */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="name@company.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="none"
                importantForAutofill="no"
                readOnly={!isFormReady}
                value={loginEmail}
                onChangeText={setLoginEmail}
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={(loginPasswordFocused || loginPassword.length > 0) && !showLoginPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="none"
                importantForAutofill="no"
                readOnly={!isFormReady}
                onFocus={() => setLoginPasswordFocused(true)}
                value={loginPassword}
                onChangeText={(val) => {
                  setLoginPasswordFocused(true);
                  setLoginPassword(val);
                }}
              />
              <TouchableOpacity
                onPress={() => setShowLoginPassword(!showLoginPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => {
                setForgotEmail(loginEmail.trim());
                setForgotOtpSent(false);
                setForgotOtp('');
                setForgotNewPassword('');
                setForgotConfirmPassword('');
                setShowForgotModal(true);
              }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* 1. Login / Sign In Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={isLoggingIn}
              activeOpacity={0.85}
            >
              {isLoggingIn ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 2. Sign In With Google Option */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isCheckingGoogleAuth}
              activeOpacity={0.85}
            >
              {isCheckingGoogleAuth ? (
                <ActivityIndicator size="small" color="#EA4335" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 3. Sign Up Option Under Google */}
            <View style={styles.signupPromptRow}>
              <Text style={styles.signupPromptText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => setAuthMode('signup')}
                activeOpacity={0.7}
              >
                <Text style={styles.signupLinkText}> Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* =========================================================================
             CREATE ACCOUNT (Full Name, Phone, Email + Send OTP, OTP Box + Verify, Passwords, Create Account)
             ========================================================================= */
          <View style={styles.card}>
            {/* Back to Login header */}
            <TouchableOpacity
              onPress={() => setAuthMode('login')}
              style={styles.topBackRow}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={styles.topBackText}>Back to Sign In</Text>
            </TouchableOpacity>

            <Text style={styles.cardHeading}>Create New Account</Text>
            <Text style={styles.cardSub}>Register to order diesel directly to your site</Text>

            {/* 1. Full Name */}
            <Text style={styles.inputLabel}>Full Name / Company Name</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Akhil Kumar"
                placeholderTextColor="#94A3B8"
                autoComplete="off"
                textContentType="none"
                readOnly={!isFormReady}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* 2. Mobile Number */}
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.inputWrap}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={[styles.textInput, { paddingLeft: 8 }]}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                autoComplete="off"
                textContentType="none"
                readOnly={!isFormReady}
                value={signupPhone}
                onChangeText={setSignupPhone}
              />
            </View>

            {/* 3. Email Address WITH "Send OTP" Button */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputWrap, styles.inputWrapRow]}>
              <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. akhil@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="none"
                readOnly={!isFormReady}
                value={signupEmail}
                onChangeText={(val) => {
                  setSignupEmail(val);
                  setIsEmailVerified(false);
                }}
              />
              <TouchableOpacity
                style={[
                  styles.sendOtpBtn,
                  isEmailVerified && styles.verifiedBadgeBtn,
                ]}
                onPress={handleSendEmailOtp}
                disabled={isSendingOtp}
                activeOpacity={0.8}
              >
                <Text style={[styles.sendOtpBtnText, isEmailVerified && styles.verifiedBadgeBtnText]}>
                  {isEmailVerified ? 'Verified ✓' : isSendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 4. OTP Box WITH "Verify" Button (Directly below Email) */}
            {otpSent && (
              <View style={styles.otpCardBox}>
                <View style={styles.otpHeaderRow}>
                  <Text style={styles.otpCardLabel}>Enter 6-Digit Email OTP</Text>
                  {isEmailVerified ? (
                    <Text style={styles.otpVerifiedStatusText}>Verified ✓</Text>
                  ) : (
                    <Text style={styles.otpHintText}>Check your inbox / spam</Text>
                  )}
                </View>
                <View style={[styles.inputWrap, styles.inputWrapRow, { marginBottom: 0, backgroundColor: COLORS.white }]}>
                  <Ionicons name="key-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { fontWeight: '700', letterSpacing: 3 }]}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={emailOtp}
                    onChangeText={setEmailOtp}
                    editable={!isEmailVerified}
                  />
                  <TouchableOpacity
                    style={[
                      styles.verifyInlineBtn,
                      isEmailVerified && styles.verifiedBadgeBtn,
                    ]}
                    onPress={handleVerifyInlineOtp}
                    disabled={isEmailVerified || isVerifyingOtp}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.verifyInlineBtnText, isEmailVerified && styles.verifiedBadgeBtnText]}>
                      {isEmailVerified ? 'Verified ✓' : isVerifyingOtp ? 'Verifying...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 5. Create Password (Directly below OTP) */}
            <Text style={[styles.inputLabel, { marginTop: 4 }]}>Create Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="At least 6 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry={(signupPasswordFocused || signupPassword.length > 0) && !showSignupPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="none"
                importantForAutofill="no"
                readOnly={!isFormReady}
                onFocus={() => setSignupPasswordFocused(true)}
                value={signupPassword}
                onChangeText={(val) => {
                  setSignupPasswordFocused(true);
                  setSignupPassword(val);
                }}
              />
              <TouchableOpacity
                onPress={() => setShowSignupPassword(!showSignupPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showSignupPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* 6. Confirm Password */}
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Re-enter password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={(signupPasswordFocused || confirmPassword.length > 0) && !showSignupPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="none"
                importantForAutofill="no"
                readOnly={!isFormReady}
                onFocus={() => setSignupPasswordFocused(true)}
                value={confirmPassword}
                onChangeText={(val) => {
                  setSignupPasswordFocused(true);
                  setConfirmPassword(val);
                }}
              />
            </View>

            {/* 7. Create Account Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateAccount}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            </TouchableOpacity>

            {/* Already have account */}
            <View style={styles.signupPromptRow}>
              <Text style={styles.signupPromptText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => setAuthMode('login')} activeOpacity={0.7}>
                <Text style={styles.signupLinkText}> Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Legal Metrology Certified Bowser Fuel Delivery</Text>
          <Text style={styles.footerSub}>Privacy Policy • Terms of Service</Text>
        </View>
      </ScrollView>

      {/* =========================================================================
         NATIVE IN-APP GOOGLE SIGN-IN BRIDGE (NO BROWSER REDIRECT)
         ========================================================================= */}
      <Modal
        visible={showGoogleModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isCheckingGoogleAuth) {
            setShowGoogleModal(false);
          }
        }}
      >
        <View style={styles.googleModalBackdrop}>
          <TouchableOpacity
            style={styles.googleModalDismissArea}
            activeOpacity={1}
            onPress={() => {
              if (!isCheckingGoogleAuth) {
                setShowGoogleModal(false);
              }
            }}
          />

          <View style={styles.googleModalCard}>
            {/* Top Sheet Drag Indicator */}
            <View style={styles.googleSheetHandle} />

            {/* Header: Google Logo + Title */}
            <View style={styles.googleHeaderRow}>
              <View style={styles.googleGLogoWrap}>
                <Ionicons name="logo-google" size={22} color="#EA4335" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.googleModalTitle}>Sign in with Google</Text>
                <Text style={styles.googleModalSub}>Enter your Google account email to continue</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isCheckingGoogleAuth && setShowGoogleModal(false)}
                style={styles.googleCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.googleDivider} />

            <View style={{ paddingVertical: 12 }}>
              <Text style={styles.inputLabel}>Google Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@gmail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={customGoogleEmail}
                  onChangeText={setCustomGoogleEmail}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 14 }]}
                onPress={() => {
                  if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
                    Alert.alert('Invalid Email', 'Please enter a valid Google email address.');
                    return;
                  }
                  const name = customGoogleEmail.split('@')[0];
                  handleSelectGoogleAccount({ name, email: customGoogleEmail.trim() });
                }}
                disabled={isCheckingGoogleAuth}
                activeOpacity={0.85}
              >
                {isCheckingGoogleAuth ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Privacy Disclaimer */}
            <View style={styles.googleFooterDisclaimer}>
              <Text style={styles.googleDisclaimerText}>
                By signing in, Google credentials verify your registered account with Extra Diesel.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowForgotModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[
              styles.forgotModalScrollOverlay,
              keyboardHeight > 0 && {
                paddingBottom: keyboardHeight + 60,
                justifyContent: 'flex-start',
                paddingTop: 60,
              }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={[styles.forgotModalCard, isDesktop && { maxWidth: 440 }]}>
              <View style={styles.forgotModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="key-outline" size={22} color={COLORS.primary} />
                  <Text style={styles.forgotModalTitle}>Reset Password</Text>
                </View>
                <TouchableOpacity onPress={() => setShowForgotModal(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.forgotModalSub}>
                Enter your registered Extra Diesel email address to receive a 6-digit password reset verification code.
              </Text>

              {/* Email Field with Send OTP Button */}
              <Text style={styles.inputLabel}>Registered Email</Text>
              <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                <Ionicons name="mail-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="registered@email.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                />
                <TouchableOpacity
                  style={styles.forgotSendOtpBtn}
                  onPress={handleSendForgotOtp}
                  disabled={isSendingForgotOtp}
                >
                  {isSendingForgotOtp ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.forgotSendOtpText}>{forgotOtpSent ? 'Resend' : 'Send OTP'}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {forgotOtpSent && (
                <>
                  {/* 6-Digit OTP Input */}
                  <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                  <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter 6-digit OTP from email"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                    />
                  </View>

                  {/* New Password */}
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={[styles.inputWrap, { marginBottom: 12 }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showForgotNewPassword}
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showForgotNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={COLORS.muted}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm New Password */}
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={[styles.inputWrap, { marginBottom: 16 }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.muted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showForgotNewPassword}
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                    />
                  </View>

                  {/* Submit Reset Button */}
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleResetPasswordSubmit}
                    disabled={isResettingPassword}
                    activeOpacity={0.85}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Update Password & Sign In</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Premium In-App Alert Modal (Replaces browser / native OS black box alert) */}
      <Modal
        visible={customAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideAppAlert}
      >
        <View style={styles.appAlertOverlay}>
          <View style={[styles.appAlertCard, isDesktop && { maxWidth: 400 }]}>
            {/* Top Alert Icon with Type Styling */}
            <View
              style={[
                styles.appAlertIconWrap,
                customAlert.type === 'error' && { backgroundColor: '#FEE2E2' },
                customAlert.type === 'warning' && { backgroundColor: '#FEF3C7' },
                customAlert.type === 'success' && { backgroundColor: '#DCFCE7' },
                customAlert.type === 'info' && { backgroundColor: '#DBEAFE' },
              ]}
            >
              <Ionicons
                name={
                  customAlert.type === 'success'
                    ? 'checkmark-circle'
                    : customAlert.type === 'warning'
                    ? 'warning'
                    : customAlert.type === 'info'
                    ? 'information-circle'
                    : 'alert-circle'
                }
                size={34}
                color={
                  customAlert.type === 'success'
                    ? '#16A34A'
                    : customAlert.type === 'warning'
                    ? '#D97706'
                    : customAlert.type === 'info'
                    ? '#2563EB'
                    : '#DC2626'
                }
              />
            </View>

            {/* Alert Title */}
            <Text style={styles.appAlertTitle}>{customAlert.title}</Text>

            {/* Alert Message */}
            <Text style={styles.appAlertMessage}>{customAlert.message}</Text>

            {/* Action Buttons Row */}
            <View style={styles.appAlertActionsRow}>
              {customAlert.secondaryText && (
                <TouchableOpacity
                  style={styles.appAlertSecondaryBtn}
                  onPress={() => {
                    hideAppAlert();
                    customAlert.onSecondary?.();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.appAlertSecondaryText}>{customAlert.secondaryText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.appAlertPrimaryBtn,
                  customAlert.type === 'success' && { backgroundColor: '#16A34A' },
                  customAlert.type === 'warning' && { backgroundColor: '#D97706' },
                ]}
                onPress={() => {
                  hideAppAlert();
                  customAlert.onPrimary?.();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.appAlertPrimaryText}>{customAlert.primaryText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSafeAreaBar: {
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 360 : 160,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLogo: {
    width: 220,
    height: 75,
  },
  // Segmented Role Tabs
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  roleTabTextActive: {
    color: COLORS.white,
  },
  deliveryCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  captainBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  captainBadgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  deliveryShieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  deliveryShieldText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
  },
  // Forgot Password Modal
  forgotModalScrollOverlay: {
    flexGrow: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 36,
  },
  forgotModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 22,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  forgotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  forgotModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  forgotModalSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  forgotSendOtpBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
  },
  forgotSendOtpText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 11,
    paddingHorizontal: 10,
  },
  inputWrapRow: {
    paddingRight: 6,
  },
  inputIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.dark,
    outlineStyle: 'none' as any,
    outlineWidth: 0 as any,
  },
  phonePrefix: {
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    marginRight: 4,
  },
  phonePrefixText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.dark,
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 11.5,
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Send OTP Button
  sendOtpBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
  },
  sendOtpBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  // OTP Section Box
  otpCardBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 11,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otpCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  otpVerifiedStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  otpHintText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.muted,
  },
  verifyInlineBtn: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  verifyInlineBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedBadgeBtn: {
    backgroundColor: '#10B981',
  },
  verifiedBadgeBtnText: {
    color: COLORS.white,
  },
  // Primary Button
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  // Google Button
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 8,
  },
  googleButtonText: {
    color: COLORS.dark,
    fontSize: 13,
    fontWeight: '700',
  },
  // Sign up link
  signupPromptRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  signupPromptText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  signupLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  topBackText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary,
  },
  skipButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: 14,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  footerSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Native Google Auth Bridge Styles
  googleModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  googleModalDismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  googleModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  googleSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  googleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  googleGLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  googleModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  googleCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  googleDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  googleAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  googleAccountInfo: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  googleAccountEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  googleAddAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  googleAddIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  customEmailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  customEmailLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  customEmailInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    height: 40,
  },
  customEmailInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  customEmailActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  customEmailCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  customEmailCancelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  customEmailConfirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  customEmailConfirmText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  googleFooterDisclaimer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  googleDisclaimerText: {
    fontSize: 10.5,
    color: '#94A3B8',
    lineHeight: 14,
    textAlign: 'center',
  },
  // In-App Alert Dialog Styles
  appAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  appAlertCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
    elevation: 10,
  },
  appAlertIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appAlertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  appAlertMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  appAlertActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  appAlertSecondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAlertSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  appAlertPrimaryBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px -1px rgba(213, 0, 0, 0.25)',
    elevation: 3,
  },
  appAlertPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

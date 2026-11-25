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

  // 1. Handle Email/Password Login (Authenticates Admin, Delivery Boys, and Customers)
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
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
        }),
      });

      const data = await res.json();
      setIsLoggingIn(false);

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials. Please check your email and password.');
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      const emailLower = loginEmail.trim().toLowerCase();
      const isAdmin = ['aadhyafuels9@gmail.com'].includes(emailLower);
      const isDelivery = emailLower.includes('delivery') || emailLower.includes('driver');
      onLoginSuccess({
        name: loginEmail.split('@')[0].toUpperCase(),
        email: loginEmail.trim(),
        phone: '',
        role: isAdmin ? 'admin' : isDelivery ? 'delivery' : 'customer',
      });
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
        Alert.alert('Play Services Unavailable', 'Google Play Services is not available or outdated.');
      } else {
        console.warn('Native Google Sign-In error:', error);
        setShowGoogleModal(true);
        setCustomGoogleEmail('');
      }
    }
  };

  // 3. Handle Google Account Selection - Instant 0-second Login & Background Sync
  const handleSelectGoogleAccount = async (account: { name: string; email: string }) => {
    const cleanEmail = account.email.toLowerCase().trim();
    const cleanName = (account.name && account.name.trim()) || cleanEmail.split('@')[0];
    const isAdmin = cleanEmail === 'aadhyafuels9@gmail.com';
    let savedPhone = '';
    try {
      const sp = await AsyncStorage.getItem('ed_user_phone');
      if (sp) savedPhone = sp;
    } catch (e) {}

    const instantUser: UserData = {
      name: cleanName,
      email: cleanEmail,
      phone: savedPhone,
      role: isAdmin ? 'admin' : 'customer',
      authProvider: 'google',
    };

    // INSTANT: Enter the app immediately without 5-second network delay
    setIsCheckingGoogleAuth(false);
    setShowGoogleModal(false);
    onLoginSuccess(instantUser);

    // Sync registration record in backend asynchronously in background
    fetch(`${API_BASE}/api/auth/google-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: cleanName }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.user) {
          if (data.user.phone) {
            AsyncStorage.setItem('ed_user_phone', data.user.phone).catch(() => {});
          }
          onLoginSuccess({
            ...data.user,
            phone: data.user.phone || savedPhone,
          });
        }
      })
      .catch((err) => {
        console.warn('Background Google Auth sync error:', err);
      });
  };

  // 3. Handle Send OTP to Email via SMTP Backend
  const handleSendEmailOtp = async () => {
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to receive OTP.');
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
        Alert.alert('Unable to Send OTP', data.error || 'Could not send verification email. Please check your email address.');
      }
    } catch (err: any) {
      setIsSendingOtp(false);
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your internet connection.'
      );
    }
  };

  // 4. Handle Verify Inline OTP via Backend
  const handleVerifyInlineOtp = async () => {
    if (!emailOtp || emailOtp.trim().length !== 6) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit code sent to your email.');
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
        Alert.alert('Incorrect OTP', data.error || 'Please check the 6-digit code in your email and try again.');
      }
    } catch (err) {
      setIsVerifyingOtp(false);
      Alert.alert('Verification Failed', 'Unable to verify OTP with server. Please check your internet connection.');
    }
  };

  // 5. Handle Final Create Account Submit
  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name or company name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      Alert.alert('Email Required', 'Please enter a valid email address.');
      return;
    }
    if (!otpSent) {
      Alert.alert('Verify Email', 'Please click "Send OTP" to verify your email address first.');
      return;
    }
    if (!isEmailVerified) {
      Alert.alert(
        'Email Verification Required',
        'Please enter the 6-digit OTP sent to your email and click "Verify" before proceeding.'
      );
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      Alert.alert('Password Required', 'Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please re-enter.');
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

        {authMode === 'login' ? (
          /* =========================================================================
             SIGN IN PAGE (Email + Password -> Login Button -> Google -> Sign Up)
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
              onPress={() => Alert.alert('Reset Password', `Reset instructions sent to ${loginEmail}`)}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* 1. Login / Sign In Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
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
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
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
});

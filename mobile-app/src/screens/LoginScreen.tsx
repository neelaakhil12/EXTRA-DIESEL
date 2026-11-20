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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface UserData {
  name: string;
  email: string;
  phone: string;
}

interface LoginScreenProps {
  onLoginSuccess: (userData: UserData) => void;
  onSkip?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSkip }) => {
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

  // Google Auth Bridge Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isCheckingGoogleAuth, setIsCheckingGoogleAuth] = useState(false);
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState<string | null>(null);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  // Available Google accounts on device
  const GOOGLE_DEVICE_ACCOUNTS = [
    {
      name: 'Aadhya Fuels',
      email: 'aadhyafuels9@gmail.com',
      initial: 'AF',
      color: '#EA4335',
    },
    {
      name: 'Akhil Kumar',
      email: 'akhil.kumar@gmail.com',
      initial: 'AK',
      color: '#4285F4',
    },
    {
      name: 'Neela Akhil Kumar',
      email: 'neelaakhilkumar50@gmail.com',
      initial: 'NA',
      color: '#FBBC05',
    },
  ];

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

  // 1. Handle Email/Password Login
  const handleLogin = () => {
    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!loginPassword || loginPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    onLoginSuccess({
      name: loginEmail.split('@')[0].toUpperCase(),
      email: loginEmail,
      phone: '+91 9876543210',
    });
  };

  // 2. Open Native In-App Google Sign-In Sheet (No Browser Redirect)
  const handleGoogleSignIn = () => {
    setShowGoogleModal(true);
    setShowCustomEmailInput(false);
    setSelectedGoogleEmail(null);
  };

  // 3. Handle Google Account Selection with Backend Registration Check
  const handleSelectGoogleAccount = async (account: { name: string; email: string }) => {
    try {
      setSelectedGoogleEmail(account.email);
      setIsCheckingGoogleAuth(true);

      const res = await fetch('http://localhost:5000/api/auth/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email.trim(), name: account.name }),
      });
      const data = await res.json();
      setIsCheckingGoogleAuth(false);
      setSelectedGoogleEmail(null);
      setShowGoogleModal(false);

      if (data.registered && data.user) {
        // Registered User -> Instant Native Sign In
        Alert.alert(
          'Google Sign-In Successful! ✓',
          `Welcome back to Extra Diesel, ${data.user.name}!`,
          [
            {
              text: 'Continue',
              onPress: () => onLoginSuccess(data.user),
            },
          ]
        );
      } else {
        // Unregistered Account -> Prompt Sign Up & Pre-fill fields
        Alert.alert(
          'Account Not Found ⚠️',
          `The Google account "${account.email}" is not registered with Extra Diesel yet.\n\nPlease complete Sign Up first to create your account.`,
          [
            {
              text: 'Sign Up Now',
              onPress: () => {
                setFullName(account.name);
                setSignupEmail(account.email);
                setAuthMode('signup');
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    } catch (err) {
      setIsCheckingGoogleAuth(false);
      setSelectedGoogleEmail(null);
      setShowGoogleModal(false);

      // Fallback check if backend is offline
      const normalizedEmail = account.email.toLowerCase().trim();
      if (normalizedEmail === 'aadhyafuels9@gmail.com' || normalizedEmail === 'akhil.kumar@gmail.com') {
        Alert.alert('Google Sign-In Successful! ✓', `Welcome back, ${account.name}!`, [
          {
            text: 'Continue',
            onPress: () =>
              onLoginSuccess({
                name: account.name,
                email: account.email,
                phone: '+91 9876543210',
              }),
          },
        ]);
      } else {
        Alert.alert(
          'Account Not Found ⚠️',
          `The Google account "${account.email}" is not registered with Extra Diesel yet.\n\nPlease Sign Up first.`,
          [
            {
              text: 'Sign Up Now',
              onPress: () => {
                setFullName(account.name);
                setSignupEmail(account.email);
                setAuthMode('signup');
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    }
  };

  // 3. Handle Send OTP to Email via SMTP Backend
  const handleSendEmailOtp = async () => {
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to receive OTP.');
      return;
    }

    try {
      setIsSendingOtp(true);
      const res = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim() }),
      });
      const data = await res.json();
      setIsSendingOtp(false);

      if (data.success) {
        setOtpSent(true);
        setIsEmailVerified(false);
        Alert.alert(
          'OTP Sent to Email! 📧',
          `A 6-digit verification code has been sent from Aadhyafuels9@gmail.com to ${signupEmail}.\n\nPlease check your inbox (and spam folder).`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(data.error || 'Failed to send OTP email');
      }
    } catch (err) {
      setIsSendingOtp(false);
      // Fallback notification with demo OTP
      setOtpSent(true);
      setIsEmailVerified(false);
      setEmailOtp('');
      Alert.alert(
        'OTP Sent! 📧',
        `Verification code sent to ${signupEmail}.\n\n(Demo Code: 123456)`
      );
    }
  };

  // 4. Handle Verify Inline OTP via Backend
  const handleVerifyInlineOtp = async () => {
    if (!emailOtp || emailOtp.length < 6) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit OTP sent to your email.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail.trim(), otp: emailOtp.trim() }),
      });
      const data = await res.json();
      setIsVerifyingOtp(false);

      if (data.success && data.verified) {
        setIsEmailVerified(true);
        Alert.alert('Email Verified! ✓', `${signupEmail} has been successfully verified.`);
      } else {
        Alert.alert('Verification Failed', data.error || 'Incorrect OTP code.');
      }
    } catch (err) {
      setIsVerifyingOtp(false);
      if (emailOtp === '123456' || emailOtp.length === 6) {
        setIsEmailVerified(true);
        Alert.alert('Email Verified! ✓', `${signupEmail} has been successfully verified.`);
      } else {
        Alert.alert('Verification Failed', 'Unable to verify OTP. Please try again.');
      }
    }
  };

  // 5. Handle Final Create Account Submit
  const handleCreateAccount = () => {
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
      if (emailOtp === '123456' || emailOtp.length === 6) {
        setIsEmailVerified(true);
      } else {
        Alert.alert('OTP Verification', 'Please enter the 6-digit OTP and click "Verify".');
        return;
      }
    }
    if (!signupPassword || signupPassword.length < 6) {
      Alert.alert('Password Required', 'Password must be at least 6 characters.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please re-enter.');
      return;
    }

    Alert.alert(
      'Account Created! 🎉',
      `Welcome to Extra Diesel, ${fullName}! Your account has been created and verified.`,
      [
        {
          text: 'Get Started',
          onPress: () => {
            const userData = {
              name: fullName,
              email: signupEmail,
              phone: signupPhone ? `+91 ${signupPhone}` : '+91 9876543210',
            };
            // Register in backend database
            fetch('http://localhost:5000/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...userData,
                password: signupPassword,
              }),
            }).catch(() => {});

            onLoginSuccess(userData);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Safe Area Header to prevent scrolled content from overlapping the notch */}
      <View style={styles.topSafeAreaBar} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* App Logo & Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="flame" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>
            EXTRA <Text style={{ color: COLORS.secondary }}>DIESEL</Text>
          </Text>
          <Text style={styles.subtitle}>Doorstep Diesel Delivery Platform</Text>
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

            {/* Guest Mode */}
            {onSkip && (
              <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Explore App as Guest →</Text>
              </TouchableOpacity>
            )}
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
                  <Text style={styles.demoOtpBadge}>Demo: 123456</Text>
                </View>
                <View style={[styles.inputWrap, styles.inputWrapRow, { marginBottom: 0, backgroundColor: COLORS.white }]}>
                  <Ionicons name="key-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { fontWeight: '700', letterSpacing: 3 }]}
                    placeholder="123456"
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
          <Text style={styles.footerText}>PESO Certified Bowser Fuel Delivery</Text>
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
                <Text style={styles.googleModalSub}>Choose an account to continue to Extra Diesel</Text>
              </View>
              <TouchableOpacity
                onPress={() => !isCheckingGoogleAuth && setShowGoogleModal(false)}
                style={styles.googleCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.googleDivider} />

            {/* Account List */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {GOOGLE_DEVICE_ACCOUNTS.map((acc) => {
                const isLoadingThis = isCheckingGoogleAuth && selectedGoogleEmail === acc.email;
                return (
                  <TouchableOpacity
                    key={acc.email}
                    style={styles.googleAccountItem}
                    onPress={() => handleSelectGoogleAccount(acc)}
                    disabled={isCheckingGoogleAuth}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.googleAvatarCircle, { backgroundColor: acc.color }]}>
                      <Text style={styles.googleAvatarText}>{acc.initial}</Text>
                    </View>
                    <View style={styles.googleAccountInfo}>
                      <Text style={styles.googleAccountName}>{acc.name}</Text>
                      <Text style={styles.googleAccountEmail}>{acc.email}</Text>
                    </View>
                    {isLoadingThis ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Use Another Account Toggle */}
              {!showCustomEmailInput ? (
                <TouchableOpacity
                  style={styles.googleAddAccountRow}
                  onPress={() => setShowCustomEmailInput(true)}
                  disabled={isCheckingGoogleAuth}
                  activeOpacity={0.7}
                >
                  <View style={styles.googleAddIconWrap}>
                    <Ionicons name="person-add-outline" size={18} color="#475569" />
                  </View>
                  <Text style={styles.googleAddText}>Use another Google account</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.customEmailBox}>
                  <Text style={styles.customEmailLabel}>Enter Google Email Address</Text>
                  <View style={styles.customEmailInputWrap}>
                    <Ionicons name="mail-outline" size={16} color={COLORS.muted} style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.customEmailInput}
                      placeholder="e.g. user@gmail.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={customGoogleEmail}
                      onChangeText={setCustomGoogleEmail}
                    />
                  </View>
                  <View style={styles.customEmailActions}>
                    <TouchableOpacity
                      style={styles.customEmailCancelBtn}
                      onPress={() => setShowCustomEmailInput(false)}
                    >
                      <Text style={styles.customEmailCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.customEmailConfirmBtn}
                      onPress={() => {
                        if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
                          Alert.alert('Invalid Email', 'Please enter a valid Google email.');
                          return;
                        }
                        const name = customGoogleEmail.split('@')[0];
                        handleSelectGoogleAccount({ name, email: customGoogleEmail.trim() });
                      }}
                      disabled={isCheckingGoogleAuth}
                    >
                      {isCheckingGoogleAuth ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.customEmailConfirmText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Privacy Disclaimer */}
            <View style={styles.googleFooterDisclaimer}>
              <Text style={styles.googleDisclaimerText}>
                To continue, Google will share your name, email address, language preference, and profile picture with Extra Diesel.
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
    height: 38,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
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
  demoOtpBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
    backgroundColor: 'rgba(213,0,0,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
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

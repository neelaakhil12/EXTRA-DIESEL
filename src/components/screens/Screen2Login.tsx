import React, { useState, useEffect } from 'react';
import { ChevronLeft, Phone, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { api } from '../../services/api';

export const Screen2Login: React.FC = () => {
  const { loginWithPhone, loginWithGoogle, registerUser } = useAuth();
  const { setCurrentScreen } = useData();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('9876543210');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState(['1', '2', '3', '4', '5', '6']);
  const [timer, setTimer] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendOtp(cleanPhone);
      setSuccessMsg(res.message);
      setStep('otp');
      setTimer(30);
      setOtp(['1', '2', '3', '4', '5', '6']); // default populated for smooth user test
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        await registerUser(name, phone, email);
      } else {
        await loginWithPhone(phone, code);
      }
      setCurrentScreen('home');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Try OTP 123456');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      setCurrentScreen('home');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col justify-between bg-white select-none overflow-y-auto">
      {/* Top Header */}
      <div className="relative z-10 px-4 pt-3 flex items-center justify-between">
        <button
          onClick={() => {
            if (step === 'otp') {
              setStep('phone');
            } else {
              setCurrentScreen('splash');
            }
          }}
          className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition active-press"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <span className="text-xs font-semibold text-slate-400">9:41</span>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 pt-2 pb-4 flex flex-col items-center flex-1">
        {/* Brand Logo */}
        <div className="w-full max-w-[210px] my-3 flex items-center justify-center">
          <img
            src="/assets/logo.png"
            alt="Extra Diesel"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Heading */}
        <div className="text-center mt-2 mb-6">
          <h2 className="text-2xl font-extrabold text-[#171717] tracking-tight">
            {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login'
              ? 'Login to order fuel delivered to your location'
              : 'Sign up for fast doorstep diesel delivery'}
          </p>
        </div>

        {/* Error / Success alert */}
        {error && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-brand-red text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Container */}
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="w-full space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hemanth Kumar"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center space-x-1 text-slate-500 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-700 pl-1 border-r border-slate-300 pr-2">
                    +91
                  </span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Mobile Number"
                  className="w-full pl-24 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-medium tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red transition"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                We will send an OTP via SMS for instant verification
              </p>
            </div>

            {/* Send OTP Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white font-bold text-sm shadow-elevated flex items-center justify-center space-x-2 active-press transition disabled:opacity-70 mt-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>Send OTP</span>
              )}
            </button>
          </form>
        ) : (
          /* OTP Step */
          <div className="w-full space-y-4">
            <div className="text-center">
              <p className="text-xs text-slate-600">
                Enter the 6-digit OTP sent to <strong className="text-slate-900">+91 {phone}</strong>
              </p>
              <p className="text-[11px] text-brand-darkRed font-semibold mt-1">
                (Demo OTP: 123456)
              </p>
            </div>

            {/* 6 Digit Boxes */}
            <div className="flex justify-between gap-2 max-w-[280px] mx-auto py-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-10 h-12 text-center text-lg font-bold rounded-xl border-2 border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 focus:outline-none bg-slate-50 text-slate-900 transition"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs px-2 pt-1">
              <span className="text-slate-500">
                {timer > 0 ? `Resend OTP in 00:${timer < 10 ? `0${timer}` : timer}` : 'Didn\'t get OTP?'}
              </span>
              <button
                type="button"
                disabled={timer > 0}
                onClick={() => handleSendOtp()}
                className={`font-bold transition ${
                  timer > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-brand-red hover:underline'
                }`}
              >
                Resend OTP
              </button>
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-brand-darkRed via-brand-red to-brand-darkRed text-white font-bold text-sm shadow-elevated flex items-center justify-center space-x-2 active-press transition disabled:opacity-70 mt-3"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* 'or' divider */}
        <div className="relative w-full flex items-center justify-center my-5">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-xs text-slate-400 font-medium">or</span>
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center space-x-3 text-xs font-bold text-slate-700 active-press transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Bottom Skyline with Yellow & Red swooshes + Switch Mode Link */}
      <div className="relative z-10 w-full pt-2">
        <div className="w-full overflow-hidden">
          <img
            src="/assets/login-bottom-banner.png"
            alt="City Skyline"
            className="w-full h-auto object-cover max-h-[85px]"
          />
        </div>

        <div className="text-center py-3 bg-white">
          <p className="text-xs text-slate-600">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
                setStep('phone');
              }}
              className="text-brand-red font-bold hover:underline"
            >
              {mode === 'login' ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

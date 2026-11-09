import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { PublicLayout } from '../../components/PublicLayout';
import { loginMeta, signupMeta, forgotPasswordMeta } from '../../seo/pages/services.meta';
import { apiFetch, setToken } from '../../lib/api';
import { INDIAN_STATES } from '../../constants/indianStates';
import { useAuth } from '../../context/AuthContext';
import { TurnstileWidget } from '../../components/TurnstileWidget';
import { trackLoginSuccess, trackSignUp } from '../../lib/analytics';
import { ArrowRight, Check, X, Smartphone, Mail, Info, ArrowLeft } from '../../components/common/AuthIcons';

const inputClass =
  'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-400';

// -------------------------------------------------------------
// 1. NORMAL LOGIN FORM (Zero OTP — Email OR Mobile + Password)
// -------------------------------------------------------------
function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!turnstileToken) {
      setError('Please complete the security verification challenge before signing in.');
      return;
    }

    setLoading(true);

    try {
      const result = await apiFetch<{
        token: string;
        user: any;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password, turnstileToken }),
      });

      login(result.token, result.user);
      trackLoginSuccess(result.user?.role || 'CLIENT');

      if (result.user.role === 'TEAM') {
        navigate(result.user.mustResetPassword ? '/admin/force-reset' : '/team');
      } else if (result.user.role === 'ADMIN') {
        navigate(result.user.mustResetPassword ? '/admin/force-reset' : '/admin');
      } else {
        navigate('/client');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid login credentials. Please try again.');
      setTurnstileToken('');
      setTurnstileResetKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Email Address or 10-Digit Mobile Number
        </label>
        <input
          type="text"
          placeholder="e.g. rahul@business.com or 9876543210"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-gray-700">Password</label>
          <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Cloudflare Turnstile CAPTCHA Verification */}
      <div className="py-1">
        <TurnstileWidget
          resetKey={turnstileResetKey}
          onVerify={(token) => {
            setTurnstileToken(token);
            setError('');
          }}
          onExpire={() => setTurnstileToken('')}
          onError={() => {
            setTurnstileToken('');
          }}
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="submit"
        disabled={loading || !turnstileToken}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/10 cursor-pointer min-h-[44px] flex items-center justify-center"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Signing in...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </button>
    </form>
  );
}

// -------------------------------------------------------------
// 2. SIGNUP FORM (Option: OTP to Mobile OR Send OTP to Mail)
// -------------------------------------------------------------
function SignupForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCode = (searchParams.get('code') || searchParams.get('welcomeCode') || '').toUpperCase().trim();

  const { login } = useAuth();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpChannel, setOtpChannel] = useState<'mobile' | 'email'>('mobile');
  const [form, setForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
    gstin: '',
    state: '',
    address: '',
    password: '',
    confirmPassword: '',
    welcomeCode: initialCode,
  });

  const [codeValidating, setCodeValidating] = useState(false);
  const [codeValidationState, setCodeValidationState] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [codeValidationMsg, setCodeValidationMsg] = useState('');

  const [sessionId, setSessionId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [updatesConsent, setUpdatesConsent] = useState(false);

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const update = (field: keyof typeof form, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const checkWelcomeCode = async (customCode?: string) => {
    const raw = (customCode !== undefined ? customCode : form.welcomeCode).trim();
    if (!raw) {
      setCodeValidationState('idle');
      setCodeValidationMsg('');
      return false;
    }
    if (raw.length < 5) {
      setCodeValidationState('invalid');
      setCodeValidationMsg('Welcome Code must be between 5 and 16 characters.');
      return false;
    }

    setCodeValidating(true);
    try {
      const res = await apiFetch<{ valid: boolean; message?: string }>('/api/auth/welcome-codes/verify', {
        method: 'POST',
        body: JSON.stringify({ code: raw.toUpperCase() }),
      });
      if (res.valid) {
        setCodeValidationState('valid');
        setCodeValidationMsg('✓ Welcome Code confirmed! You are authorized to register.');
        return true;
      } else {
        setCodeValidationState('invalid');
        setCodeValidationMsg('Invalid, expired, or already used Welcome Code.');
        return false;
      }
    } catch (err: any) {
      setCodeValidationState('invalid');
      setCodeValidationMsg(err.message || 'Invalid, expired, or already used Welcome Code.');
      return false;
    } finally {
      setCodeValidating(false);
    }
  };

  // Auto-validate if invite code in query parameter
  useEffect(() => {
    if (initialCode && initialCode.length >= 5) {
      checkWelcomeCode(initialCode);
    }
  }, [initialCode]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!form.welcomeCode.trim()) {
      setError('Registration is by invite only. Please enter the Welcome Code provided by your administrator.');
      return;
    }

    if (form.welcomeCode.trim().length < 5) {
      setError('Welcome Code must be between 5 and 16 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.phone.replace(/\D/g, '').length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      if (otpChannel === 'mobile') {
        const res = await apiFetch<{
          success: boolean;
          sessionId: string;
          message: string;
          cooldownSeconds: number;
        }>('/api/auth/signup/request-mobile-otp', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            businessName: form.businessName,
            phone: form.phone,
            email: form.email,
            gstin: form.gstin || undefined,
            state: form.state,
            address: form.address,
            password: form.password,
            welcomeCode: form.welcomeCode.trim().toUpperCase(),
            marketingConsent: updatesConsent,
          }),
        });

        setSessionId(res.sessionId);
        setCooldown(res.cooldownSeconds || 60);
        setMessage(res.message);
      } else {
        const res = await apiFetch<{
          success?: boolean;
          message: string;
          cooldownSeconds?: number;
        }>('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            businessName: form.businessName,
            phone: form.phone,
            email: form.email,
            gstin: form.gstin || undefined,
            state: form.state,
            address: form.address,
            password: form.password,
            welcomeCode: form.welcomeCode.trim().toUpperCase(),
            marketingConsent: updatesConsent,
          }),
        });

        setCooldown(res.cooldownSeconds || 60);
        setMessage(res.message);
      }
      setStep('otp');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : otpChannel === 'mobile'
          ? 'Failed to send mobile verification code'
          : 'Failed to send email verification code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (otpChannel === 'mobile') {
        const result = await apiFetch<{ token: string; user?: any; message: string }>('/api/auth/signup/verify-mobile-otp', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            otp,
            signupData: {
              name: form.name,
              businessName: form.businessName,
              phone: form.phone,
              email: form.email,
              gstin: form.gstin || undefined,
              state: form.state,
              address: form.address,
              password: form.password,
              welcomeCode: form.welcomeCode.trim().toUpperCase(),
              marketingConsent: updatesConsent,
            },
          }),
        });
        if (result.user) {
          login(result.token, result.user);
      trackLoginSuccess(result.user?.role || 'CLIENT');
        } else {
          setToken(result.token);
        }
      } else {
        const result = await apiFetch<{ token: string; user: any }>('/api/auth/signup/verify', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email.trim().toLowerCase(),
            code: otp.trim(),
            welcomeCode: form.welcomeCode.trim().toUpperCase(),
          }),
        });
        login(result.token, result.user);
      trackLoginSuccess(result.user?.role || 'CLIENT');
      }

      trackSignUp(form.state);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (otpChannel === 'mobile') {
        const res = await apiFetch<{ success: boolean; sessionId: string; cooldownSeconds: number }>(
          '/api/auth/resend-mobile-otp',
          {
            method: 'POST',
            body: JSON.stringify({
              mobile: form.phone,
              purpose: 'SIGNUP_MOBILE_VERIFICATION',
            }),
          }
        );
        setSessionId(res.sessionId);
        setCooldown(res.cooldownSeconds || 60);
        setMessage('New mobile OTP dispatched via SMS.');
      } else {
        const res = await apiFetch<{ message: string; cooldownSeconds?: number }>(
          '/api/auth/resend-signup-otp',
          {
            method: 'POST',
            body: JSON.stringify({
              email: form.email.trim().toLowerCase(),
            }),
          }
        );
        setCooldown(res.cooldownSeconds || 60);
        setMessage(res.message || 'Verification code sent to your email.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : otpChannel === 'mobile'
          ? 'Failed to resend mobile verification code'
          : 'Failed to resend email verification code'
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOtp} className="max-w-md mx-auto space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-xl">
            {otpChannel === 'mobile' ? <Smartphone className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {otpChannel === 'mobile' ? 'Verify Mobile Number' : 'Verify Email Address'}
          </h2>
          <p className="text-gray-600 text-xs">
            {otpChannel === 'mobile' ? (
              <>
                We sent a 6-digit SMS verification code to <strong>+91 {form.phone}</strong>.
              </>
            ) : (
              <>
                We sent a 6-digit verification code to <strong>{form.email}</strong>.
              </>
            )}
          </p>
        </div>

        {message && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center">
            {message}
          </div>
        )}

        <input
          type="text"
          placeholder="000000"
          required
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className={`${inputClass} text-center text-2xl tracking-[0.5em] font-mono`}
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.length < 4}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
        >
          {loading
            ? 'Verifying...'
            : otpChannel === 'mobile'
            ? 'Verify Mobile & Create Account'
            : 'Verify Email & Create Account'}
        </button>

        <div className="flex items-center justify-between text-xs pt-2">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={loading || cooldown > 0}
            className="text-blue-600 hover:underline font-semibold disabled:text-gray-400 disabled:no-underline cursor-pointer"
          >
            {cooldown > 0
              ? `Resend ${otpChannel === 'mobile' ? 'SMS' : 'Email'} OTP in ${cooldown}s`
              : `Resend ${otpChannel === 'mobile' ? 'SMS' : 'Email'} OTP`}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setError('');
              setMessage('');
              setOtp('');
            }}
            className="text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            ← Change Channel / Details
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestOtp} className="max-w-lg mx-auto space-y-4">
      {/* 1. Verification Option Switcher */}
      <div className="space-y-1.5 pb-1">
        <label className="block text-xs font-bold text-gray-700">
          Choose OTP Verification Method *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setOtpChannel('mobile');
              setError('');
            }}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
              otpChannel === 'mobile'
                ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                otpChannel === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span
                className={`block text-xs font-bold leading-tight ${
                  otpChannel === 'mobile' ? 'text-blue-900' : 'text-gray-800'
                }`}
              >
                OTP to Mobile
              </span>
              <span className="block text-[10px] text-gray-500 leading-tight mt-0.5">
                Fast SMS code to phone
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOtpChannel('email');
              setError('');
            }}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
              otpChannel === 'email'
                ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                otpChannel === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span
                className={`block text-xs font-bold leading-tight ${
                  otpChannel === 'email' ? 'text-blue-900' : 'text-gray-800'
                }`}
              >
                Send OTP to Mail
              </span>
              <span className="block text-[10px] text-gray-500 leading-tight mt-0.5">
                Code to registered email
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Admin Welcome Code (Invite-Only Registration Gate) */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            Admin Welcome Code *
          </label>
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Invite-Only Registration
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="e.g. GST-8849"
            required
            maxLength={16}
            value={form.welcomeCode}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/\s+/g, '');
              update('welcomeCode', val);
              if (codeValidationState !== 'idle') {
                setCodeValidationState('idle');
                setCodeValidationMsg('');
              }
            }}
            onBlur={() => {
              if (form.welcomeCode.trim().length >= 5) {
                checkWelcomeCode();
              }
            }}
            className={`${inputClass} font-mono uppercase font-bold tracking-widest text-slate-900 border-indigo-200 bg-white pr-24`}
          />
          <button
            type="button"
            disabled={codeValidating || form.welcomeCode.trim().length < 5}
            onClick={() => checkWelcomeCode()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition cursor-pointer"
          >
            {codeValidating ? 'Checking...' : 'Verify'}
          </button>
        </div>

        {codeValidationState === 'valid' && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <span>✓</span> {codeValidationMsg}
          </div>
        )}

        {codeValidationState === 'invalid' && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
            <span>✕</span> {codeValidationMsg}
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Registration requires a 5–8 character Welcome Code provided by the Admin. Once used, your code will be permanently registered and linked to your account.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
          <input
            placeholder="Authorized Person Name"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Business Name *</label>
          <input
            placeholder="Enterprise / Legal Entity Name"
            required
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number (10 digits) *</label>
          {/* JIT privacy notice — mobile */}
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-2 leading-relaxed">
            ℹ️ Your mobile number is used for one-time verification and login. It is not shared with third parties for marketing.
          </p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
              +91
            </span>
            <input
              type="tel"
              placeholder="9876543210"
              required
              maxLength={10}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} pl-12`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
          <input
            type="email"
            placeholder="taxpayer@company.com"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN (Optional)</label>
          <input
            placeholder="e.g. 29ABCDE1234F1Z5"
            maxLength={15}
            value={form.gstin}
            onChange={(e) => update('gstin', e.target.value.toUpperCase())}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">State *</label>
          <select
            required
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            className={inputClass}
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">Business Address *</label>
        {/* JIT privacy notice — address */}
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-2 leading-relaxed">
          ℹ️ Your business address is needed to determine applicable GST rules and appears on invoices.
        </p>
        <textarea
          placeholder="Principal place of business..."
          required
          rows={2}
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
          <input
            type="password"
            placeholder="Min 8 characters"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password *</label>
          <input
            type="password"
            placeholder="Re-enter password"
            required
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        Password must be at least 8 characters.{' '}
        {otpChannel === 'mobile'
          ? 'Mobile verification code will be sent via SMS.'
          : 'Email verification code will be sent to your inbox.'}
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* DPDP Statutory Privacy Notice & Optional Updates Consent */}
      <div className="pt-2 space-y-3">
        <p className="text-[11px] text-slate-500 leading-relaxed text-center sm:text-left">
          By creating an account, you acknowledge our{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-semibold">
            Privacy Notice
          </Link>{' '}
          and agree to the processing of your personal data for GST compliance and service delivery. GSTBro is intended strictly for adults (18+).
        </p>

        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={updatesConsent}
            onChange={(e) => setUpdatesConsent(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>I agree to receive optional service update emails from GSTBro (you can change this anytime in your privacy settings).</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
      >
        {loading
          ? otpChannel === 'mobile'
            ? 'Sending Mobile OTP...'
            : 'Sending Email OTP...'
          : otpChannel === 'mobile'
          ? 'Send Mobile OTP & Continue'
          : 'Send OTP to Mail & Continue'}
      </button>
    </form>
  );
}

// -------------------------------------------------------------
// 3. FORGOT PASSWORD PAGE (Mobile OTP & Email Options)
// -------------------------------------------------------------
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'mobile' | 'email'>('mobile');

  // Mobile flow state
  const [mobile, setMobile] = useState('');
  const [mobileSessionId, setMobileSessionId] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileStep, setMobileStep] = useState<'phone' | 'otp' | 'newPassword'>('phone');
  const [resetToken, setResetToken] = useState('');

  // Email flow state
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'email' | 'reset'>('email');

  // Shared state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Mobile: Step 1 — Request OTP
  const handleSendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await apiFetch<{
        success: boolean;
        sessionId: string;
        message: string;
        cooldownSeconds: number;
      }>('/api/auth/forgot-password/mobile-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      });

      setMobileSessionId(res.sessionId || '');
      setCooldown(res.cooldownSeconds || 60);
      setMessage(res.message);
      setMobileStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send mobile recovery OTP');
    } finally {
      setLoading(false);
    }
  };

  // Mobile: Step 2 — Verify OTP and get single-use Reset Token
  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch<{
        valid: boolean;
        resetToken: string;
        message: string;
      }>('/api/auth/forgot-password/verify-mobile-otp', {
        method: 'POST',
        body: JSON.stringify({
          mobile,
          sessionId: mobileSessionId,
          otp: mobileOtp,
        }),
      });

      setResetToken(res.resetToken);
      setMessage(res.message);
      setMobileStep('newPassword');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  // Mobile: Step 3 — Set New Password with Reset Token
  const handleResetWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await apiFetch('/api/auth/forgot-password/reset-with-token', {
        method: 'POST',
        body: JSON.stringify({
          resetToken,
          password: newPassword,
        }),
      });

      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Email: Step 1 — Request Email Code
  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await apiFetch<{ message: string; cooldownSeconds?: number }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
      setCooldown(res.cooldownSeconds || 60);
      setEmailStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recovery email');
    } finally {
      setLoading(false);
    }
  };

  // Email: Step 2 — Reset Password with Email Code
  const handleResetWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          code: emailCode,
          password: newPassword,
        }),
      });

      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout meta={forgotPasswordMeta}>
      <div className="relative py-12 sm:py-20 overflow-hidden bg-slate-50/60">
        <div className="absolute inset-0 bg-financial-grid-light pointer-events-none opacity-60" />
        <div className="relative max-w-md mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50"
          >
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-3">
                Account Recovery
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Forgot Password</h1>
              <p className="text-slate-600 mt-2 text-xs sm:text-sm">
                Choose your recovery method to securely reset your credentials.
              </p>
            </div>

            {/* Method Switcher Tabs */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6 border border-gray-200">
          <button
            type="button"
            onClick={() => {
              setMethod('mobile');
              setError('');
              setMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              method === 'mobile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Reset using Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod('email');
              setError('');
              setMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              method === 'email' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Reset using Email
          </button>
        </div>

        {message && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* ----------------- MOBILE RECOVERY FLOW ----------------- */}
        {method === 'mobile' && (
          <>
            {mobileStep === 'phone' && (
              <form onSubmit={handleSendMobileOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Registered Mobile Number (10 digits)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || mobile.length !== 10}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Sending OTP...' : 'Send Mobile Recovery OTP'}
                </button>
              </form>
            )}

            {mobileStep === 'otp' && (
              <form onSubmit={handleVerifyMobileOtp} className="space-y-4">
                <p className="text-gray-600 text-xs text-center">
                  Enter the 6-digit OTP sent to <strong>+91 {mobile}</strong>
                </p>
                <input
                  type="text"
                  placeholder="000000"
                  required
                  maxLength={6}
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} text-center text-xl tracking-widest font-mono`}
                />
                <button
                  type="submit"
                  disabled={loading || mobileOtp.length < 4}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Verifying OTP...' : 'Verify OTP & Proceed'}
                </button>
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleSendMobileOtp}
                    disabled={loading || cooldown > 0}
                    className="text-blue-600 hover:underline font-semibold disabled:text-gray-400 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend SMS OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileStep('phone');
                      setError('');
                    }}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Change Number
                  </button>
                </div>
              </form>
            )}

            {mobileStep === 'newPassword' && (
              <form onSubmit={handleResetWithToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            )}
          </>
        )}

        {/* ----------------- EMAIL RECOVERY FLOW ----------------- */}
        {method === 'email' && (
          <>
            {emailStep === 'email' ? (
              <form onSubmit={handleSendEmailCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@business.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Sending Code...' : 'Send Recovery Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetWithEmail} className="space-y-4">
                <p className="text-gray-600 text-xs text-center">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
                <input
                  type="text"
                  placeholder="000000"
                  required
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass} text-center text-xl tracking-widest font-mono`}
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                >
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={loading || cooldown > 0}
                    className="text-blue-600 hover:underline font-semibold disabled:text-gray-400 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Email Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep('email');
                      setError('');
                    }}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        <p className="text-center text-xs mt-6 pt-4 border-t border-slate-100 text-slate-500">
          Remember your password?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold underline">
            Back to login
          </Link>
        </p>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}

// -------------------------------------------------------------
// 4. MAIN PAGE EXPORTS
// -------------------------------------------------------------
export function LoginPage() {
  return (
    <PublicLayout meta={loginMeta}>
      <div className="relative py-12 sm:py-20 overflow-hidden bg-slate-50/60">
        <div className="absolute inset-0 bg-financial-grid-light pointer-events-none opacity-60" />
        <div className="relative max-w-lg mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50"
          >
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-3">
                Secure Client &amp; Team Gateway
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Sign In to GSTBro</h1>
              <p className="text-slate-600 mt-2 text-xs sm:text-sm">
                Unified access for Taxpayers, Practice Specialists, and Administrators.
              </p>
            </div>
            <LoginForm />
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              New client?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-bold underline">
                Create an account
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}

export function SignupPage() {
  return (
    <PublicLayout meta={signupMeta}>
      <div className="relative py-12 sm:py-20 overflow-hidden bg-slate-50/60">
        <div className="absolute inset-0 bg-financial-grid-light pointer-events-none opacity-60" />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50"
          >
            <div className="text-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-3">
                Client Registration
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Create Your Account</h1>
              <p className="text-slate-600 mt-2 text-xs sm:text-sm">
                Register with your business details and verify mobile via SMS.
              </p>
            </div>
            <SignupForm />
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold underline">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}

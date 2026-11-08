import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { adminPath } from '../lib/routes';

export function LoginPage() {
  useEffect(() => {
    window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Redirecting to unified sign in...</p>
      </div>
    </div>
  );
}

function LegacyAdminLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api<{ token: string; user: { role: string; mustResetPassword?: boolean } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      if (!['ADMIN', 'TEAM'].includes(result.user.role)) {
        setError('Unauthorized: Administrator or CA specialist credentials required.');
        return;
      }
      setToken(result.token);
      if (result.user.role === 'TEAM') {
        window.location.href = '/team';
        return;
      }
      navigate(result.user.mustResetPassword ? adminPath('/force-reset') : adminPath('/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Column: Brand & Trust Showcase (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-[#0b1324] border-r border-slate-800 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/25">
              GB
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">GST<span className="text-blue-400">Bro</span></span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Compliance OS</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Chartered Accountant & Tax Operator Console
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Institutional Tax Operations & Practice Automation.
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Manage multi-state GSTIN registrations, automated GSTR-1 & 3B reconciliations, TDS/TCS filings, client fee billing, and Google Drive document vault sync in one unified console.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs font-bold text-slate-200">Statutory Security</p>
              <p className="text-[11px] text-slate-400 mt-1">256-bit SSL encrypted filing credentials & audit trails.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs font-bold text-slate-200">GSTN Compliant</p>
              <p className="text-[11px] text-slate-400 mt-1">Automated GSTR-2B ITC matching & challan verification.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800/80">
          <span>GSTBro Technologies Private Limited</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Production v2.4 Live
          </span>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
              GB
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">GST<span className="text-blue-400">Bro</span></span>
              <p className="text-[10px] text-slate-400 font-medium">Admin & Operations</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Staff Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your authorized credentials to access practice data.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email or 10-Digit Mobile Number
              </label>
              <input
                type="text"
                required
                placeholder="name@gstbro.in or 9876543210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  to={adminPath('/forgot-password')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
            </button>
          </form>

          <div className="pt-6 border-t border-slate-900 text-center">
            <p className="text-[11px] text-slate-500">
              Tax client or business seeking services?{' '}
              <a href="/" className="text-blue-400 hover:underline">
                Return to public portal
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'mobile' | 'email'>('mobile');

  // Mobile state
  const [mobile, setMobile] = useState('');
  const [mobileSessionId, setMobileSessionId] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileStep, setMobileStep] = useState<'phone' | 'otp' | 'newPassword'>('phone');
  const [resetToken, setResetToken] = useState('');

  // Email state
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'email' | 'reset'>('email');

  // Shared password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Mobile: Step 1 — Send Mobile OTP
  const sendMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api<{ success: boolean; sessionId: string; message: string; cooldownSeconds: number }>(
        '/api/auth/forgot-password/mobile-otp',
        {
          method: 'POST',
          body: JSON.stringify({ mobile }),
        }
      );
      setMobileSessionId(res.sessionId || '');
      setCooldown(res.cooldownSeconds || 60);
      setMessage(res.message);
      setMobileStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send mobile recovery OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Mobile: Step 2 — Verify Mobile OTP & Receive Reset Token
  const verifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api<{ valid: boolean; resetToken: string; message: string }>(
        '/api/auth/forgot-password/verify-mobile-otp',
        {
          method: 'POST',
          body: JSON.stringify({ mobile, sessionId: mobileSessionId, otp: mobileOtp }),
        }
      );
      setResetToken(res.resetToken);
      setMessage(res.message);
      setMobileStep('newPassword');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Mobile: Step 3 — Save New Password
  const resetWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/api/auth/forgot-password/reset-with-token', {
        method: 'POST',
        body: JSON.stringify({ resetToken, password }),
      });
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Email: Step 1 — Send Email Code
  const sendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await api<{ message: string; cooldownSeconds?: number }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
      setCooldown(res.cooldownSeconds || 60);
      setEmailStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Email: Step 2 — Reset with Email Code
  const resetWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: emailCode, password }),
      });
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Staff Account Recovery</h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose your verification channel to recover staff console access.
          </p>
        </div>

        {/* Method Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMethod('mobile');
              setError('');
              setMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              method === 'mobile' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
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
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              method === 'email' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Reset using Email
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            {message}
          </div>
        )}

        {/* Mobile Channel */}
        {method === 'mobile' && (
          <>
            {mobileStep === 'phone' && (
              <form onSubmit={sendMobileOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-12 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || mobile.length !== 10}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send SMS Recovery OTP'}
                </button>
              </form>
            )}

            {mobileStep === 'otp' && (
              <form onSubmit={verifyMobileOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    6-Digit SMS Code sent to +91 {mobile}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 text-center text-lg tracking-widest font-mono rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || mobileOtp.length < 4}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Set New Password'}
                </button>
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={sendMobileOtp}
                    disabled={loading || cooldown > 0}
                    className="text-blue-400 hover:underline disabled:text-slate-600 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend SMS OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileStep('phone');
                      setError('');
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Change Number
                  </button>
                </div>
              </form>
            )}

            {mobileStep === 'newPassword' && (
              <form onSubmit={resetWithToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Password & Sign In'}
                </button>
              </form>
            )}
          </>
        )}

        {/* Email Channel */}
        {method === 'email' && (
          <>
            {emailStep === 'email' ? (
              <form onSubmit={sendEmailCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gstbro.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send Recovery Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={resetWithEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">6-Digit Email Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 text-center text-lg tracking-widest font-mono rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {loading ? 'Resetting...' : 'Update Password & Sign In'}
                </button>
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={loading || cooldown > 0}
                    className="text-blue-400 hover:underline disabled:text-slate-600 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep('email');
                      setError('');
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Change Email
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        <div className="text-center pt-2">
          <a href="/login" className="text-xs text-blue-400 hover:underline">
            ← Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export function ForceResetPasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, password }),
      });
      navigate(adminPath('/'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Set Permanent Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            As a security protocol, you must replace your temporary onboarding credentials before opening the operations console.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Temporary Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Permanent Password (min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Permanent Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50"
          >
            {loading ? 'Updating Credentials...' : 'Activate Account & Proceed'}
          </button>
        </form>
      </div>
    </div>
  );
}

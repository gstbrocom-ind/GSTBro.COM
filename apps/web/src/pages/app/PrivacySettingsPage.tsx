import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ConsentPurpose = 'service_delivery' | 'service_notifications' | 'marketing_email' | 'analytics';

interface ConsentState {
  purpose: ConsentPurpose;
  granted: boolean;
  updatedAt?: string;
}

interface ConsentHistory {
  purpose: ConsentPurpose;
  granted: boolean;
  createdAt: string;
  note?: string;
}

interface ConsentResponse {
  consents: ConsentState[];
  history?: ConsentHistory[];
}

// ---------------------------------------------------------------------------
// Purpose definitions
// ---------------------------------------------------------------------------
const PURPOSES: {
  key: ConsentPurpose;
  title: string;
  description: string;
  locked: boolean;
  icon: string;
}[] = [
  {
    key: 'service_delivery',
    title: 'Service Delivery',
    description:
      'Processing your account data, GSTIN, business information, and return data to provide GST compliance services. This is the core legal basis for providing the service you signed up for.',
    locked: true,
    icon: '🏛️',
  },
  {
    key: 'service_notifications',
    title: 'Service Notifications (Email/SMS)',
    description:
      'Transactional notifications about your GST filings, document uploads, case updates, and deadlines — sent via email or SMS.',
    locked: false,
    icon: '🔔',
  },
  {
    key: 'marketing_email',
    title: 'Marketing Emails',
    description:
      'Occasional emails about new GSTBro features, tax updates, and educational content. Off by default.',
    locked: false,
    icon: '📧',
  },
  {
    key: 'analytics',
    title: 'Product Analytics',
    description:
      'Anonymous usage data to improve the GSTBro platform. Currently no analytics are in use — this consent will be activated before any analytics tool is enabled.',
    locked: false,
    icon: '📊',
  },
];

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export function PrivacySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [consents, setConsents] = useState<ConsentState[]>([]);
  const [history, setHistory] = useState<ConsentHistory[]>([]);
  const [noticeVersion, setNoticeVersion] = useState<{ version: string; effectiveDate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<ConsentPurpose | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/client/privacy-settings');
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [consentRes, versionRes] = await Promise.all([
        apiFetch<ConsentResponse>('/api/privacy/consent'),
        apiFetch<{ version: string; effectiveDate: string }>('/api/privacy/notice-version').catch(() => null),
      ]);
      setConsents(consentRes.consents ?? []);
      setHistory(consentRes.history ?? []);
      if (versionRes) setNoticeVersion(versionRes);
    } catch {
      setError('Unable to load your privacy settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const getConsent = (purpose: ConsentPurpose): boolean => {
    const found = consents.find((c) => c.purpose === purpose);
    if (!found) {
      // Default states
      return purpose === 'service_delivery' || purpose === 'service_notifications';
    }
    return found.granted;
  };

  const handleToggle = async (purpose: ConsentPurpose, newValue: boolean) => {
    setToggling(purpose);
    setToastMsg('');
    try {
      await apiFetch('/api/privacy/consent', {
        method: 'POST',
        body: JSON.stringify({ purpose, granted: newValue }),
      });
      setConsents((prev) => {
        const existing = prev.find((c) => c.purpose === purpose);
        if (existing) {
          return prev.map((c) => (c.purpose === purpose ? { ...c, granted: newValue } : c));
        }
        return [...prev, { purpose, granted: newValue }];
      });
      setToastMsg(
        newValue
          ? `✓ ${PURPOSES.find((p) => p.key === purpose)?.title} enabled.`
          : `✓ ${PURPOSES.find((p) => p.key === purpose)?.title} disabled.`
      );
      setTimeout(() => setToastMsg(''), 4000);
      fetchData();
    } catch (err) {
      setToastMsg(err instanceof Error ? err.message : 'Failed to update consent. Please try again.');
    } finally {
      setToggling(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔐</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Privacy Settings</h1>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            GSTBro collects and uses your data to provide GST compliance services. The{' '}
            <strong className="text-white">Service Delivery</strong> purpose cannot be turned off while your account is
            active — it is the legal basis for providing you the service you signed up for. To stop this processing, you
            can close your account.
          </p>
          {noticeVersion && (
            <p className="mt-3 text-xs text-slate-500">
              Privacy Notice version {noticeVersion.version} &bull; Effective {noticeVersion.effectiveDate}
            </p>
          )}
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
            {toastMsg}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Consent cards */}
        <section className="space-y-4">
          {PURPOSES.map((purpose) => {
            const granted = getConsent(purpose.key);
            const isToggling = toggling === purpose.key;
            return (
              <div
                key={purpose.key}
                className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm transition ${
                  purpose.locked ? 'border-slate-200 opacity-90' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl shrink-0 mt-0.5">{purpose.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{purpose.title}</h3>
                        {purpose.locked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            🔒 Required
                          </span>
                        )}
                      </div>

                      {/* Toggle button or locked indicator */}
                      {purpose.locked ? (
                        <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800">
                          Always On
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggle(purpose.key, !granted)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 ${
                            granted ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                          aria-label={`${granted ? 'Disable' : 'Enable'} ${purpose.title}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              granted ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mt-1.5">{purpose.description}</p>

                    {/* Current state label */}
                    {!purpose.locked && (
                      <p className={`text-[10px] font-semibold mt-2 ${granted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isToggling
                          ? 'Updating…'
                          : granted
                          ? '● Currently enabled'
                          : '○ Currently disabled'}
                      </p>
                    )}

                    {purpose.locked && (
                      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                        To stop this processing, you would need to close your GSTBro account.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Link to rights requests */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">Want to access, correct, or erase your data?</p>
          <p className="text-xs text-blue-700 mb-3 leading-relaxed">
            You can submit a formal privacy request under the DPDP Act — such as an access request, correction, or erasure request.
          </p>
          <Link
            to="/client/privacy"
            className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-900 underline text-xs"
          >
            Go to Privacy Requests →
          </Link>
        </div>

        {/* Consent history */}
        {history.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Consent History</h2>
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-slate-600 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className={`mt-0.5 font-bold ${h.granted ? 'text-emerald-600' : 'text-red-500'}`}>
                    {h.granted ? '✓' : '✕'}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">
                      {PURPOSES.find((p) => p.key === h.purpose)?.title ?? h.purpose}
                    </span>
                    {' — '}
                    {h.granted ? 'Enabled' : 'Disabled'}
                    <span className="text-slate-400 ml-2">{formatDate(h.createdAt)}</span>
                    {h.note && <p className="text-slate-500 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

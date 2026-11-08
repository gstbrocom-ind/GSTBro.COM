import { useState, useEffect, useCallback, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Types matching server DPDP backend
// ---------------------------------------------------------------------------
type RequestType =
  | 'ACCESS'
  | 'CORRECTION'
  | 'ERASURE'
  | 'CONSENT_WITHDRAWAL'
  | 'GRIEVANCE'
  | 'NOMINATION';

interface PrivacyRequestEvent {
  id: string;
  actor_label?: string;
  event_type?: string;
  note?: string;
  created_at: string;
}

interface PrivacyRequest {
  id: string;
  request_type: RequestType;
  status: string;
  description?: string;
  resolution_note?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
  events?: PrivacyRequestEvent[];
}

// ---------------------------------------------------------------------------
// Helpers & Accessible Metadata
// ---------------------------------------------------------------------------
const REQUEST_TYPE_INFO: Record<
  RequestType,
  { label: string; badgeClass: string; icon: string; description: string }
> = {
  ACCESS: {
    label: 'Data Access Summary',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: '📋',
    description: 'Request a summary of personal data held about you and how it is processed.',
  },
  CORRECTION: {
    label: 'Correction of Data',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    icon: '✏️',
    description: 'Request correction or completion of inaccurate personal data.',
  },
  ERASURE: {
    label: 'Erasure & Account Closure',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    icon: '🗑️',
    description: 'Request deletion of your data and account closure (subject to legal retention).',
  },
  CONSENT_WITHDRAWAL: {
    label: 'Withdraw Consent',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: '⛔',
    description: 'Withdraw previously granted consent for optional processing.',
  },
  GRIEVANCE: {
    label: 'Grievance / Complaint',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    icon: '⚖️',
    description: 'Submit a privacy grievance for internal investigation by the Privacy Officer.',
  },
  NOMINATION: {
    label: 'Nomination of Representative',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    icon: '🤝',
    description: 'Nominate another person to exercise your DPDP rights on your behalf.',
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: string }
> = {
  PENDING: {
    label: 'Pending Review',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    icon: '⏳',
  },
  IDENTITY_VERIFIED: {
    label: 'Identity Verified',
    badgeClass: 'bg-sky-50 text-sky-900 border-sky-300',
    icon: '🛡️',
  },
  IN_REVIEW: {
    label: 'In Review by Officer',
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-300',
    icon: '🔍',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    icon: '✅',
  },
  PARTIALLY_COMPLETED: {
    label: 'Partially Completed',
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300',
    icon: '↗️',
  },
  REJECTED: {
    label: 'Request Rejected',
    badgeClass: 'bg-red-50 text-red-900 border-red-300',
    icon: '✕',
  },
};

function formatFullDate(isoString: string) {
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Subcomponent: Accessible Inline Timeline Card
// ---------------------------------------------------------------------------
function RequestDetailTimeline({ requestId }: { requestId: string }) {
  const [events, setEvents] = useState<PrivacyRequestEvent[]>([]);
  const [resolutionNote, setResolutionNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    apiFetch<{ request: PrivacyRequest; events?: PrivacyRequestEvent[] }>(
      `/api/privacy/requests/${requestId}`
    )
      .then((res) => {
        if (!isMounted) return;
        setEvents(res.events ?? res.request.events ?? []);
        setResolutionNote(res.request.resolution_note ?? null);
      })
      .catch(() => {
        if (isMounted) setError('Unable to load timeline. Please check your connection.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-500" role="status">
        <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
        <span>Loading request event timeline…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200/80 text-xs text-red-600 font-medium" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3.5 animate-fadeIn">
      {resolutionNote && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <span className="font-bold text-slate-900 block flex items-center gap-1.5">
            <span>📝</span> Official Resolution Note:
          </span>
          <p className="leading-relaxed whitespace-pre-wrap">{resolutionNote}</p>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Auditable Event History
        </p>

        {events.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No milestone events logged yet.</p>
        ) : (
          <ol className="relative border-l-2 border-slate-200 ml-2.5 space-y-3.5" aria-label="Timeline of actions">
            {events.map((ev, idx) => (
              <li key={ev.id || idx} className="ml-4 text-xs">
                <div
                  className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white ring-1 ring-blue-300"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                  <span className="font-bold text-slate-800">
                    {(ev.event_type || 'UPDATE').replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    by <span className="font-semibold">{ev.actor_label || 'SYSTEM'}</span>
                  </span>
                  <time className="text-[10px] text-slate-400 sm:ml-auto block sm:inline">
                    {formatFullDate(ev.created_at)}
                  </time>
                </div>
                {ev.note && (
                  <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                    {ev.note}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export function PrivacyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Unique IDs for screen reader label/error associations
  const typeSelectId = useId();
  const descriptionId = useId();
  const descriptionErrorId = useId();
  const nomineeNameId = useId();
  const nomineeEmailId = useId();
  const nomineeRelId = useId();
  const nominationErrorId = useId();
  const erasureCheckboxId = useId();
  const erasureErrorId = useId();

  // ---- Form State ----
  const [requestType, setRequestType] = useState<RequestType>('ACCESS');
  const [description, setDescription] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [nomineeRelationship, setNomineeRelationship] = useState('');
  const [erasureAcknowledged, setErasureAcknowledged] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // ---- Request List State ----
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/privacy/requests');
    }
  }, [user, authLoading, navigate]);

  const fetchRequests = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await apiFetch<{ requests: PrivacyRequest[] }>('/api/privacy/requests');
      setRequests(res.requests ?? []);
    } catch {
      setListError('Unable to load your requests. Please refresh the page.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  // Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!description.trim()) {
      errors.description = 'Please describe your request details (minimum 5 characters).';
    } else if (description.trim().length < 5) {
      errors.description = 'Description is too short. Please provide clearer details.';
    }

    if (requestType === 'NOMINATION') {
      if (!nomineeName.trim()) errors.nomineeName = 'Nominee full name is required.';
      if (!nomineeEmail.trim() || !nomineeEmail.includes('@')) {
        errors.nomineeEmail = 'Valid nominee email address is required.';
      }
      if (!nomineeRelationship.trim()) {
        errors.nomineeRelationship = 'Relationship (e.g. Legal Counsel, Partner, Spouse) is required.';
      }
    }

    if (requestType === 'ERASURE' && !erasureAcknowledged) {
      errors.erasure = 'Mandatory: You must acknowledge statutory tax retention terms before initiating erasure.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        requestType,
        description: description.trim(),
      };

      if (requestType === 'NOMINATION') {
        payload.nomineeName = nomineeName.trim();
        payload.nomineeEmail = nomineeEmail.trim();
        payload.nomineeRelationship = nomineeRelationship.trim();
      }

      if (requestType === 'ERASURE') {
        payload.erasureAcknowledged = true;
      }

      const res = await apiFetch<{ success: boolean; message: string; request: PrivacyRequest }>(
        '/api/privacy/requests',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      setSubmitSuccess(res.message || 'Your privacy request has been successfully registered.');
      setDescription('');
      setNomineeName('');
      setNomineeEmail('');
      setNomineeRelationship('');
      setErasureAcknowledged(false);
      setRequestType('ACCESS');
      setFieldErrors({});

      // Refresh list to show new request
      fetchRequests();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to submit request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center" role="status">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" aria-hidden="true" />
        <p className="text-sm text-slate-600 font-medium">Verifying your secure session…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/70 py-6 sm:py-10 px-3.5 sm:px-6 lg:px-8">
      <main className="max-w-4xl mx-auto space-y-6 sm:space-y-8">

        {/* 1. Header Banner */}
        <header className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl sm:text-2xl shrink-0" aria-hidden="true">
                🛡️
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Privacy Rights Request Centre
                </h1>
                <p className="text-xs text-blue-300 font-semibold">
                  Digital Personal Data Protection Act, 2023 Compliance
                </p>
              </div>
            </div>

            <Link
              to="/client/privacy-settings"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/90 border border-slate-700 hover:bg-slate-700 hover:text-white transition active:scale-[0.98] min-h-[44px]"
            >
              <span>⚙️ Manage Consent Preferences</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Exercise your statutory rights to access, rectify, or erase your personal data, appoint a nominee, or lodge a formal grievance. GSTBro investigates and fulfills every request pursuant to the DPDP Rules.
          </p>

          {/* Grievance & Escalation Notice */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <p>
              <strong className="text-slate-200">Privacy &amp; Grievance Officer:</strong>{' '}
              <a
                href="mailto:privacy@gstbro.in"
                className="text-blue-400 hover:text-blue-300 underline font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
              >
                privacy@gstbro.in
              </a>
            </p>
            <p className="text-[11px] text-slate-400">
              If your grievance is not resolved to your satisfaction within prescribed statutory timelines, you possess the right to escalate your complaint directly to the{' '}
              <strong className="text-slate-300">Data Protection Board of India</strong>.
            </p>
          </div>
        </header>

        {/* 2. Request Submission Form */}
        <section aria-labelledby="form-heading" className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-8">
          <h2 id="form-heading" className="text-base sm:text-lg font-black text-slate-900 mb-1 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0" aria-hidden="true">
              +
            </span>
            <span>Submit a Privacy Rights Request</span>
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            All fields marked with an asterisk (<span className="text-red-500 font-bold">*</span>) are mandatory.
          </p>

          {/* Feedback Alerts */}
          {submitSuccess && (
            <div
              className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-medium flex items-start gap-2.5 leading-relaxed"
              role="alert"
            >
              <span className="text-emerald-600 font-bold text-base" aria-hidden="true">✓</span>
              <div>
                <p className="font-bold">Request Successfully Dispatched</p>
                <p className="text-emerald-800 text-xs mt-0.5">{submitSuccess}</p>
              </div>
            </div>
          )}

          {submitError && (
            <div
              className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm font-medium flex items-start gap-2.5 leading-relaxed"
              role="alert"
            >
              <span className="text-red-600 font-bold text-base" aria-hidden="true">⚠️</span>
              <div>
                <p className="font-bold">Action Failed</p>
                <p className="text-red-800 text-xs mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Field: Request Type */}
            <div>
              <label htmlFor={typeSelectId} className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Statutory Request Category <span className="text-red-500" aria-hidden="true">*</span>
              </label>

              <select
                id={typeSelectId}
                value={requestType}
                onChange={(e) => {
                  setRequestType(e.target.value as RequestType);
                  setErasureAcknowledged(false);
                  setFieldErrors((prev) => ({ ...prev, erasure: '', nomineeName: '', nomineeEmail: '', nomineeRelationship: '' }));
                }}
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white shadow-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition"
              >
                {(Object.keys(REQUEST_TYPE_INFO) as RequestType[]).map((t) => (
                  <option key={t} value={t}>
                    {REQUEST_TYPE_INFO[t].icon} {REQUEST_TYPE_INFO[t].label}
                  </option>
                ))}
              </select>

              {/* Dynamic Context Helper */}
              <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                <span className="text-blue-600 text-sm shrink-0" aria-hidden="true">ℹ️</span>
                <span>{REQUEST_TYPE_INFO[requestType].description}</span>
              </div>
            </div>

            {/* Field: Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={descriptionId} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Request Specifics &amp; Details <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {description.length}/2000
                </span>
              </div>

              <textarea
                id={descriptionId}
                rows={4}
                maxLength={2000}
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? descriptionErrorId : undefined}
                placeholder="Specify which documents, filings, invoices, or records this request pertains to..."
                className={`w-full rounded-xl border px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition resize-y min-h-[110px] ${
                  fieldErrors.description
                    ? 'border-red-400 focus:ring-red-400/20 bg-red-50/20'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20 bg-white'
                }`}
              />

              {fieldErrors.description && (
                <p id={descriptionErrorId} className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1" role="alert">
                  <span>✕</span> {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Dynamic Section: NOMINATION */}
            {requestType === 'NOMINATION' && (
              <fieldset className="p-4 sm:p-5 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-4">
                <legend className="text-xs font-black text-teal-900 uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100">
                  Authorised Nominee Information
                </legend>

                <p className="text-xs text-teal-800 leading-relaxed">
                  Under Section 14 of the DPDP Act, you may nominate a designated individual to exercise rights on your behalf in the event of death or incapacity.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor={nomineeNameId} className="block text-xs font-bold text-slate-700 mb-1">
                      Nominee Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={nomineeNameId}
                      type="text"
                      autoComplete="name"
                      required
                      value={nomineeName}
                      onChange={(e) => setNomineeName(e.target.value)}
                      placeholder="e.g. Meera Sharma"
                      className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white"
                    />
                    {fieldErrors.nomineeName && (
                      <p className="mt-1 text-[11px] text-red-600 font-semibold">{fieldErrors.nomineeName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor={nomineeEmailId} className="block text-xs font-bold text-slate-700 mb-1">
                      Nominee Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={nomineeEmailId}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={nomineeEmail}
                      onChange={(e) => setNomineeEmail(e.target.value)}
                      placeholder="nominee@domain.com"
                      className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white"
                    />
                    {fieldErrors.nomineeEmail && (
                      <p className="mt-1 text-[11px] text-red-600 font-semibold">{fieldErrors.nomineeEmail}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor={nomineeRelId} className="block text-xs font-bold text-slate-700 mb-1">
                    Relationship to User <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={nomineeRelId}
                    type="text"
                    required
                    value={nomineeRelationship}
                    onChange={(e) => setNomineeRelationship(e.target.value)}
                    placeholder="e.g. Legal Representative, Partner, Next of Kin"
                    className="w-full min-h-[46px] rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white"
                  />
                  {fieldErrors.nomineeRelationship && (
                    <p className="mt-1 text-[11px] text-red-600 font-semibold">{fieldErrors.nomineeRelationship}</p>
                  )}
                </div>
              </fieldset>
            )}

            {/* Dynamic Section: ERASURE ACKNOWLEDGMENT */}
            {requestType === 'ERASURE' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50/80 border border-red-200 space-y-3">
                <div className="flex items-center gap-2 text-red-900 font-black text-xs uppercase tracking-wider">
                  <span>⚠️</span> Statutory Legal Retention Warning
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  GST law (Section 36 of the CGST Act) and accounting regulations mandate retaining tax invoices, books of account, and GST return filings for a minimum statutory period (up to 72 months).
                </p>

                <label
                  htmlFor={erasureCheckboxId}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-red-200 cursor-pointer min-h-[48px] touch-manipulation hover:bg-white transition"
                >
                  <input
                    id={erasureCheckboxId}
                    type="checkbox"
                    checked={erasureAcknowledged}
                    onChange={(e) => {
                      setErasureAcknowledged(e.target.checked);
                      if (fieldErrors.erasure) {
                        setFieldErrors((prev) => ({ ...prev, erasure: '' }));
                      }
                    }}
                    aria-describedby={fieldErrors.erasure ? erasureErrorId : undefined}
                    className="mt-0.5 w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500 shrink-0"
                  />
                  <span className="text-xs font-semibold text-red-950 leading-relaxed select-none">
                    I acknowledge that personal identity records will be erased within 30 days, but legally mandated GST return records and invoices cannot be immediately purged.
                  </span>
                </label>

                {fieldErrors.erasure && (
                  <p id={erasureErrorId} className="text-xs font-bold text-red-700" role="alert">
                    ✕ {fieldErrors.erasure}
                  </p>
                )}
              </div>
            )}

            {/* Submit CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[50px] px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
                    <span>Verifying &amp; Recording Request…</span>
                  </>
                ) : (
                  <>
                    <span>Submit Formal Privacy Request</span>
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 3. Request History & Status Tracking */}
        <section aria-labelledby="history-heading" className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 id="history-heading" className="text-base sm:text-lg font-black text-slate-900">
                Your Request History &amp; Tracking
              </h2>
              <p className="text-xs text-slate-500">
                Review historical submissions, investigation progress, and official resolution logs.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRequests}
              disabled={listLoading}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition min-h-[36px]"
              aria-label="Refresh request list"
            >
              <span className={`text-sm ${listLoading ? 'animate-spin' : ''}`}>🔄</span>
              <span>Refresh</span>
            </button>
          </div>

          {/* Loading / Error States */}
          {listLoading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500" role="status">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span className="text-xs font-medium">Fetching verified submissions…</span>
            </div>
          )}

          {listError && !listLoading && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium" role="alert">
              {listError}
            </div>
          )}

          {!listLoading && !listError && requests.length === 0 && (
            <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 space-y-2">
              <span className="text-3xl block" aria-hidden="true">📭</span>
              <p className="text-sm font-bold text-slate-800">No Privacy Requests Recorded</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You have not submitted any privacy, rectification, or erasure requests yet. Use the form above whenever needed.
              </p>
            </div>
          )}

          {/* Mobile-Optimized Stacked Cards List */}
          <div className="space-y-3.5" role="list">
            {requests.map((req) => {
              const typeCfg = REQUEST_TYPE_INFO[req.request_type] ?? {
                label: req.request_type,
                badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
                icon: '📄',
              };
              const statusCfg = STATUS_CONFIG[req.status] ?? {
                label: req.status.replace(/_/g, ' '),
                badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                icon: '•',
              };
              const isExpanded = expandedId === req.id;

              return (
                <article
                  key={req.id}
                  className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300/80 transition bg-white shadow-xs"
                  role="listitem"
                >
                  {/* Top Bar: Badges + Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Type Badge */}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${typeCfg.badgeClass}`}>
                        <span aria-hidden="true">{typeCfg.icon}</span>
                        <span>{typeCfg.label}</span>
                      </span>

                      {/* Status Badge with accessible text + icon */}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusCfg.badgeClass}`}>
                        <span aria-hidden="true">{statusCfg.icon}</span>
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    <time className="text-[11px] font-medium text-slate-400 shrink-0">
                      {formatFullDate(req.created_at)}
                    </time>
                  </div>

                  {/* Description snippet */}
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <p className={isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
                      {req.description || 'No additional commentary provided.'}
                    </p>
                  </div>

                  {/* Expansion CTA Button (Min touch target 44px) */}
                  <div className="mt-3 pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 active:text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded py-2 px-1 min-h-[44px] cursor-pointer"
                    >
                      <span>{isExpanded ? '▲ Hide Milestones' : '▼ View Milestones & Timeline'}</span>
                    </button>

                    <span className="text-[10px] text-slate-400 font-mono">
                      REF: {req.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Expanded Timeline Accordion */}
                  {isExpanded && <RequestDetailTimeline requestId={req.id} />}
                </article>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}

export default PrivacyRequestsPage;

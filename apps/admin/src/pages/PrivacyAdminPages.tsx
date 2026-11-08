import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

// ============================================================================
// 1. PRIVACY RIGHTS REQUEST QUEUE
// ============================================================================

export interface PrivacyRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  channel: string;
  details: string | null;
  target_fields: string[] | null;
  nominee_name: string | null;
  nominee_contact: string | null;
  nominee_relationship: string | null;
  identity_verified_at: string | null;
  identity_verified_by: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  users?: { name?: string; email?: string } | null;
}

export interface PrivacyEvent {
  id: string;
  request_id: string;
  actor_label: string;
  event_type: string;
  note: string | null;
  created_at: string;
}

export function PrivacyRequestsAdminPage() {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PrivacyRequest | null>(null);
  const [requestEvents, setRequestEvents] = useState<PrivacyEvent[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Update form state inside modal
  const [newStatus, setNewStatus] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [eventNote, setEventNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/privacy/requests?limit=100';
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (typeFilter !== 'ALL') url += `&requestType=${typeFilter}`;
      const res = await api<{ requests: PrivacyRequest[]; total: number }>(url);
      setRequests(res.requests || []);
    } catch (err: any) {
      console.error('Failed to load privacy requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, typeFilter]);

  const openRequestModal = async (req: PrivacyRequest) => {
    setSelectedRequest(req);
    setNewStatus(req.status);
    setResolutionNote(req.resolution_note || '');
    setEventNote('');
    setErrorMsg('');
    setModalLoading(true);
    try {
      const res = await api<{ request: PrivacyRequest; events: PrivacyEvent[] }>(`/api/privacy/requests/${req.id}`);
      setRequestEvents(res.events || []);
    } catch {
      setRequestEvents([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!eventNote.trim()) {
      setErrorMsg('Audit note is required to record the action.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      let eventType = 'NOTE_ADDED';
      if (newStatus !== selectedRequest.status) {
        if (newStatus === 'COMPLETED') eventType = 'COMPLETED';
        else if (newStatus === 'REJECTED') eventType = 'REJECTED';
        else if (newStatus === 'IDENTITY_VERIFIED') eventType = 'IDENTITY_CHECKED';
        else eventType = 'STATUS_CHANGED';
      }

      await api(`/api/admin/privacy/requests/${selectedRequest.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus !== selectedRequest.status ? newStatus : undefined,
          resolutionNote: resolutionNote.trim() || undefined,
          eventType,
          eventNote: eventNote.trim(),
        }),
      });

      setSelectedRequest(null);
      await loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update request');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.users?.name?.toLowerCase().includes(q) ||
        r.users?.email?.toLowerCase().includes(q) ||
        r.request_type.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
      inReview: requests.filter((r) => r.status === 'IN_REVIEW' || r.status === 'IDENTITY_VERIFIED').length,
      completed: requests.filter((r) => r.status === 'COMPLETED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
    };
  }, [requests]);

  const statusBadge = (st: string) => {
    switch (st) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">Pending</span>;
      case 'IDENTITY_VERIFIED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">Identity Verified</span>;
      case 'IN_REVIEW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">In Review</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">Completed</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-800 border border-rose-200">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{st}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🛡️</span> Privacy Rights Request Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            DPDP Act, 2023 Statutory Rights Management: Summary, Correction, Erasure, Grievance & Nomination
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={loading}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Requests</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-xs">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Pending Action</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-xs">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.inReview}</p>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-xs">
          <p className="text-xs font-medium text-rose-700 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-bold text-rose-900 mt-1">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by ID, User Name, Email, or Request Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IDENTITY_VERIFIED">Identity Verified</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Request Types</option>
            <option value="DATA_SUMMARY">Data Summary</option>
            <option value="CORRECTION">Correction</option>
            <option value="ERASURE">Erasure</option>
            <option value="NOMINATION">Nomination</option>
            <option value="GRIEVANCE">Grievance</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading privacy requests...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No privacy requests found matching your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Request ID</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Requester</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                      {req.id.substring(0, 8)}...
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {req.request_type.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{req.users?.name || 'User'}</div>
                      <div className="text-xs text-slate-500">{req.users?.email || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(req.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      {statusBadge(req.status)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openRequestModal(req)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Inspect & Process →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Inspection Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>📋</span> Process Request: {selectedRequest.request_type.replace('_', ' ')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">ID: {selectedRequest.id}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Requester Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <p>
                <strong className="text-slate-700">Requester:</strong> {selectedRequest.users?.name} ({selectedRequest.users?.email})
              </p>
              <p>
                <strong className="text-slate-700">Submitted:</strong> {new Date(selectedRequest.created_at).toLocaleString('en-IN')}
              </p>
              {selectedRequest.nominee_name && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="font-semibold text-slate-900">Nominee Information:</p>
                  <p>Name: {selectedRequest.nominee_name} | Contact: {selectedRequest.nominee_contact}</p>
                  <p>Relationship: {selectedRequest.nominee_relationship}</p>
                </div>
              )}
              {selectedRequest.target_fields && selectedRequest.target_fields.length > 0 && (
                <p>
                  <strong className="text-slate-700">Target Data Fields:</strong> {selectedRequest.target_fields.join(', ')}
                </p>
              )}
              {selectedRequest.details && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="font-semibold text-slate-900">User Statement / Details:</p>
                  <p className="text-slate-600 whitespace-pre-wrap mt-0.5">{selectedRequest.details}</p>
                </div>
              )}
            </div>

            {/* Events Audit Trail */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Audit History</h4>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {modalLoading ? (
                  <p className="p-3 text-xs text-slate-400">Loading audit trail...</p>
                ) : requestEvents.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400">No events logged yet.</p>
                ) : (
                  requestEvents.map((ev) => (
                    <div key={ev.id} className="p-2.5 text-xs">
                      <div className="flex justify-between font-medium text-slate-800">
                        <span>{ev.event_type.replace('_', ' ')} ({ev.actor_label})</span>
                        <span className="text-slate-400">{new Date(ev.created_at).toLocaleTimeString('en-IN')}</span>
                      </div>
                      {ev.note && <p className="text-slate-500 mt-0.5">{ev.note}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Processing Form */}
            <form onSubmit={handleUpdate} className="space-y-4 pt-2 border-t border-slate-100">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Update Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IDENTITY_VERIFIED">IDENTITY_VERIFIED</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Resolution Note (User Facing)</label>
                  <input
                    type="text"
                    placeholder="e.g. Identity verified; data summary dispatched."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Audit Reason / Event Note *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Record what step was taken, verification methodology, or reason for rejection..."
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Commit Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. PRIVACY GOVERNANCE: CONSENT SEARCH & DATA BREACH REGISTER
// ============================================================================

export interface BreachIncident {
  id: string;
  title: string;
  status: string;
  severity: string;
  discovered_at: string;
  reported_by_name: string;
  description: string;
  affected_systems: string[];
  affected_data_categories: string[];
  estimated_affected_users: number | null;
  containment_steps: string | null;
  remediation_steps: string | null;
  dpb_notification_required: boolean;
  dpb_notification_sent_at: string | null;
  dpb_notification_reference: string | null;
  user_notification_required: boolean;
  user_notification_sent_at: string | null;
  created_at: string;
}

export function PrivacyGovernanceAdminPage() {
  const [activeTab, setActiveTab] = useState<'CONSENT' | 'BREACH'>('CONSENT');

  // Consent search state
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [consentResults, setConsentResults] = useState<any[]>([]);
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Breach incidents state
  const [incidents, setIncidents] = useState<BreachIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newSystems, setNewSystems] = useState('Database, Application Server');
  const [newDataCategories, setNewDataCategories] = useState('Contact details, GSTIN');
  const [newEstimatedUsers, setNewEstimatedUsers] = useState<number>(0);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);

  const handleSearchConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api<{ user: any; consents: any[] }>(`/api/admin/privacy/consent-search?email=${encodeURIComponent(searchEmail.trim())}`);
      setSearchedUser(res.user);
      setConsentResults(res.consents || []);
    } catch {
      setSearchedUser(null);
      setConsentResults([]);
    } finally {
      setSearching(false);
    }
  };

  const loadIncidents = async () => {
    setIncidentsLoading(true);
    try {
      const res = await api<{ incidents: BreachIncident[] }>('/api/admin/privacy/incidents');
      setIncidents(res.incidents || []);
    } catch {
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'BREACH') loadIncidents();
  }, [activeTab]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncidentSubmitting(true);
    try {
      await api('/api/admin/privacy/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          discoveredAt: new Date().toISOString(),
          description: newDesc.trim(),
          severity: newSeverity,
          affectedSystems: newSystems.split(',').map((s) => s.trim()).filter(Boolean),
          affectedDataCategories: newDataCategories.split(',').map((s) => s.trim()).filter(Boolean),
          estimatedAffectedUsers: newEstimatedUsers || 0,
        }),
      });

      setShowNewIncidentModal(false);
      setNewTitle('');
      setNewDesc('');
      await loadIncidents();
    } catch (err: any) {
      alert(err.message || 'Failed to create breach incident');
    } finally {
      setIncidentSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>🏛️</span> DPDP Governance & Incident Registry
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Consent Audit Trail Search & Section 8(6) Personal Data Breach Management Runbook
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('CONSENT')}
          className={`pb-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'CONSENT'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📜 Consent Audit Log Search
        </button>
        <button
          onClick={() => setActiveTab('BREACH')}
          className={`pb-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'BREACH'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🚨 Data Breach Incidents ({incidents.length})
        </button>
      </div>

      {/* TAB 1: Consent Search */}
      {activeTab === 'CONSENT' && (
        <div className="space-y-6">
          <form onSubmit={handleSearchConsent} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-3">
            <input
              type="email"
              required
              placeholder="Search user or lead by exact email address..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              {searching ? 'Searching...' : 'Search Consent History'}
            </button>
          </form>

          {hasSearched && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-800">
                    Target: {searchedUser ? `${searchedUser.name} (${searchedUser.email})` : searchEmail}
                  </span>
                  <span className="ml-2 text-slate-500">
                    ({consentResults.length} consent record{consentResults.length !== 1 ? 's' : ''} found)
                  </span>
                </div>
                <span className="text-slate-400 font-mono">Append-Only Audit</span>
              </div>

              {consentResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No consent records logged for this email address.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Timestamp</th>
                        <th className="px-5 py-3">Purpose</th>
                        <th className="px-5 py-3">Notice Ver</th>
                        <th className="px-5 py-3">Action</th>
                        <th className="px-5 py-3">Channel</th>
                        <th className="px-5 py-3">Data Categories</th>
                        <th className="px-5 py-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {consentResults.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3 text-slate-600">
                            {new Date(c.created_at).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-3 font-semibold font-sans text-slate-900">
                            {c.purpose}
                          </td>
                          <td className="px-5 py-3 text-slate-500">
                            v{c.notice_version}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                c.action === 'GRANTED'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {c.action}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600 font-sans">
                            {c.channel}
                          </td>
                          <td className="px-5 py-3 text-slate-500 font-sans">
                            {Array.isArray(c.data_categories) ? c.data_categories.join(', ') : ''}
                          </td>
                          <td className="px-5 py-3 text-slate-400">
                            {c.ip_address || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Breach Incident Register */}
      {activeTab === 'BREACH' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Personal Data Breach Incident Log compliant with DPDP Section 8(6) & DPDP Rules 2025.
            </p>
            <button
              onClick={() => setShowNewIncidentModal(true)}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>+</span> Log New Security Incident
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {incidentsLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading incident register...</div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No personal data breach incidents reported. System is secure.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Severity</th>
                      <th className="px-5 py-3.5">Incident Title</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Discovered</th>
                      <th className="px-5 py-3.5">Affected Users</th>
                      <th className="px-5 py-3.5">DPB Notified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : inc.severity === 'HIGH'
                                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                : inc.severity === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">
                          {inc.title}
                          <p className="text-xs text-slate-500 font-normal line-clamp-1">{inc.description}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-800">
                            {inc.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {new Date(inc.discovered_at).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold">
                          {inc.estimated_affected_users ?? 'Unknown'}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {inc.dpb_notification_sent_at ? (
                            <span className="text-emerald-700 font-semibold">✓ Yes ({new Date(inc.dpb_notification_sent_at).toLocaleDateString('en-IN')})</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Pending Assessment</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* New Incident Modal */}
          {showNewIncidentModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🚨</span> Record Personal Data Breach Incident
                  </h3>
                  <button
                    onClick={() => setShowNewIncidentModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateIncident} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Incident Title *</label>
                    <input
                      required
                      placeholder="e.g. Unauthorized access attempt on client export"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
                      <select
                        value={newSeverity}
                        onChange={(e) => setNewSeverity(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Affected Users</label>
                      <input
                        type="number"
                        min={0}
                        value={newEstimatedUsers}
                        onChange={(e) => setNewEstimatedUsers(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Affected Systems (comma-separated)</label>
                    <input
                      value={newSystems}
                      onChange={(e) => setNewSystems(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Affected Data Categories (comma-separated)</label>
                    <input
                      value={newDataCategories}
                      onChange={(e) => setNewDataCategories(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Incident Description & Initial Observations *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe the nature of the breach, affected records, and containment actions taken..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewIncidentModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={incidentSubmitting}
                      className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      {incidentSubmitting ? 'Recording...' : 'Record Incident'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. RETENTION POLICY REGISTER & ERASURE STAGING
// ============================================================================

export interface RetentionPolicy {
  id: string;
  table_name: string;
  description: string;
  retention_days: number | null;
  legal_basis: string;
  legal_reference: string;
  auto_purge_enabled: boolean;
  note: string | null;
}

export function PrivacyRetentionAdminPage() {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [pendingErasures, setPendingErasures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resPol, resPending] = await Promise.all([
        api<{ policies: RetentionPolicy[] }>('/api/admin/privacy/retention-policies'),
        api<{ pending: any[] }>('/api/admin/privacy/erasure-pending'),
      ]);
      setPolicies(resPol.policies || []);
      setPendingErasures(resPending.pending || []);
    } catch (err: any) {
      console.error('Failed to load retention data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualPurge = async () => {
    if (!confirm('Run automated retention purge for expired security records (OTP codes, sessions, reset tokens)?')) return;
    setPurging(true);
    try {
      const res = await api<any>('/api/admin/privacy/retention-purge', { method: 'POST' });
      setPurgeResult(res);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Purge failed');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Statutory Header */}
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-800 text-blue-200 border border-blue-700">
            DPDP Rules 2025 Compliance
          </span>
          <h1 className="text-2xl font-bold tracking-tight mt-2 flex items-center gap-2">
            <span>🗄️</span> Data Retention & Erasure Staging Registry
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl">
            Target Operational Date: <strong>13 May 2027</strong>. Financial GST records are strictly retained for 6 years per CGST Act 2017 Section 36.
          </p>
        </div>
        <button
          onClick={handleManualPurge}
          disabled={purging}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
        >
          <span>🧹</span> {purging ? 'Purging...' : 'Run Scheduled Security Purge'}
        </button>
      </div>

      {purgeResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
          <p className="font-bold">✓ Purge completed at {new Date(purgeResult.timestamp).toLocaleTimeString('en-IN')}:</p>
          <p>Total records purged across authorized tables: <strong>{purgeResult.totalPurged}</strong></p>
          <ul className="list-disc list-inside mt-1 text-emerald-800">
            {purgeResult.results?.map((r: any) => (
              <li key={r.table}>
                {r.table}: {r.purgedCount} records removed {r.error ? `(Error: ${r.error})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pending Erasures Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>⏳</span> Staged Account Erasures ({pendingErasures.length})
          </h3>
          <span className="text-xs text-slate-500">30-day grace period with statutory tax hold checks</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
        ) : pendingErasures.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No accounts currently scheduled for erasure.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Requested At</th>
                  <th className="px-5 py-3">Scheduled Deletion</th>
                  <th className="px-5 py-3">Hold Reason</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pendingErasures.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {u.name} ({u.email})
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {u.deletion_requested_at ? new Date(u.deletion_requested_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900">
                      {u.deletion_scheduled_at ? new Date(u.deletion_scheduled_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-5 py-3 text-amber-700 font-medium">
                      {u.deletion_hold_reason || 'None (in 30-day grace period)'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {u.is_anonymized ? 'Anonymized' : 'Staged for Purge'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Retention Policy Register */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            📋 Comprehensive Table Retention Register (16 Entities)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Documented basis, auto-purge authorization status, and statutory retention references.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading policies...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Table Name</th>
                  <th className="px-4 py-3">Entity Description</th>
                  <th className="px-4 py-3">Retention Period</th>
                  <th className="px-4 py-3">Legal Basis</th>
                  <th className="px-4 py-3">Auto Purge</th>
                  <th className="px-4 py-3">Legal Reference & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {p.table_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.description}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {p.retention_days ? `${p.retention_days} days` : 'Statutory / Legal Review'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.legal_basis}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.auto_purge_enabled ? (
                        <span className="text-emerald-700 font-bold">✓ Enabled</span>
                      ) : (
                        <span className="text-slate-400">Manual / Hold</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs">
                      <div>{p.legal_reference}</div>
                      {p.note && <div className="text-[10px] text-amber-600 mt-0.5">{p.note}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

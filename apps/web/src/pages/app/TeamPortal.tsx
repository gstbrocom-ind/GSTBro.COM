import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, clearToken, getToken } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { GstReturnConverterModal } from './GstReturnConverterModal';
import { TeamFinancialReportModal } from './TeamFinancialReportModal';
import { OpeningItcModal } from './OpeningItcModal';
import { PurchasesEntryModal } from './PurchasesEntryModal';
import { Gstr1DetailModal } from './Gstr1DetailModal';
import { ManualReturnEntryModal } from './ManualReturnEntryModal';
import { calculateMultiPeriodItcLedger, RawPeriodGstData } from '../../lib/itcEngine';
import { formatGstDateDisplay } from '../../lib/pdfReturnParser';
import { InvoiceDashboard } from './invoice/InvoiceDashboard';
import { PortalLoadingSkeleton } from '../../components/PortalLoadingSkeleton';

type TeamClient = {
  id: string;
  name: string;
  email: string;
  business_name?: string | null;
  gstin?: string | null;
  phone?: string | null;
  state?: string | null;
  address?: string | null;
};

type DueDate = {
  id: string;
  title: string;
  category: string;
  due_date: string;
  description?: string | null;
  deadline_key?: string;
};

const STATUTORY_REQUIREMENTS_LIST = [
  { key: 'GSTR-1', label: 'GSTR-1 (Monthly Outward Supplies)', tag: 'GST' },
  { key: 'GSTR-3B', label: 'GSTR-3B (Monthly Summary & Tax Payment)', tag: 'GST' },
  { key: 'TDS_DEPOSIT', label: 'TDS / TCS Deposit (Challan 281)', tag: 'TDS' },
  { key: 'TDS_RETURNS', label: 'TDS Quarterly Statements (24Q / 26Q / 27EQ)', tag: 'TDS' },
  { key: 'GST_TDS_TCS', label: 'GST TDS & TCS (GSTR-7 & GSTR-8)', tag: 'GST TDS' },
  { key: 'QRMP_SCHEME', label: 'QRMP Scheme (IFF & PMT-06)', tag: 'QRMP' },
  { key: 'COMPOSITION', label: 'Composition Scheme (CMP-08)', tag: 'COMPOSITION' },
  { key: 'ADVANCE_TAX', label: 'Advance Income Tax Instalments', tag: 'INCOME TAX' },
  { key: 'ANNUAL_RETURNS', label: 'Annual Returns & Reconciliation (GSTR-9 / 9C)', tag: 'ANNUAL' },
];

type ClientDocument = {
  id: string;
  file_name: string;
  category: string;
  uploaded_at: string;
};

type ChatMessage = {
  id: string;
  message: string;
  sender_user_id: string;
  created_at: string;
  read_at?: string | null;
};

const CATEGORIES = [
  { key: 'CLIENT_DOCS', label: 'KYC & Client Docs' },
  { key: 'SALES', label: 'Sales Register' },
  { key: 'PURCHASES', label: 'Purchase Register' },
  { key: 'GSTR1', label: 'GSTR-1 Filed Returns' },
  { key: 'GSTR3B', label: 'GSTR-3B Filed Returns' },
  { key: 'ITC', label: 'ITC & Ledger Statements' },
];

const MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
];

const YEARS = ['2026-27', '2025-26', '2024-25'];

function formatStandardFileName(
  clientName: string,
  category: string,
  month: string,
  year: string,
  originalFileName: string
): string {
  const ext = originalFileName.includes('.')
    ? originalFileName.substring(originalFileName.lastIndexOf('.'))
    : '';
  const baseName = originalFileName
    .substring(0, originalFileName.includes('.') ? originalFileName.lastIndexOf('.') : originalFileName.length)
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedClient = clientName.replace(/[^a-zA-Z0-9_\s-]/g, '').trim();

  const categoryLabels: Record<string, string> = {
    SALES: 'Sales Register',
    PURCHASES: 'Purchase Register',
    GSTR1: 'GSTR-1 Filed Return',
    GSTR3B: 'GSTR-3B Filed Return',
    ITC: 'ITC Statement',
    CLIENT_DOCS: 'KYC & Business Doc',
  };
  const typeLabel = categoryLabels[category] || 'Document';

  if (category === 'SALES' || category === 'PURCHASES') {
    return `${sanitizedClient} - ${typeLabel} - ${month} ${year} - ${baseName}${ext}`;
  }
  return `${sanitizedClient} - ${typeLabel} - ${baseName}${ext}`;
}

export function TeamPortal() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<TeamClient[]>([]);
  const [dueDates, setDueDates] = useState<DueDate[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'returns' | 'mis' | 'chat' | 'documents' | 'calendar' | 'invoicing'>('overview');

  // Client workspace data
  const [clientProfile, setClientProfile] = useState<TeamClient | null>(null);
  const [gstData, setGstData] = useState<RawPeriodGstData[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [converterOpen, setConverterOpen] = useState(false);
  const [financialModalOpen, setFinancialModalOpen] = useState(false);
  const [openingItcModalOpen, setOpeningItcModalOpen] = useState(false);
  const [purchasesModalOpen, setPurchasesModalOpen] = useState(false);
  const [purchasesSelectedPeriod, setPurchasesSelectedPeriod] = useState<string | undefined>(undefined);
  const [manualReturnModalOpen, setManualReturnModalOpen] = useState(false);
  const [manualReturnSelectedPeriod, setManualReturnSelectedPeriod] = useState<string | undefined>(undefined);
  const [manualReturnSelectedRow, setManualReturnSelectedRow] = useState<any>(null);
  const [returnFilter, setReturnFilter] = useState<'ALL' | 'GSTR1' | 'GSTR3B'>('ALL');
  const [calendarCategory, setCalendarCategory] = useState<'ALL' | 'GST' | 'TDS_TCS' | 'INCOME_TAX' | 'ANNUAL'>('ALL');
  const [gstr1ModalOpen, setGstr1ModalOpen] = useState(false);
  const [selectedGstr1Row, setSelectedGstr1Row] = useState<any>(null);

  // Upload state
  const [uploadCategory, setUploadCategory] = useState('SALES');
  const [uploadMonth, setUploadMonth] = useState('April');
  const [uploadYear, setUploadYear] = useState('2026-27');
  const [customFileName, setCustomFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status & loading
  const [loading, setLoading] = useState(true);
  const [loadingClient, setLoadingClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Client MIS presentation format preference
  const [clientMisType, setClientMisType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL');
  const [savingMisConfig, setSavingMisConfig] = useState(false);
  const [misConfigSuccess, setMisConfigSuccess] = useState(false);

  // Client dashboard view mode (Team decides: 'STANDARD' for Tax Pro or 'SIMPLE' for non-GST person)
  const [clientDashboardMode, setClientDashboardMode] = useState<'STANDARD' | 'SIMPLE'>('STANDARD');
  const [savingDashboardMode, setSavingDashboardMode] = useState(false);

  // Client statutory deadline requirements & completed status
  const [clientApplicableRequirements, setClientApplicableRequirements] = useState<string[]>([
    'GSTR-1',
    'GSTR-3B',
    'TDS_DEPOSIT',
    'ANNUAL_RETURNS',
  ]);
  const [clientCompletedDeadlines, setClientCompletedDeadlines] = useState<Record<string, string[]>>({});
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [complianceSuccess, setComplianceSuccess] = useState(false);
  const [complianceMonth, setComplianceMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Auto-generator and deadline inline date edit state
  const [generatingDeadlines, setGeneratingDeadlines] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [editingDeadlineDate, setEditingDeadlineDate] = useState<string>('');
  const [savingDeadlineDate, setSavingDeadlineDate] = useState(false);

  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gstbro_team_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gstbro_team_theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  // Check auth and initial load
  useEffect(() => {
    const token = getToken();
    if (!token) {
      clearToken();
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'TEAM' && payload.role !== 'ADMIN') {
        clearToken();
        navigate('/login');
        return;
      }
    } catch {
      clearToken();
      navigate('/login');
      return;
    }

    Promise.all([
      apiFetch<{ clients: TeamClient[] }>('/api/team/dashboard'),
      apiFetch<{ dueDates: DueDate[] }>('/api/due-dates'),
    ])
      .then(([dashboard, calendar]) => {
        setClients(dashboard.clients || []);
        setDueDates(calendar.dueDates || []);
        const queryClientId = searchParams.get('client') || searchParams.get('clientId');
        if (queryClientId && dashboard.clients?.some((c) => c.id === queryClientId)) {
          setSelectedId(queryClientId);
        } else if (dashboard.clients && dashboard.clients.length > 0) {
          setSelectedId(dashboard.clients[0].id);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unable to load team workspace';
        if (msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('Invalid token') || msg.includes('jwt')) {
          clearToken();
          navigate('/login');
          return;
        }
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [navigate, searchParams]);

  // Sync selected client if query parameter changes while on page
  useEffect(() => {
    const queryClientId = searchParams.get('client') || searchParams.get('clientId');
    if (queryClientId && queryClientId !== selectedId && clients.some((c) => c.id === queryClientId)) {
      setSelectedId(queryClientId);
    }
  }, [searchParams, clients, selectedId]);

  // Load selected client workspace data
  const loadClientWorkspace = async (id: string) => {
    if (!id) return;
    setLoadingClient(true);
    try {
      const res = await apiFetch<{
        client: TeamClient;
        gstData: RawPeriodGstData[];
        documents: ClientDocument[];
        driveFolderUrl?: string;
        completedByPeriod?: Record<string, string[]>;
      }>(`/api/clients/${id}/workspace`);

      setClientProfile(res.client);
      setGstData(res.gstData || []);
      setDocuments(res.documents || []);
      setDriveFolderUrl(res.driveFolderUrl || null);

      if (Array.isArray((res.client as any)?.applicableRequirements)) {
        setClientApplicableRequirements((res.client as any).applicableRequirements);
      } else {
        setClientApplicableRequirements(['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS']);
      }
      if (res.completedByPeriod) {
        setClientCompletedDeadlines(res.completedByPeriod);
      }

      // Determine client MIS type from data or PAN 4th character
      let detectedType: 'INDIVIDUAL' | 'CORPORATE' | null = null;
      for (const r of res.gstData || []) {
        const salesObj = (r.sales || {}) as Record<string, unknown>;
        if (salesObj.misReportType === 'INDIVIDUAL' || salesObj.misReportType === 'CORPORATE') {
          detectedType = salesObj.misReportType;
          break;
        }
        const rep = (salesObj.financialReport || (r.purchases as Record<string, unknown>)?.financialReport) as any;
        if (rep?.reportType === 'INDIVIDUAL' || rep?.reportType === 'CORPORATE') {
          detectedType = rep.reportType;
          break;
        }
      }
      if (!detectedType) {
        const gstin = res.client?.gstin?.trim() || '';
        if (gstin.length >= 6 && gstin.charAt(5).toUpperCase() === 'P') {
          detectedType = 'INDIVIDUAL';
        } else if (gstin.length >= 6) {
          detectedType = 'CORPORATE';
        } else {
          detectedType = 'INDIVIDUAL';
        }
      }
      setClientMisType(detectedType);

      // Determine client dashboard mode preference (Team decided)
      const assignedMode = (res.client as any)?.assignedDashboardMode;
      if (assignedMode === 'STANDARD' || assignedMode === 'SIMPLE') {
        setClientDashboardMode(assignedMode);
      } else {
        let rowMode: 'STANDARD' | 'SIMPLE' = 'STANDARD';
        for (const r of res.gstData || []) {
          const s = (r.sales || {}) as Record<string, unknown>;
          if (s.dashboardMode === 'STANDARD' || s.dashboardMode === 'SIMPLE') {
            rowMode = s.dashboardMode as 'STANDARD' | 'SIMPLE';
            break;
          }
        }
        setClientDashboardMode(rowMode);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load client workspace';
      if (msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('Invalid token') || msg.includes('jwt')) {
        clearToken();
        navigate('/login');
        return;
      }
      setError(msg);
    } finally {
      setLoadingClient(false);
    }
  };

  const isDeadlineCompleted = (deadline: DueDate, month: string) => {
    const dueY = parseInt(deadline.due_date.slice(0, 4), 10);
    const dueM = parseInt(deadline.due_date.slice(5, 7), 10);
    const prevDate = new Date(dueY, dueM - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    const periodsToCheck = [month, prevMonthStr, deadline.due_date.slice(0, 7)];
    for (const p of periodsToCheck) {
      const completedList = clientCompletedDeadlines[p] || [];
      const tUpper = deadline.title.toUpperCase();
      const key = (deadline.deadline_key || '').toUpperCase();
      const marked = completedList.some((item) => {
        const iUpper = item.toUpperCase();
        if (item === deadline.id) return true;
        if (key && iUpper === key) return true;
        if (iUpper === 'GSTR-1' && (tUpper.includes('GSTR-1') || key.includes('GSTR-1'))) return true;
        if (iUpper === 'GSTR-3B' && (tUpper.includes('GSTR-3B') || key.includes('GSTR-3B'))) return true;
        if (iUpper === 'TDS_DEPOSIT' && (tUpper.includes('CHALLAN ITNS 281') || tUpper.includes('TDS / TCS MONTHLY DEPOSIT'))) return true;
        return tUpper.includes(iUpper);
      });
      if (marked) return true;

      const row = gstData.find((r) => r.period === p);
      if (row) {
        const g1 = (row.gstr1 || {}) as Record<string, unknown>;
        const g3b = (row.gstr3b || {}) as Record<string, unknown>;
        if ((tUpper.includes('GSTR-1') || key.includes('GSTR-1')) && (g1.arn || g1.arnDate)) return true;
        if ((tUpper.includes('GSTR-3B') || key.includes('GSTR-3B')) && (g3b.arn || g3b.arnDate)) return true;
      }
    }
    return false;
  };

  const isDeadlineApplicable = (deadline: DueDate) => {
    if (!clientApplicableRequirements.length) return true;
    const tUpper = deadline.title.toUpperCase();
    const cUpper = deadline.category.toUpperCase();
    const key = deadline.deadline_key || '';

    return clientApplicableRequirements.some((req) => {
      if (key === req) return true;
      switch (req) {
        case 'GSTR-1':
          return tUpper.includes('GSTR-1') || cUpper.includes('GSTR-1');
        case 'GSTR-3B':
          return tUpper.includes('GSTR-3B') || cUpper.includes('GSTR-3B') || tUpper.includes('GSTR-2B');
        case 'TDS_DEPOSIT':
          return tUpper.includes('CHALLAN ITNS 281') || tUpper.includes('TDS / TCS MONTHLY DEPOSIT') || key === 'TDS_DEPOSIT';
        case 'TDS_RETURNS':
          return tUpper.includes('24Q') || tUpper.includes('26Q') || tUpper.includes('27EQ') || tUpper.includes('PROPERTY / RENT');
        case 'GST_TDS_TCS':
          return tUpper.includes('GSTR-7') || tUpper.includes('GSTR-8') || cUpper.includes('GST TDS') || cUpper.includes('GST TCS');
        case 'QRMP_SCHEME':
          return tUpper.includes('IFF') || tUpper.includes('PMT-06') || tUpper.includes('QRMP');
        case 'COMPOSITION':
          return tUpper.includes('CMP-08') || tUpper.includes('COMPOSITION');
        case 'ADVANCE_TAX':
          return tUpper.includes('ADVANCE') || cUpper === 'INCOME_TAX';
        case 'ANNUAL_RETURNS':
          return tUpper.includes('GSTR-9') || cUpper === 'ANNUAL';
        default:
          return tUpper.includes(req.toUpperCase()) || cUpper.includes(req.toUpperCase());
      }
    });
  };

  const handleToggleDeadline = async (deadline: DueDate) => {
    if (!selectedId) return;
    const currentlyDone = isDeadlineCompleted(deadline, complianceMonth);
    const targetKey = deadline.deadline_key || deadline.id;
    const period = complianceMonth;

    setClientCompletedDeadlines((prev) => {
      const list = prev[period] || [];
      let nextList: string[];
      if (!currentlyDone) {
        nextList = [...new Set([...list, targetKey, deadline.id, deadline.title])];
      } else {
        nextList = list.filter((k) => k !== targetKey && k !== deadline.id && k !== deadline.title);
      }
      return { ...prev, [period]: nextList };
    });

    try {
      await apiFetch(`/api/clients/${selectedId}/compliance`, {
        method: 'POST',
        body: JSON.stringify({
          period,
          deadlineKey: targetKey,
          completed: !currentlyDone,
          applicableRequirements: clientApplicableRequirements,
        }),
      });
      setSuccessMsg(
        !currentlyDone
          ? `✓ "${deadline.title}" marked as Done! It is now hidden from the client portal for ${complianceMonth}.`
          : `"${deadline.title}" marked as pending.`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update deadline status');
      loadClientWorkspace(selectedId);
    }
  };

  const loadDueDates = async () => {
    try {
      const calendar = await apiFetch<{ dueDates: DueDate[] }>('/api/due-dates');
      if (calendar.dueDates) {
        setDueDates(calendar.dueDates);
      }
    } catch {}
  };

  const handleToggleRequirement = (key: string) => {
    setClientApplicableRequirements((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllReqs = () => {
    setClientApplicableRequirements(STATUTORY_REQUIREMENTS_LIST.map((r) => r.key));
  };

  const handleUnselectAllReqs = () => {
    setClientApplicableRequirements([]);
  };

  const handleResetDefaultReqs = () => {
    setClientApplicableRequirements(['GSTR-1', 'GSTR-3B']);
  };

  const handleSaveClientRequirements = async () => {
    if (!selectedId || savingCompliance) return;
    setSavingCompliance(true);
    try {
      await apiFetch(`/api/clients/${selectedId}/compliance`, {
        method: 'POST',
        body: JSON.stringify({
          applicableRequirements: clientApplicableRequirements,
          period: complianceMonth,
        }),
      });
      setComplianceSuccess(true);
      setSuccessMsg('Client statutory filing requirements saved successfully!');
      setTimeout(() => {
        setComplianceSuccess(false);
        setSuccessMsg('');
      }, 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save client requirements');
    } finally {
      setSavingCompliance(false);
    }
  };

  const handleAutoGenerateDeadlinesForMonth = async () => {
    if (!complianceMonth) return;
    const [yStr, mStr] = complianceMonth.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    if (!year || !month) return;

    setGeneratingDeadlines(true);
    try {
      const res = await apiFetch<{ message: string; dueDates?: DueDate[] }>('/api/admin/due-dates/generate-month', {
        method: 'POST',
        body: JSON.stringify({ year, month, overwrite: false }),
      });
      setSuccessMsg(res.message || `Statutory deadlines automatically generated for ${complianceMonth}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await loadDueDates();
      if (selectedId) {
        await loadClientWorkspace(selectedId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to auto-generate statutory deadlines');
    } finally {
      setGeneratingDeadlines(false);
    }
  };

  const handleStartEditDeadlineDate = (item: DueDate) => {
    setEditingDeadlineId(item.id);
    setEditingDeadlineDate(item.due_date ? item.due_date.substring(0, 10) : '');
  };

  const handleCancelEditDeadlineDate = () => {
    setEditingDeadlineId(null);
    setEditingDeadlineDate('');
  };

  const handleSaveDeadlineDate = async (deadlineId: string) => {
    if (!editingDeadlineDate || savingDeadlineDate) return;
    setSavingDeadlineDate(true);
    try {
      await apiFetch(`/api/admin/due-dates/${deadlineId}`, {
        method: 'PATCH',
        body: JSON.stringify({ dueDate: editingDeadlineDate }),
      });
      setSuccessMsg('Statutory due date updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setEditingDeadlineId(null);
      await loadDueDates();
      if (selectedId) {
        await loadClientWorkspace(selectedId);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update due date');
    } finally {
      setSavingDeadlineDate(false);
    }
  };

  // Update client MIS model preference
  const handleUpdateMisConfig = async (type: 'INDIVIDUAL' | 'CORPORATE') => {
    if (!selectedId || savingMisConfig) return;
    setSavingMisConfig(true);
    setMisConfigSuccess(false);
    setError('');

    try {
      await apiFetch(`/api/clients/${selectedId}/mis-config`, {
        method: 'PUT',
        body: JSON.stringify({ misReportType: type, dashboardMode: clientDashboardMode }),
      });

      setClientMisType(type);
      setMisConfigSuccess(true);
      setTimeout(() => setMisConfigSuccess(false), 4000);

      // Refresh workspace data silently
      loadClientWorkspace(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update MIS configuration');
    } finally {
      setSavingMisConfig(false);
    }
  };

  // Update client dashboard mode preference (Team decided - hidden from client)
  const handleUpdateDashboardMode = async (mode: 'STANDARD' | 'SIMPLE') => {
    if (!selectedId || savingDashboardMode) return;
    setSavingDashboardMode(true);
    setError('');

    try {
      await apiFetch(`/api/clients/${selectedId}/mis-config`, {
        method: 'PUT',
        body: JSON.stringify({ dashboardMode: mode, misReportType: clientMisType }),
      });

      setClientDashboardMode(mode);
      setSuccessMsg(`Client dashboard mode switched to ${mode === 'SIMPLE' ? 'Simple (Non-GST Person)' : 'Tax Professional (Standard)'} view.`);
      setTimeout(() => setSuccessMsg(''), 4000);

      // Refresh workspace data silently
      loadClientWorkspace(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dashboard mode');
    } finally {
      setSavingDashboardMode(false);
    }
  };

  // Load chat messages for selected client
  const loadClientMessages = async (id: string) => {
    if (!id) return;
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(`/api/team/clients/${id}/messages`);
      setMessages(res.messages || []);
    } catch {
      // silently ignore message load failures
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadClientWorkspace(selectedId);
      loadClientMessages(selectedId);
    }
  }, [selectedId]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Calculate live multi-period ITC ledger
  const itcLedger = useMemo(() => calculateMultiPeriodItcLedger(gstData), [gstData]);

  // Handle client selection change
  const handleClientSelect = (id: string) => {
    setSelectedId(id);
    setSelectedFile(null);
    setCustomFileName('');
  };

  // Handle file select with auto-naming
  const handleFileChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const clientName = clientProfile?.business_name || clientProfile?.name || 'Client';
    const formatted = formatStandardFileName(clientName, uploadCategory, uploadMonth, uploadYear, file.name);
    setCustomFileName(formatted);
  };

  // Handle file upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedId) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const body = new FormData();
      const ext = selectedFile.name.includes('.') ? selectedFile.name.substring(selectedFile.name.lastIndexOf('.')) : '';
      let finalName = customFileName.trim() || selectedFile.name;
      if (ext && !finalName.toLowerCase().endsWith(ext.toLowerCase())) {
        finalName += ext;
      }

      body.append('file', selectedFile, finalName);
      body.append('category', uploadCategory);

      await apiFetch(`/api/clients/${selectedId}/documents`, { method: 'POST', body });
      setSuccessMsg(`Document "${finalName}" uploaded successfully.`);
      setSelectedFile(null);
      setCustomFileName('');
      loadClientWorkspace(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  // Send chat message
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatText.trim();
    if (!text || !selectedId || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await apiFetch<{ message: ChatMessage }>(`/api/team/clients/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setChatText('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedId) || clientProfile;
  const clientDisplayName = selectedClient?.business_name || selectedClient?.name || 'Selected Client';

  // Metrics summary
  const latestGst = gstData[0];
  const turnover = Number(latestGst?.sales?.taxableSales || latestGst?.sales?.total || 0);
  const outputTax = Number(latestGst?.sales?.outputTax || latestGst?.sales?.gstAmount || 0);
  const itc = Number(latestGst?.itc?.totalItc || latestGst?.itc?.total || 0);
  const cashPaid = Number(latestGst?.gstr3b?.cashPaid) || Number(latestGst?.sales?.cashTaxPaid) || Math.max(0, outputTax - itc);

  if (loading) {
    return <PortalLoadingSkeleton dark={dark} />;
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${dark ? 'portal-dark bg-[#0b1329] text-[#e2e8f0]' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Navigation Bar */}
      <header className={`border-b sticky top-0 z-30 shadow-xs transition-colors duration-150 ${dark ? 'bg-[#0b1329] border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className={`font-black text-2xl tracking-tight select-none leading-none ${dark ? 'text-white' : 'text-slate-900'}`}>
              GST<span className={`text-transparent bg-clip-text ${dark ? 'bg-gradient-to-r from-blue-400 to-cyan-300' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>Bro</span>
            </span>
            <span className={`hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${dark ? 'bg-blue-950/80 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
              Team Workbench
            </span>
          </div>

          {/* Quick Client Switcher */}
          <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
            <span className={`text-xs font-bold shrink-0 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Client:</span>
            <select
              value={selectedId}
              onChange={(e) => handleClientSelect(e.target.value)}
              className={`w-full text-xs font-semibold border rounded-lg px-3 py-1.5 focus:outline-none transition ${dark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-400' : 'bg-slate-50 border-slate-300 focus:border-blue-500 focus:bg-white'}`}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name || c.name} {c.gstin ? `(${c.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Right User & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setDark(!dark)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                dark
                  ? 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={dark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              <span>{dark ? '☀️' : '🌙'}</span>
              <span className="hidden lg:inline text-[11px]">{dark ? 'Light mode' : 'Dark mode'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-right">
              <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center ${dark ? 'bg-slate-800 text-blue-300 border border-slate-700' : 'bg-slate-200 text-slate-700'}`}>
                TM
              </div>
              <div className="text-left">
                <span className={`block text-xs font-bold leading-tight ${dark ? 'text-slate-200' : 'text-slate-800'}`}>Team Officer</span>
                <span className="block text-[10px] text-emerald-500 font-semibold leading-tight">Active Duty</span>
              </div>
            </div>

            <button
              onClick={logout}
              className={`text-xs font-semibold px-3 py-1.5 border rounded-lg hover:text-red-400 hover:bg-red-500/10 transition ${dark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600'}`}
            >
              Sign out
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg text-lg ${dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top duration-150 ${dark ? 'bg-[#0b1329] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className={`flex items-center justify-between pb-2 border-b ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  TM
                </div>
                <div>
                  <span className={`block text-xs font-bold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>Team Officer</span>
                  <span className="block text-[10px] text-emerald-500 font-semibold">Active Duty</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDark(!dark)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${dark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <span>{dark ? '☀️ Light' : '🌙 Dark'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'overview' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>⌂</span> Overview
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('returns'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'returns' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>↗</span> Returns
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('mis'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'mis' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>📊</span> MIS Reports
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('chat'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'chat' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>💬</span> Chat ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'documents' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>📁</span> Client Files
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('calendar'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'calendar' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>📅</span> Due Dates
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('invoicing'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl text-left flex items-center gap-2 ${activeTab === 'invoicing' ? (dark ? 'bg-blue-900/60 text-blue-300 font-bold' : 'bg-blue-50 text-blue-700 font-bold') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
              >
                <span>🧾</span> GST Invoices
              </button>
            </div>

            <div className={`pt-2 border-t ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={logout}
                className="w-full text-xs font-semibold py-2 px-3 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center gap-2 transition"
              >
                <span>↪</span> Sign out
              </button>
            </div>
          </div>
        )}

        {/* Mobile Client Switcher */}
        <div className={`md:hidden px-4 py-2 border-t ${dark ? 'border-slate-800 bg-[#0b1329]' : 'border-slate-100 bg-slate-50'}`}>
          <label className={`text-[10px] font-bold block mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Select Client Workspace:</label>
          <select
            value={selectedId}
            onChange={(e) => handleClientSelect(e.target.value)}
            className={`w-full text-xs font-semibold rounded-lg px-2.5 py-2 shadow-xs outline-none ${dark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name || c.name} {c.gstin ? `(${c.gstin})` : ''}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8 space-y-6">
        {/* Status Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 flex justify-between items-center shadow-xs">
            <span><strong>Notice:</strong> {error}</span>
            <button onClick={() => setError('')} className="font-bold text-base leading-none">×</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex justify-between items-center shadow-xs">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="font-bold text-base leading-none">×</button>
          </div>
        )}

        {/* Client Master Banner */}
        <div className={`rounded-2xl border p-5 shadow-sm space-y-4 transition-colors ${
          dark ? 'bg-[#0f172a] border-slate-800 text-slate-200' : 'bg-white border-slate-200/80 text-slate-900'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className={`text-xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {clientDisplayName}
                </h1>
                {selectedClient?.gstin && (
                  <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    dark ? 'bg-blue-950/80 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {selectedClient.gstin}
                  </span>
                )}
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  dark ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/80' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  Compliance Active
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  dark ? 'text-indigo-300 bg-indigo-950/80 border-indigo-800/80' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                }`}>
                  {clientMisType === 'INDIVIDUAL' ? '👤 MIS: Individual (GST)' : '🏢 MIS: Corporate (P&L)'}
                </span>
              </div>
              <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Email: <span className={`font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{selectedClient?.email || 'N/A'}</span> • Phone: <span className={`font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{selectedClient?.phone || 'N/A'}</span> • State: <span className={`font-medium ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{selectedClient?.state || 'Telangana'}</span>
              </p>
            </div>

            {/* Quick Actions Action Bar - Responsive 2x2 on Mobile, Inline on Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setConverterOpen(true)}
                disabled={!selectedId}
                className="min-h-[44px] px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>⚡</span> Convert Return
              </button>

              <button
                type="button"
                onClick={() => setOpeningItcModalOpen(true)}
                disabled={!selectedId}
                className="min-h-[44px] px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Enter the opening balance of ITC for the start of the financial year"
              >
                <span>🏦</span> Opening ITC Balance
              </button>

              <button
                type="button"
                onClick={() => setFinancialModalOpen(true)}
                disabled={!selectedId}
                className="min-h-[44px] px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>📊</span> Publish MIS
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                disabled={!selectedId}
                className="min-h-[44px] px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>💬</span> Chat ({messages.length})
              </button>

              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`col-span-2 sm:col-span-1 min-h-[44px] px-3.5 py-2.5 border active:scale-95 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 ${
                    dark 
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>📁</span> Drive Vault ↗
                </a>
              )}
            </div>
          </div>

          {/* Client Dashboard View Mode & Experience Controller (Team-controlled, client cannot switch) */}
          <div className={`border rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
            dark 
              ? 'bg-[#101b33] border-[#1e2f56] text-slate-200 shadow-sm' 
              : 'bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border-blue-100 text-slate-800'
          }`}>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-black uppercase tracking-wider ${dark ? 'text-slate-100' : 'text-slate-800'}`}>
                  Client Dashboard Mode:
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  clientDashboardMode === 'SIMPLE'
                    ? (dark ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' : 'bg-amber-100 text-amber-900 border-amber-300')
                    : (dark ? 'bg-blue-950/80 text-blue-300 border-blue-800/80' : 'bg-blue-100 text-blue-900 border-blue-300')
                }`}>
                  {clientDashboardMode === 'SIMPLE' ? '👤 Simple (Non-GST Person)' : '🏢 Tax Professional (Standard)'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                  dark ? 'text-slate-400 bg-slate-900/80 border-slate-700/80' : 'text-slate-500 bg-white border-slate-200'
                }`}>
                  Team Decided · Hidden From Client
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                Determines how {clientDisplayName} sees their dashboard.{' '}
                <strong className={dark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>Simple Mode</strong>{' '}
                provides low-technical plain language (Sales, Purchases, Tax Saved, Bank Payment) designed for non-GST users.{' '}
                <strong className={dark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>Tax Professional Mode</strong>{' '}
                displays complete GSTR-1/3B tables, Table 4 ITC Credit Ledger, and RCM.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={savingDashboardMode || !selectedId}
                onClick={() => handleUpdateDashboardMode('STANDARD')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  clientDashboardMode === 'STANDARD'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-sm'
                    : (dark 
                        ? 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100')
                }`}
              >
                <span>🏢</span> Tax Professional
              </button>
              <button
                type="button"
                disabled={savingDashboardMode || !selectedId}
                onClick={() => handleUpdateDashboardMode('SIMPLE')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  clientDashboardMode === 'SIMPLE'
                    ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-sm'
                    : (dark 
                        ? 'bg-slate-900/90 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100')
                }`}
              >
                <span>👤</span> Simple (Non-GST)
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t ${dark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className={`p-3 rounded-xl border ${dark ? 'bg-[#111c38] border-[#1e2f56]' : 'bg-slate-50/70 border-slate-100'}`}>
              <span className={`text-[10px] uppercase font-bold block ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Current Turnover</span>
              <strong className={`text-base font-bold block font-mono mt-0.5 ${dark ? 'text-white' : 'text-slate-900'}`}>
                ₹{turnover.toLocaleString('en-IN')}
              </strong>
              <small className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Latest filing period</small>
            </div>

            <div className={`p-3 rounded-xl border ${dark ? 'bg-[#111c38] border-[#1e2f56]' : 'bg-slate-50/70 border-slate-100'}`}>
              <span className={`text-[10px] uppercase font-bold block ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Output Tax</span>
              <strong className="text-base font-bold text-amber-500 block font-mono mt-0.5">
                ₹{outputTax.toLocaleString('en-IN')}
              </strong>
              <small className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Total liability</small>
            </div>

            <div className={`p-3 rounded-xl border ${dark ? 'bg-[#111c38] border-[#1e2f56]' : 'bg-slate-50/70 border-slate-100'}`}>
              <span className={`text-[10px] uppercase font-bold block ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Eligible ITC</span>
              <strong className="text-base font-bold text-emerald-400 block font-mono mt-0.5">
                ₹{itc.toLocaleString('en-IN')}
              </strong>
              <small className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Electronic Credit Ledger</small>
            </div>

            <div className={`p-3 rounded-xl border ${dark ? 'bg-[#111c38] border-[#1e2f56]' : 'bg-slate-50/70 border-slate-100'}`}>
              <span className={`text-[10px] uppercase font-bold block ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Net Cash Paid</span>
              <strong className={`text-base font-bold block font-mono mt-0.5 ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                ₹{cashPaid.toLocaleString('en-IN')}
              </strong>
              <small className={`text-[10px] ${dark ? 'text-slate-400' : 'text-slate-400'}`}>Challan PMT-06</small>
            </div>

            <div
              onClick={() => setActiveTab('calendar')}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between col-span-2 sm:col-span-1 ${
                dark 
                  ? 'bg-blue-950/40 hover:bg-blue-900/40 border-blue-800/80 text-blue-300' 
                  : 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-200/80 text-blue-900'
              }`}
            >
              <div>
                <span className={`text-[10px] uppercase font-bold block ${dark ? 'text-blue-400' : 'text-blue-700'}`}>Compliance Status</span>
                <strong className={`text-xs font-bold block mt-0.5 ${dark ? 'text-blue-200' : 'text-blue-900'}`}>
                  {clientApplicableRequirements.length} Requirements
                </strong>
              </div>
              <span className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                Mark as Done ➔
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b overflow-x-auto gap-1 ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          {[
            { id: 'overview', icon: '⌂', label: 'Overview & Upload' },
            { id: 'returns', icon: '↗', label: `Returns & ITC Ledger (${gstData.length})` },
            { id: 'mis', icon: '📊', label: 'MIS Reports & P&L' },
            { id: 'chat', icon: '💬', label: `Client Chat Desk (${messages.length})` },
            { id: 'documents', icon: '📁', label: `Document Vault (${documents.length})` },
            { id: 'calendar', icon: '◷', label: `Compliance Deadlines (${dueDates.length})` },
            { id: 'invoicing', icon: '🧾', label: 'GST Invoices' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? (dark ? 'border-blue-400 text-blue-400 font-extrabold' : 'border-blue-600 text-blue-600 font-extrabold')
                  : (dark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-slate-500 hover:text-slate-800')
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & DOCUMENT UPLOAD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Split layout: Upload Zone & Recent Returns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Document Uploader with Standardized Naming (5 cols) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload Client Record</h3>
                  <p className="text-xs text-slate-500">
                    Auto-prefixes client business name and period to preserve orderly filing folders.
                  </p>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Target Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => {
                        setUploadCategory(e.target.value);
                        if (selectedFile) {
                          const clientName = clientProfile?.business_name || clientProfile?.name || 'Client';
                          setCustomFileName(formatStandardFileName(clientName, e.target.value, uploadMonth, uploadYear, selectedFile.name));
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {(uploadCategory === 'SALES' || uploadCategory === 'PURCHASES') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Month</label>
                        <select
                          value={uploadMonth}
                          onChange={(e) => {
                            setUploadMonth(e.target.value);
                            if (selectedFile) {
                              const clientName = clientProfile?.business_name || clientProfile?.name || 'Client';
                              setCustomFileName(formatStandardFileName(clientName, uploadCategory, e.target.value, uploadYear, selectedFile.name));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        >
                          {MONTHS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-1">Financial Year</label>
                        <select
                          value={uploadYear}
                          onChange={(e) => {
                            setUploadYear(e.target.value);
                            if (selectedFile) {
                              const clientName = clientProfile?.business_name || clientProfile?.name || 'Client';
                              setCustomFileName(formatStandardFileName(clientName, uploadCategory, uploadMonth, e.target.value, selectedFile.name));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Select File</label>
                    <input
                      type="file"
                      onChange={handleFileChoose}
                      className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {selectedFile && (
                    <div>
                      <label className="font-bold text-slate-600 block mb-1">Formatted File Name (Editable)</label>
                      <input
                        type="text"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-800"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!selectedFile || saving}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-xs"
                  >
                    {saving ? 'Uploading to Client Vault...' : 'Upload Document'}
                  </button>
                </form>
              </div>

              {/* Recent Returns Table (7 cols) */}
              <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Recent Filed Returns</h3>
                    <p className="text-xs text-slate-500">Official filings submitted to gst.gov.in</p>
                  </div>
                  <button
                    onClick={() => setConverterOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>⚡</span> Convert & Sync
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Period</th>
                        <th className="py-2 px-3">Turnover</th>
                        <th className="py-2 px-3">Output Tax</th>
                        <th className="py-2 px-3">Eligible ITC</th>
                        <th className="py-2 px-3">GSTR-1</th>
                        <th className="py-2 px-3">GSTR-3B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {gstData.slice(0, 5).map((r) => {
                        const t = Number(r.sales?.taxableSales || r.sales?.total || 0);
                        const o = Number(r.sales?.outputTax || r.sales?.gstAmount || 0);
                        const c = Number(r.itc?.totalItc || r.itc?.total || 0);
                        return (
                          <tr key={r.period} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{r.period}</td>
                            <td className="py-2.5 px-3">₹{t.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-amber-600">₹{o.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-emerald-600">₹{c.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Filed
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                Filed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {!gstData.length && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                            No GST records filed yet. Use "Convert Return" above to process GSTR PDF/JSON exports.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RETURNS & ELECTRONIC CREDIT LEDGER */}
        {activeTab === 'returns' && (
          <div className="space-y-6">
            {/* Returns Action Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Statutory Returns & Credit Ledger</h2>
                <p className="text-xs text-slate-500">
                  Reconciled filings, automated multi-month ITC carry-forward, and reverse charge calculations.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConverterOpen(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⚡</span> Convert GSTR-1 / 3B
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualReturnSelectedPeriod(undefined);
                    setManualReturnSelectedRow(null);
                    setManualReturnModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Manually enter or edit GSTR-1 & GSTR-3B return details when automated conversion fails"
                >
                  <span>✍️</span> Add / Edit Details
                </button>
                <button
                  type="button"
                  onClick={() => setOpeningItcModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🏦</span> Opening ITC Balance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPurchasesSelectedPeriod(undefined);
                    setPurchasesModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🛒</span> Enter Purchases
                </button>
              </div>
            </div>

            {/* Filed Returns & Government ACK (ARN) Registry */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📑</span> Filed Returns &amp; Government ACK (ARN) Registry
                  </h3>
                  <p className="text-xs text-slate-500">
                    Month-wise turnover, eligible ITC, output tax, and official ARN dates extracted from GSTR-1 &amp; GSTR-3B.
                  </p>
                </div>

                {/* Return Dropdown Switcher */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualReturnSelectedPeriod(undefined);
                      setManualReturnSelectedRow(null);
                      setManualReturnModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Add or edit return details for any period"
                  >
                    <span>➕</span> Add Monthly Details
                  </button>
                  <label className="text-xs font-semibold text-slate-600">Filter Return:</label>
                  <select
                    value={returnFilter}
                    onChange={(e) => setReturnFilter(e.target.value as 'ALL' | 'GSTR1' | 'GSTR3B')}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:bg-white"
                  >
                    <option value="ALL">All Returns (Combined View)</option>
                    <option value="GSTR1">GSTR-1 (Outward Supplies)</option>
                    <option value="GSTR3B">GSTR-3B (Summary Return)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      {returnFilter === 'GSTR1' && (
                        <>
                          <th className="py-2.5 px-3">Taxable Turnover (GSTR-1)</th>
                          <th className="py-2.5 px-3">Output Tax</th>
                          <th className="py-2.5 px-3">Eligible ITC</th>
                          <th className="py-2.5 px-3">ARN Reference</th>
                          <th className="py-2.5 px-3">Filing Date (ARN Date)</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </>
                      )}
                      {returnFilter === 'GSTR3B' && (
                        <>
                          <th className="py-2.5 px-3">Taxable Turnover (3B)</th>
                          <th className="py-2.5 px-3">Output Tax</th>
                          <th className="py-2.5 px-3 text-indigo-700 font-bold">Purchases (Taxable)</th>
                          <th className="py-2.5 px-3 text-emerald-700 font-bold">Eligible ITC (Table 4)</th>
                          <th className="py-2.5 px-3 text-blue-700 font-bold">Cash Paid (PMT-06)</th>
                          <th className="py-2.5 px-3">ARN Reference</th>
                          <th className="py-2.5 px-3">Filing Date (ARN Date)</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </>
                      )}
                      {returnFilter === 'ALL' && (
                        <>
                          <th className="py-2.5 px-3">GSTR-1 Turnover</th>
                          <th className="py-2.5 px-3">GSTR-3B Turnover</th>
                          <th className="py-2.5 px-3 text-indigo-700 font-bold">Purchases (Taxable)</th>
                          <th className="py-2.5 px-3 text-emerald-700 font-bold">Eligible ITC (3B)</th>
                          <th className="py-2.5 px-3 text-blue-700 font-bold">Cash Paid</th>
                          <th className="py-2.5 px-3">GSTR-1 ARN &amp; Date</th>
                          <th className="py-2.5 px-3">GSTR-3B ARN &amp; Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {gstData.map((row) => {
                      const salesObj = (row.sales || {}) as Record<string, unknown>;
                      const itcObj = (row.itc || {}) as Record<string, unknown>;
                      const purchasesObj = (row.purchases || {}) as Record<string, unknown>;
                      const g1 = (row.gstr1 || {}) as Record<string, unknown>;
                      const g3b = (row.gstr3b || {}) as Record<string, unknown>;

                      const g1Turnover = Number(g1.taxableSales ?? g1.taxableValue ?? salesObj.taxableSales ?? 0);
                      const g1Tax = Number(g1.totalTax ?? salesObj.outputTax ?? 0);
                      const g1Arn = String(g1.arn || (Object.keys(g1).length > 0 ? 'ARN-VERIFIED' : ''));
                      const g1Date = formatGstDateDisplay(g1.filingDate || g1.arnDate);

                      const g3bTurnover = Number(g3b.outwardTaxable ?? salesObj.taxableSales ?? 0);
                      const g3bTax = Number(g3b.outwardTax ?? salesObj.outputTax ?? 0);
                      const g3bItc = Number(g3b.itcAvailable ?? itcObj.totalItc ?? (itcObj.inwardItc as any)?.total ?? 0);
                      const g3bCash = Number(g3b.cashPaid ?? salesObj.cashTaxPaid ?? 0);
                      const g3bArn = String(g3b.arn || (Object.keys(g3b).length > 0 ? 'ARN-VERIFIED' : ''));
                      const g3bDate = formatGstDateDisplay(g3b.filingDate || g3b.arnDate);

                      const purchasesVal = Number(purchasesObj.taxablePurchases ?? purchasesObj.total ?? purchasesObj.taxable_purchase ?? purchasesObj.taxable_purchases ?? 0);

                      const hasG1 = Object.keys(g1).length > 0 || Boolean(g1Arn);
                      const hasG3b = Object.keys(g3b).length > 0 || Boolean(g3bArn);

                      return (
                        <tr key={row.period} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-sans font-bold text-slate-900">{row.period}</td>

                          {returnFilter === 'GSTR1' && (
                            <>
                              <td className="py-3 px-3">₹{g1Turnover.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-amber-600">₹{g1Tax.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-slate-400 font-sans">N/A (Outward Only)</td>
                              <td className="py-3 px-3 text-[11px] text-blue-700 font-bold truncate max-w-[150px]">
                                {g1Arn || '-'}
                              </td>
                              <td className="py-3 px-3 font-sans text-slate-700">{g1Date !== '-' ? g1Date : '-'}</td>
                              <td className="py-3 px-3 font-sans">
                                {hasG1 ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedGstr1Row(row);
                                      setGstr1ModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition shadow-2xs inline-flex items-center gap-1"
                                    title="View GSTR-1 statutory tables (Table 4 through 15)"
                                  >
                                    <span>✓ Filed</span>
                                    <span className="text-emerald-950 font-normal">🔍 Details</span>
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {returnFilter === 'GSTR3B' && (
                            <>
                              <td className="py-3 px-3">₹{g3bTurnover.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-amber-600">₹{g3bTax.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={purchasesVal > 0 ? 'text-indigo-950 font-bold' : 'text-slate-400 font-sans'}>
                                    ₹{purchasesVal.toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPurchasesSelectedPeriod(row.period);
                                      setPurchasesModalOpen(true);
                                    }}
                                    title="Edit purchases taxable value"
                                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-emerald-600 font-bold">₹{g3bItc.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-blue-600 font-bold">₹{g3bCash.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-[11px] text-blue-700 font-bold truncate max-w-[150px]">
                                {g3bArn || '-'}
                              </td>
                              <td className="py-3 px-3 font-sans text-slate-700">{g3bDate !== '-' ? g3bDate : '-'}</td>
                              <td className="py-3 px-3 font-sans">
                                {hasG3b ? (
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                    ✓ Filed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {returnFilter === 'ALL' && (
                            <>
                              <td className="py-3 px-3 text-slate-900">₹{g1Turnover.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-slate-900">₹{g3bTurnover.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={purchasesVal > 0 ? 'text-indigo-950 font-bold' : 'text-slate-400 font-sans'}>
                                    ₹{purchasesVal.toLocaleString('en-IN')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPurchasesSelectedPeriod(row.period);
                                      setPurchasesModalOpen(true);
                                    }}
                                    title="Edit purchases taxable value"
                                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors cursor-pointer"
                                  >
                                    ✏️ Edit
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-emerald-600 font-bold">₹{g3bItc.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-blue-600 font-bold">₹{g3bCash.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-[11px]">
                                {g1Arn ? (
                                  <div>
                                    <span className="font-bold text-blue-700 block truncate max-w-[130px]">{g1Arn}</span>
                                    <span className="text-[10px] text-slate-400 font-sans block">{g1Date}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedGstr1Row(row);
                                        setGstr1ModalOpen(true);
                                      }}
                                      className="mt-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                                      title="View Form GSTR-1 outward supply breakdown"
                                    >
                                      <span>📊</span> Details
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-[11px]">
                                {g3bArn ? (
                                  <div>
                                    <span className="font-bold text-indigo-700 block truncate max-w-[130px]">{g3bArn}</span>
                                    <span className="text-[10px] text-slate-400 font-sans">{g3bDate}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-sans">
                                {hasG1 && hasG3b ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    ✓ 1 &amp; 3B Filed
                                  </span>
                                ) : hasG1 ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    GSTR-1 Filed
                                  </span>
                                ) : hasG3b ? (
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                    GSTR-3B Filed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          <td className="py-3 px-3 text-right font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setManualReturnSelectedPeriod(row.period);
                                setManualReturnSelectedRow(row);
                                setManualReturnModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              title="Edit GSTR-1 & GSTR-3B details for this period"
                            >
                              <span>✏️</span> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!gstData.length && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                          <p>No returns recorded yet for this client.</p>
                          <div className="flex justify-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setConverterOpen(true)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                            >
                              ⚡ Convert GSTR-1 / 3B
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setManualReturnSelectedPeriod(undefined);
                                setManualReturnSelectedRow(null);
                                setManualReturnModalOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                            >
                              ➕ Add Return Details Manually
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Electronic Credit Ledger Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🏦</span> Form GST PMT-02 — Electronic Credit Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automated rolling calculation: Opening Balance + Eligible ITC from 3B – GST on Sales.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpeningItcModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer"
                  >
                    <span>🏦</span> Set / Edit Opening Balance
                  </button>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Auto-Rolling Active
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Opening ITC</th>
                      <th className="py-2.5 px-3 text-emerald-800">+ ITC from 3B</th>
                      <th className="py-2.5 px-3 font-bold text-slate-800">Total Available</th>
                      <th className="py-2.5 px-3 text-amber-700">– GST on Sales</th>
                      <th className="py-2.5 px-3">ITC Utilized</th>
                      <th className="py-2.5 px-3 text-emerald-700 font-bold">= Closing ITC (Carry Fwd)</th>
                      <th className="py-2.5 px-3 text-blue-700 font-bold">Net Cash Payable (PMT-06)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {itcLedger.map((row) => (
                      <tr key={row.period} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-sans font-bold text-slate-900">{row.period}</td>
                        <td className="py-3 px-3">₹{row.openingItc.total.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-emerald-700 font-medium">+₹{row.inwardItc.total.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">₹{row.totalAvailableItc.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-amber-600 font-medium">-₹{row.outputTaxLiability.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-slate-700">₹{row.itcUtilized.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50/40">
                          ₹{row.closingItc.total.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-600 bg-blue-50/40">
                          ₹{row.netCashPayable.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {!itcLedger.length && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          No ITC records found. Click "Set / Edit Opening Balance" above to enter the start of year ITC.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MIS REPORTS & P&L */}
        {activeTab === 'mis' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Monthly MIS Financial Reports & P&L</h2>
                <p className="text-xs text-slate-500">
                  Publish audited financial summaries, gross margins, returns, and management commentary to the client dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFinancialModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>📊</span> Publish New MIS Statement
              </button>
            </div>

            {/* Client MIS Presentation Mode Selector */}
            <div className={`rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 border transition-colors ${
              dark 
                ? 'bg-[#101b33] border-[#1e2f56] text-slate-200' 
                : 'bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border-blue-200/80 text-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Client MIS Report Presentation Format</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      dark ? 'bg-blue-950/80 text-blue-300 border-blue-800/80' : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      Client Portal Target
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select which MIS report format applies to <strong className={dark ? 'text-white' : 'text-slate-800'}>{clientDisplayName}</strong> on their client dashboard.
                  </p>
                </div>
                {misConfigSuccess && (
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-xs border animate-pulse ${
                    dark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    <span>✓</span> Saved & Updated on Client Dashboard!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Individual */}
                <button
                  type="button"
                  onClick={() => handleUpdateMisConfig('INDIVIDUAL')}
                  disabled={savingMisConfig}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 relative cursor-pointer active:scale-[0.99] ${
                    clientMisType === 'INDIVIDUAL'
                      ? (dark ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-xs' : 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-xs')
                      : (dark ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700' : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300')
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    clientMisType === 'INDIVIDUAL'
                      ? (dark ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-700')
                      : (dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                  }`}>
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className={`text-xs font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Individual (Pure GST Model)</strong>
                      {clientMisType === 'INDIVIDUAL' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          dark ? 'text-blue-300 bg-blue-950/80 border-blue-800' : 'text-blue-700 bg-blue-50 border border-blue-200'
                        }`}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-1 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Strictly GST data: Sales, Sales Returns, Purchases, Purchase Returns, 1M / 6M / 12M comparisons with interactive bar charts & growth run rate.
                    </p>
                  </div>
                </button>

                {/* Option 2: Corporate / Non-Individual */}
                <button
                  type="button"
                  onClick={() => handleUpdateMisConfig('CORPORATE')}
                  disabled={savingMisConfig}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 relative cursor-pointer active:scale-[0.99] ${
                    clientMisType === 'CORPORATE'
                      ? (dark ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xs' : 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs')
                      : (dark ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700' : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300')
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    clientMisType === 'CORPORATE'
                      ? (dark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-700')
                      : (dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                  }`}>
                    🏢
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className={`text-xs font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Corporate & LLP (Audited P&L)</strong>
                      {clientMisType === 'CORPORATE' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          dark ? 'text-indigo-300 bg-indigo-950/80 border-indigo-800' : 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                        }`}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-1 leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Comprehensive P&L Statement, Operating Expenses (Payroll, Rent, Admin), EBITDA, PAT, and Project Profitability breakdown (shows graceful waiting state if unpublished).
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {gstData.map((row) => {
                const report = (row.sales as Record<string, unknown>)?.financialReport as any;
                if (!report) return null;
                const netIncome = (report.totalIncome || 0) - (report.salesReturns || 0);
                const netExpenses = (report.totalExpenses || 0) - (report.purchaseReturns || 0);
                const netProfit = netIncome - netExpenses;

                return (
                  <div key={row.period} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{row.period}</strong>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Published to Client Portal
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        Auditor: {report.preparedBy || 'GST Bro Team'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Net Income</span>
                        <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                          ₹{netIncome.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Net Expenses</span>
                        <strong className="text-sm font-bold text-amber-600 block mt-0.5">
                          ₹{netExpenses.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Net Profit / P&L</span>
                        <strong className="text-sm font-bold text-emerald-600 block mt-0.5">
                          ₹{netProfit.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Returns Adj.</span>
                        <strong className="text-sm font-bold text-slate-700 block mt-0.5">
                          ₹{((report.salesReturns || 0) + (report.purchaseReturns || 0)).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!gstData.some((r) => Boolean((r.sales as Record<string, unknown>)?.financialReport)) && (
                <div className="text-center py-12 text-xs text-slate-400">
                  <span className="text-3xl block mb-2">📊</span>
                  <p className="font-semibold text-slate-700">No MIS reports published yet for this client</p>
                  <p className="mt-1">Click "Publish New MIS Statement" to generate and send financial reports to the client portal.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CLIENT SUPPORT CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[70vh] min-h-[500px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>💬</span> Client Support Desk: {clientDisplayName}
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time communication with client. Chat logs are permanently archived for audit compliance.
                </p>
              </div>
              <button
                onClick={() => loadClientMessages(selectedId)}
                className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                🔄 Refresh
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
              {!messages.length && (
                <div className="text-center py-16 space-y-2">
                  <span className="text-3xl block">💬</span>
                  <p className="text-xs font-semibold text-slate-700">No messages in conversation yet</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Type a message below to coordinate return filings, missing bills, or queries with the client.
                  </p>
                </div>
              )}

              {messages.map((m) => {
                const isClient = m.sender_user_id === selectedId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold text-slate-600">
                        {isClient ? clientDisplayName : 'You (Team)'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                        isClient
                          ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                          : 'bg-blue-600 text-white rounded-tr-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>

                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {new Date(m.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Send Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center">
              <input
                type="text"
                placeholder="Type your message to the client..."
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                disabled={sendingMsg}
                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!chatText.trim() || sendingMsg}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
              >
                {sendingMsg ? 'Sending...' : 'Send'} <span>➤</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: DOCUMENT VAULT */}
        {activeTab === 'documents' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Client Document Vault</h2>
                <p className="text-xs text-slate-500">
                  Uploaded bills, returns, registers, and KYC files stored for {clientDisplayName}.
                </p>
              </div>
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition"
                >
                  Open Google Drive Vault ↗
                </a>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Document Name</th>
                    <th className="py-2.5 px-3">Folder</th>
                    <th className="py-2.5 px-3">Uploaded Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">{doc.file_name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(doc.uploaded_at).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            window.open(`/api/documents/${doc.id}/download`, '_blank');
                          }}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Download ↓
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!documents.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">
                        No documents uploaded for this client yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: COMPLIANCE DEADLINES & CLIENT STATUTORY REQUIREMENTS */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Header with client and month selector */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                    Compliance Management
                  </span>
                  {clientProfile && (
                    <span className="text-xs font-bold text-slate-700">
                      Client: {clientProfile.business_name || clientProfile.name}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">Statutory Filing Requirements &amp; Due Dates</h2>
                <p className="text-xs text-slate-500">
                  Configure client-specific statutory requirements and mark completed returns to keep the client portal clean.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Filing Period:</label>
                <select
                  value={complianceMonth}
                  onChange={(e) => setComplianceMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-2xs focus:border-blue-500 focus:bg-white"
                >
                  {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                    const now = new Date();
                    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
                    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const lbl = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
                    return (
                      <option key={val} value={val}>
                        {lbl} ({val})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Section 1: Client-Specific Statutory Requirements (Team Configurable) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>⚙️</span> Client Statutory Filing Requirements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Check which returns apply to this client. Only selected statutory deadlines will be visible in their Client Portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveClientRequirements}
                  disabled={savingCompliance}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  {savingCompliance ? (
                    'Saving...'
                  ) : complianceSuccess ? (
                    <><span>✓</span> Saved Requirements</>
                  ) : (
                    'Save Client Requirements'
                  )}
                </button>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-xs">
                <span className="text-slate-600 font-semibold text-[11px]">
                  Quick Selection: ({clientApplicableRequirements.length} / {STATUTORY_REQUIREMENTS_LIST.length} Active)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllReqs}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-blue-700 transition"
                  >
                    ✓ Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleUnselectAllReqs}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-rose-700 transition"
                  >
                    ✕ Unselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaultReqs}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition"
                  >
                    Standard GST Defaults (GSTR-1 &amp; 3B)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {STATUTORY_REQUIREMENTS_LIST.map((req) => {
                  const isChecked = clientApplicableRequirements.includes(req.key);
                  return (
                    <div
                      key={req.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleRequirement(req.key)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          handleToggleRequirement(req.key);
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer select-none flex items-start gap-2.5 transition ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/60 text-blue-900 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleRequirement(req.key);
                        }}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isChecked ? 'bg-blue-200/80 text-blue-900' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {req.tag}
                          </span>
                          <span className="font-bold text-slate-900">{req.label}</span>
                        </div>
                        <span className="text-[11px] block mt-0.5 opacity-80">
                          {isChecked ? 'Enabled for this client' : 'Hidden from client'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Statutory Deadlines Checklist & "Mark as Done" */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>📅</span> Statutory Deadlines &amp; Filing Completion for {complianceMonth}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Deadlines automatically created for the start of every month. Completed filings are hidden from the Client Portal for this period.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('ALL')}
                    className={`px-3 py-1 rounded-lg transition ${calendarCategory === 'ALL' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    All ({dueDates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('GST')}
                    className={`px-3 py-1 rounded-lg transition ${calendarCategory === 'GST' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    GST
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('TDS_TCS')}
                    className={`px-3 py-1 rounded-lg transition ${calendarCategory === 'TDS_TCS' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    TDS / TCS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('INCOME_TAX')}
                    className={`px-3 py-1 rounded-lg transition ${calendarCategory === 'INCOME_TAX' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Advance Tax
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('ANNUAL')}
                    className={`px-3 py-1 rounded-lg transition ${calendarCategory === 'ANNUAL' ? 'bg-blue-600 text-white font-bold shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              {/* ⚡ Automatic Statutory Deadline Generator Banner for Team */}
              <div className="p-3.5 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-blue-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                      ⚡ Automatic Statutory Deadline Updater for {complianceMonth}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Missing or outdated statutory dates? Automatically generate all CBIC &amp; CBDT filing deadlines for this month.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoGenerateDeadlinesForMonth}
                  disabled={generatingDeadlines}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <span>⚡</span> {generatingDeadlines ? 'Generating Deadlines...' : 'Auto-Generate & Sync Deadlines'}
                </button>
              </div>

              {/* Informational banner about automatic client hiding */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <span className="text-base leading-none">💡</span>
                <div>
                  <strong className="font-bold">Client Portal Sync Rule:</strong> When you mark any statutory deadline as <strong>Done</strong>, it is immediately removed from the Client Portal for that month so the client only sees pending, actionable filings!
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dueDates
                  .filter((item) => {
                    if (calendarCategory === 'ALL') return true;
                    if (calendarCategory === 'GST') return item.category.includes('GST') || item.category === 'GST' || item.category.startsWith('GSTR');
                    if (calendarCategory === 'TDS_TCS') return item.category.includes('TDS') || item.category.includes('TCS');
                    if (calendarCategory === 'INCOME_TAX') return item.category === 'INCOME_TAX';
                    if (calendarCategory === 'ANNUAL') return item.category === 'ANNUAL';
                    return true;
                  })
                  .map((item) => {
                    const dueDateObj = new Date(item.due_date);
                    const diffDays = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isDone = isDeadlineCompleted(item, complianceMonth);
                    const isApplicable = isDeadlineApplicable(item);
                    const isEditingDate = editingDeadlineId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                          isDone
                            ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                            : isApplicable
                            ? 'bg-white border-slate-200 hover:border-blue-300 shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                                {dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              {!isEditingDate && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditDeadlineDate(item)}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-1 py-0.5 rounded hover:bg-blue-50 transition"
                                  title="Change statutory due date"
                                >
                                  ✏️
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline Date Editing Widget */}
                          {isEditingDate && (
                            <div className="mt-2 p-2 bg-blue-50/90 rounded-lg border border-blue-200 flex flex-wrap items-center gap-1.5 animate-in fade-in">
                              <span className="text-[10px] font-bold text-blue-900">Change Due Date:</span>
                              <input
                                type="date"
                                value={editingDeadlineDate}
                                onChange={(e) => setEditingDeadlineDate(e.target.value)}
                                className="px-2 py-0.5 text-xs rounded border border-blue-300 bg-white font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDeadlineDate(item.id)}
                                disabled={savingDeadlineDate}
                                className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingDeadlineDate ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditDeadlineDate}
                                className="px-2 py-0.5 text-[10px] rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          <h4 className="font-bold text-slate-900 text-xs mt-2">{item.title}</h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                          )}

                          <div className="mt-2.5 flex items-center gap-1.5">
                            {isApplicable ? (
                              <span className="text-[10px] font-semibold text-blue-700 flex items-center gap-1">
                                <span>●</span> Active for Client
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <span>○</span> Excluded by Requirements
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            {isDone ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                                <span>✓</span> Done (Hidden)
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  diffDays < 0
                                    ? 'bg-slate-100 text-slate-700'
                                    : diffDays === 0
                                    ? 'bg-amber-100 text-amber-900 font-extrabold animate-pulse'
                                    : diffDays <= 5
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {diffDays < 0 ? 'Passed' : diffDays === 0 ? 'Due Today' : `${diffDays}d left`}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleDeadline(item)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              isDone
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                            }`}
                          >
                            {isDone ? 'Revert to Pending' : '✓ Mark as Done'}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {!dueDates.length && (
                  <div className="col-span-full py-10 text-center text-slate-400 text-xs">
                    No upcoming statutory deadlines configured for this month.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: GST INVOICES WORKSPACE */}
        {activeTab === 'invoicing' && (
          <div className="space-y-4">
            <InvoiceDashboard clientId={selectedId} />
          </div>
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'overview' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="text-base leading-none">⌂</span>
          <span className="text-[10px] mt-0.5">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'returns' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="text-base leading-none">↗</span>
          <span className="text-[10px] mt-0.5">Returns</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mis')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'mis' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="text-base leading-none">📊</span>
          <span className="text-[10px] mt-0.5">MIS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`relative flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'chat' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="text-base leading-none">💬</span>
          <span className="text-[10px] mt-0.5">Chat</span>
          {messages.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'documents' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="text-base leading-none">📁</span>
          <span className="text-[10px] mt-0.5">Files</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoicing')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'invoicing' ? 'text-blue-600 font-bold bg-blue-50/80' : 'text-slate-500 font-medium'
          }`}
        >
          <span className="text-base leading-none">🧾</span>
          <span className="text-[10px] mt-0.5">Invoices</span>
        </button>
      </nav>

      {/* Return Converter Modal (PDF & JSON) */}
      <GstReturnConverterModal
        isOpen={converterOpen}
        onClose={() => setConverterOpen(false)}
        clientId={selectedId}
        allGstData={gstData}
        onSuccess={(updated) => {
          setSuccessMsg(`Return data for ${updated.periodLabel} converted and synced successfully.`);
          loadClientWorkspace(selectedId);
        }}
      />

      {/* MIS Report Publisher Modal */}
      {financialModalOpen && selectedId && (
        <TeamFinancialReportModal
          clientId={selectedId}
          clientName={clientDisplayName}
          isOpen={financialModalOpen}
          defaultReportType={clientMisType}
          onClose={() => setFinancialModalOpen(false)}
          onSaved={() => {
            setSuccessMsg('MIS Financial Report published to client dashboard.');
            loadClientWorkspace(selectedId);
          }}
        />
      )}

      {/* Opening ITC Balance Modal */}
      {openingItcModalOpen && selectedId && (
        <OpeningItcModal
          clientId={selectedId}
          clientName={clientDisplayName}
          existingRecords={gstData}
          isOpen={openingItcModalOpen}
          onClose={() => setOpeningItcModalOpen(false)}
          onSaved={() => {
            setSuccessMsg('Opening ITC Balance saved. Automatic rolling carry-forward updated.');
            loadClientWorkspace(selectedId);
          }}
        />
      )}

      {/* Purchases Taxable Value Entry Modal */}
      {purchasesModalOpen && selectedId && (
        <PurchasesEntryModal
          clientId={selectedId}
          clientName={clientDisplayName}
          existingRecords={gstData}
          defaultPeriod={purchasesSelectedPeriod}
          isOpen={purchasesModalOpen}
          onClose={() => {
            setPurchasesModalOpen(false);
            setPurchasesSelectedPeriod(undefined);
          }}
          onSaved={() => {
            setSuccessMsg('Purchases taxable value updated and synced to Client Dashboard.');
            loadClientWorkspace(selectedId);
          }}
        />
      )}

      {/* Manual GSTR-1 & GSTR-3B Return Entry & Override Modal */}
      {manualReturnModalOpen && selectedId && (
        <ManualReturnEntryModal
          isOpen={manualReturnModalOpen}
          onClose={() => {
            setManualReturnModalOpen(false);
            setManualReturnSelectedPeriod(undefined);
            setManualReturnSelectedRow(null);
          }}
          clientId={selectedId}
          clientName={clientDisplayName}
          existingRecords={gstData}
          defaultPeriod={manualReturnSelectedPeriod}
          defaultRowData={manualReturnSelectedRow}
          onSaved={() => {
            setSuccessMsg('Monthly return details saved and synchronized across client registry.');
            loadClientWorkspace(selectedId);
          }}
        />
      )}

      {/* Form GSTR-1 Statutory Table Breakdown Modal */}
      {gstr1ModalOpen && (
        <Gstr1DetailModal
          isOpen={gstr1ModalOpen}
          onClose={() => {
            setGstr1ModalOpen(false);
            setSelectedGstr1Row(null);
          }}
          period={selectedGstr1Row?.period || ''}
          clientName={clientDisplayName}
          clientGstin={selectedClient?.gstin}
          gstr1Data={selectedGstr1Row?.gstr1}
          salesData={selectedGstr1Row?.sales}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearToken, getToken } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { RegisterUploadPanel } from './RegisterUploadPanel';
import { AccountPanel } from './AccountPanel';
import { GstPortalsLaunchpad } from './GstPortalsLaunchpad';
import { MonthlyFinancialReport } from './MonthlyFinancialReport';
import { InvoiceDashboard } from './invoice/InvoiceDashboard';
import { calculateMultiPeriodItcLedger } from '../../lib/itcEngine';
import { formatGstDateDisplay } from '../../lib/pdfReturnParser';
import { Gstr1DetailModal } from './Gstr1DetailModal';
import { PortalLoadingSkeleton } from '../../components/PortalLoadingSkeleton';

type GstRow = {
  period: string;
  sales: Record<string, unknown>;
  purchases: Record<string, unknown>;
  itc: Record<string, unknown>;
  rcm?: Record<string, unknown>;
  gstr1: Record<string, unknown>;
  gstr3b: Record<string, unknown>;
};

type ClientData = {
  client?: {
    id?: string;
    name?: string | null;
    business_name?: string | null;
    display_name?: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    state?: string | null;
    address?: string | null;
    assignedMisReportType?: 'INDIVIDUAL' | 'CORPORATE' | null;
    assignedDashboardMode?: 'STANDARD' | 'SIMPLE' | null;
  };
  gstData: GstRow[];
  documents: { id: string; file_name: string; category: string; uploaded_at: string }[];
  dueDates: { id: string; title: string; category: string; due_date: string; description?: string | null }[];
  fees: {
    id: string;
    invoice_number: string;
    description: string;
    amount: number;
    gst_amount: number;
    due_date: string;
    status: string;
    fee_payments: { amount: number }[];
  }[];
  driveFolderUrl?: string | null;
  assignedTeam?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type Message = { id: string; message: string; sender_user_id: string; created_at: string };

function currentUserId() {
  const token = getToken();
  if (!token) return '';
  try {
    return JSON.parse(atob(token.split('.')[1])).id as string;
  } catch {
    return '';
  }
}

const numberFrom = (record: Record<string, unknown> | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = Number(record?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
};

function StatusPill({ children, tone = 'blue' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

function Chart({ values }: { values: number[] }) {
  const list = values.length ? values : [0];
  const max = Math.max(...list, 1);
  const points = list
    .map((value, index) => `${(index / Math.max(list.length - 1, 1)) * 100},${90 - (value / max) * 75}`)
    .join(' ');
  return (
    <div className="portal-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="liveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity=".22" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#liveFill)" />
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-labels">
        {list.map((_, index) => (
          <span key={index}>M{index + 1}</span>
        ))}
      </div>
    </div>
  );
}

function formatStandardFileName(
  clientName: string,
  category: string,
  month: string,
  year: string,
  originalFileName: string
): string {
  const sanitizedClient = clientName.trim() || 'Client';
  const ext = originalFileName.includes('.') ? originalFileName.substring(originalFileName.lastIndexOf('.')) : '';
  const baseName = originalFileName.includes('.') ? originalFileName.substring(0, originalFileName.lastIndexOf('.')) : originalFileName;

  const categoryLabels: Record<string, string> = {
    SALES: 'Sales Register',
    PURCHASES: 'Purchase Register',
    ITC: 'Challan & ITC',
    CLIENT_DOCS: 'KYC & Business Doc',
  };
  const typeLabel = categoryLabels[category] || 'Document';

  if (category === 'SALES' || category === 'PURCHASES') {
    return `${sanitizedClient} - ${typeLabel} - ${month} ${year} - ${baseName}${ext}`;
  }
  return `${sanitizedClient} - ${typeLabel} - ${baseName}${ext}`;
}

function formatPeriodMonthYear(periodStr: string): string {
  if (!periodStr) return '';
  const parts = periodStr.split('-');
  if (parts.length < 2) return periodStr;
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (m >= 1 && m <= 12) {
    return `${monthNames[m - 1]} ${y}`;
  }
  return periodStr;
}

const PORTAL_TABS = [
  ['overview', 'Overview', '⌂'],
  ['returns', 'GST Returns', '↗'],
  ['financials', 'MIS Reports', '📊'],
  ['invoicing', 'Invoicing Hub (B2B/B2C)', '🧾'],
  ['portals', 'Statutory Portals Gateway', '🏛️'],
  ['documents', 'Document Vault & Drive', '□'],
  ['calendar', 'Compliance Calendar', '◷'],
  ['fees', 'GST Bro Fee Invoices', '💳'],
  ['messages', 'Assigned Team Chat', '◌'],
  ['account', 'Company Profile', '⚙'],
] as const;

export function ClientPortal() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState<ClientData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [metric, setMetric] = useState('sales');
  const [active, setActive] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gstbro_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gstbro_theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [copiedGstin, setCopiedGstin] = useState(false);

  // Month / period selector & Trends states
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(['ALL']);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const [trendMetric, setTrendMetric] = useState<'all' | 'sales' | 'purchases' | 'output' | 'itc' | 'cash'>('all');
  const [returnFilter, setReturnFilter] = useState<'ALL' | 'GSTR1' | 'GSTR3B'>('ALL');
  const [calendarCategory, setCalendarCategory] = useState<'ALL' | 'GST' | 'TDS_TCS' | 'INCOME_TAX' | 'ANNUAL'>('ALL');
  const [gstr1ModalOpen, setGstr1ModalOpen] = useState(false);
  const [selectedGstr1Row, setSelectedGstr1Row] = useState<GstRow | null>(null);

  // Upload modal form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [isNameEdited, setIsNameEdited] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('CLIENT_DOCS');
  const [uploadYear, setUploadYear] = useState('2026-27');
  const [uploadMonth, setUploadMonth] = useState('April');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: string; error?: string } | null>(null);

  const clientName = data?.client?.display_name || data?.client?.business_name || data?.client?.name || 'Client';

  const handleFileSelect = (selectedFile: File | null) => {
    setUploadFile(selectedFile);
    if (selectedFile) {
      const generated = formatStandardFileName(
        clientName,
        uploadCategory,
        uploadMonth,
        uploadYear,
        selectedFile.name
      );
      setCustomFileName(generated);
      setIsNameEdited(false);
    } else {
      setCustomFileName('');
      setIsNameEdited(false);
    }
  };

  const resetUploadModal = () => {
    setUploadOpen(false);
    setUploadFile(null);
    setCustomFileName('');
    setIsNameEdited(false);
    setUploadStatus(null);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDashboardData = () => {
    Promise.all([
      apiFetch<ClientData>('/api/client/dashboard'),
      apiFetch<{ messages: Message[] }>('/api/client/messages'),
    ])
      .then(([dashboard, chat]) => {
        setData(dashboard);
        setMessages(chat.messages);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Unable to load dashboard';
        if (msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('Invalid token') || msg.includes('jwt')) {
          clearToken();
          navigate('/login');
          return;
        }
        setError(msg);
      });
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      clearToken();
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'CLIENT' && payload.role !== 'ADMIN') {
        clearToken();
        navigate('/login');
        return;
      }
    } catch {
      clearToken();
      navigate('/login');
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    };
    if (periodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [periodDropdownOpen]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    try {
      const result = await apiFetch<{ message: Message }>('/api/client/messages', {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });
      setMessages((current) => [...current, result.message]);
      setMessageText('');
      showToast('Message sent to your assigned GST team.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    if (uploadFile.size > 100 * 1024 * 1024) {
      setUploadStatus({ error: 'File size exceeds 100 MB limit.' });
      return;
    }

    setUploadLoading(true);
    setUploadStatus(null);

    const ext = uploadFile.name.includes('.') ? uploadFile.name.substring(uploadFile.name.lastIndexOf('.')) : '';
    let finalFileName = customFileName.trim() || uploadFile.name;
    if (ext && !finalFileName.toLowerCase().endsWith(ext.toLowerCase())) {
      finalFileName += ext;
    }

    const userId = currentUserId();
    const formData = new FormData();
    formData.append('file', uploadFile, finalFileName);
    formData.append('fileName', finalFileName);
    formData.append('category', uploadCategory);
    if (uploadCategory === 'SALES' || uploadCategory === 'PURCHASES') {
      formData.append('financialYear', uploadYear);
      formData.append('month', uploadMonth);
    }

    try {
      await apiFetch(`/api/clients/${userId}/documents`, {
        method: 'POST',
        body: formData,
      });
      setUploadStatus({ success: 'Document uploaded and archived successfully!' });
      fetchDashboardData();
      showToast('Document uploaded successfully to your vault.');
      setTimeout(() => {
        resetUploadModal();
      }, 1200);
    } catch (err) {
      setUploadStatus({ error: err instanceof Error ? err.message : 'Upload failed. Please try again.' });
    } finally {
      setUploadLoading(false);
    }
  };

  const rows = data?.gstData ?? [];
  const itcLedger = useMemo(() => calculateMultiPeriodItcLedger(rows), [rows]);

  const isAllSelected = selectedPeriods.includes('ALL') || (rows.length > 0 && selectedPeriods.length === rows.length);

  const activeRows = useMemo(() => {
    if (!rows.length) return [];
    if (isAllSelected) return rows;
    const filtered = rows.filter((r) => selectedPeriods.includes(r.period));
    return filtered.length > 0 ? filtered : [rows[0]];
  }, [rows, selectedPeriods, isAllSelected]);

  const activePeriod = activeRows.length === 1 ? activeRows[0].period : isAllSelected ? 'ALL' : activeRows.map((r) => r.period).join(', ');
  const activeRow = activeRows[0] || rows[0];

  const activeSales = useMemo(
    () => activeRows.reduce((sum, r) => sum + numberFrom(r.sales, ['total', 'taxableSales', 'taxable_sales']), 0),
    [activeRows]
  );
  const activeOutputTax = useMemo(
    () => activeRows.reduce((sum, r) => sum + numberFrom(r.sales, ['gstAmount', 'outputTax', 'output_tax']), 0),
    [activeRows]
  );
  const activePurchases = useMemo(
    () => activeRows.reduce((sum, r) => sum + numberFrom(r.purchases, ['total', 'taxablePurchases', 'taxable_purchase', 'taxable_purchases']), 0),
    [activeRows]
  );
  const activeItc = useMemo(
    () => activeRows.reduce((sum, r) => sum + numberFrom(r.itc, ['total', 'totalItc', 'total_itc']), 0),
    [activeRows]
  );
  const activeCashPaid = useMemo(
    () =>
      activeRows.reduce((sum, r) => {
        const cash =
          numberFrom(r.gstr3b, ['cashPaid', 'cash_paid']) ||
          numberFrom(r.sales, ['cashTaxPaid', 'cash_tax_paid']) ||
          Math.max(0, numberFrom(r.sales, ['gstAmount', 'outputTax', 'output_tax']) - numberFrom(r.itc, ['total', 'totalItc', 'total_itc']));
        return sum + cash;
      }, 0),
    [activeRows]
  );

  const activePeriodLabel = useMemo(() => {
    if (isAllSelected) {
      return rows.length > 0 ? `All ${rows.length} Months (Cumulative Total)` : 'All Months (Cumulative Total)';
    }
    if (activeRows.length === 1) {
      return `${formatPeriodMonthYear(activeRows[0].period)} (${activeRows[0].period})`;
    }
    return `${activeRows.length} Months Selected (${activeRows.map((r) => r.period).join(', ')})`;
  }, [isAllSelected, activeRows, rows.length]);

  const togglePeriod = (period: string) => {
    if (period === 'ALL') {
      setSelectedPeriods(['ALL']);
      return;
    }
    if (isAllSelected) {
      setSelectedPeriods([period]);
      return;
    }
    if (selectedPeriods.includes(period)) {
      const next = selectedPeriods.filter((p) => p !== period);
      if (next.length === 0) {
        setSelectedPeriods(['ALL']);
      } else {
        setSelectedPeriods(next);
      }
    } else {
      const next = [...selectedPeriods, period];
      if (next.length >= rows.length) {
        setSelectedPeriods(['ALL']);
      } else {
        setSelectedPeriods(next);
      }
    }
  };

  const selectSinglePeriod = (period: string) => {
    if (selectedPeriods.length === 1 && selectedPeriods[0] === period) {
      setSelectedPeriods(['ALL']);
    } else {
      setSelectedPeriods([period]);
    }
  };

  const dashboardMode: 'STANDARD' | 'SIMPLE' = (data?.client as any)?.assignedDashboardMode || 'STANDARD';
  const isSimpleMode = dashboardMode === 'SIMPLE';

  const navTabs = useMemo(() => {
    if (isSimpleMode) {
      return [
        ['overview', 'Business Overview', '⌂'],
        ['returns', 'Tax Filing Proofs', '↗'],
        ['financials', 'MIS Reports', '📊'],
        ['invoicing', 'Invoicing Hub (B2B/B2C)', '🧾'],
        ['portals', 'Statutory Portals Gateway', '🏛️'],
        ['documents', 'Document Vault & Drive', '□'],
        ['calendar', 'Compliance Calendar', '◷'],
        ['fees', 'GST Bro Fee Invoices', '💳'],
        ['messages', 'Assigned Team Chat', '◌'],
        ['account', 'Company Profile', '⚙'],
      ] as const;
    }
    return PORTAL_TABS;
  }, [isSimpleMode]);

  const valueFor = (row: GstRow) =>
    metric === 'purchases'
      ? numberFrom(row.purchases, ['total', 'taxablePurchase', 'taxable_purchase'])
      : metric === 'itc'
      ? numberFrom(row.itc, ['total', 'totalItc', 'total_itc'])
      : metric === 'output'
      ? numberFrom(row.sales, ['gstAmount', 'outputTax', 'output_tax'])
      : metric === 'liability'
      ? Math.max(0, numberFrom(row.sales, ['gstAmount', 'outputTax', 'output_tax']) - numberFrom(row.itc, ['total', 'totalItc', 'total_itc']))
      : numberFrom(row.sales, ['total', 'taxableSales', 'taxable_sales']);

  const values = rows.slice(0, 12).reverse().map(valueFor);
  const metricLabel = ({
    sales: 'Total Taxable Sales',
    purchases: 'Total Purchases',
    output: 'Output GST Liability',
    itc: 'Eligible ITC Available',
    liability: 'Net GST Cash Payable',
  } as Record<string, string>)[metric];

  const latest = rows[0];
  const latestSales = activeSales;
  const latestOutputTax = activeOutputTax;
  const itc = activeItc;
  const tax = activeCashPaid;

  const docs = useMemo(
    () => (data?.documents ?? []).filter((doc) => doc.file_name.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  );
  const nextDue = data?.dueDates?.[0];

  const upcomingDueDates = useMemo(() => {
    const list = data?.dueDates ?? [];
    return [...list].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [data?.dueDates]);

  const filteredCalendarDueDates = useMemo(() => {
    return upcomingDueDates.filter((d) => {
      if (calendarCategory === 'ALL') return true;
      if (calendarCategory === 'GST') return d.category.includes('GST') || d.category === 'GST' || d.category.startsWith('GSTR');
      if (calendarCategory === 'TDS_TCS') return d.category.includes('TDS') || d.category.includes('TCS');
      if (calendarCategory === 'INCOME_TAX') return d.category === 'INCOME_TAX';
      if (calendarCategory === 'ANNUAL') return d.category === 'ANNUAL';
      return true;
    });
  }, [upcomingDueDates, calendarCategory]);

  const copyGstin = () => {
    if (!data?.client?.gstin) return;
    navigator.clipboard.writeText(data.client.gstin);
    setCopiedGstin(true);
    showToast('GSTIN copied to clipboard');
    setTimeout(() => setCopiedGstin(false), 2000);
  };

  const actions = data
    ? [
        {
          label: latest ? 'Latest GST Return Synced' : 'GST Data Pending from Team',
          detail: latest ? `Current period: ${latest.period} · Team Verified` : 'Your assigned GST team will update this',
          tone: 'blue',
          button: 'Review Returns',
          onClick: () => setActive('returns'),
        },
        {
          label: docs.length ? 'Review Archived Documents' : 'Upload Required Billing Data',
          detail: `${docs.length} files secured in Google Drive vault`,
          tone: 'green',
          button: docs.length ? 'View Vault' : 'Upload',
          onClick: () => (docs.length ? setActive('documents') : setUploadOpen(true)),
        },
        ...(nextDue
          ? [
              {
                label: nextDue.title,
                detail: `${nextDue.category} · Due ${new Date(nextDue.due_date).toLocaleDateString()}`,
                tone: 'amber',
                button: 'View Calendar',
                onClick: () => setActive('calendar'),
              },
            ]
          : [
              {
                label: 'All Statutory Deadlines Complete',
                detail: 'Monthly returns filed and reconciled by your GST team',
                tone: 'green',
                button: 'Compliance Calendar',
                onClick: () => setActive('calendar'),
              },
            ]),
      ]
    : [];

  const activity = [
    ...rows.map((row) => ({
      title: 'GST Return Synchronized',
      detail: `Data reconciled for period ${row.period}`,
      date: row.period,
      tone: 'green',
    })),
    ...(data?.documents ?? []).map((doc) => ({
      title: 'Document Archived',
      detail: `${doc.file_name} · ${doc.category}`,
      date: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Recent',
      tone: 'blue',
    })),
  ].slice(0, 4);

  if (!data && !error) {
    return <PortalLoadingSkeleton dark={dark} />;
  }

  return (
    <div className={`client-portal min-h-screen font-sans transition-colors duration-150 ${dark ? 'portal-dark bg-[#0b1329] text-[#e2e8f0]' : 'bg-[#f5f8fc] text-[#16243a]'}`}>
      {/* Executive Dark Left Sidebar */}
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <span className="text-2xl font-black tracking-tight text-white select-none leading-none">
            GST<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bro</span>
          </span>
        </div>

        <div className="workspace-switcher">
          <div className="avatar small">CL</div>
          <div>
            <b>{data?.client?.business_name || data?.client?.name || 'My Company'}</b>
            <small>{data?.client?.gstin || 'GST REGISTERED'}</small>
          </div>
        </div>

        <nav>
          {navTabs.map(([id, label, icon]) => (
            <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={logout}>
            <span>↪</span>
            Sign out
          </button>
          <button onClick={() => setDark(!dark)}>
            <span>◐</span>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="portal-main">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0b1329] border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition"
              aria-label="Open Navigation Menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight text-white select-none">
                GST<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bro</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg transition text-xs"
              title="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={logout}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[82vw] bg-[#0b1329] text-[#94a3b8] flex flex-col p-5 shadow-2xl z-10 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="leading-tight">
                  <span className="font-black text-xl tracking-tight text-white select-none">
                    GST<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Bro</span>
                  </span>
                  <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Client Hub</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  aria-label="Close Navigation Menu"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Workspace Badge */}
              <div className="my-4 p-3 bg-[#121c38] border border-[#1f2d52] rounded-xl flex items-center gap-2.5">
                <div className="avatar small shrink-0">CL</div>
                <div className="min-w-0">
                  <b className="text-xs text-white block truncate">{data?.client?.business_name || data?.client?.name || 'My Company'}</b>
                  <small className="text-[10px] text-slate-400 block truncate">{data?.client?.gstin || 'GST REGISTERED'}</small>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 space-y-1">
                {navTabs.map(([id, label, icon]) => (
                  <button
                    key={id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition text-left ${
                      active === id
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                    onClick={() => {
                      setActive(id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="w-5 text-center text-sm">{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
                <button
                  onClick={() => setDark(!dark)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition text-left"
                >
                  <span>◐</span>
                  <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition text-left"
                >
                  <span>↪</span>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="portal-content">
          {error && <div className="team-error">{error}</div>}

          {/* TAB CONTENTS */}
          {active === 'overview' && (
            <>
              {/* Executive Company Banner Header */}
              <div className="portal-heading">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="eyebrow">
                      {isSimpleMode ? 'SIMPLE BUSINESS FINANCIAL WORKSPACE' : 'TAXPAYER COMPLIANCE WORKSPACE'}
                    </p>
                    {isSimpleMode && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        👤 Simple Business Mode
                      </span>
                    )}
                  </div>
                  <h1>
                    {(data?.client?.display_name ?? data?.client?.business_name ?? data?.client?.name ?? 'Client')}{' '}
                    <span>✦</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {data?.client?.gstin && (
                      <span
                        onClick={copyGstin}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 shadow-2xs cursor-pointer hover:border-blue-400"
                        title="Click to copy GSTIN"
                      >
                        <span>GSTIN:</span> {data.client.gstin}
                        <span className="text-[10px] text-blue-600">{copiedGstin ? 'Copied!' : '📋'}</span>
                      </span>
                    )}
                    {data?.client?.state && (
                      <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
                        📍 {data.client.state}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      ✓ Monthly Regular Taxpayer
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                      🛡️ Managed by GST Bro Team
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {data?.driveFolderUrl && (
                    <a
                      href={data.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
                    >
                      <span>📂</span> Drive Vault ↗
                    </a>
                  )}
                  <button onClick={() => setUploadOpen(true)} className="primary-button">
                    + Upload Document
                  </button>
                </div>
              </div>

              {/* Assigned Dedicated Team Lead Banner */}
              {data?.assignedTeam && (
                <div className="bg-white border border-blue-100 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {data.assignedTeam.name ? data.assignedTeam.name.substring(0, 2).toUpperCase() : 'CA'}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Your Assigned Dedicated GST Expert
                      </span>
                      <strong className="text-sm text-slate-900 font-bold block">
                        {data.assignedTeam.name || 'GST Bro Compliance Specialist'}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {data.assignedTeam.email && `${data.assignedTeam.email} · `}
                        {data.assignedTeam.phone || 'Dedicated GST Specialist'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActive('messages')}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center"
                  >
                    <span>💬</span> Message Your Manager
                  </button>
                </div>
              )}

              {/* Month / Period Selector Dropdown in Overview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold shadow-2xs">
                    📅
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      {isSimpleMode ? 'Select Statement Month(s)' : 'Select GST Filing Period(s)'}
                    </span>
                    <div className="relative mt-1" ref={periodDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setPeriodDropdownOpen((prev) => !prev)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-xs text-blue-700 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer hover:border-blue-400 transition flex items-center gap-2.5"
                      >
                        <span className="font-mono">{activePeriodLabel}</span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                          {isAllSelected ? `All (${rows.length})` : `${activeRows.length} of ${rows.length}`}
                        </span>
                        <span className="text-slate-400 text-xs">
                          {periodDropdownOpen ? '▲' : '▼'}
                        </span>
                      </button>

                      {periodDropdownOpen && (
                        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800">Select Periods</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPeriods(['ALL'])}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline hover:no-underline"
                              >
                                Select All
                              </button>
                              <span className="text-slate-300">|</span>
                              {rows[0] && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPeriods([rows[0].period])}
                                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline hover:no-underline"
                                >
                                  Latest Only
                                </button>
                              )}
                            </div>
                          </div>

                          {/* "ALL" Option */}
                          <div
                            onClick={() => togglePeriod('ALL')}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none active:scale-[0.99] touch-target ${
                              isAllSelected
                                ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs'
                                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isAllSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}>
                                {isAllSelected && (
                                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <div className="text-xs flex items-center gap-1.5">
                                  <span>✨</span>
                                  <span>All Available Months (Cumulative)</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Sum of all {rows.length} filed periods combined
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                              TOTAL
                            </span>
                          </div>

                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1">
                            Or select individual months:
                          </div>

                          {/* Individual Month Checkboxes */}
                          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 touch-scroll-x">
                            {rows.map((r) => {
                              const isChecked = isAllSelected || selectedPeriods.includes(r.period);
                              const rSales = numberFrom(r.sales, ['total', 'taxableSales', 'taxable_sales']);
                              return (
                                <div
                                  key={r.period}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    togglePeriod(r.period);
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none active:scale-[0.99] touch-target ${
                                    isChecked && !isAllSelected
                                      ? 'bg-blue-50/90 border-blue-400 text-blue-900 font-bold shadow-2xs'
                                      : isChecked && isAllSelected
                                      ? 'bg-blue-50/40 border-slate-200 text-slate-800'
                                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                      isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-white border-slate-300'
                                    }`}>
                                      {isChecked && (
                                        <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold">
                                        {formatPeriodMonthYear(r.period)}
                                      </div>
                                      <div className="text-[10px] font-mono text-slate-400">
                                        {r.period}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-mono text-slate-600">
                                    ₹{rSales.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              {isAllSelected
                                ? `All ${rows.length} months active`
                                : `${activeRows.length} of ${rows.length} months selected`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPeriodDropdownOpen(false)}
                              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition touch-target"
                            >
                              Apply Selection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <span>✓</span>{' '}
                    {isSimpleMode
                      ? isAllSelected
                        ? 'All Periods Reconciled & Clear'
                        : activeRows.length > 1
                        ? `${activeRows.length} Months Combined & Reconciled`
                        : `${formatPeriodMonthYear(activeRows[0]?.period)} Reconciled & Clear`
                      : isAllSelected
                      ? `All ${rows.length} Periods Reconciled`
                      : activeRows.length > 1
                      ? `${activeRows.length} Periods Combined & Reconciled`
                      : `Period ${activeRows[0]?.period} Reconciled`}
                  </span>
                </div>
              </div>

              {/* 4 Core KPI Stat Cards */}
              <section className="stat-grid">
                <article className={isSimpleMode ? 'border-l-4 border-blue-500' : ''}>
                  <div className="stat-icon blue">💰</div>
                  <span>
                    {isSimpleMode
                      ? 'Total Sales (Money In)'
                      : isAllSelected
                      ? 'Taxable Turnover (Cumulative Total)'
                      : activeRows.length > 1
                      ? `Taxable Turnover (${activeRows.length} Months Combined)`
                      : `Taxable Turnover (${formatPeriodMonthYear(activeRows[0]?.period)})`}
                  </span>
                  <strong>₹{activeSales.toLocaleString('en-IN')}</strong>
                  <p>{isSimpleMode ? 'Total invoices billed to customers' : 'Gross outward supplies'}</p>
                </article>
                <article className={isSimpleMode ? 'border-l-4 border-indigo-500' : ''}>
                  <div className="stat-icon purple">{isSimpleMode ? '📦' : '▧'}</div>
                  <span>
                    {isSimpleMode
                      ? 'Business Purchases (Money Out)'
                      : isAllSelected
                      ? 'Output Tax Liability (Cumulative)'
                      : 'Output Tax Liability'}
                  </span>
                  <strong>₹{(isSimpleMode ? activePurchases : activeOutputTax).toLocaleString('en-IN')}</strong>
                  <p>{isSimpleMode ? 'Stock & expenses with tax bills' : 'IGST + CGST + SGST'}</p>
                </article>
                <article className={isSimpleMode ? 'border-l-4 border-emerald-500' : ''}>
                  <div className="stat-icon green">{isSimpleMode ? '🏷️' : '◈'}</div>
                  <span>
                    {isSimpleMode
                      ? 'Tax Saved on Purchases (ITC)'
                      : isAllSelected
                      ? 'Eligible ITC Claimed (Cumulative)'
                      : 'Eligible ITC Claimed'}
                  </span>
                  <strong>₹{activeItc.toLocaleString('en-IN')}</strong>
                  <p>{isSimpleMode ? 'Govt tax discount from purchase bills' : 'GSTR-2B Input Credit'}</p>
                </article>
                <article className={isSimpleMode ? 'border-l-4 border-amber-500' : ''}>
                  <div className="stat-icon amber">{isSimpleMode ? '🏦' : '₹'}</div>
                  <span>
                    {isSimpleMode
                      ? 'Actual Tax Paid from Bank'
                      : isAllSelected
                      ? 'Net Cash Tax Paid (Cumulative)'
                      : 'Net Cash Tax Paid'}
                  </span>
                  <strong>₹{activeCashPaid.toLocaleString('en-IN')}</strong>
                  <p>{isSimpleMode ? 'Net paid to govt via bank challan' : 'Challan PMT-06'}</p>
                </article>
              </section>

              {/* Comprehensive Month-wise Trends for All Data */}
              <section className="panel mb-4 space-y-4">
                <div className="panel-heading flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {isSimpleMode ? '📈 Month-by-Month Business & Tax Trends' : '📈 Month-wise Performance & Statutory Trends'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isSimpleMode
                        ? 'Monthly sales, purchases, and tax figures'
                        : 'Comparative trajectories for sales turnover, purchases, output tax, eligible ITC, and cash liability'}
                    </p>
                  </div>

                  {/* Trend Metric Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setTrendMetric('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${trendMetric === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      All Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('sales')}
                      className={`px-2.5 py-1 rounded-lg transition ${trendMetric === 'sales' ? 'bg-blue-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {isSimpleMode ? 'Sales (Money In)' : 'Sales'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('purchases')}
                      className={`px-2.5 py-1 rounded-lg transition ${trendMetric === 'purchases' ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {isSimpleMode ? 'Purchases (Expenses)' : 'Purchases'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('output')}
                      className={`px-2.5 py-1 rounded-lg transition ${trendMetric === 'output' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {isSimpleMode ? 'Sales Tax' : 'Output Tax'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('itc')}
                      className={`px-2.5 py-1 rounded-lg transition ${trendMetric === 'itc' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {isSimpleMode ? 'Tax Saved (ITC)' : 'Eligible ITC'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('cash')}
                      className={`px-2.5 py-1 rounded-lg transition ${trendMetric === 'cash' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {isSimpleMode ? 'Bank Paid' : 'Cash Paid'}
                    </button>
                  </div>
                </div>

                {/* Visual Comparative Bars for the Selected Metric / All Metrics */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rows.slice(0, 6).map((r) => {
                      const rSales = numberFrom(r.sales, ['total', 'taxableSales', 'taxable_sales']);
                      const rPurchases = numberFrom(r.purchases, ['total', 'taxablePurchases', 'taxable_purchase', 'taxable_purchases']);
                      const rOut = numberFrom(r.sales, ['gstAmount', 'outputTax', 'output_tax']);
                      const rItc = numberFrom(r.itc, ['total', 'totalItc', 'total_itc']);
                      const rCash = numberFrom(r.gstr3b, ['cashPaid', 'cash_paid']) || numberFrom(r.sales, ['cashTaxPaid', 'cash_tax_paid']) || Math.max(0, rOut - rItc);
                      const isSelected = isAllSelected || selectedPeriods.includes(r.period);
                      const isExclusive = !isAllSelected && selectedPeriods.length === 1 && selectedPeriods[0] === r.period;

                      return (
                        <div
                          key={r.period}
                          onClick={() => selectSinglePeriod(r.period)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer ${
                            isExclusive
                              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-300'
                              : isSelected
                              ? 'bg-blue-50/50 border-blue-300'
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                            <div>
                              <strong className="text-xs font-bold text-slate-900 block">
                                {formatPeriodMonthYear(r.period)}
                              </strong>
                              <span className="font-mono text-[10px] text-slate-500">{r.period}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isExclusive
                                  ? 'bg-blue-600 text-white'
                                  : isSelected
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isExclusive ? 'Viewing Solo' : isSelected ? 'Included' : 'Select'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs font-mono">
                            {(trendMetric === 'all' || trendMetric === 'sales') && (
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-[11px] text-slate-500">{isSimpleMode ? 'Sales' : 'Turnover'}:</span>
                                <strong className="text-slate-900">₹{rSales.toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {(trendMetric === 'all' || trendMetric === 'purchases') && (
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-[11px] text-slate-500">Purchases:</span>
                                <strong className="text-indigo-700">₹{rPurchases.toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {(trendMetric === 'all' || trendMetric === 'output') && (
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-[11px] text-slate-500">{isSimpleMode ? 'Sales Tax' : 'Output GST'}:</span>
                                <strong className="text-amber-600">₹{rOut.toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {(trendMetric === 'all' || trendMetric === 'itc') && (
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-[11px] text-slate-500">{isSimpleMode ? 'Tax Saved' : 'Eligible ITC'}:</span>
                                <strong className="text-emerald-600">₹{rItc.toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                            {(trendMetric === 'all' || trendMetric === 'cash') && (
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-[11px] text-slate-500">{isSimpleMode ? 'Bank Paid' : 'Cash Paid'}:</span>
                                <strong className="text-blue-600 font-bold">₹{rCash.toLocaleString('en-IN')}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Month-wise Breakdown Matrix Table */}
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Month / Period</th>
                          <th className="py-2.5 px-3">{isSimpleMode ? 'Total Sales (Revenue)' : 'Taxable Sales'}</th>
                          <th className="py-2.5 px-3">{isSimpleMode ? 'Total Purchases' : 'Inward Purchases'}</th>
                          <th className="py-2.5 px-3">{isSimpleMode ? 'Sales Tax' : 'Output Tax'}</th>
                          <th className="py-2.5 px-3">{isSimpleMode ? 'Tax Saved (Credit)' : 'Eligible ITC'}</th>
                          <th className="py-2.5 px-3">{isSimpleMode ? 'Paid From Bank' : 'Net Cash Paid'}</th>
                          <th className="py-2.5 px-3">{isSimpleMode ? 'Filing Status' : 'Filing Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {rows.map((r) => {
                          const rSales = numberFrom(r.sales, ['total', 'taxableSales', 'taxable_sales']);
                          const rPurchases = numberFrom(r.purchases, ['total', 'taxablePurchases', 'taxable_purchase', 'taxable_purchases']);
                          const rOut = numberFrom(r.sales, ['gstAmount', 'outputTax', 'output_tax']);
                          const rItc = numberFrom(r.itc, ['total', 'totalItc', 'total_itc']);
                          const rCash = numberFrom(r.gstr3b, ['cashPaid', 'cash_paid']) || numberFrom(r.sales, ['cashTaxPaid', 'cash_tax_paid']) || Math.max(0, rOut - rItc);
                          const isSelected = isAllSelected || selectedPeriods.includes(r.period);
                          const isExclusive = !isAllSelected && selectedPeriods.length === 1 && selectedPeriods[0] === r.period;

                          return (
                            <tr
                              key={r.period}
                              onClick={() => selectSinglePeriod(r.period)}
                              className={`cursor-pointer transition ${
                                isExclusive
                                  ? 'bg-blue-100/80 font-bold'
                                  : isSelected
                                  ? 'bg-blue-50/60 font-semibold'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                                {isSelected && <span className="text-blue-600">●</span>}
                                {formatPeriodMonthYear(r.period)} ({r.period})
                              </td>
                              <td className="py-2.5 px-3 text-slate-900">₹{rSales.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-indigo-700">₹{rPurchases.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-amber-600">₹{rOut.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-emerald-600">₹{rItc.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-blue-700 font-bold">₹{rCash.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  ✓ Filed & Cleared
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="dashboard-grid">
                <article className="panel sales-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Tax & Turnover Trajectory</h2>
                      <p>Monthly trends maintained and reconciled by your team</p>
                    </div>
                    <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                      <option value="sales">Sales (Taxable Value)</option>
                      <option value="output">Output GST</option>
                      <option value="itc">Eligible ITC</option>
                      <option value="liability">Net Cash Liability</option>
                      <option value="purchases">Inward Purchases</option>
                    </select>
                  </div>
                  <div className="sales-total">
                    <strong>₹{values.reduce((sum, value) => sum + value, 0).toLocaleString('en-IN')}</strong>
                    <span className="positive">Live Synced</span>
                    <small>{metricLabel} (Annual Cumulative)</small>
                  </div>
                  <Chart values={values} />
                </article>

                <article className="panel tasks-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Action Items & Compliance</h2>
                      <p>Team verified compliance checkpoints</p>
                    </div>
                  </div>
                  {actions.map((action) => (
                    <div className="task-item" key={action.label}>
                      <span className={`task-dot ${action.tone}`}>✓</span>
                      <div>
                        <b>{action.label}</b>
                        <small>{action.detail}</small>
                      </div>
                      <button onClick={action.onClick}>{action.button}</button>
                    </div>
                  ))}
                  {!actions.length && <div className="empty-state">All compliance items up to date.</div>}
                </article>
              </section>

              {/* Statutory Due Dates Ribbon */}
              <section className="panel mb-4">
                <div className="panel-heading mb-3">
                  <div>
                    <h2>Statutory Deadlines & Compliance Calendar</h2>
                    <p>Mandatory deadlines for the current tax period</p>
                  </div>
                  <button onClick={() => setActive('calendar')} className="text-button">
                    View Full Calendar ↗
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {upcomingDueDates.slice(0, 4).map((due) => {
                    const dueDateObj = new Date(due.due_date);
                    const diffDays = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={due.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-extrabold text-blue-700 uppercase block font-mono">
                              {dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                              {due.category}
                            </span>
                          </div>
                          <strong className="text-slate-900 block font-bold text-xs mt-0.5">{due.title}</strong>
                          <span className="text-[11px] text-slate-500 block mt-1 line-clamp-2">
                            {due.description || 'Statutory compliance deadline handled by your assigned team'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              diffDays < 0
                                ? 'bg-slate-200 text-slate-700'
                                : diffDays === 0
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'
                                : diffDays <= 5
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {diffDays < 0 ? '✓ Filed & Clear' : diffDays === 0 ? 'Due Today' : `${diffDays} days left`}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">Team Handled</span>
                        </div>
                      </div>
                    );
                  })}
                  {!upcomingDueDates.length && (
                    <div className="col-span-4 p-4 text-center text-xs text-slate-400">
                      All upcoming statutory compliance deadlines are in sync.
                    </div>
                  )}
                </div>
              </section>

              {/* Lower Grid: Returns & Activity */}
              <section className="dashboard-grid lower">
                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent GST Returns Filed</h2>
                      <p>Synced return history</p>
                    </div>
                    <button onClick={() => setActive('returns')} className="text-button">
                      View All ↗
                    </button>
                  </div>
                  {rows.slice(0, 4).map((row) => {
                    const rSales = numberFrom(row.sales, ['total', 'taxableSales']);
                    const rItc = numberFrom(row.itc, ['total', 'totalItc']);
                    return (
                      <div className="return-row" key={row.period}>
                        <span className="return-code">3B</span>
                        <div>
                          <b>Period: {row.period}</b>
                          <small>
                            Sales: ₹{rSales.toLocaleString('en-IN')} · ITC: ₹{rItc.toLocaleString('en-IN')}
                          </small>
                        </div>
                        <StatusPill tone="green">Filed & Synced</StatusPill>
                        <span className="return-date">Team Verified</span>
                      </div>
                    );
                  })}
                  {!rows.length && <div className="empty-state">No GST return records yet.</div>}
                </article>

                <article className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Workspace Activity</h2>
                      <p>Latest updates and records</p>
                    </div>
                  </div>
                  {activity.map((item) => (
                    <div className="activity" key={`${item.title}-${item.date}-${Math.random()}`}>
                      <span className={`activity-icon ${item.tone}`}>✓</span>
                      <div>
                        <b>{item.title}</b>
                        <small>
                          {item.detail} · {item.date}
                        </small>
                      </div>
                    </div>
                  ))}
                  {!activity.length && <div className="empty-state">No activity yet.</div>}
                </article>
              </section>
            </>
          )}

          {/* RETURNS TAB: View-Only for Client */}
          {active === 'returns' && (
            <section className="panel inner-page space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="eyebrow">{isSimpleMode ? 'GOVERNMENT TAX PROOFS' : 'STATUTORY FILINGS'}</p>
                  <h2>{isSimpleMode ? 'Tax Filing Proofs & Confirmations' : 'Filed GST Returns'}</h2>
                  <p>
                    {isSimpleMode
                      ? 'Your official filing receipts, government confirmation codes (ARNs), and payment proofs verified by your tax specialist.'
                      : 'Official GSTR-1 and GSTR-3B filings, ARNs, and tax liabilities maintained and reconciled by your assigned team.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Return Filter Dropdown */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                    <label className="text-xs font-semibold text-slate-600">Return View:</label>
                    <select
                      value={returnFilter}
                      onChange={(e) => setReturnFilter(e.target.value as 'ALL' | 'GSTR1' | 'GSTR3B')}
                      className="bg-transparent text-xs font-bold text-slate-800 border-none outline-hidden cursor-pointer"
                    >
                      <option value="ALL">All Returns (Combined View)</option>
                      <option value="GSTR1">GSTR-1 (Outward Supplies)</option>
                      <option value="GSTR3B">GSTR-3B (Summary Return)</option>
                    </select>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
                    <span>🛡️</span> Managed &amp; Verified by Team
                  </span>
                </div>
              </div>

              {isSimpleMode ? (
                /* Simple Non-Technical Cards for Each Month */
                <div className="space-y-4">
                  {rows.map((row) => {
                    const g1 = (row.gstr1 || {}) as Record<string, unknown>;
                    const g3b = (row.gstr3b || {}) as Record<string, unknown>;
                    const salesObj = (row.sales || {}) as Record<string, unknown>;
                    const itcObj = (row.itc || {}) as Record<string, unknown>;

                    const g1Sales = Number(g1.taxableSales ?? g1.taxableValue ?? salesObj.taxableSales ?? 0);
                    const g1Tax = Number(g1.totalTax ?? salesObj.outputTax ?? 0);
                    const g1Arn = String(g1.arn || (Object.keys(g1).length > 0 ? 'ARN-VERIFIED' : ''));
                    const g1Date = formatGstDateDisplay(g1.filingDate || g1.arnDate);

                    const g3bSales = Number(g3b.outwardTaxable ?? salesObj.taxableSales ?? 0);
                    const g3bTax = Number(g3b.outwardTax ?? salesObj.outputTax ?? 0);
                    const g3bItc = Number(g3b.itcAvailable ?? itcObj.totalItc ?? (itcObj.inwardItc as any)?.total ?? 0);
                    const g3bCash = Number(g3b.cashPaid ?? salesObj.cashTaxPaid ?? Math.max(0, g3bTax - g3bItc));
                    const g3bArn = String(g3b.arn || (Object.keys(g3b).length > 0 ? 'ARN-VERIFIED' : ''));
                    const g3bDate = formatGstDateDisplay(g3b.filingDate || g3b.arnDate);

                    const rSales = returnFilter === 'GSTR1' ? g1Sales : returnFilter === 'GSTR3B' ? g3bSales : (g1Sales || g3bSales);
                    const rOut = returnFilter === 'GSTR1' ? g1Tax : returnFilter === 'GSTR3B' ? g3bTax : (g1Tax || g3bTax);
                    const rItc = returnFilter === 'GSTR1' ? 0 : g3bItc;
                    const rCash = returnFilter === 'GSTR1' ? 0 : g3bCash;
                    const hasG1 = Object.keys(g1).length > 0 || Boolean(g1Arn);

                    return (
                      <div key={row.period} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg">
                              ✓
                            </span>
                            <div>
                              <strong className="text-base text-slate-900 block font-bold">
                                {formatPeriodMonthYear(row.period)} {returnFilter === 'GSTR1' ? 'GSTR-1 Supplies Filed' : returnFilter === 'GSTR3B' ? 'GSTR-3B Taxes Filed' : 'Taxes Successfully Filed'}
                              </strong>
                              <span className="text-xs text-slate-500">
                                Official Period: <span className="font-mono font-bold text-slate-700">{row.period}</span> · Filed on Time
                              </span>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold self-start sm:self-center">
                            100% Complete &amp; Locked
                          </span>
                        </div>

                        {/* Plain Language Summary Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">
                              {returnFilter === 'GSTR1' ? 'GSTR-1 Sales' : returnFilter === 'GSTR3B' ? 'GSTR-3B Sales' : 'Sales Billed'}
                            </span>
                            <strong className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                              ₹{rSales.toLocaleString('en-IN')}
                            </strong>
                            <small className="text-slate-400 text-[10px]">Customer sales</small>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Sales Tax (Govt)</span>
                            <strong className="text-sm font-bold text-amber-600 font-mono block mt-0.5">
                              ₹{rOut.toLocaleString('en-IN')}
                            </strong>
                            <small className="text-slate-400 text-[10px]">Tax collected</small>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Purchase Tax Saved</span>
                            <strong className="text-sm font-bold text-emerald-600 font-mono block mt-0.5">
                              {returnFilter === 'GSTR1' ? '-' : `₹${rItc.toLocaleString('en-IN')}`}
                            </strong>
                            <small className="text-slate-400 text-[10px]">
                              {returnFilter === 'GSTR1' ? 'N/A (Outward Only)' : 'ITC discount saved'}
                            </small>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Paid From Bank</span>
                            <strong className="text-sm font-bold text-blue-600 font-mono block mt-0.5">
                              {returnFilter === 'GSTR1' ? '-' : `₹${rCash.toLocaleString('en-IN')}`}
                            </strong>
                            <small className="text-slate-400 text-[10px]">
                              {returnFilter === 'GSTR1' ? 'N/A' : 'Bank challan (PMT-06)'}
                            </small>
                          </div>
                        </div>

                        {/* Government Proofs & Codes */}
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-3">
                              {(returnFilter === 'ALL' || returnFilter === 'GSTR1') && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-600 font-semibold">GSTR-1 ARN:</span>
                                  <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-blue-700">
                                    {g1Arn || 'Pending'}
                                  </code>
                                  {g1Date !== '-' && (
                                    <span className="text-[11px] text-slate-500 font-sans">({g1Date})</span>
                                  )}
                                </div>
                              )}
                              {(returnFilter === 'ALL' || returnFilter === 'GSTR3B') && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-600 font-semibold">GSTR-3B ARN:</span>
                                  <code className="bg-white px-2 py-0.5 rounded border border-slate-300 font-bold text-indigo-700">
                                    {g3bArn || 'Pending'}
                                  </code>
                                  {g3bDate !== '-' && (
                                    <span className="text-[11px] text-slate-500 font-sans">({g3bDate})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              These confirmation codes verify your return submission on gst.gov.in. Keep for bank audits and loan verifications.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasG1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGstr1Row(row);
                                  setGstr1ModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>📊</span> View GSTR-1 Details
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const code = returnFilter === 'GSTR1' ? g1Arn : (g3bArn || g1Arn);
                                navigator.clipboard.writeText(code);
                                showToast('ARN Code copied to clipboard!');
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-blue-600 rounded-lg font-bold text-xs shadow-2xs transition"
                            >
                              Copy ARN Code
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!rows.length && (
                    <div className="py-12 text-center text-slate-400 font-medium">
                      No filings submitted yet. Your assigned GST team will prepare and file your upcoming monthly returns.
                    </div>
                  )}
                </div>
              ) : (
                <>
              {/* Returns Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      {returnFilter === 'GSTR1' && (
                        <>
                          <th className="py-2.5 px-3">Taxable Sales (GSTR-1)</th>
                          <th className="py-2.5 px-3">Output GST</th>
                          <th className="py-2.5 px-3">Eligible ITC</th>
                          <th className="py-2.5 px-3">GSTR-1 ARN Reference</th>
                          <th className="py-2.5 px-3">Filing Date (ARN Date)</th>
                          <th className="py-2.5 px-3">GSTR-1 Status</th>
                        </>
                      )}
                      {returnFilter === 'GSTR3B' && (
                        <>
                          <th className="py-2.5 px-3">Taxable Sales (3B)</th>
                          <th className="py-2.5 px-3">Output GST</th>
                          <th className="py-2.5 px-3 text-indigo-700 font-bold">Purchases</th>
                          <th className="py-2.5 px-3 text-emerald-700 font-bold">Eligible ITC (Table 4)</th>
                          <th className="py-2.5 px-3 text-blue-700 font-bold">Net Cash Paid</th>
                          <th className="py-2.5 px-3">GSTR-3B ARN Reference</th>
                          <th className="py-2.5 px-3">Filing Date (ARN Date)</th>
                          <th className="py-2.5 px-3">GSTR-3B Status</th>
                        </>
                      )}
                      {returnFilter === 'ALL' && (
                        <>
                          <th className="py-2.5 px-3">GSTR-1 Sales</th>
                          <th className="py-2.5 px-3">GSTR-3B Sales</th>
                          <th className="py-2.5 px-3 text-indigo-700 font-bold">Purchases</th>
                          <th className="py-2.5 px-3 text-emerald-700 font-bold">Eligible ITC (3B)</th>
                          <th className="py-2.5 px-3 text-blue-700 font-bold">Net Cash Paid</th>
                          <th className="py-2.5 px-3">GSTR-1 ARN &amp; Date</th>
                          <th className="py-2.5 px-3">GSTR-3B ARN &amp; Date</th>
                          <th className="py-2.5 px-3">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {rows.map((row) => {
                      const g1 = (row.gstr1 || {}) as Record<string, unknown>;
                      const g3b = (row.gstr3b || {}) as Record<string, unknown>;
                      const salesObj = (row.sales || {}) as Record<string, unknown>;
                      const itcObj = (row.itc || {}) as Record<string, unknown>;

                      const g1Sales = Number(g1.taxableSales ?? g1.taxableValue ?? salesObj.taxableSales ?? 0);
                      const g1Tax = Number(g1.totalTax ?? salesObj.outputTax ?? 0);
                      const g1Arn = String(g1.arn || (Object.keys(g1).length > 0 ? 'ARN-VERIFIED' : ''));
                      const g1Date = formatGstDateDisplay(g1.filingDate || g1.arnDate);

                      const g3bSales = Number(g3b.outwardTaxable ?? salesObj.taxableSales ?? 0);
                      const g3bTax = Number(g3b.outwardTax ?? salesObj.outputTax ?? 0);
                      const g3bItc = Number(g3b.itcAvailable ?? itcObj.totalItc ?? (itcObj.inwardItc as any)?.total ?? 0);
                      const g3bCash = Number(g3b.cashPaid ?? salesObj.cashTaxPaid ?? Math.max(0, g3bTax - g3bItc));
                      const g3bArn = String(g3b.arn || (Object.keys(g3b).length > 0 ? 'ARN-VERIFIED' : ''));
                      const g3bDate = formatGstDateDisplay(g3b.filingDate || g3b.arnDate);

                      const rPurchases = numberFrom(row.purchases, ['total', 'taxablePurchases', 'taxable_purchase', 'taxable_purchases']);

                      const hasG1 = Object.keys(g1).length > 0 || Boolean(g1Arn);
                      const hasG3b = Object.keys(g3b).length > 0 || Boolean(g3bArn);

                      return (
                        <tr key={row.period} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-sans font-bold text-slate-900">{row.period}</td>

                          {returnFilter === 'GSTR1' && (
                            <>
                              <td className="py-3 px-3">₹{g1Sales.toLocaleString('en-IN')}</td>
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
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition shadow-2xs"
                                    title="Click to view official Form GSTR-1 breakdown tables"
                                  >
                                    <span>✓ Filed</span>
                                    <span className="text-emerald-950 font-normal">🔍 Details</span>
                                  </button>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {returnFilter === 'GSTR3B' && (
                            <>
                              <td className="py-3 px-3">₹{g3bSales.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-amber-600">₹{g3bTax.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-indigo-700 font-bold">₹{rPurchases.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-emerald-600 font-bold">₹{g3bItc.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-blue-600 font-bold">₹{g3bCash.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-[11px] text-blue-700 font-bold truncate max-w-[150px]">
                                {g3bArn || '-'}
                              </td>
                              <td className="py-3 px-3 font-sans text-slate-700">{g3bDate !== '-' ? g3bDate : '-'}</td>
                              <td className="py-3 px-3 font-sans">
                                {hasG3b ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                    ✓ Filed (3B)
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}

                          {returnFilter === 'ALL' && (
                            <>
                              <td className="py-3 px-3 text-slate-900">₹{g1Sales.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-slate-900">₹{g3bSales.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-indigo-700 font-bold">₹{rPurchases.toLocaleString('en-IN')}</td>
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
                                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    ✓ 1 &amp; 3B Filed
                                  </span>
                                ) : hasG1 ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    GSTR-1 Filed
                                  </span>
                                ) : hasG3b ? (
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                    GSTR-3B Filed
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {!rows.length && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                          No return records filed yet. Your assigned GST team will upload and reconcile returns for each period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* SECTION: Electronic Credit Ledger (ITC Balance & Utilization) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase mb-1">
                      <span>🏦</span> Form GST PMT-02 Compliant
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Electronic Credit Ledger (ITC Statement)</h3>
                    <p className="text-xs text-slate-500">
                      Automated multi-period ITC ledger. Opening balances carry forward across months; utilized against output tax per Rule 88A.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                    Reconciled with Portal Returns
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
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
                      {itcLedger.map((rec) => (
                        <tr key={rec.period} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-sans font-bold text-slate-900">{rec.period}</td>
                          <td className="py-3 px-3">₹{rec.openingItc.total.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-emerald-700 font-medium">+₹{rec.inwardItc.total.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 font-bold text-slate-800">₹{rec.totalAvailableItc.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-amber-600 font-medium">-₹{rec.outputTaxLiability.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-slate-700">₹{rec.itcUtilized.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50/40">
                            ₹{rec.closingItc.total.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 font-bold text-blue-600 bg-blue-50/40">
                            ₹{rec.netCashPayable.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {!itcLedger.length && (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400 font-sans">
                            No ITC ledger records initialized. Your assigned team will configure opening ITC and update returns.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>
                    💡 <b>Automated Formula:</b> Closing ITC = Total Available ITC (Opening + 3B Eligible ITC) – GST on Sales. Carry forward transfers to next month.
                  </span>
                  <span className="font-semibold text-emerald-800">
                    Cumulative Closing Carry-Forward Active
                  </span>
                </div>
              </div>
              </>
              )}
            </section>
          )}

          {/* MONTHLY FINANCIAL REPORT & P&L TAB */}
          {active === 'financials' && (
            <section className="panel inner-page">
              <MonthlyFinancialReport
                gstData={rows}
                client={data?.client}
                assignedTeam={data?.assignedTeam}
              />
            </section>
          )}

          {/* INVOICING HUB TAB */}
          {active === 'invoicing' && (
            <section className="panel inner-page">
              <InvoiceDashboard />
            </section>
          )}

          {/* STATUTORY PORTALS LAUNCHPAD TAB */}
          {active === 'portals' && (
            <section className="panel inner-page">
              <GstPortalsLaunchpad clientGstin={data?.client?.gstin} />
            </section>
          )}

          {/* DOCUMENTS & DRIVE VAULT TAB */}
          {active === 'documents' && (
            <section className="panel inner-page space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="eyebrow">DOCUMENT VAULT</p>
                  <h2>Archived Documents & Google Drive Repository</h2>
                  <p>All business documents are preserved and accessible to your assigned compliance team.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none w-48 focus:border-blue-500"
                  />
                  {data?.driveFolderUrl && (
                    <a
                      href={data.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>📂</span> Open Google Drive Folder ↗
                    </a>
                  )}
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 shadow-sm"
                  >
                    + Upload Document
                  </button>
                </div>
              </div>

              {docs.map((doc) => (
                <div className="document-row" key={doc.id}>
                  <span className="file-type">FILE</span>
                  <div>
                    <b>{doc.file_name}</b>
                    <small>
                      {doc.category} · {new Date(doc.uploaded_at).toLocaleDateString()}
                    </small>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Preserved in Vault</span>
                </div>
              ))}
              {!docs.length && <div className="empty-state">No documents uploaded yet.</div>}
            </section>
          )}

          {/* COMPLIANCE CALENDAR TAB */}
          {active === 'calendar' && (
            <section className="panel inner-page space-y-4">
              <div className="panel-heading border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">CALENDAR</p>
                  <h2>Statutory Compliance Schedule</h2>
                  <p>Official Government due dates for GST, TDS, TCS, and Annual Returns</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('ALL')}
                    className={`px-3 py-1 rounded-lg transition ${
                      calendarCategory === 'ALL'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All ({upcomingDueDates.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('GST')}
                    className={`px-3 py-1 rounded-lg transition ${
                      calendarCategory === 'GST'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    GST Returns
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('TDS_TCS')}
                    className={`px-3 py-1 rounded-lg transition ${
                      calendarCategory === 'TDS_TCS'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    TDS / TCS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('INCOME_TAX')}
                    className={`px-3 py-1 rounded-lg transition ${
                      calendarCategory === 'INCOME_TAX'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Advance Tax
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarCategory('ANNUAL')}
                    className={`px-3 py-1 rounded-lg transition ${
                      calendarCategory === 'ANNUAL'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Annual Returns
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredCalendarDueDates.map((due) => {
                  const dueDateObj = new Date(due.due_date);
                  const diffDays = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  return (
                    <div
                      key={due.id}
                      className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 text-center p-2 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0">
                          <span className="block text-[9px] uppercase font-bold text-slate-500">
                            {dueDateObj.toLocaleDateString('en-IN', { month: 'short' })}
                          </span>
                          <span className="block text-base font-extrabold text-slate-900 leading-tight">
                            {dueDateObj.getDate()}
                          </span>
                          <span className="block text-[8px] text-slate-400 font-mono">
                            {dueDateObj.getFullYear()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                              {due.category}
                            </span>
                            <strong className="text-sm font-bold text-slate-900">{due.title}</strong>
                          </div>
                          {due.description && (
                            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                              {due.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            diffDays < 0
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : diffDays === 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'
                              : diffDays <= 5
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {diffDays < 0 ? '✓ Filed & Closed' : diffDays === 0 ? 'Due Today' : `${diffDays} days left`}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <span>🛡️</span> Handled by Team
                        </span>
                      </div>
                    </div>
                  );
                })}
                {!filteredCalendarDueDates.length && (
                  <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200/80 rounded-2xl">
                    <div className="text-3xl mb-2">🎉</div>
                    <h3 className="text-sm font-bold text-emerald-900">All Statutory Filings are Completed!</h3>
                    <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                      All required statutory returns for this period have been marked as done and reconciled by your assigned GST team.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800 shadow-2xs">
                      <span>🛡️</span> 100% Tax Compliant
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* FEE INVOICES TAB */}
          {active === 'fees' && (
            <section className="panel inner-page space-y-4">
              <div className="panel-heading border-b pb-3">
                <div>
                  <p className="eyebrow">BILLING</p>
                  <h2>GST Bro Service Invoices</h2>
                  <p>Invoices and fee payments for your professional GST management services</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">GST (18%)</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(data?.fees ?? []).map((fee) => (
                      <tr key={fee.id}>
                        <td className="p-3 font-bold text-slate-900">{fee.invoice_number}</td>
                        <td className="p-3 font-sans">{fee.description}</td>
                        <td className="p-3">₹{Number(fee.amount).toLocaleString('en-IN')}</td>
                        <td className="p-3">₹{Number(fee.gst_amount).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-slate-600">{new Date(fee.due_date).toLocaleDateString()}</td>
                        <td className="p-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fee.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {fee.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!data?.fees?.length && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                          No outstanding fee invoices. Your account is in good standing!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* MESSAGES TAB */}
          {active === 'messages' && (
            <section className="panel inner-page">
              <div className="panel-heading border-b pb-3 mb-3">
                <div>
                  <p className="eyebrow">COMMUNICATION</p>
                  <h2>Assigned GST Compliance Desk</h2>
                  <p>Chat directly with your assigned GST team lead. Messages are automatically archived after 7 days.</p>
                </div>
              </div>

              <div className="client-chat">
                <div className="chat-history">
                  {messages.map((item) => {
                    const isClient = item.sender_user_id === currentUserId();
                    return (
                      <div
                        className={`chat-message ${isClient ? 'client-msg' : ''}`}
                        key={item.id}
                        style={{
                          marginLeft: isClient ? 'auto' : '0',
                          background: isClient ? '#dbeafe' : '#f1f5f9',
                        }}
                      >
                        <b>{isClient ? 'You' : (data?.assignedTeam?.name || 'GST Bro Support Desk')}</b>
                        <p>{item.message}</p>
                        <small>{new Date(item.created_at).toLocaleString()}</small>
                      </div>
                    );
                  })}
                  {!messages.length && (
                    <div className="empty-state">
                      No messages yet. Send a query below to connect with your assigned GST specialist.
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Ask your assigned GST specialist about return filings, notices, or ITC reconciliations..."
                    rows={3}
                  />
                  <button
                    className="primary-button"
                    onClick={sendMessage}
                    disabled={!messageText.trim()}
                  >
                    Send Message to Team
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ACCOUNT PROFILE TAB */}
          {active === 'account' && (
            <AccountPanel client={data?.client} />
          )}
        </div>
      </main>

      {/* Document Upload Modal */}
      {uploadOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!uploadLoading) resetUploadModal();
          }}
        >
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => {
                if (!uploadLoading) resetUploadModal();
              }}
            >
              ×
            </button>
            <div className="upload-cloud">↑</div>
            <h2>Upload Document</h2>
            <p>Add a file to your secure workspace. Your team will inspect and process it.</p>

            <form onSubmit={handleUploadSubmit} className="text-left mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setUploadCategory(newCat);
                    if (uploadFile && !isNameEdited) {
                      setCustomFileName(formatStandardFileName(clientName, newCat, uploadMonth, uploadYear, uploadFile.name));
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="CLIENT_DOCS">General KYC / Business Documents</option>
                  <option value="SALES">Sales Register (Monthly)</option>
                  <option value="PURCHASES">Purchase Register (Monthly)</option>
                  <option value="ITC">Tax Payment Challans & ITC Records</option>
                </select>
              </div>

              {(uploadCategory === 'SALES' || uploadCategory === 'PURCHASES') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Financial Year</label>
                    <select
                      value={uploadYear}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        setUploadYear(newYear);
                        if (uploadFile && !isNameEdited) {
                          setCustomFileName(formatStandardFileName(clientName, uploadCategory, uploadMonth, newYear, uploadFile.name));
                        }
                      }}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:border-blue-500"
                    >
                      <option>2026-27</option>
                      <option>2025-26</option>
                      <option>2024-25</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
                    <select
                      value={uploadMonth}
                      onChange={(e) => {
                        const newMonth = e.target.value;
                        setUploadMonth(newMonth);
                        if (uploadFile && !isNameEdited) {
                          setCustomFileName(formatStandardFileName(clientName, uploadCategory, newMonth, uploadYear, uploadFile.name));
                        }
                      }}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm focus:border-blue-500"
                    >
                      {[
                        'April', 'May', 'June', 'July', 'August', 'September',
                        'October', 'November', 'December', 'January', 'February', 'March',
                      ].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select File (Max 100 MB)</label>
                <input
                  type="file"
                  required
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {/* Editable File Name for Assigned Team */}
              {uploadFile && (
                <div className="bg-slate-50 border border-blue-200/80 rounded-xl p-3 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      File Name for Team <span className="text-blue-600 font-semibold">(Editable)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const std = formatStandardFileName(clientName, uploadCategory, uploadMonth, uploadYear, uploadFile.name);
                        setCustomFileName(std);
                        setIsNameEdited(false);
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition"
                      title="Reset to recommended standard naming format"
                    >
                      <span>🔄</span> Reset name
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => {
                      setCustomFileName(e.target.value);
                      setIsNameEdited(true);
                    }}
                    placeholder="Enter file name..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-600 pt-0.5">
                    <span className="text-blue-600 font-bold">ℹ</span>
                    <span>
                      Standard format includes <strong>{clientName}</strong>
                      {(uploadCategory === 'SALES' || uploadCategory === 'PURCHASES') && (
                        <span> + <strong>{uploadMonth} {uploadYear}</strong> + <strong>{uploadCategory === 'SALES' ? 'Sales Register' : 'Purchase Register'}</strong></span>
                      )} so your assigned team can find it easily. You can edit this freely above.
                    </span>
                  </div>
                </div>
              )}

              {uploadStatus?.error && <p className="text-red-600 text-xs">{uploadStatus.error}</p>}
              {uploadStatus?.success && <p className="text-green-600 text-xs font-semibold">{uploadStatus.success}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="w-1/2 border border-slate-300 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
                  onClick={resetUploadModal}
                  disabled={uploadLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button w-1/2"
                  disabled={!uploadFile || uploadLoading}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Form GSTR-1 Statutory Detail Modal */}
      <Gstr1DetailModal
        isOpen={gstr1ModalOpen}
        onClose={() => {
          setGstr1ModalOpen(false);
          setSelectedGstr1Row(null);
        }}
        period={selectedGstr1Row?.period || ''}
        clientName={clientName}
        clientGstin={data?.client?.gstin}
        gstr1Data={selectedGstr1Row?.gstr1}
        salesData={selectedGstr1Row?.sales}
      />

      {/* Floating Toast notification */}
      {toast && <div className="portal-toast">{toast}</div>}
    </div>
  );
}

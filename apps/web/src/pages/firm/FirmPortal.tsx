import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearToken, getToken } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { PortalLoadingSkeleton } from '../../components/PortalLoadingSkeleton';

type FirmProfile = {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  logo_url?: string | null;
  frn_number?: string | null;
  membership_number?: string | null;
  stamp_signature_url?: string | null;
  letterhead_url?: string | null;
  brand_color?: string | null;
  branding?: Record<string, any>;
  status: string;
};

type FirmTask = {
  id: string;
  title: string;
  description?: string | null;
  category: 'GST' | 'INCOME_TAX' | 'AUDIT' | 'ROC' | 'ACCOUNTING' | 'OFFICE';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'ARCHIVED';
  due_date?: string | null;
  assigned_to?: string | null;
  client_id?: string | null;
  created_at: string;
  completed_at?: string | null;
  client?: { id: string; name: string; business_name?: string | null; gstin?: string | null } | null;
  assigned_user?: { id: string; name: string; email: string } | null;
  creator?: { id: string; name: string } | null;
  completer?: { id: string; name: string } | null;
};

type RecurringRule = {
  id: string;
  rule_name: string;
  task_template_title: string;
  category: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  days_before_due_date: number;
  target_due_date_category: string;
  auto_assign_to_client_staff: boolean;
  is_active: boolean;
};

type FirmClient = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  business_name?: string | null;
  gstin?: string | null;
  state?: string | null;
  address?: string | null;
  filing_stage?: 'DATA_COLLECTION' | 'RECON_IN_PROGRESS' | 'CA_REVIEW' | 'FILED';
  assigned_staff_id?: string | null;
  assigned_staff?: { id: string; name: string; email: string } | null;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  firm_role: string;
  assignedClientsCount: number;
};

type DueDateItem = {
  id: string;
  title: string;
  category: string;
  due_date: string;
  deadline_key?: string;
  description?: string | null;
  statutory_due_date?: string;
  is_overridden: boolean;
  override_reason?: string | null;
};

type DscToken = {
  id: string;
  holder_name: string;
  designation?: string | null;
  pan_or_din?: string | null;
  expiry_date: string;
  token_type?: string;
  storage_location?: string | null;
  notes?: string | null;
  client?: { id: string; name: string; business_name?: string | null } | null;
};

export function FirmPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'pipeline' | 'tasks' | 'clients' | 'team' | 'due-dates' | 'dsc' | 'drive' | 'settings'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [firm, setFirm] = useState<FirmProfile | null>(null);
  const [tasks, setTasks] = useState<FirmTask[]>([]);
  const [clients, setClients] = useState<FirmClient[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [dueDates, setDueDates] = useState<DueDateItem[]>([]);
  const [dscTokens, setDscTokens] = useState<DscToken[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [driveConfig, setDriveConfig] = useState<{ is_connected: boolean; root_folder_name?: string; root_folder_id?: string }>({
    is_connected: false,
  });
  const [routingRules, setRoutingRules] = useState<any[]>([]);

  // Modals & Action States
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showRecurringRulesModal, setShowRecurringRulesModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showInviteStaffModal, setShowInviteStaffModal] = useState(false);
  const [showOverrideDateModal, setShowOverrideDateModal] = useState<DueDateItem | null>(null);
  const [showNewDscModal, setShowNewDscModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('ALL');

  const isStaff = user?.role === 'FIRM_STAFF' || user?.firm_role === 'FIRM_STAFF';

  // Handover form state
  const [handoverForm, setHandoverForm] = useState({
    fromStaffId: '',
    toStaffId: '',
    notes: '',
  });

  // New task form state
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'GST' as FirmTask['category'],
    priority: 'NORMAL' as FirmTask['priority'],
    due_date: '',
    assigned_to: '',
    client_id: '',
  });

  // New client form state
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    gstin: '',
    state: 'Maharashtra',
    assigned_staff_id: '',
  });

  // Invite staff form state
  const [inviteStaffForm, setInviteStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    firm_role: 'FIRM_STAFF' as 'FIRM_MANAGER' | 'FIRM_STAFF',
    password: '',
  });

  // Due date override form state
  const [overrideForm, setOverrideForm] = useState({
    custom_due_date: '',
    reason: '',
  });

  // DSC token form state
  const [newDscForm, setNewDscForm] = useState({
    holder_name: '',
    designation: 'Director / Partner',
    pan_or_din: '',
    expiry_date: '',
    storage_location: 'Office Vault Drawer 1',
    client_id: '',
    notes: '',
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    logo_url: '',
    frn_number: '',
    membership_number: '',
    stamp_signature_url: '',
    brand_color: '#2563eb',
  });

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // 1. Initial Load of all Firm data
  const loadFirmData = async () => {
    try {
      const [
        profileRes,
        tasksRes,
        clientsRes,
        teamRes,
        dueDatesRes,
        dscRes,
        rulesRes,
        driveRes,
        routingRes,
      ] = await Promise.all([
        apiFetch<{ firm: FirmProfile }>('/api/firm/profile'),
        apiFetch<{ tasks: FirmTask[] }>('/api/firm/tasks'),
        apiFetch<{ clients: FirmClient[] }>('/api/firm/clients'),
        apiFetch<{ team: TeamMember[] }>('/api/firm/team'),
        apiFetch<{ dueDates: DueDateItem[] }>('/api/firm/due-dates'),
        apiFetch<{ tokens: DscToken[] }>('/api/firm/dsc-tokens'),
        apiFetch<{ rules: RecurringRule[] }>('/api/firm/tasks/recurring-rules'),
        apiFetch<{ driveConfig: any }>('/api/firm/drive').catch(() => ({ driveConfig: { is_connected: false } })),
        apiFetch<{ rules: any[] }>('/api/firm/routing-rules').catch(() => ({ rules: [] })),
      ]);

      setFirm(profileRes.firm);
      setSettingsForm({
        name: profileRes.firm.name || '',
        email: profileRes.firm.email || '',
        phone: profileRes.firm.phone || '',
        gstin: profileRes.firm.gstin || '',
        address: profileRes.firm.address || '',
        logo_url: profileRes.firm.logo_url || '',
        frn_number: profileRes.firm.frn_number || '',
        membership_number: profileRes.firm.membership_number || '',
        stamp_signature_url: profileRes.firm.stamp_signature_url || '',
        brand_color: profileRes.firm.brand_color || '#2563eb',
      });

      setTasks(tasksRes.tasks || []);
      setClients(clientsRes.clients || []);
      setTeam(teamRes.team || []);
      setDueDates(dueDatesRes.dueDates || []);
      setDscTokens(dscRes.tokens || []);
      setRecurringRules(rulesRes.rules || []);
      setDriveConfig(driveRes.driveConfig || { is_connected: false });
      setRoutingRules(routingRes.rules || []);
    } catch (err) {
      console.error('Failed to load firm practice data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFirmData();
  }, []);

  // Task actions
  const handleToggleTaskStatus = async (task: FirmTask) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const res = await apiFetch<{ success: boolean; task: FirmTask }>(`/api/firm/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
        showNotification(
          nextStatus === 'COMPLETED'
            ? `Task marked completed at ${new Date().toLocaleTimeString()}!`
            : 'Task moved back to To-Do.'
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;
    try {
      const res = await apiFetch<{ success: boolean; task: FirmTask }>('/api/firm/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskForm.title,
          description: newTaskForm.description || null,
          category: newTaskForm.category,
          priority: newTaskForm.priority,
          due_date: newTaskForm.due_date ? new Date(newTaskForm.due_date).toISOString() : null,
          assigned_to: newTaskForm.assigned_to || null,
          client_id: newTaskForm.client_id || null,
        }),
      });
      if (res.success && res.task) {
        setTasks((prev) => [res.task, ...prev]);
        setShowNewTaskModal(false);
        setNewTaskForm({
          title: '',
          description: '',
          category: 'GST',
          priority: 'NORMAL',
          due_date: '',
          assigned_to: '',
          client_id: '',
        });
        showNotification('New task created successfully with creation audit record!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const handleTriggerMonthlyRecurring = async () => {
    try {
      const res = await apiFetch<{ success: boolean; generatedCount: number; message?: string }>(
        '/api/firm/tasks/generate-recurring',
        { method: 'POST' }
      );
      if (res.generatedCount > 0) {
        showNotification(`Generated ${res.generatedCount} monthly recurring compliance tasks for your clients!`);
        const updated = await apiFetch<{ tasks: FirmTask[] }>('/api/firm/tasks');
        setTasks(updated.tasks || []);
      } else {
        showNotification(res.message || 'All recurring tasks for current period are already generated.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger recurring tasks');
    }
  };

  // Client actions
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ success: boolean; client: FirmClient }>('/api/firm/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: newClientForm.name,
          business_name: newClientForm.business_name || newClientForm.name,
          email: newClientForm.email,
          phone: newClientForm.phone || undefined,
          gstin: newClientForm.gstin || undefined,
          state: newClientForm.state,
          assigned_staff_id: newClientForm.assigned_staff_id || null,
        }),
      });
      if (res.success && res.client) {
        setClients((prev) => [...prev, res.client]);
        setShowNewClientModal(false);
        setNewClientForm({
          name: '',
          business_name: '',
          email: '',
          phone: '',
          gstin: '',
          state: 'Maharashtra',
          assigned_staff_id: '',
        });
        showNotification('Client onboarded successfully under your firm!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to onboard client');
    }
  };

  const handleUpdateClientStage = async (clientId: string, stage: FirmClient['filing_stage']) => {
    try {
      const res = await apiFetch<{ success: boolean; client: FirmClient }>(`/api/firm/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ filing_stage: stage }),
      });
      if (res.success && res.client) {
        setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, filing_stage: stage } : c)));
        showNotification(`Client moved to ${stage?.replace(/_/g, ' ')}!`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update filing stage');
    }
  };

  const handleAssignStaff = async (clientId: string, staffId: string) => {
    try {
      const res = await apiFetch<{ success: boolean; client: FirmClient }>(`/api/firm/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_staff_id: staffId || null }),
      });
      if (res.success) {
        const staffName = team.find((t) => t.id === staffId)?.name || 'Unassigned';
        setClients((prev) =>
          prev.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  assigned_staff_id: staffId || null,
                  assigned_staff: staffId ? { id: staffId, name: staffName, email: '' } : null,
                }
              : c
          )
        );
        showNotification(`Assigned client to ${staffName}!`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign staff');
    }
  };

  // Staff actions
  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ success: boolean; member: TeamMember }>('/api/firm/team/invite', {
        method: 'POST',
        body: JSON.stringify(inviteStaffForm),
      });
      if (res.success && res.member) {
        setTeam((prev) => [...prev, { ...res.member, assignedClientsCount: 0 }]);
        setShowInviteStaffModal(false);
        setInviteStaffForm({
          name: '',
          email: '',
          phone: '',
          firm_role: 'FIRM_STAFF',
          password: '',
        });
        showNotification('Article Clerk / Team member added to your firm!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add team member');
    }
  };

  const handleExecuteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverForm.fromStaffId || !handoverForm.toStaffId) {
      alert('Please select both from-staff and to-staff members.');
      return;
    }
    if (handoverForm.fromStaffId === handoverForm.toStaffId) {
      alert('From and To staff cannot be the same person.');
      return;
    }

    try {
      const res = await apiFetch<{
        success: boolean;
        transferredClientsCount: number;
        transferredTasksCount: number;
      }>('/api/firm/team/handover', {
        method: 'POST',
        body: JSON.stringify(handoverForm),
      });

      if (res.success) {
        showNotification(
          `Successfully handed over ${res.transferredClientsCount} clients and ${res.transferredTasksCount} pending tasks!`
        );
        setShowHandoverModal(false);
        setHandoverForm({ fromStaffId: '', toStaffId: '', notes: '' });
        loadFirmData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute handover');
    }
  };

  // Due date override
  const handleSaveDueDateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOverrideDateModal) return;
    try {
      const res = await apiFetch<{ success: boolean; override: any }>('/api/firm/due-dates/override', {
        method: 'POST',
        body: JSON.stringify({
          statutory_due_date_id: showOverrideDateModal.id,
          deadline_key: showOverrideDateModal.deadline_key || showOverrideDateModal.category,
          title: showOverrideDateModal.title,
          category: showOverrideDateModal.category,
          custom_due_date: overrideForm.custom_due_date,
          reason: overrideForm.reason,
        }),
      });
      if (res.success) {
        setDueDates((prev) =>
          prev.map((d) =>
            d.id === showOverrideDateModal.id
              ? {
                  ...d,
                  statutory_due_date: d.statutory_due_date || d.due_date,
                  due_date: overrideForm.custom_due_date,
                  is_overridden: true,
                  override_reason: overrideForm.reason,
                }
              : d
          )
        );
        setShowOverrideDateModal(null);
        showNotification('Statutory due date successfully overridden for your practice!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save due date override');
    }
  };

  const handleResetDueDate = async (item: DueDateItem) => {
    const key = item.deadline_key || item.category;
    try {
      await apiFetch(`/api/firm/due-dates/override/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      setDueDates((prev) =>
        prev.map((d) =>
          d.id === item.id
            ? {
                ...d,
                due_date: d.statutory_due_date || d.due_date,
                is_overridden: false,
                override_reason: null,
              }
            : d
        )
      );
      showNotification('Due date reset back to statutory default.');
    } catch (err: any) {
      alert(err.message || 'Failed to reset due date');
    }
  };

  // DSC Token actions
  const handleAddDscToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ success: boolean; token: DscToken }>('/api/firm/dsc-tokens', {
        method: 'POST',
        body: JSON.stringify({
          holder_name: newDscForm.holder_name,
          designation: newDscForm.designation,
          pan_or_din: newDscForm.pan_or_din || undefined,
          expiry_date: newDscForm.expiry_date,
          storage_location: newDscForm.storage_location,
          client_id: newDscForm.client_id || null,
          notes: newDscForm.notes || undefined,
        }),
      });
      if (res.success && res.token) {
        setDscTokens((prev) => [...prev, res.token]);
        setShowNewDscModal(false);
        setNewDscForm({
          holder_name: '',
          designation: 'Director / Partner',
          pan_or_din: '',
          expiry_date: '',
          storage_location: 'Office Vault Drawer 1',
          client_id: '',
          notes: '',
        });
        showNotification('DSC token registered in practice vault!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register DSC token');
    }
  };

  // Practice Profile Settings
  const handleSaveFirmSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ success: boolean; firm: FirmProfile }>('/api/firm/profile', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      if (res.success && res.firm) {
        setFirm(res.firm);
        showNotification('Firm white-label branding and credentials updated successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update firm settings');
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (taskFilterStatus === 'ALL') return tasks;
    return tasks.filter((t) => t.status === taskFilterStatus);
  }, [tasks, taskFilterStatus]);

  // Upcoming DSC alerts
  const expiringDscCount = useMemo(() => {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    return dscTokens.filter((t) => {
      const exp = new Date(t.expiry_date);
      return exp >= today && exp <= in30Days;
    }).length;
  }, [dscTokens]);

  if (loading) {
    return <PortalLoadingSkeleton />;
  }

  const brandColor = firm?.brand_color || '#2563eb';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. TOP WHITE-LABEL BRANDING NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          {firm?.logo_url ? (
            <img
              src={firm.logo_url}
              alt={firm.name}
              className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-slate-700 shadow"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg"
              style={{ backgroundColor: brandColor }}
            >
              {firm?.name ? firm.name.substring(0, 2).toUpperCase() : 'CA'}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white tracking-tight">
                {firm?.name || 'Chartered Accountants Practice'}
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                CA Firm Workspace
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {firm?.frn_number && <span>ICAI FRN: <strong className="text-slate-300">{firm.frn_number}</strong></span>}
              {firm?.frn_number && firm?.membership_number && <span>•</span>}
              {firm?.membership_number && <span>M.No: <strong className="text-slate-300">{firm.membership_number}</strong></span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300 font-medium">{user?.name}</span>
            <span className="text-slate-500">({user?.role === 'FIRM_OWNER' ? 'Partner / CA' : 'Staff / Article'})</span>
          </div>

          <button
            onClick={() => {
              clearToken();
              logout();
              navigate('/login');
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ACTION BANNER NOTIFICATION */}
      {actionNotice && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 px-6 py-2.5 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 2. SUB-NAVIGATION BAR */}
      <nav className="bg-slate-950/60 border-b border-slate-800 px-4 sm:px-6 overflow-x-auto scrollbar-none flex gap-1">
        {(isStaff
          ? [
              { key: 'overview', label: '📊 My Article Desk' },
              { key: 'pipeline', label: '📋 My GST Filing Pipeline' },
              { key: 'tasks', label: `✅ My Tasks (${tasks.length})` },
              { key: 'clients', label: `👥 My Assigned Clients (${clients.length})` },
              { key: 'due-dates', label: '📅 Statutory Deadlines' },
            ]
          : [
              { key: 'overview', label: '📊 Practice Command Center' },
              { key: 'pipeline', label: '📋 GST Compliance Pipeline' },
              { key: 'tasks', label: '✅ To-Do & Tasks' },
              { key: 'clients', label: `👥 Client Roster (${clients.length})` },
              { key: 'team', label: `🧑‍🤝‍🧑 Team / Articles (${team.length})` },
              { key: 'due-dates', label: '📅 Due Dates & Overrides' },
              { key: 'dsc', label: `🔏 DSC Vault ${expiringDscCount > 0 ? `(${expiringDscCount} Expiring)` : ''}` },
              { key: 'drive', label: '📁 BYOD Google Drive' },
              { key: 'settings', label: '⚙️ Firm Branding & FRN' },
            ]
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 px-3.5 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 3. MAIN WORKSPACE VIEWPORT */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: PRACTICE COMMAND CENTER (OVERVIEW)                                 */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">Total Managed Clients</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-3xl font-black text-white">{clients.length}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                    Active Practice
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Monthly GST & Tax Clients</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">Current Month Returns</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-3xl font-black text-blue-400">
                    {clients.filter((c) => c.filing_stage === 'FILED').length} / {clients.length}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                    Filed on GSTN
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {clients.filter((c) => c.filing_stage !== 'FILED').length} Pending Computation/Review
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">Practice To-Dos & Tasks</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className="text-3xl font-black text-amber-400">
                    {tasks.filter((t) => t.status !== 'COMPLETED').length}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
                    In Progress
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {tasks.filter((t) => t.status === 'COMPLETED').length} Completed this month
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">DSC Expiry Watch</p>
                <div className="flex items-baseline justify-between mt-2">
                  <h3 className={`text-3xl font-black ${expiringDscCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {expiringDscCount}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      expiringDscCount > 0
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Expiring &lt;30d
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Total Tokens in Vault: {dscTokens.length}</p>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Quick Actions:</span>
              <button
                onClick={() => setShowNewClientModal(true)}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Onboard New Client</span>
              </button>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Add To-Do / Task</span>
              </button>
              <button
                onClick={() => setShowInviteStaffModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Invite Article Clerk</span>
              </button>
              <button
                onClick={handleTriggerMonthlyRecurring}
                className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
              >
                <span>⚡ Auto-Generate Monthly Tasks</span>
              </button>
            </div>

            {/* Two-Column Grid: Active Tasks + Upcoming Due Dates */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Recent Practice Tasks (2 cols) */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Priority To-Do & Compliance Tasks</h3>
                    <p className="text-xs text-slate-400">Click checkmark to complete with audit timestamp</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-xs text-blue-400 hover:underline font-semibold"
                  >
                    View All ({tasks.length}) →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {tasks.slice(0, 6).map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                        task.status === 'COMPLETED'
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        onChange={() => handleToggleTaskStatus(task)}
                        className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              task.priority === 'URGENT'
                                ? 'bg-red-500/20 text-red-400'
                                : task.priority === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {task.category}
                          </span>
                          <span
                            className={`font-semibold text-xs truncate ${
                              task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {task.client && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Client: <strong className="text-slate-300">{task.client.business_name || task.client.name}</strong>
                          </p>
                        )}

                        {/* Audit Details */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>
                            Created {new Date(task.created_at).toLocaleDateString()} by {task.creator?.name || 'Partner'}
                          </span>
                          {task.completed_at && (
                            <span className="text-emerald-400 font-medium">
                              • Completed on {new Date(task.completed_at).toLocaleDateString()} by{' '}
                              {task.completer?.name || 'Staff'}
                            </span>
                          )}
                          {task.assigned_user && (
                            <span className="text-slate-400 ml-auto font-medium">
                              Assignee: {task.assigned_user.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {tasks.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No tasks created yet. Click "+ Add To-Do / Task" to create your first practice task.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Upcoming Due Dates (1 col) */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Statutory Calendar</h3>
                  <button
                    onClick={() => setActiveTab('due-dates')}
                    className="text-xs text-blue-400 hover:underline font-semibold"
                  >
                    Overrides →
                  </button>
                </div>

                <div className="space-y-3">
                  {dueDates.slice(0, 5).map((due) => (
                    <div key={due.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-200">{due.title}</span>
                        {due.is_overridden && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Firm Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{due.category}</span>
                        <span className="font-black text-rose-400">
                          {new Date(due.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {due.is_overridden && due.override_reason && (
                        <p className="text-[10px] text-amber-400/90 italic">Reason: {due.override_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GST COMPLIANCE PIPELINE (KANBAN BOARD)                              */}
        {/* ========================================================================= */}
        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Monthly GST Compliance Board</h2>
                <p className="text-xs text-slate-400">
                  Track client returns across all 4 stages: Data Collection → ITC Recon → CA Review → Filed
                </p>
              </div>
              <button
                onClick={() => setShowNewClientModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
              >
                + Onboard Client
              </button>
            </div>

            {/* 4 Pipeline Stages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                [
                  { key: 'DATA_COLLECTION', label: '1. Data Collection', color: 'border-amber-500/40 bg-amber-500/5' },
                  { key: 'RECON_IN_PROGRESS', label: '2. ITC Recon & Comp', color: 'border-blue-500/40 bg-blue-500/5' },
                  { key: 'CA_REVIEW', label: '3. CA Partner Review', color: 'border-purple-500/40 bg-purple-500/5' },
                  { key: 'FILED', label: '4. Filed on GSTN (ARN)', color: 'border-emerald-500/40 bg-emerald-500/5' },
                ] as const
              ).map((stage) => {
                const stageClients = clients.filter(
                  (c) => (c.filing_stage || 'DATA_COLLECTION') === stage.key
                );

                return (
                  <div key={stage.key} className={`p-4 rounded-2xl border ${stage.color} flex flex-col min-h-[450px]`}>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <h4 className="font-bold text-xs text-white">{stage.label}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-black">
                        {stageClients.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {stageClients.map((client) => (
                        <div
                          key={client.id}
                          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-sm space-y-2 transition"
                        >
                          <div>
                            <h5 className="font-bold text-xs text-white">{client.business_name || client.name}</h5>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{client.gstin || 'GSTIN Pending'}</p>
                          </div>

                          {/* Assignee selection */}
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                            <span className="text-slate-500 text-[10px]">Article:</span>
                            <select
                              value={client.assigned_staff_id || ''}
                              onChange={(e) => handleAssignStaff(client.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none"
                            >
                              <option value="">Unassigned</option>
                              {team.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Move stage dropdown */}
                          <div className="flex items-center justify-between text-[10px] pt-1">
                            <span className="text-slate-500">Stage:</span>
                            <select
                              value={client.filing_stage || 'DATA_COLLECTION'}
                              onChange={(e) => handleUpdateClientStage(client.id, e.target.value as any)}
                              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 focus:outline-none"
                            >
                              <option value="DATA_COLLECTION">Data Collection</option>
                              <option value="RECON_IN_PROGRESS">ITC Recon</option>
                              <option value="CA_REVIEW">CA Review</option>
                              <option value="FILED">Filed (ARN)</option>
                            </select>
                          </div>
                        </div>
                      ))}

                      {stageClients.length === 0 && (
                        <div className="py-12 text-center text-[11px] text-slate-600">No clients in this stage</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TO-DO & PRACTICE TASK MANAGEMENT (WITH AUDITING)                   */}
        {/* ========================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Practice Tasks & To-Do List</h2>
                <p className="text-xs text-slate-400">
                  Full creation and completion audit tracking with turnaround metrics
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerMonthlyRecurring}
                  className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition cursor-pointer"
                >
                  ⚡ Auto-Generate Monthly Tasks
                </button>
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition cursor-pointer"
                >
                  + Create Task
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 mr-2">Filter:</span>
              {['ALL', 'TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setTaskFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    taskFilterStatus === st
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Tasks Table */}
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.status === 'COMPLETED'
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'COMPLETED'}
                      onChange={() => handleToggleTaskStatus(task)}
                      className="mt-1 w-5 h-5 rounded text-blue-600 bg-slate-900 border-slate-700 cursor-pointer"
                    />

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            task.priority === 'URGENT'
                              ? 'bg-red-500/20 text-red-400'
                              : task.priority === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {task.category}
                        </span>
                        <h4
                          className={`font-bold text-sm ${
                            task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </h4>
                      </div>

                      {task.description && <p className="text-xs text-slate-400 mt-1">{task.description}</p>}

                      {/* Audit Stamp Trail */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>
                          📅 Created: {new Date(task.created_at).toLocaleString()} by{' '}
                          <strong className="text-slate-400">{task.creator?.name || 'Partner'}</strong>
                        </span>

                        {task.completed_at && (
                          <span className="text-emerald-400 font-semibold">
                            ✓ Completed: {new Date(task.completed_at).toLocaleString()} by{' '}
                            <strong className="text-emerald-300">{task.completer?.name || 'Staff'}</strong>
                          </span>
                        )}

                        {task.due_date && (
                          <span className="text-rose-400">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 text-right pl-8 sm:pl-0">
                    {task.client && (
                      <span className="text-xs font-semibold text-slate-300">
                        {task.client.business_name || task.client.name}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      Assigned to: <strong className="text-slate-200">{task.assigned_user?.name || 'Unassigned'}</strong>
                    </span>
                  </div>
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-xs">No tasks found matching this filter.</div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CLIENT DIRECTORY                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Client Directory</h2>
                <p className="text-xs text-slate-400">Businesses and taxpayers managed by your firm</p>
              </div>
              <button
                onClick={() => setShowNewClientModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
              >
                + Onboard New Client
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Business Name & Client</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Filing Stage</th>
                    <th className="py-3 px-4">Assigned Article</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{client.business_name || client.name}</div>
                        <div className="text-[11px] text-slate-400">{client.name}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-blue-400">{client.gstin || '—'}</td>
                      <td className="py-3 px-4">
                        <div>{client.email}</div>
                        <div className="text-slate-400">{client.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={client.filing_stage || 'DATA_COLLECTION'}
                          onChange={(e) => handleUpdateClientStage(client.id, e.target.value as any)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="DATA_COLLECTION">Data Collection</option>
                          <option value="RECON_IN_PROGRESS">ITC Recon</option>
                          <option value="CA_REVIEW">CA Review</option>
                          <option value="FILED">Filed (ARN)</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={client.assigned_staff_id || ''}
                          onChange={(e) => handleAssignStaff(client.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="">Unassigned</option>
                          {team.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}

                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No clients onboarded yet. Click "+ Onboard New Client" to start managing client files.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: TEAM & ARTICLE CLERKS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Team & Article Workload</h2>
                <p className="text-xs text-slate-400">Invite article clerks, reassign portfolios, and balance workloads</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHandoverModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔄 1-Click Handover / Transfer</span>
                </button>
                <button
                  onClick={() => setShowInviteStaffModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
                >
                  + Invite Article Clerk / Staff
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((member) => (
                <div key={member.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{member.name}</h4>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {member.firm_role === 'FIRM_MANAGER' ? 'Manager' : 'Article Clerk'}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Assigned Clients:</span>
                    <span className="font-black text-sm text-white">{member.assignedClientsCount} Clients</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: STATUTORY DUE DATES & OVERRIDES                                    */}
        {/* ========================================================================= */}
        {activeTab === 'due-dates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Compliance Calendar & Overrides</h2>
                <p className="text-xs text-slate-400">
                  Statutory deadlines with the ability to set practice overrides and extensions
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Requirement / Return</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Effective Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {dueDates.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-4 font-bold text-white">{item.title}</td>
                      <td className="py-3 px-4 text-slate-400">{item.category}</td>
                      <td className="py-3 px-4 font-black text-rose-400">
                        {new Date(item.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {item.is_overridden ? (
                          <div>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Overridden
                            </span>
                            {item.override_reason && (
                              <p className="text-[10px] text-amber-400 mt-1 italic">{item.override_reason}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Statutory Default</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setShowOverrideDateModal(item);
                            setOverrideForm({
                              custom_due_date: item.due_date.substring(0, 10),
                              reason: item.override_reason || '',
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Override Date
                        </button>
                        {item.is_overridden && (
                          <button
                            onClick={() => handleResetDueDate(item)}
                            className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: DIGITAL SIGNATURE (DSC) VAULT                                      */}
        {/* ========================================================================= */}
        {activeTab === 'dsc' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Digital Signature (DSC) Vault</h2>
                <p className="text-xs text-slate-400">Manage client director & partner tokens with expiry alerts</p>
              </div>
              <button
                onClick={() => setShowNewDscModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
              >
                + Register DSC Token
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dscTokens.map((token) => {
                const expDate = new Date(token.expiry_date);
                const diffDays = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = diffDays <= 30;

                return (
                  <div
                    key={token.id}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isExpiringSoon
                        ? 'bg-rose-500/5 border-rose-500/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">{token.holder_name}</h4>
                        <p className="text-xs text-slate-400">{token.designation || 'Signatory'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          diffDays <= 0
                            ? 'bg-red-600 text-white'
                            : isExpiringSoon
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {diffDays <= 0 ? 'EXPIRED' : `${diffDays} Days Left`}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs pt-2 border-t border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expiry Date:</span>
                        <span className="font-mono text-slate-200">
                          {expDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Storage Box:</span>
                        <span className="text-slate-300">{token.storage_location || 'Vault'}</span>
                      </div>
                      {token.client && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Client:</span>
                          <span className="font-semibold text-blue-400">
                            {token.client.business_name || token.client.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {dscTokens.length === 0 && (
                <div className="col-span-3 py-12 text-center text-slate-500 text-xs">
                  No DSC tokens registered in your practice vault.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: GOOGLE DRIVE BYOD & DOCUMENT ROUTING                               */}
        {/* ========================================================================= */}
        {activeTab === 'drive' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Bring-Your-Own Google Drive</h3>
                  <p className="text-xs text-slate-400">
                    Store all client GST files and filings directly inside your firm's private Google Workspace
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    driveConfig.is_connected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {driveConfig.is_connected ? '● Connected' : '○ Not Configured'}
                </span>
              </div>

              {driveConfig.is_connected ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <p className="text-xs text-slate-300 font-semibold">
                    Root Practice Folder:{' '}
                    <strong className="text-white">{driveConfig.root_folder_name || 'My GST Bro Firm Drive'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Folder ID: {driveConfig.root_folder_id}</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
                  Configure your Google Cloud Service Account or OAuth credentials in Settings to auto-route files
                  directly to your team's Google Drive.
                </div>
              )}
            </div>

            {/* Document Routing Rules */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">Smart Document Routing Rules</h3>
              <p className="text-xs text-slate-400">
                Incoming invoices and tax documents are automatically sorted into target directories
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { cat: 'SALES', label: 'Sales Invoices & Registers', target: '{Client}/Sales/{Year}_{Month}' },
                  { cat: 'PURCHASES', label: 'Purchase Invoices & Bills', target: '{Client}/Purchases/{Year}_{Month}' },
                  { cat: 'FILED_RETURNS', label: 'Filed GSTR-1 & 3B (ARN)', target: '{Client}/Filed_Returns' },
                  { cat: 'NOTICES', label: 'Department Notices & Orders', target: '{Client}/Notices_Scrutiny' },
                ].map((rule) => (
                  <div key={rule.cat} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                      {rule.cat}
                    </span>
                    <h5 className="font-bold text-xs text-white">{rule.label}</h5>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">Directs to: {rule.target}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: WHITE-LABEL BRANDING & PRACTICE SETTINGS                           */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveFirmSettings} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Firm White-Label Branding & Profile</h2>
              <p className="text-xs text-slate-400">
                Customize your firm name, logo, ICAI registration numbers, and brand colors
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Practice Display Name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  placeholder="e.g. M/s Rahul Sharma & Associates, Chartered Accountants"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ICAI Firm Reg Number (FRN)</label>
                <input
                  type="text"
                  value={settingsForm.frn_number}
                  onChange={(e) => setSettingsForm({ ...settingsForm, frn_number: e.target.value })}
                  placeholder="e.g. 012345N"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Partner Membership No (M.No)</label>
                <input
                  type="text"
                  value={settingsForm.membership_number}
                  onChange={(e) => setSettingsForm({ ...settingsForm, membership_number: e.target.value })}
                  placeholder="e.g. 543210"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Firm Logo URL</label>
                <input
                  type="url"
                  value={settingsForm.logo_url}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                  placeholder="https://.../logo.png"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settingsForm.brand_color}
                    onChange={(e) => setSettingsForm({ ...settingsForm, brand_color: e.target.value })}
                    className="w-10 h-10 rounded-xl border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-300">{settingsForm.brand_color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Office Email</label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Office Address & Header Info</label>
                <textarea
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
              >
                Save Practice Branding
              </button>
            </div>
          </form>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW PRACTICE TASK                                           */}
      {/* ========================================================================= */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Create Practice Task / To-Do</h3>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Reconcile April GSTR-2B with Tally Purchase Register"
                  required
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="GST">GST Returns & ITC</option>
                    <option value="INCOME_TAX">Income Tax / TDS</option>
                    <option value="AUDIT">Statutory / Tax Audit</option>
                    <option value="ROC">ROC & Compliance</option>
                    <option value="ACCOUNTING">Bookkeeping / Tally</option>
                    <option value="OFFICE">Office Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="URGENT">🔴 Urgent</option>
                    <option value="HIGH">🟠 High</option>
                    <option value="NORMAL">🔵 Normal</option>
                    <option value="LOW">⚪ Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign to Article</label>
                  <select
                    value={newTaskForm.assigned_to}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assigned_to: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">Unassigned</option>
                    {team.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Associate Client</label>
                  <select
                    value={newTaskForm.client_id}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, client_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">General Office Task</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={newTaskForm.due_date}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional instructions for the article assistant..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ONBOARD NEW CLIENT                                                 */}
      {/* ========================================================================= */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateClient}
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Onboard Client into Practice</h3>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business / Trade Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                  required
                  value={newClientForm.business_name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, business_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    required
                    value={newClientForm.name}
                    onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AABCU9603R1ZM"
                    value={newClientForm.gstin}
                    onChange={(e) => setNewClientForm({ ...newClientForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="accounts@acme.com"
                    required
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign to Article Clerk</label>
                <select
                  value={newClientForm.assigned_staff_id}
                  onChange={(e) => setNewClientForm({ ...newClientForm, assigned_staff_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Unassigned</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              >
                Onboard Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVITE STAFF / ARTICLE                                             */}
      {/* ========================================================================= */}
      {showInviteStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteStaff}
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Add Team Member / Article</h3>
              <button
                type="button"
                onClick={() => setShowInviteStaffModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sneha Patel"
                  required
                  value={inviteStaffForm.name}
                  onChange={(e) => setInviteStaffForm({ ...inviteStaffForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="sneha@firm.com"
                  required
                  value={inviteStaffForm.email}
                  onChange={(e) => setInviteStaffForm({ ...inviteStaffForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Designation</label>
                <select
                  value={inviteStaffForm.firm_role}
                  onChange={(e) => setInviteStaffForm({ ...inviteStaffForm, firm_role: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="FIRM_STAFF">Article Assistant / Clerk</option>
                  <option value="FIRM_MANAGER">Practice Manager / Senior CA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
                <input
                  type="text"
                  placeholder="e.g. Article@123456"
                  required
                  value={inviteStaffForm.password}
                  onChange={(e) => setInviteStaffForm({ ...inviteStaffForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">Staff will be asked to change on first login</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInviteStaffModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              >
                Add to Practice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OVERRIDE STATUTORY DUE DATE                                        */}
      {/* ========================================================================= */}
      {showOverrideDateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDueDateOverride}
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Override Due Date</h3>
              <button
                type="button"
                onClick={() => setShowOverrideDateModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Adjust deadline for <strong className="text-white">{showOverrideDateModal.title}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Effective Due Date</label>
                <input
                  type="date"
                  required
                  value={overrideForm.custom_due_date}
                  onChange={(e) => setOverrideForm({ ...overrideForm, custom_due_date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Override</label>
                <input
                  type="text"
                  placeholder="e.g. Government Circular No. 24/2026 extension"
                  required
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOverrideDateModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              >
                Save Override
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER DSC TOKEN                                                 */}
      {/* ========================================================================= */}
      {showNewDscModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDscToken}
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Register DSC USB Token</h3>
              <button
                type="button"
                onClick={() => setShowNewDscModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Token Holder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  required
                  value={newDscForm.holder_name}
                  onChange={(e) => setNewDscForm({ ...newDscForm, holder_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newDscForm.designation}
                    onChange={(e) => setNewDscForm({ ...newDscForm, designation: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newDscForm.expiry_date}
                    onChange={(e) => setNewDscForm({ ...newDscForm, expiry_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Associated Client</label>
                <select
                  value={newDscForm.client_id}
                  onChange={(e) => setNewDscForm({ ...newDscForm, client_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">None / General</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Physical Box / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Vault Drawer 1 - Slot B"
                  value={newDscForm.storage_location}
                  onChange={(e) => setNewDscForm({ ...newDscForm, storage_location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewDscModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              >
                Register Token
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 1-CLICK CLIENT & TASK HANDOVER                                     */}
      {/* ========================================================================= */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteHandover}
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">1-Click Client & Task Handover</h3>
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Transfer all assigned clients and pending tasks from an outgoing or rotating staff member to another.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">From Staff Member (Outgoing / On Leave)</label>
                <select
                  required
                  value={handoverForm.fromStaffId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, fromStaffId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Select staff member...</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.assignedClientsCount} Clients)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">To Staff Member (Receiving Article)</label>
                <select
                  required
                  value={handoverForm.toStaffId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, toStaffId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Select recipient staff...</option>
                  {team
                    .filter((t) => t.id !== handoverForm.fromStaffId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.assignedClientsCount} Clients currently)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Handover Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Outgoing on CA Final exam study leave until July 2026. Handing over monthly return filing."
                  value={handoverForm.notes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowHandoverModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow"
              >
                Transfer Portfolio Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

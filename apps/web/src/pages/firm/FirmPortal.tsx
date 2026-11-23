import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, clearToken, getToken } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { PortalLoadingSkeleton } from '../../components/PortalLoadingSkeleton';
import { InvoiceDashboard } from '../app/invoice/InvoiceDashboard';
import { DayOneOnboardingModal } from './DayOneOnboardingModal';

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
  permissions?: Record<string, Record<string, boolean>>;
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
  team_group?: string;
  icai_membership_no?: string | null;
  icai_membership_type?: 'FCA' | 'ACA' | null;
  cop_number?: string | null;
  partner_designation?: string | null;
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

type ChatMessage = {
  id: string;
  client_user_id: string;
  sender_user_id: string;
  message: string;
  created_at: string;
  thread_type: 'CLIENT_EXTERNAL' | 'INTERNAL_TEAM_NOTE';
  category: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  sender?: { id: string; name: string; email: string; role: string; firm_role?: string } | null;
};

type PreFilingChecklist = {
  id?: string;
  client_id: string;
  period: string;
  return_type: string;
  itc_2b_reconciled: boolean;
  rcm_checked: boolean;
  outward_eway_matched: boolean;
  cash_ledger_verified: boolean;
  client_draft_approved: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  approver?: { id: string; name: string; firm_role?: string } | null;
};

type ClientMilestone = {
  id: string;
  firm_id: string;
  client_id: string;
  milestone_type: 'BIRTHDAY' | 'INCORPORATION_DAY' | 'GST_ANNIVERSARY' | 'CUSTOM';
  title: string;
  milestone_date: string;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  last_greeted_year?: number | null;
  last_greeted_at?: string | null;
  client?: { id: string; name: string; business_name?: string | null; email: string; phone?: string; assigned_staff_id?: string } | null;
};

type FirmUserTodo = {
  id: string;
  user_id: string;
  firm_id?: string | null;
  title: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  created_at: string;
};

type FirmChatGroup = {
  id: string;
  firm_id: string;
  name: string;
  description?: string | null;
  group_type: 'INTERNAL_TEAM' | 'CLIENT_GROUP' | 'BROADCAST';
  created_by?: string | null;
  members?: Array<{ user_id: string; role: string }>;
};

export function FirmPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'pipeline' | 'tasks' | 'clients' | 'invoices' | 'milestones' | 'messages' | 'team' | 'due-dates' | 'dsc' | 'drive' | 'settings'
  >('overview');
  const [selectedInvoiceClientId, setSelectedInvoiceClientId] = useState<string>('');

  // Client Milestones CRM state (Birthdays, Incorporation Days, GST Milestones)
  const [milestones, setMilestones] = useState<ClientMilestone[]>([]);
  const [showNewMilestoneModal, setShowNewMilestoneModal] = useState(false);
  const [newMilestoneClientId, setNewMilestoneClientId] = useState('');
  const [newMilestoneType, setNewMilestoneType] = useState<'BIRTHDAY' | 'INCORPORATION_DAY' | 'GST_ANNIVERSARY' | 'CUSTOM'>('INCORPORATION_DAY');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestonePerson, setNewMilestonePerson] = useState('');
  const [newMilestonePhone, setNewMilestonePhone] = useState('');
  const [newMilestoneNotes, setNewMilestoneNotes] = useState('');
  const [greetingMilestone, setGreetingMilestone] = useState<ClientMilestone | null>(null);
  const [showGreetingModal, setShowGreetingModal] = useState(false);

  // Personal Sticky Scratchpad To-Dos state
  const [personalTodos, setPersonalTodos] = useState<FirmUserTodo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [todoFilter, setTodoFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');

  // Groups & Direct Team Messaging state
  const [chatScope, setChatScope] = useState<'CLIENTS' | 'GROUPS' | 'DIRECT'>('CLIENTS');
  const [chatGroups, setChatGroups] = useState<FirmChatGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState<'INTERNAL_TEAM' | 'BROADCAST'>('INTERNAL_TEAM');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [selectedDirectUserId, setSelectedDirectUserId] = useState<string>('');
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);

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

  // In-Website Chat state (WhatsApp replacement)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChatClientId, setSelectedChatClientId] = useState<string>('');
  const [chatThreadType, setChatThreadType] = useState<'CLIENT_EXTERNAL' | 'INTERNAL_TEAM_NOTE'>('CLIENT_EXTERNAL');
  const [chatCategoryFilter, setChatCategoryFilter] = useState<string>('ALL');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageCategory, setNewMessageCategory] = useState<'GENERAL' | 'MONTHLY_DOCS' | 'ITC_RECON' | 'NOTICE_REPLY' | 'BILLING'>('GENERAL');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [chatSearch, setChatSearch] = useState('');

  // Role permissions matrix state (5-Level Hierarchy)
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    FIRM_MANAGER: {
      change_due_dates: true,
      client_access_all: true,
      allocate_clients: true,
      manage_tasks: true,
      view_pending_dashboard: true,
      approve_returns: true,
      view_invoicing_fees: true,
    },
    FIRM_STAFF: {
      change_due_dates: false,
      client_access_all: false,
      allocate_clients: false,
      manage_tasks: false,
      view_pending_dashboard: false,
      approve_returns: false,
      view_invoicing_fees: false,
    },
  });

  // Pre-filing checklist modal state
  const [showChecklistModal, setShowChecklistModal] = useState<FirmClient | null>(null);
  const [checklistState, setChecklistState] = useState<PreFilingChecklist>({
    client_id: '',
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    return_type: 'GSTR-3B',
    itc_2b_reconciled: false,
    rcm_checked: false,
    outward_eway_matched: false,
    cash_ledger_verified: false,
    client_draft_approved: false,
  });

  // Modals & Action States
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showRecurringRulesModal, setShowRecurringRulesModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showInviteStaffModal, setShowInviteStaffModal] = useState(false);
  const [showInvitePartnerModal, setShowInvitePartnerModal] = useState(false);
  const [showOverrideDateModal, setShowOverrideDateModal] = useState<DueDateItem | null>(null);
  const [showNewDscModal, setShowNewDscModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('ALL');

  // Practice Client Welcome Codes State
  const [showClientCodesModal, setShowClientCodesModal] = useState(false);
  const [showDayOneModal, setShowDayOneModal] = useState(false);
  const [firmCodesData, setFirmCodesData] = useState<{
    total: number;
    available: number;
    used: number;
    expired: number;
    redemptionRate: number;
    codes: any[];
  }>({ total: 0, available: 0, used: 0, expired: 0, redemptionRate: 0, codes: [] });
  const [loadingFirmCodes, setLoadingFirmCodes] = useState(false);
  const [generatingFirmCode, setGeneratingFirmCode] = useState(false);
  const [firmCodeForm, setFirmCodeForm] = useState({
    count: 1,
    customCode: '',
    note: '',
    expiresInDays: 30 as number | null,
  });
  const [copiedFirmCode, setCopiedFirmCode] = useState<string | null>(null);

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
    team_group: 'General',
    password: '',
  });

  // Invite partner form state (ICAI Credentials & Co-Executive parity)
  const [invitePartnerForm, setInvitePartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    icai_membership_no: '',
    icai_membership_type: 'FCA' as 'FCA' | 'ACA',
    cop_number: '',
    partner_designation: 'Partner — Indirect Tax & GST',
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
        permRes,
        milestonesRes,
        todosRes,
        groupsRes,
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
        apiFetch<{ permissions: any }>('/api/firm/permissions').catch(() => ({ permissions: {} })),
        apiFetch<{ milestones: ClientMilestone[] }>('/api/firm/milestones').catch(() => ({ milestones: [] })),
        apiFetch<{ todos: FirmUserTodo[] }>('/api/firm/todos').catch(() => ({ todos: [] })),
        apiFetch<{ groups: FirmChatGroup[] }>('/api/firm/groups').catch(() => ({ groups: [] })),
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

      if (permRes.permissions && Object.keys(permRes.permissions).length > 0) {
        setRolePermissions(permRes.permissions);
      }

      setTasks(tasksRes.tasks || []);
      setClients(clientsRes.clients || []);
      if (clientsRes.clients.length > 0 && !selectedChatClientId) {
        setSelectedChatClientId(clientsRes.clients[0].id);
      }

      setTeam(teamRes.team || []);
      setDueDates(dueDatesRes.dueDates || []);
      setDscTokens(dscRes.tokens || []);
      setRecurringRules(rulesRes.rules || []);
      setDriveConfig(driveRes.driveConfig || { is_connected: false });
      setRoutingRules(routingRes.rules || []);
      setMilestones(milestonesRes.milestones || []);
      setPersonalTodos(todosRes.todos || []);
      setChatGroups(groupsRes.groups || []);
      if (groupsRes.groups && groupsRes.groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsRes.groups[0].id);
      }
      if (teamRes.team && teamRes.team.length > 0 && !selectedDirectUserId) {
        setSelectedDirectUserId(teamRes.team[0].id);
      }
    } catch (err) {
      console.error('Failed to load firm practice data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFirmData();
  }, []);

  // Chat message loading
  const loadChatMessages = async (clientId: string, threadType: 'CLIENT_EXTERNAL' | 'INTERNAL_TEAM_NOTE') => {
    if (!clientId) return;
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(
        `/api/firm/messages?clientId=${clientId}&threadType=${threadType}`
      );
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    if (selectedChatClientId) {
      loadChatMessages(selectedChatClientId, chatThreadType);
    }
  }, [selectedChatClientId, chatThreadType]);

  // Milestone Anniversary and Days Calculation
  const { todayCelebrations, upcomingMilestones } = useMemo(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const todayItems: Array<ClientMilestone & { yearsCompleted?: number }> = [];
    const upcomingItems: Array<ClientMilestone & { daysUntil: number; yearsCompleted?: number }> = [];

    milestones.forEach((m) => {
      const parts = m.milestone_date.split('-');
      if (parts.length < 3) return;
      const mYear = parseInt(parts[0], 10);
      const mMonth = parseInt(parts[1], 10);
      const mDay = parseInt(parts[2], 10);
      const years = isNaN(mYear) ? 0 : today.getFullYear() - mYear;

      if (mMonth === todayMonth && mDay === todayDay) {
        todayItems.push({ ...m, yearsCompleted: Math.max(0, years) });
        return;
      }

      let targetYear = today.getFullYear();
      let targetDate = new Date(targetYear, mMonth - 1, mDay);
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      if (targetDate.getTime() < todayZero) {
        targetDate = new Date(targetYear + 1, mMonth - 1, mDay);
      }

      const diffDays = Math.round((targetDate.getTime() - todayZero) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && diffDays <= 14) {
        upcomingItems.push({ ...m, daysUntil: diffDays, yearsCompleted: Math.max(0, targetDate.getFullYear() - mYear) });
      }
    });

    upcomingItems.sort((a, b) => a.daysUntil - b.daysUntil);
    return { todayCelebrations: todayItems, upcomingMilestones: upcomingItems };
  }, [milestones]);

  // Milestone actions
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneClientId || !newMilestoneTitle.trim() || !newMilestoneDate) return;

    try {
      const res = await apiFetch<{ success: boolean; milestone: ClientMilestone }>('/api/firm/milestones', {
        method: 'POST',
        body: JSON.stringify({
          clientId: newMilestoneClientId,
          milestoneType: newMilestoneType,
          title: newMilestoneTitle.trim(),
          milestoneDate: newMilestoneDate,
          contactPerson: newMilestonePerson.trim() || undefined,
          contactPhone: newMilestonePhone.trim() || undefined,
          notes: newMilestoneNotes.trim() || undefined,
        }),
      });

      if (res.success && res.milestone) {
        setMilestones((prev) => [...prev, res.milestone]);
        setShowNewMilestoneModal(false);
        setNewMilestoneTitle('');
        setNewMilestoneDate('');
        setNewMilestonePerson('');
        setNewMilestonePhone('');
        setNewMilestoneNotes('');
        showNotification('Client milestone date saved successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save client milestone');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to remove this milestone date?')) return;
    try {
      await apiFetch(`/api/firm/milestones/${id}`, { method: 'DELETE' });
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      showNotification('Milestone removed.');
    } catch (err: any) {
      alert(err.message || 'Failed to delete milestone');
    }
  };

  const handleRecordMilestoneGreet = async (m: ClientMilestone) => {
    try {
      const res = await apiFetch<{ success: boolean; milestone: ClientMilestone }>(`/api/firm/milestones/${m.id}/greet`, {
        method: 'POST',
      });
      if (res.success && res.milestone) {
        setMilestones((prev) => prev.map((item) => (item.id === m.id ? res.milestone : item)));
        showNotification(`Greeting recorded for ${m.title}!`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record greeting');
    }
  };

  // Personal To-Do handlers
  const handleCreatePersonalTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      const res = await apiFetch<{ success: boolean; todo: FirmUserTodo }>('/api/firm/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          priority: newTodoPriority,
        }),
      });

      if (res.success && res.todo) {
        setPersonalTodos((prev) => [res.todo, ...prev]);
        setNewTodoTitle('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add to-do');
    }
  };

  const handleTogglePersonalTodo = async (id: string) => {
    try {
      const res = await apiFetch<{ success: boolean; todo: FirmUserTodo }>(`/api/firm/todos/${id}/toggle`, {
        method: 'PATCH',
      });
      if (res.success && res.todo) {
        setPersonalTodos((prev) => prev.map((t) => (t.id === id ? res.todo : t)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update to-do');
    }
  };

  const handleDeletePersonalTodo = async (id: string) => {
    try {
      await apiFetch(`/api/firm/todos/${id}`, { method: 'DELETE' });
      setPersonalTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete to-do');
    }
  };

  // Group & Direct Chat loaders
  const loadGroupMessages = async (groupId: string) => {
    if (!groupId) return;
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(`/api/firm/groups/${groupId}/messages`);
      setGroupMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load group messages:', err);
    }
  };

  const loadDirectMessages = async (targetUserId: string) => {
    if (!targetUserId) return;
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(`/api/firm/team/direct-messages/${targetUserId}`);
      setDirectMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load direct messages:', err);
    }
  };

  useEffect(() => {
    if (chatScope === 'GROUPS' && selectedGroupId) {
      loadGroupMessages(selectedGroupId);
    } else if (chatScope === 'DIRECT' && selectedDirectUserId) {
      loadDirectMessages(selectedDirectUserId);
    }
  }, [chatScope, selectedGroupId, selectedDirectUserId]);

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedGroupId) return;

    try {
      const res = await apiFetch<{ success: boolean; message: ChatMessage }>(`/api/firm/groups/${selectedGroupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          message: newMessageText.trim(),
          attachmentUrl: newAttachmentUrl.trim() || undefined,
          attachmentName: newAttachmentName.trim() || undefined,
        }),
      });

      if (res.success && res.message) {
        setGroupMessages((prev) => [...prev, res.message]);
        setNewMessageText('');
        setNewAttachmentUrl('');
        setNewAttachmentName('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to post message to group');
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedDirectUserId) return;

    try {
      const res = await apiFetch<{ success: boolean; message: ChatMessage }>(`/api/firm/team/direct-messages/${selectedDirectUserId}`, {
        method: 'POST',
        body: JSON.stringify({
          message: newMessageText.trim(),
          attachmentUrl: newAttachmentUrl.trim() || undefined,
          attachmentName: newAttachmentName.trim() || undefined,
        }),
      });

      if (res.success && res.message) {
        setDirectMessages((prev) => [...prev, res.message]);
        setNewMessageText('');
        setNewAttachmentUrl('');
        setNewAttachmentName('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send direct message');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await apiFetch<{ success: boolean; group: FirmChatGroup }>('/api/firm/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
          groupType: newGroupType,
          memberUserIds: newGroupMembers,
        }),
      });

      if (res.success && res.group) {
        setChatGroups((prev) => [res.group, ...prev]);
        setSelectedGroupId(res.group.id);
        setShowNewGroupModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupMembers([]);
        showNotification(`Channel "#${res.group.name}" created!`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedChatClientId) return;

    try {
      const res = await apiFetch<{ success: boolean; message: ChatMessage }>('/api/firm/messages', {
        method: 'POST',
        body: JSON.stringify({
          clientId: selectedChatClientId,
          message: newMessageText.trim(),
          threadType: chatThreadType,
          category: newMessageCategory,
          attachmentUrl: newAttachmentUrl.trim() || null,
          attachmentName: newAttachmentName.trim() || null,
        }),
      });

      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setNewMessageText('');
        setNewAttachmentUrl('');
        setNewAttachmentName('');
        showNotification(
          chatThreadType === 'INTERNAL_TEAM_NOTE'
            ? 'Private internal note posted (hidden from client)!'
            : 'Message sent to client!'
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const handleResolveMessage = async (msgId: string) => {
    try {
      const res = await apiFetch<{ success: boolean; message: any }>(`/api/firm/messages/${msgId}/resolve`, {
        method: 'PATCH',
      });
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: 'RESOLVED' } : m))
        );
        showNotification('Query thread marked as resolved!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve query');
    }
  };

  // Pre-filing Checklist handlers
  const handleOpenChecklist = async (client: FirmClient) => {
    setShowChecklistModal(client);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      const res = await apiFetch<{ checklist: PreFilingChecklist | null }>(
        `/api/firm/checklists?clientId=${client.id}&period=${period}&returnType=GSTR-3B`
      );
      if (res.checklist) {
        setChecklistState(res.checklist);
      } else {
        setChecklistState({
          client_id: client.id,
          period,
          return_type: 'GSTR-3B',
          itc_2b_reconciled: false,
          rcm_checked: false,
          outward_eway_matched: false,
          cash_ledger_verified: false,
          client_draft_approved: false,
        });
      }
    } catch {
      setChecklistState({
        client_id: client.id,
        period,
        return_type: 'GSTR-3B',
        itc_2b_reconciled: false,
        rcm_checked: false,
        outward_eway_matched: false,
        cash_ledger_verified: false,
        client_draft_approved: false,
      });
    }
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showChecklistModal) return;
    try {
      const res = await apiFetch<{ success: boolean; checklist: PreFilingChecklist }>('/api/firm/checklists', {
        method: 'PUT',
        body: JSON.stringify({
          clientId: showChecklistModal.id,
          period: checklistState.period,
          returnType: checklistState.return_type,
          itc2bReconciled: checklistState.itc_2b_reconciled,
          rcmChecked: checklistState.rcm_checked,
          outwardEwayMatched: checklistState.outward_eway_matched,
          cashLedgerVerified: checklistState.cash_ledger_verified,
          clientDraftApproved: checklistState.client_draft_approved,
          notes: checklistState.notes || null,
        }),
      });

      if (res.success) {
        setChecklistState(res.checklist);
        showNotification(
          res.checklist.approved_at
            ? '✓ Pre-filing sign-off completed! All 5 checklist verifications verified.'
            : 'Pre-filing checklist updated.'
        );
        setShowChecklistModal(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save checklist');
    }
  };

  // Save Role Permissions matrix
  const handleSavePermissions = async () => {
    try {
      const res = await apiFetch<{ success: boolean; permissions: any }>('/api/firm/permissions', {
        method: 'PUT',
        body: JSON.stringify({ permissions: rolePermissions }),
      });
      if (res.success) {
        showNotification('Practice role permissions matrix updated successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save permissions');
    }
  };

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

  // Partner & Staff actions
  const handleInvitePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ success: boolean; member: TeamMember }>('/api/firm/team/invite', {
        method: 'POST',
        body: JSON.stringify({
          name: invitePartnerForm.name.trim(),
          email: invitePartnerForm.email.trim().toLowerCase(),
          phone: invitePartnerForm.phone.trim() || undefined,
          firm_role: 'FIRM_PARTNER',
          team_group: 'Executive Partners',
          password: invitePartnerForm.password.trim() || 'Partner@123456',
          icai_membership_no: invitePartnerForm.icai_membership_no.trim() || undefined,
          icai_membership_type: invitePartnerForm.icai_membership_type,
          cop_number: invitePartnerForm.cop_number.trim() || undefined,
          partner_designation: invitePartnerForm.partner_designation.trim() || 'Partner',
        }),
      });
      if (res.success && res.member) {
        setTeam((prev) => [...prev, { ...res.member, assignedClientsCount: 0 }]);
        setShowInvitePartnerModal(false);
        setInvitePartnerForm({
          name: '',
          email: '',
          phone: '',
          icai_membership_no: '',
          icai_membership_type: 'FCA',
          cop_number: '',
          partner_designation: 'Partner — Indirect Tax & GST',
          password: '',
        });
        showNotification('CA Partner invited with full co-ownership & statutory signing authority!');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to invite CA Partner');
    }
  };

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
          team_group: 'General',
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

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to permanently delete and remove client "${clientName}" from your firm?\n\nThis will remove their file access, task records, and messages.`)) {
      return;
    }
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(`/api/firm/clients/${clientId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
        showNotification(res.message || `Client "${clientName}" removed from firm.`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete client');
    }
  };

  const handleDeleteTeamMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove team member "${memberName}" from the firm?\n\nTheir allocated clients and open tasks will be unassigned.`)) {
      return;
    }
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(`/api/firm/team/${memberId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setTeam((prev) => prev.filter((t) => t.id !== memberId));
        showNotification(res.message || `Team member "${memberName}" removed.`);
        loadFirmData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove team member');
    }
  };

  const loadFirmWelcomeCodes = async () => {
    setLoadingFirmCodes(true);
    try {
      const res = await apiFetch<any>('/api/firm/welcome-codes');
      setFirmCodesData(res);
    } catch (err: any) {
      alert(err.message || 'Failed to load client invite codes');
    } finally {
      setLoadingFirmCodes(false);
    }
  };

  const handleGenerateFirmCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingFirmCode(true);
    try {
      const res = await apiFetch<{ success: boolean; count: number; message: string }>('/api/firm/welcome-codes/generate', {
        method: 'POST',
        body: JSON.stringify(firmCodeForm),
      });
      if (res.success) {
        showNotification(res.message || `Generated ${res.count} client invite code(s)!`);
        setFirmCodeForm({ count: 1, customCode: '', note: '', expiresInDays: 30 });
        await loadFirmWelcomeCodes();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate client invite codes');
    } finally {
      setGeneratingFirmCode(false);
    }
  };

  const handleRevokeFirmCode = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to revoke unused invite code "${code}"?`)) return;
    try {
      await apiFetch(`/api/firm/welcome-codes/${id}`, { method: 'DELETE' });
      showNotification(`Invite code "${code}" revoked.`);
      await loadFirmWelcomeCodes();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invite code');
    }
  };

  const handleShareFirmInvite = (code: string, note?: string) => {
    const firmName = firm?.name || 'our practice';
    const text = `Welcome to ${firmName}!\n\nYou have been invited to onboard your business compliance workspace.\n\nYour exclusive registration Welcome Code is:\n👉  ${code}\n\nPlease complete your registration here:\n${window.location.origin}/signup\n${note ? `\n(Reference: ${note})` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedFirmCode(code);
    showNotification(`Invite message for code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedFirmCode(null), 2500);
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

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedChatClientId) || null;
  }, [clients, selectedChatClientId]);

  const filteredChatClients = useMemo(() => {
    if (!chatSearch.trim()) return clients;
    const q = chatSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.business_name && c.business_name.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  }, [clients, chatSearch]);

  const filteredMessages = useMemo(() => {
    if (chatCategoryFilter === 'ALL') return messages;
    return messages.filter((m) => m.category === chatCategoryFilter);
  }, [messages, chatCategoryFilter]);

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
                {isStaff ? 'Article Assistant Workspace' : 'CA Firm Suite'}
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
            <span className="text-slate-500">
              ({user?.role === 'FIRM_OWNER' ? 'Firm Owner / Partner' : user?.role === 'FIRM_PARTNER' ? 'CA Partner (Co-Executive)' : user?.firm_role === 'FIRM_MANAGER' ? 'Manager' : 'Article Clerk'})
            </span>
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

      {/* 2. SUB-NAVIGATION BAR (DYNAMIC FOR ARTICLE CLERK VS PARTNER) */}
      <nav className="bg-slate-950/60 border-b border-slate-800 px-4 sm:px-6 overflow-x-auto scrollbar-none flex gap-1">
        {(isStaff
          ? [
              { key: 'overview', label: '📊 My Article Desk' },
              { key: 'pipeline', label: '📋 My GST Filing Pipeline' },
              { key: 'tasks', label: `✅ My Tasks (${tasks.length})` },
              { key: 'clients', label: `👥 My Assigned Clients (${clients.length})` },
              { key: 'invoices', label: '🧾 Invoice Generator' },
              { key: 'milestones', label: `🎂 Client Milestones ${todayCelebrations.length > 0 ? `(${todayCelebrations.length} Today!)` : ''}` },
              { key: 'messages', label: '💬 Messages & Groups' },
              { key: 'due-dates', label: '📅 Statutory Deadlines' },
            ]
          : [
              { key: 'overview', label: '📊 Practice Command Center' },
              { key: 'pipeline', label: '📋 GST Compliance Pipeline' },
              { key: 'tasks', label: '✅ To-Do & Tasks' },
              { key: 'clients', label: `👥 Client Roster (${clients.length})` },
              { key: 'invoices', label: '🧾 Invoice Generator' },
              { key: 'milestones', label: `🎂 Milestones & Celebrations ${todayCelebrations.length > 0 ? `(${todayCelebrations.length} Today!)` : ''}` },
              { key: 'messages', label: `💬 Messaging & Groups (${chatGroups.length})` },
              { key: 'team', label: `🧑‍🤝‍🧑 Team / Articles (${team.length})` },
              { key: 'due-dates', label: '📅 Due Dates & Overrides' },
              { key: 'dsc', label: `🔏 DSC Vault ${expiringDscCount > 0 ? `(${expiringDscCount} Expiring)` : ''}` },
              { key: 'drive', label: '📁 BYOD Google Drive' },
              { key: 'settings', label: '⚙️ Firm Branding & Permissions' },
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
                <p className="text-xs font-medium text-slate-400">
                  {isStaff ? 'My Assigned Clients' : 'Total Managed Clients'}
                </p>
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

            {/* TODAY'S CELEBRATIONS & MILESTONES BANNER */}
            {(todayCelebrations.length > 0 || upcomingMilestones.length > 0) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950 border border-purple-500/30 space-y-3 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎉</span>
                    <h3 className="font-extrabold text-sm text-white">Client Celebrations & Milestone Watch</h3>
                    {todayCelebrations.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse">
                        {todayCelebrations.length} TODAY!
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab('milestones')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer"
                  >
                    View All Milestones Directory ({milestones.length}) →
                  </button>
                </div>

                {/* Today's Celebrations Grid */}
                {todayCelebrations.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {todayCelebrations.map((m) => {
                      const isGreeted = m.last_greeted_year === new Date().getFullYear();
                      return (
                        <div key={m.id} className="p-3.5 rounded-xl bg-purple-900/30 border border-purple-500/40 space-y-2 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                                {m.milestone_type === 'BIRTHDAY' ? '🎂 Birthday Today!' : m.milestone_type === 'INCORPORATION_DAY' ? '🏢 Incorporation Day!' : '📜 Anniversary Today!'}
                              </span>
                              {isGreeted ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  ✓ Greeted {m.last_greeted_year}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold animate-bounce">
                                  Needs Wish!
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-white mt-1">{m.title}</h4>
                            <p className="text-xs text-slate-300 font-semibold">{m.client?.business_name || m.client?.name}</p>
                            {m.contact_phone && (
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">📞 {m.contact_phone}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-purple-500/20 text-xs">
                            <button
                              onClick={() => {
                                setGreetingMilestone(m);
                                setShowGreetingModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <span>💌 Wish Client</span>
                            </button>
                            {m.contact_phone && (
                              <button
                                onClick={() => {
                                  const text = encodeURIComponent(
                                    `Dear ${m.contact_person || m.client?.name || 'Valued Client'},\nHeartiest congratulations on your ${m.title}! Wishing you immense success, health, and prosperity.\nWarm Regards,\n${firm?.name || 'Your Chartered Accountants'}`
                                  );
                                  window.open(`https://wa.me/${(m.contact_phone || '').replace(/\D/g, '')}?text=${text}`, '_blank');
                                  handleRecordMilestoneGreet(m);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                title="Open WhatsApp with pre-drafted greeting"
                              >
                                <span>🟢 WhatsApp</span>
                              </button>
                            )}
                            {!isGreeted && (
                              <button
                                onClick={() => handleRecordMilestoneGreet(m)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition cursor-pointer ml-auto"
                                title="Mark as greeted without sending message"
                              >
                                ✓ Done
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Upcoming next 14 days preview */}
                {upcomingMilestones.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Upcoming (Next 14d):
                    </span>
                    {upcomingMilestones.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                      >
                        <span>{m.milestone_type === 'BIRTHDAY' ? '🎂' : '🏢'}</span>
                        <strong className="text-white">{m.title}</strong>
                        <span className="text-slate-400">({m.client?.business_name || m.client?.name})</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                          in {m.daysUntil}d
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Quick Actions:</span>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Add To-Do / Task</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoiceClientId('');
                  setActiveTab('invoices');
                }}
                className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🧾 Open Invoice Generator</span>
              </button>
              {!isStaff && (
                <>
                  <button
                    onClick={() => setShowNewClientModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>+ Onboard New Client</span>
                  </button>
                  <button
                    onClick={() => setShowInviteStaffModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>+ Invite Article Clerk</span>
                  </button>
                  <button
                    onClick={() => setShowHandoverModal(true)}
                    className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔄 1-Click Handover</span>
                  </button>
                  <button
                    onClick={handleTriggerMonthlyRecurring}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
                  >
                    <span>⚡ Auto-Generate Monthly Tasks</span>
                  </button>
                </>
              )}
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
                      No tasks found. Click "+ Add To-Do / Task" to create your first task.
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

                {/* Personal Sticky Scratchpad To-Dos */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400">📝</span>
                      <h4 className="font-bold text-xs text-white">My Personal To-Do Pad</h4>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {personalTodos.filter((t) => !t.is_completed).length} Pending
                    </span>
                  </div>

                  {/* Quick Input Form */}
                  <form onSubmit={handleCreatePersonalTodo} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Add personal to-do..."
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <select
                      value={newTodoPriority}
                      onChange={(e) => setNewTodoPriority(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-300"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                      <option value="LOW">Low</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!newTodoTitle.trim()}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                    >
                      +
                    </button>
                  </form>

                  {/* To-Do Checklist */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-none">
                    {personalTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition ${
                          todo.is_completed
                            ? 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                            : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={todo.is_completed}
                            onChange={() => handleTogglePersonalTodo(todo.id)}
                            className="w-3.5 h-3.5 rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span className={`truncate text-xs ${todo.is_completed ? 'line-through text-slate-500' : ''}`}>
                            {todo.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {todo.priority !== 'NORMAL' && (
                            <span
                              className={`text-[9px] font-black uppercase px-1 rounded ${
                                todo.priority === 'URGENT'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : todo.priority === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {todo.priority}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeletePersonalTodo(todo.id)}
                            className="text-slate-600 hover:text-rose-400 font-bold text-xs p-0.5 cursor-pointer"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    {personalTodos.length === 0 && (
                      <p className="text-[11px] text-slate-500 text-center py-3">No personal to-dos. Add one above!</p>
                    )}
                  </div>
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
              {!isStaff && (
                <button
                  onClick={() => setShowNewClientModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
                >
                  + Onboard Client
                </button>
              )}
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

                          {/* Pre-filing Sign-off checklist trigger button */}
                          <div className="pt-1 flex items-center justify-between">
                            <button
                              onClick={() => handleOpenChecklist(client)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-blue-400 border border-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <span>📝 5-Point Sign-Off</span>
                            </button>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {client.assigned_staff?.name || 'Unassigned'}
                            </span>
                          </div>

                          {/* Move stage dropdown */}
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
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
                {!isStaff && (
                  <button
                    onClick={handleTriggerMonthlyRecurring}
                    className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition cursor-pointer"
                  >
                    ⚡ Auto-Generate Monthly Tasks
                  </button>
                )}
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
              {!isStaff && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDayOneModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition cursor-pointer flex items-center gap-1.5 active:scale-95 border border-emerald-400/30"
                    title="Paste raw WhatsApp chat or notes to generate complete 10-doc regulatory kit, invite code, and drive in 1 click"
                  >
                    <span className="text-sm">✨</span>
                    <span>Day-One AI Onboarding</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientCodesModal(true);
                      loadFirmWelcomeCodes();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Generate unique registration codes for prospective clients"
                  >
                    <span>🎟️</span>
                    <span>Client Invite Codes</span>
                  </button>
                  <button
                    onClick={() => setShowNewClientModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
                  >
                    + Onboard New Client
                  </button>
                </div>
              )}
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
                    <th className="py-3 px-4 text-right">Tools</th>
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
                          disabled={isStaff}
                          onChange={(e) => handleAssignStaff(client.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {team.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceClientId(client.id);
                              setActiveTab('invoices');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Generate or view invoices for this client"
                          >
                            <span>🧾</span>
                            <span>Invoices</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChatClientId(client.id);
                              setActiveTab('messages');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-[11px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer transition shadow-xs"
                            title="Open chat with this client"
                          >
                            <span>💬</span>
                            <span>Chat</span>
                          </button>
                          {!isStaff && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClient(client.id, client.business_name || client.name)}
                              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg text-[11px] font-bold border border-rose-800/60 flex items-center gap-1 cursor-pointer transition shadow-xs"
                              title="Delete Client from Firm"
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No clients found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4.5: INVOICE GENERATOR TOOL (PRACTICE SUITE & CLIENT BILLING)         */}
        {/* ========================================================================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🧾</span>
                  <span>Invoice Generator & Billing Suite</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {isStaff
                    ? 'Generate professional GST invoices for your firm or for clients allocated to you.'
                    : 'Generate practice invoices, manage recurring bulk billing, and supervise client invoices.'}
                </p>
              </div>
            </div>
            <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow">
              <InvoiceDashboard clientId={selectedInvoiceClientId || undefined} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4.6: CLIENT MILESTONES & CELEBRATIONS CRM                             */}
        {/* ========================================================================= */}
        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🎂</span>
                  <span>Client Milestones, Birthdays & Celebrations CRM</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Track client birthdays, foundation anniversaries, and key dates to foster strong taxpayer relationships.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewMilestoneModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Add Client Milestone</span>
              </button>
            </div>

            {/* Milestone Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">Total Tracked Dates</p>
                <h3 className="text-3xl font-black text-white mt-1">{milestones.length}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Birthdays & Anniversaries</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 shadow">
                <p className="text-xs font-medium text-purple-400">Celebrations Today</p>
                <h3 className="text-3xl font-black text-amber-300 mt-1">{todayCelebrations.length}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Actions needed today</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">Upcoming in 14 Days</p>
                <h3 className="text-3xl font-black text-blue-400 mt-1">{upcomingMilestones.length}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Next 2 weeks preview</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow">
                <p className="text-xs font-medium text-slate-400">Greeted this Year</p>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">
                  {milestones.filter((m) => m.last_greeted_year === new Date().getFullYear()).length}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">Audited greetings sent</p>
              </div>
            </div>

            {/* Milestones Directory Table */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Client / Business</th>
                      <th className="py-3 px-4">Milestone Title & Type</th>
                      <th className="py-3 px-4">Annual Date</th>
                      <th className="py-3 px-4">Key Contact & Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Greeting Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {milestones.map((m) => {
                      const isGreeted = m.last_greeted_year === new Date().getFullYear();
                      return (
                        <tr key={m.id} className="hover:bg-slate-900/50 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{m.client?.business_name || m.client?.name || 'Client'}</div>
                            <div className="text-[11px] text-slate-400">{m.client?.name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{m.title}</div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                              {m.milestone_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-300">
                            {new Date(m.milestone_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-300">{m.contact_person || '—'}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{m.contact_phone || '—'}</div>
                          </td>
                          <td className="py-3 px-4">
                            {isGreeted ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                ✓ Greeted {m.last_greeted_year}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setGreetingMilestone(m);
                                  setShowGreetingModal(true);
                                }}
                                className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-[11px] font-bold border border-purple-500/30 transition cursor-pointer"
                              >
                                💌 Wish
                              </button>
                              {m.contact_phone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const text = encodeURIComponent(
                                      `Dear ${m.contact_person || m.client?.name || 'Valued Client'},\nHeartiest congratulations on your ${m.title}! Wishing you immense success, health, and prosperity.\nWarm Regards,\n${firm?.name || 'Your Chartered Accountants'}`
                                    );
                                    window.open(`https://wa.me/${(m.contact_phone || '').replace(/\D/g, '')}?text=${text}`, '_blank');
                                    handleRecordMilestoneGreet(m);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-500/30 transition cursor-pointer"
                                  title="Send WhatsApp Greeting"
                                >
                                  🟢 WhatsApp
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="px-2 py-1 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                title="Delete Milestone"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {milestones.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No client milestone dates added yet. Click "+ Add Client Milestone" above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: IN-WEBSITE MESSAGING & COMMUNICATIONS (WHATSAPP ALTERNATIVE)       */}
        {/* ========================================================================= */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {/* Scope Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setChatScope('CLIENTS')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    chatScope === 'CLIENTS'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>👥</span>
                  <span>Client Inboxes ({clients.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChatScope('GROUPS')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    chatScope === 'GROUPS'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>💬</span>
                  <span>Practice Groups & Channels ({chatGroups.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChatScope('DIRECT')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    chatScope === 'DIRECT'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>🔒</span>
                  <span>Team Direct Messages ({team.length})</span>
                </button>
              </div>

              {chatScope === 'GROUPS' && !isStaff && (
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1"
                >
                  <span>+ Create Channel / Group</span>
                </button>
              )}
            </div>

            {chatScope === 'CLIENTS' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
            {/* Left: Client List for Chat */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white">Client Inboxes</h3>
                <span className="text-[10px] text-slate-500 font-mono">Total {filteredChatClients.length}</span>
              </div>

              <input
                type="text"
                placeholder="Search clients..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />

              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[500px]">
                {filteredChatClients.map((client) => {
                  const isSelected = selectedChatClientId === client.id;
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedChatClientId(client.id)}
                      className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/50 text-white shadow'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{client.business_name || client.name}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{client.name}</span>
                        <span className="text-slate-500">{client.assigned_staff?.name || 'Unassigned'}</span>
                      </div>
                    </button>
                  );
                })}

                {filteredChatClients.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">No clients found</div>
                )}
              </div>
            </div>

            {/* Right: Active Chat Stream */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col space-y-4">
              {selectedClient ? (
                <>
                  {/* Chat Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-white">{selectedClient.business_name || selectedClient.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        GSTIN: {selectedClient.gstin || 'None'} • Article: {selectedClient.assigned_staff?.name || 'Unassigned'}
                      </p>
                    </div>

                    {/* Dual-Thread Toggle Buttons */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                      <button
                        onClick={() => setChatThreadType('CLIENT_EXTERNAL')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          chatThreadType === 'CLIENT_EXTERNAL'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🌐 Client Chat
                      </button>
                      <button
                        onClick={() => setChatThreadType('INTERNAL_TEAM_NOTE')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                          chatThreadType === 'INTERNAL_TEAM_NOTE'
                            ? 'bg-purple-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>🔒 Private Notes</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900/80 text-purple-200">Team Only</span>
                      </button>
                    </div>
                  </div>

                  {/* Privacy Banner if Internal Team Note */}
                  {chatThreadType === 'INTERNAL_TEAM_NOTE' && (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] flex items-center gap-2">
                      <span>🔒</span>
                      <span>
                        <strong>Confidential Internal Stream:</strong> Messages and notes posted here are strictly visible only to your firm's Articles, Managers, and Partners. The client cannot see this.
                      </span>
                    </div>
                  )}

                  {/* Messages Feed */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    {filteredMessages.map((msg) => {
                      const isMe = msg.sender_user_id === user?.id;
                      const isClientSender = msg.sender?.role === 'CLIENT';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                            <span className="font-bold text-slate-400">{msg.sender?.name || 'Unknown'}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-800 text-slate-300">
                              {isClientSender ? 'Client' : msg.sender?.firm_role === 'FIRM_MANAGER' ? 'Manager' : msg.sender?.role === 'FIRM_OWNER' ? 'Partner' : 'Article Assistant'}
                            </span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3 rounded-2xl max-w-lg text-xs leading-relaxed shadow ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : msg.thread_type === 'INTERNAL_TEAM_NOTE'
                                ? 'bg-purple-900/40 border border-purple-500/30 text-purple-100 rounded-tl-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            <p>{msg.message}</p>

                            {/* Attachment Pill */}
                            {msg.attachment_url && (
                              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                                <span className="text-[10px]">📎</span>
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] underline font-bold hover:text-white"
                                >
                                  {msg.attachment_name || 'Download Attachment'}
                                </a>
                              </div>
                            )}

                            {/* Query Status resolution button */}
                            <div className="mt-2 pt-1 flex items-center justify-between text-[10px] opacity-80">
                              <span>Tag: {msg.category}</span>
                              {msg.status !== 'RESOLVED' ? (
                                <button
                                  onClick={() => handleResolveMessage(msg.id)}
                                  className="text-emerald-300 hover:underline font-bold"
                                >
                                  Mark Resolved ✓
                                </button>
                              ) : (
                                <span className="text-emerald-300 font-bold">Resolved ✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredMessages.length === 0 && (
                      <div className="py-16 text-center text-slate-500 text-xs">
                        No messages in this thread yet. Send a message to replace WhatsApp communications.
                      </div>
                    )}
                  </div>

                  {/* Message Composer */}
                  <form onSubmit={handleSendMessage} className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <select
                        value={newMessageCategory}
                        onChange={(e) => setNewMessageCategory(e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300"
                      >
                        <option value="GENERAL">General Query</option>
                        <option value="MONTHLY_DOCS">Monthly Docs Request</option>
                        <option value="ITC_RECON">ITC / 2B Clarification</option>
                        <option value="NOTICE_REPLY">Notice & Legal</option>
                        <option value="BILLING">Billing & Fee</option>
                      </select>

                      <input
                        type="url"
                        placeholder="Attachment URL (optional)"
                        value={newAttachmentUrl}
                        onChange={(e) => {
                          setNewAttachmentUrl(e.target.value);
                          if (!newAttachmentName && e.target.value) {
                            setNewAttachmentName('Tax Document.pdf');
                          }
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 flex-1"
                      />
                    </div>

                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        required
                        placeholder={
                          chatThreadType === 'INTERNAL_TEAM_NOTE'
                            ? 'Post confidential internal note (only visible to firm team)...'
                            : 'Type message to client...'
                        }
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
                      />
                      <button
                        type="submit"
                        className={`px-5 rounded-xl font-bold text-xs text-white shadow cursor-pointer transition ${
                          chatThreadType === 'INTERNAL_TEAM_NOTE'
                            ? 'bg-purple-600 hover:bg-purple-500'
                            : 'bg-blue-600 hover:bg-blue-500'
                        }`}
                      >
                        {chatThreadType === 'INTERNAL_TEAM_NOTE' ? 'Post Note' : 'Send'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                  Select a client from the left pane to view or send messages.
                </div>
              )}
            </div>
          </div>
        )}

            {/* VIEW 2: PRACTICE CHANNELS & GROUPS */}
            {chatScope === 'GROUPS' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
                {/* Left: Group Channel List */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white">Firm Channels & Groups</h3>
                    <span className="text-[10px] text-slate-500 font-mono">Total {chatGroups.length}</span>
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[500px]">
                    {chatGroups.map((g) => {
                      const isSelected = selectedGroupId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGroupId(g.id)}
                          className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600/10 border-purple-500/50 text-white shadow'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">#{g.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {g.group_type === 'BROADCAST' ? '📢 All-Firm' : '💬 Group'}
                            </span>
                          </div>
                          {g.description && <p className="text-[11px] text-slate-400 mt-1 truncate">{g.description}</p>}
                        </button>
                      );
                    })}

                    {chatGroups.length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No custom groups yet. Click "+ Create Channel / Group" above.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Group Chat Stream */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col space-y-4">
                  {selectedGroupId ? (
                    <>
                      {/* Group Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <h3 className="font-bold text-sm text-white flex items-center gap-2">
                            <span>#</span>
                            <span>{chatGroups.find((g) => g.id === selectedGroupId)?.name || 'Group Channel'}</span>
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {chatGroups.find((g) => g.id === selectedGroupId)?.description || 'Practice team collaboration channel'}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                          Practice Channel
                        </span>
                      </div>

                      {/* Group Messages Stream */}
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                        {groupMessages.map((msg) => {
                          const isMe = msg.sender_user_id === user?.id;
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                                <span className="font-semibold text-slate-300">{isMe ? 'You' : msg.sender?.name || 'Colleague'}</span>
                                {msg.sender?.firm_role && (
                                  <span className="text-purple-400 font-mono">({msg.sender.firm_role})</span>
                                )}
                                <span>•</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div
                                className={`p-3 rounded-2xl text-xs max-w-xl space-y-1.5 shadow ${
                                  isMe
                                    ? 'bg-purple-600 text-white rounded-br-none'
                                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                {msg.attachment_url && (
                                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                                    <span className="text-[10px]">📎</span>
                                    <a
                                      href={msg.attachment_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] underline font-bold hover:text-white"
                                    >
                                      {msg.attachment_name || 'Download Attachment'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {groupMessages.length === 0 && (
                          <div className="py-16 text-center text-slate-500 text-xs">
                            No messages in this channel yet. Post an announcement or start the conversation!
                          </div>
                        )}
                      </div>

                      {/* Group Composer */}
                      <form onSubmit={handleSendGroupMessage} className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            placeholder="Attachment URL (optional)"
                            value={newAttachmentUrl}
                            onChange={(e) => {
                              setNewAttachmentUrl(e.target.value);
                              if (!newAttachmentName && e.target.value) {
                                setNewAttachmentName('Shared Workpaper.pdf');
                              }
                            }}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <textarea
                            rows={2}
                            required
                            placeholder="Post to channel..."
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
                          />
                          <button
                            type="submit"
                            className="px-5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 shadow cursor-pointer transition"
                          >
                            Post
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                      Select a practice channel from the left pane.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: TEAM 1-ON-1 DIRECT MESSAGES */}
            {chatScope === 'DIRECT' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
                {/* Left: Colleague Roster */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white">Team Colleagues</h3>
                    <span className="text-[10px] text-slate-500 font-mono">Total {team.length}</span>
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[500px]">
                    {team.map((member) => {
                      const isSelected = selectedDirectUserId === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => setSelectedDirectUserId(member.id)}
                          className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/10 border-emerald-500/50 text-white shadow'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{member.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 font-mono">
                              {member.firm_role || 'STAFF'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{member.email}</p>
                        </button>
                      );
                    })}

                    {team.length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No colleagues onboarded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Direct 1-to-1 Stream */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col space-y-4">
                  {selectedDirectUserId ? (
                    <>
                      {/* Direct Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div>
                          <h3 className="font-bold text-sm text-white flex items-center gap-2">
                            <span>🔒</span>
                            <span>{team.find((t) => t.id === selectedDirectUserId)?.name || 'Direct Chat'}</span>
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {team.find((t) => t.id === selectedDirectUserId)?.email} • Role: {team.find((t) => t.id === selectedDirectUserId)?.firm_role || 'Article Assistant'}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                          Direct 1-on-1
                        </span>
                      </div>

                      {/* Direct Messages Stream */}
                      <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                        {directMessages.map((msg) => {
                          const isMe = msg.sender_user_id === user?.id;
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1">
                                <span className="font-semibold text-slate-300">{isMe ? 'You' : msg.sender?.name || 'Colleague'}</span>
                                <span>•</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div
                                className={`p-3 rounded-2xl text-xs max-w-xl space-y-1.5 shadow ${
                                  isMe
                                    ? 'bg-emerald-600 text-white rounded-br-none'
                                    : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                                }`}
                              >
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                {msg.attachment_url && (
                                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                                    <span className="text-[10px]">📎</span>
                                    <a
                                      href={msg.attachment_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] underline font-bold hover:text-white"
                                    >
                                      {msg.attachment_name || 'Download Attachment'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {directMessages.length === 0 && (
                          <div className="py-16 text-center text-slate-500 text-xs">
                            No direct messages yet. Send a private message to this team member!
                          </div>
                        )}
                      </div>

                      {/* Direct Composer */}
                      <form onSubmit={handleSendDirectMessage} className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex gap-2">
                          <textarea
                            rows={2}
                            required
                            placeholder="Type direct message..."
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
                          />
                          <button
                            type="submit"
                            className="px-5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow cursor-pointer transition"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                      Select a team colleague from the left pane to start a private direct conversation.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: TEAM & ARTICLE CLERKS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Partners &amp; Practice Team</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {team.length} Members
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage CA Partners with equal co-ownership, article clerks, portfolios, and workload handovers.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowHandoverModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔄 1-Click Handover / Transfer</span>
                </button>
                {!isStaff && (
                  <button
                    onClick={() => setShowInvitePartnerModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer transition transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>⭐ + Add CA Partner</span>
                  </button>
                )}
                <button
                  onClick={() => setShowInviteStaffModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer transition"
                >
                  + Invite Article Clerk / Staff
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.map((member) => {
                const isMemberPartner = member.role === 'FIRM_PARTNER' || member.role === 'FIRM_OWNER' || member.firm_role === 'FIRM_OWNER' || member.firm_role === 'FIRM_PARTNER';
                const isMemberOwner = member.role === 'FIRM_OWNER' || member.firm_role === 'FIRM_OWNER';

                return (
                  <div
                    key={member.id}
                    className={`p-5 rounded-2xl border space-y-3 transition-all ${
                      isMemberPartner
                        ? 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-amber-500/30 shadow-lg shadow-amber-950/20'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{member.name}</h4>
                          {isMemberPartner && (
                            <span className="text-amber-400 text-xs" title="ICAI Authorized Partner">
                              ⭐
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{member.email}</p>
                        {member.phone && <p className="text-[11px] text-slate-500 font-mono">📱 {member.phone}</p>}
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          isMemberOwner
                            ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                            : isMemberPartner
                            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                            : member.firm_role === 'FIRM_MANAGER'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {isMemberOwner
                          ? '🏛️ Firm Owner'
                          : isMemberPartner
                          ? '⭐ CA Partner'
                          : member.firm_role === 'FIRM_MANAGER'
                          ? 'Manager'
                          : 'Article Clerk'}
                      </span>
                    </div>

                    {/* ICAI Partner Regulatory Credentials */}
                    {isMemberPartner && (
                      <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Designation:</span>
                          <span className="font-semibold text-amber-200">{member.partner_designation || 'Practice Partner'}</span>
                        </div>
                        {member.icai_membership_no && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">ICAI Membership:</span>
                            <span className="font-mono font-bold text-white">
                              {member.icai_membership_no} ({member.icai_membership_type || 'FCA'})
                            </span>
                          </div>
                        )}
                        {member.cop_number && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">COP No.:</span>
                            <span className="font-mono text-slate-200">{member.cop_number}</span>
                          </div>
                        )}
                        <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                          <span>✓ Full Co-Ownership &amp; SA 210 Signing Parity</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Assigned Clients:</span>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-white">{member.assignedClientsCount} Clients</span>
                        {!isStaff && !isMemberOwner && member.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTeamMember(member.id, member.name)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title={isMemberPartner ? 'Remove Partner from Firm' : 'Remove Team Member from Firm'}
                          >
                            <span>🗑️</span>
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: STATUTORY DUE DATES & OVERRIDES                                    */}
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
                        {!isStaff && (
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
                        )}
                        {!isStaff && item.is_overridden && (
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
        {/* TAB 8: DIGITAL SIGNATURE (DSC) VAULT                                      */}
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
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: GOOGLE DRIVE BYOD & DOCUMENT ROUTING                               */}
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
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: WHITE-LABEL BRANDING & ROLE PERMISSIONS MANAGER (5-LEVEL HIERARCHY)*/}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* 1. White-label Firm Profile */}
            <form onSubmit={handleSaveFirmSettings} className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">Firm White-Label Branding & Profile</h2>
                <p className="text-xs text-slate-400">Customize your firm name, logo, ICAI registration numbers, and brand colors</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Practice Display Name</label>
                  <input
                    type="text"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Partner Membership No (M.No)</label>
                  <input
                    type="text"
                    value={settingsForm.membership_number}
                    onChange={(e) => setSettingsForm({ ...settingsForm, membership_number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Firm Logo URL</label>
                  <input
                    type="url"
                    value={settingsForm.logo_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  Save Practice Branding
                </button>
              </div>
            </form>

            {/* 2. Granular Dynamic Role Permissions Manager (5-Level Hierarchy) */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">🛡️ Role Permissions Manager (5-Level Hierarchy)</h2>
                  <p className="text-xs text-slate-400">
                    Allow or disallow specific capabilities for Firm Managers and Article Clerks. Changes apply immediately.
                  </p>
                </div>
                <button
                  onClick={handleSavePermissions}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  Save Role Permissions Matrix
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Practice Capability</th>
                      <th className="py-3 px-4 text-center">Firm Partners</th>
                      <th className="py-3 px-4 text-center">Firm Managers</th>
                      <th className="py-3 px-4 text-center">Article Clerks / Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {[
                      { key: 'change_due_dates', label: 'Override & Change Due Dates', desc: 'Can extend statutory dates and set office deadlines' },
                      { key: 'client_access_all', label: 'View All Firm Clients', desc: 'Access all practice clients vs strictly assigned clients' },
                      { key: 'allocate_clients', label: 'Allocate & Reassign Clients', desc: 'Can transfer client portfolios between staff' },
                      { key: 'manage_tasks', label: 'Create & Manage Tasks for Others', desc: 'Can delegate and delete tasks for other team members' },
                      { key: 'view_pending_dashboard', label: 'Pending Tasks Workload Dashboard', desc: 'Access to firm-wide pending task bottleneck metrics' },
                      { key: 'approve_returns', label: 'Final Return Sign-Off (5-Point)', desc: 'Can approve and sign off computations before portal filing' },
                      { key: 'view_invoicing_fees', label: 'Practice Invoicing & Client Fees', desc: 'Can view client fee ledgers and GST Bro subscription charges' },
                    ].map((perm) => (
                      <tr key={perm.key} className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{perm.label}</div>
                          <div className="text-[11px] text-slate-400">{perm.desc}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-emerald-400 font-bold">✓ Always Allowed</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rolePermissions.FIRM_MANAGER?.[perm.key] ?? true}
                            onChange={(e) =>
                              setRolePermissions({
                                ...rolePermissions,
                                FIRM_MANAGER: {
                                  ...(rolePermissions.FIRM_MANAGER || {}),
                                  [perm.key]: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={rolePermissions.FIRM_STAFF?.[perm.key] ?? false}
                            onChange={(e) =>
                              setRolePermissions({
                                ...rolePermissions,
                                FIRM_STAFF: {
                                  ...(rolePermissions.FIRM_STAFF || {}),
                                  [perm.key]: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: PRE-FILING 5-POINT SIGN-OFF CHECKLIST                              */}
      {/* ========================================================================= */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveChecklist}
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Pre-Filing 5-Point Sign-Off</h3>
                <p className="text-xs text-slate-400">
                  {showChecklistModal.business_name || showChecklistModal.name} • Period: {checklistState.period}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { key: 'itc_2b_reconciled', label: '1. GSTR-2B ITC Reconciled with Purchase Register', desc: 'Unmatched invoices quarantined and flagged to client' },
                { key: 'rcm_checked', label: '2. Reverse Charge Mechanism (RCM) Liabilities Checked', desc: 'Section 9(3) / 9(4) liabilities verified with cash outflow' },
                { key: 'outward_eway_matched', label: '3. Outward Supplies Matched with E-Way Bill Summary', desc: 'B2B and B2C sales totals agree with generation portal' },
                { key: 'cash_ledger_verified', label: '4. Electronic Cash & Credit Ledger Balances Verified', desc: 'Challan created and sufficient balance present for tax offset' },
                { key: 'client_draft_approved', label: '5. Client Draft Approval Received in In-App Chat', desc: 'Client acknowledged final liability figures before portal sign-off' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={(checklistState as any)[item.key] || false}
                    onChange={(e) =>
                      setChecklistState({
                        ...checklistState,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                  <div>
                    <h5 className="font-bold text-xs text-white">{item.label}</h5>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                </label>
              ))}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Partner Sign-Off Notes / Exceptions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified with client accountant Mr. Sharma. Ready for OTP generation."
                  value={checklistState.notes || ''}
                  onChange={(e) => setChecklistState({ ...checklistState, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {checklistState.approved_at && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
                  <span>✓ Digitally Approved by {checklistState.approver?.name || 'Partner'}</span>
                  <span className="text-[10px] text-emerald-400">
                    {new Date(checklistState.approved_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowChecklistModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
              >
                Save Sign-Off Verification
              </button>
            </div>
          </form>
        </div>
      )}

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
      {/* MODAL: PRACTICE CLIENT INVITE CODES (WELCOME CODES)                      */}
      {/* ========================================================================= */}
      {showClientCodesModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎟️</span>
                  <h3 className="font-bold text-base text-white">Client Invitation Codes</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Practice Scoped
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Generate unique welcome codes for prospective clients. Clients who register with your code are automatically onboarded into <strong className="text-white">{firm?.name || 'your firm'}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClientCodesModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Issued</span>
                <span className="text-xl font-black text-white">{firmCodesData.total}</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl border-l-4 border-l-emerald-500">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Available</span>
                <span className="text-xl font-black text-emerald-400">{firmCodesData.available}</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl border-l-4 border-l-purple-500">
                <span className="text-[10px] uppercase font-bold text-purple-400 block">Redeemed</span>
                <span className="text-xl font-black text-purple-400">{firmCodesData.used}</span>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-rose-400 block">Expired</span>
                <span className="text-xl font-black text-rose-400">{firmCodesData.expired}</span>
              </div>
            </div>

            {/* Quick Generator Box */}
            <form onSubmit={handleGenerateFirmCodes} className="p-4 bg-slate-900/60 border border-indigo-900/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Issue New Client Welcome Code</span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Client Reference / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp - Direct Invite"
                    value={firmCodeForm.note}
                    onChange={(e) => setFirmCodeForm({ ...firmCodeForm, note: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Custom Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ACME26 (5-16 chars)"
                    maxLength={16}
                    value={firmCodeForm.customCode}
                    onChange={(e) => setFirmCodeForm({ ...firmCodeForm, customCode: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Validity Period</label>
                  <select
                    value={firmCodeForm.expiresInDays ?? ''}
                    onChange={(e) => setFirmCodeForm({ ...firmCodeForm, expiresInDays: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="7">7 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="">Never Expires</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={generatingFirmCode}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <span>{generatingFirmCode ? 'Generating...' : '+ Generate Invite Code'}</span>
                </button>
              </div>
            </form>

            {/* Codes List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingFirmCodes ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading practice codes...</div>
              ) : firmCodesData.codes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No invite codes generated yet. Use the form above to generate your first client welcome code.
                </div>
              ) : (
                <div className="space-y-2">
                  {firmCodesData.codes.map((c: any) => {
                    const isCopied = copiedFirmCode === c.code;
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm tracking-wider text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-lg">
                              {c.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.used
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                                  : c.expires_at && new Date(c.expires_at).getTime() < Date.now()
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              }`}
                            >
                              {c.used ? 'Redeemed' : c.expires_at && new Date(c.expires_at).getTime() < Date.now() ? 'Expired' : 'Available'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {c.note ? <span>Note: <strong className="text-slate-300">{c.note}</strong></span> : <span>General client invite</span>}
                            {c.used && c.used_by_name && (
                              <span className="ml-2 text-purple-300">
                                • Registered by: <strong>{c.used_by_name}</strong> ({c.used_by_email}) on {new Date(c.used_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {!c.used && (
                            <button
                              type="button"
                              onClick={() => handleShareFirmInvite(c.code, c.note)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                              title="Copy WhatsApp / Email Invitation Message"
                            >
                              <span>{isCopied ? '✓ Copied' : '📋 Copy Invite'}</span>
                            </button>
                          )}
                          {!c.used && (
                            <button
                              type="button"
                              onClick={() => handleRevokeFirmCode(c.id, c.code)}
                              className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg text-[11px] font-semibold border border-rose-800/40 transition cursor-pointer"
                              title="Revoke unused code"
                            >
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Day-One AI Client Onboarding Suite Modal */}
      <DayOneOnboardingModal
        isOpen={showDayOneModal}
        onClose={() => setShowDayOneModal(false)}
        teamMembers={team}
        onClientOnboarded={() => {
          loadFirmData();
          loadFirmWelcomeCodes();
          showNotification('Client onboarded successfully via Day-One AI Kit!');
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: INVITE CA PRACTICE PARTNER (CO-EXECUTIVE)                          */}
      {/* ========================================================================= */}
      {showInvitePartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleInvitePartner}
            className="w-full max-w-lg bg-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl shadow-amber-950/30 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="font-bold text-base text-white">Add CA Practice Partner</h3>
                  <p className="text-[11px] text-amber-400/90 font-medium">Equal Executive Co-Ownership &amp; ICAI Regulatory Authority</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvitePartnerModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-200/90 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-300">
                <span>🛡️ Executive Privileges Granted:</span>
              </p>
              <p className="leading-relaxed">
                Newly invited Partners hold 100% administrative parity with the Firm Owner — including all client tax files, Day-One AI onboarding, team governance, and signing authority for ICAI SA 210 Engagement Letters.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Partner Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. CA Rajesh Kumar"
                    required
                    value={invitePartnerForm.name}
                    onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Professional Email *</label>
                  <input
                    type="email"
                    placeholder="rajesh@firm.com"
                    required
                    value={invitePartnerForm.email}
                    onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mobile / WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={invitePartnerForm.phone}
                    onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Partner Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Partner — Indirect Tax"
                    value={invitePartnerForm.partner_designation}
                    onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, partner_designation: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* ICAI Regulatory Credentials */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                  ICAI Compliance &amp; Signatory Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-400 text-[11px] mb-1">Fellowship</label>
                    <select
                      value={invitePartnerForm.icai_membership_type}
                      onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, icai_membership_type: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-2 text-white"
                    >
                      <option value="FCA">FCA (Fellow CA)</option>
                      <option value="ACA">ACA (Associate CA)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-400 text-[11px] mb-1">ICAI M.No (MRN)</label>
                    <input
                      type="text"
                      placeholder="e.g. 512345"
                      value={invitePartnerForm.icai_membership_no}
                      onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, icai_membership_no: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-400 text-[11px] mb-1">COP Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 88491"
                      value={invitePartnerForm.cop_number}
                      onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, cop_number: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-2 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Initial Password (Force-Reset on Login)</label>
                <input
                  type="text"
                  placeholder="e.g. Partner@123456"
                  value={invitePartnerForm.password}
                  onChange={(e) => setInvitePartnerForm({ ...invitePartnerForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Leave blank for default: Partner@123456</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowInvitePartnerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold hover:bg-slate-850"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Grant Partner Co-Ownership &rarr;
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
              Transfer all assigned clients and pending tasks from an outgoing staff member to another.
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

      {/* MODAL: ADD CLIENT MILESTONE DATE */}
      {showNewMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateMilestone}
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>🎂</span>
                <span>Add Client Milestone / Important Date</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewMilestoneModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Client *</label>
                <select
                  required
                  value={newMilestoneClientId}
                  onChange={(e) => setNewMilestoneClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.business_name || c.name} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Milestone Category *</label>
                  <select
                    value={newMilestoneType}
                    onChange={(e) => setNewMilestoneType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="INCORPORATION_DAY">🏢 Company Incorporation Day</option>
                    <option value="BIRTHDAY">🎂 Director / Key Person Birthday</option>
                    <option value="GST_ANNIVERSARY">📜 GST Registration Anniversary</option>
                    <option value="CUSTOM">⏰ Custom Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Milestone Date (YYYY-MM-DD) *</label>
                  <input
                    type="date"
                    required
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5th Incorporation Day or Rajesh Kumar's Birthday"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Rajesh Kumar (MD)"
                    value={newMilestonePerson}
                    onChange={(e) => setNewMilestonePerson(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone (for WhatsApp greetings)</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={newMilestonePhone}
                    onChange={(e) => setNewMilestonePhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Likes sweets/diary gift box or formal email"
                  value={newMilestoneNotes}
                  onChange={(e) => setNewMilestoneNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewMilestoneModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow"
              >
                Save Milestone Date
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE NEW PRACTICE CHAT GROUP */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>💬</span>
                <span>Create Practice Group / Channel</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Channel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GST-Filing-Squad or Corporate-Audit-Review"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Channel Purpose / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Daily filing coordination, notices discussion and query escalation"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Channel Visibility Type</label>
                <select
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="INTERNAL_TEAM">🔒 Internal Team Working Group</option>
                  <option value="BROADCAST">📢 Firm-Wide Broadcast Announcement Channel</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Member Colleagues ({newGroupMembers.length} selected)</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
                  {team.map((member) => {
                    const isChecked = newGroupMembers.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewGroupMembers([...newGroupMembers, member.id]);
                              } else {
                                setNewGroupMembers(newGroupMembers.filter((id) => id !== member.id));
                              }
                            }}
                            className="rounded border-slate-700 text-purple-600 focus:ring-0"
                          />
                          <span className="text-white font-medium">{member.name}</span>
                          <span className="text-[10px] text-slate-400">({member.firm_role || 'STAFF'})</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{member.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow"
              >
                Create Channel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CLIENT GREETING & DELEGATION */}
      {showGreetingModal && greetingMilestone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-950 border border-purple-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <h3 className="font-bold text-base text-white">Client Celebration Greeting</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGreetingModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1 text-xs">
              <h4 className="font-bold text-white text-sm">{greetingMilestone.title}</h4>
              <p className="text-purple-300 font-medium">
                Client: {greetingMilestone.client?.business_name || greetingMilestone.client?.name}
              </p>
              {greetingMilestone.contact_phone && (
                <p className="text-slate-400 font-mono text-[11px]">Contact Phone: {greetingMilestone.contact_phone}</p>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-300">Pre-Crafted Professional Greeting:</label>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs leading-relaxed italic">
                "Dear {greetingMilestone.contact_person || greetingMilestone.client?.name || 'Valued Client'}, heartiest congratulations on your {greetingMilestone.title}! Wishing you continued success, good health, and prosperity in all your endeavors. From all of us at {firm?.name || 'Your Chartered Accountants'}."
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleRecordMilestoneGreet(greetingMilestone);
                  setShowGreetingModal(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ✓ Mark Greeted in Records
              </button>

              <div className="flex items-center gap-2">
                {greetingMilestone.contact_phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `Dear ${greetingMilestone.contact_person || greetingMilestone.client?.name || 'Valued Client'},\nHeartiest congratulations on your ${greetingMilestone.title}! Wishing you immense success, health, and prosperity.\nWarm Regards,\n${firm?.name || 'Your Chartered Accountants'}`
                      );
                      window.open(`https://wa.me/${greetingMilestone.contact_phone?.replace(/\D/g, '')}?text=${text}`, '_blank');
                      handleRecordMilestoneGreet(greetingMilestone);
                      setShowGreetingModal(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🟢 Open WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    if (!greetingMilestone.client_id) return;
                    try {
                      await apiFetch('/api/firm/messages', {
                        method: 'POST',
                        body: JSON.stringify({
                          clientId: greetingMilestone.client_id,
                          message: `🎉 Happy ${greetingMilestone.title}! Wishing you continued growth and prosperity from the team at ${firm?.name || 'our CA firm'}.`,
                          threadType: 'CLIENT_EXTERNAL',
                          category: 'GENERAL',
                        }),
                      });
                      handleRecordMilestoneGreet(greetingMilestone);
                      showNotification('Greeting message sent directly in client portal chat!');
                      setShowGreetingModal(false);
                    } catch (err: any) {
                      alert(err.message || 'Failed to dispatch greeting');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💌 Send In-App Chat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

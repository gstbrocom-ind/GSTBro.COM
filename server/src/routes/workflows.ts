import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getDriveService } from '../services/googleDrive.js';
import { logActivity, getActivityLogs } from '../services/activityLogger.js';
import {
  uuidParamSchema,
  periodParamSchema,
  dateParamSchema,
  financialYearParamSchema,
  monthParamSchema,
  safeJsonRecordSchema,
  sanitizeText,
  validateUploadFile,
} from '../lib/security.js';
import {
  UPLOAD_RATE_LIMIT,
  HEAVY_DATA_RATE_LIMIT,
  HEAVY_QUERY_RATE_LIMIT,
} from '../lib/rateLimiter.js';
import { canAccessClient } from '../lib/authorization.js';

const jsonRecord = safeJsonRecordSchema;

export interface StatutoryDeadlineTemplate {
  id?: string;
  title: string;
  category: string;
  due_date: string;
  description: string;
  active: boolean;
  deadline_key?: string;
}

export function generateStatutoryDeadlinesForMonth(year: number, month: number): StatutoryDeadlineTemplate[] {
  const monthStr = String(month).padStart(2, '0');
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevMonthName = prevMonthDate.toLocaleString('en-US', { month: 'short' });
  const prevYear = prevMonthDate.getFullYear();

  const deadlines: StatutoryDeadlineTemplate[] = [];

  // 1. 7th: TDS/TCS Monthly Deposit
  deadlines.push({
    title: 'TDS / TCS Monthly Deposit (Challan ITNS 281)',
    category: 'TDS/TCS',
    due_date: `${year}-${monthStr}-07`,
    description: `Deposit of Tax Deducted at Source (TDS) and TCS collected in ${prevMonthName} ${prevYear} under Income Tax Act.`,
    active: true,
    deadline_key: 'TDS_DEPOSIT',
  });

  // 2. 10th: GSTR-7 (GST TDS)
  deadlines.push({
    title: 'GSTR-7 (GST TDS Monthly Return)',
    category: 'GST TDS',
    due_date: `${year}-${monthStr}-10`,
    description: `Monthly return for registered deductors deducting tax at source (TDS) under GST Section 51 for ${prevMonthName} ${prevYear}.`,
    active: true,
    deadline_key: 'GST_TDS_TCS',
  });

  // 3. 10th: GSTR-8 (GST TCS)
  deadlines.push({
    title: 'GSTR-8 (GST TCS Monthly Statement)',
    category: 'GST TCS',
    due_date: `${year}-${monthStr}-10`,
    description: `Monthly statement for e-commerce operators collecting TCS under GST Section 52 for ${prevMonthName} ${prevYear}.`,
    active: true,
    deadline_key: 'GST_TDS_TCS',
  });

  // 4. 11th: GSTR-1 (Monthly Outward Supplies)
  deadlines.push({
    title: 'GSTR-1 (Monthly Outward Supplies)',
    category: 'GSTR-1',
    due_date: `${year}-${monthStr}-11`,
    description: `Filing outward supplies of goods or services for monthly taxpayers for ${prevMonthName} ${prevYear}.`,
    active: true,
    deadline_key: 'GSTR-1',
  });

  // 5. 13th: GSTR-6 (ISD)
  deadlines.push({
    title: 'GSTR-6 (Input Service Distributor Return)',
    category: 'GST',
    due_date: `${year}-${monthStr}-13`,
    description: `Monthly return for Input Service Distributors (ISD) to distribute input tax credit for ${prevMonthName} ${prevYear}.`,
    active: true,
    deadline_key: 'GSTR-1',
  });

  // 6. 14th: GSTR-2B
  deadlines.push({
    title: 'GSTR-2B (Static Auto-Drafted ITC Statement)',
    category: 'GST',
    due_date: `${year}-${monthStr}-14`,
    description: `Static statement generated showing eligible and ineligible ITC based on counterparty GSTR-1 filings.`,
    active: true,
    deadline_key: 'GSTR-3B',
  });

  // 7. 20th: GSTR-3B (Monthly Summary Return & Tax Payment)
  deadlines.push({
    title: 'GSTR-3B (Monthly Summary & Cash Tax Payment)',
    category: 'GSTR-3B',
    due_date: `${year}-${monthStr}-20`,
    description: `Monthly summary return for outward supplies, ITC set-off, and cash tax payment for ${prevMonthName} ${prevYear}.`,
    active: true,
    deadline_key: 'GSTR-3B',
  });

  // 8. 20th: GSTR-5 / 5A
  deadlines.push({
    title: 'GSTR-5 / 5A (Non-Resident & OIDAR Taxpayers)',
    category: 'GST',
    due_date: `${year}-${monthStr}-20`,
    description: `Monthly return for non-resident taxable persons and online information database services for ${prevMonthName} ${prevYear}.`,
    active: true,
    deadline_key: 'GSTR-3B',
  });

  // Quarterly schedules: Jan (1), Apr (4), Jul (7), Oct (10)
  const isQuarterEndFollowMonth = [1, 4, 7, 10].includes(month);
  const quarterNum = month === 4 ? 4 : month === 7 ? 1 : month === 10 ? 2 : 3;

  if (isQuarterEndFollowMonth) {
    deadlines.push({
      title: `GSTR-1 (Quarterly Outward Supplies - QRMP Q${quarterNum})`,
      category: 'GSTR-1',
      due_date: `${year}-${monthStr}-13`,
      description: `Quarterly outward supplies return for QRMP registered taxpayers for Quarter ${quarterNum}.`,
      active: true,
      deadline_key: 'QRMP_SCHEME',
    });

    deadlines.push({
      title: `TCS Quarterly Statement - Form 27EQ (Q${quarterNum})`,
      category: 'TCS',
      due_date: `${year}-${monthStr}-15`,
      description: `Quarterly statement of Tax Collected at Source (TCS) for Quarter ${quarterNum}.`,
      active: true,
      deadline_key: 'TDS_RETURNS',
    });

    deadlines.push({
      title: `CMP-08 (Composition Scheme Statement & Tax Payment)`,
      category: 'GST',
      due_date: `${year}-${monthStr}-18`,
      description: `Quarterly statement and self-assessed tax payment by composition taxpayers for Quarter ${quarterNum}.`,
      active: true,
      deadline_key: 'COMPOSITION',
    });

    deadlines.push({
      title: `GSTR-3B Quarterly (QRMP Category 1 States)`,
      category: 'GSTR-3B',
      due_date: `${year}-${monthStr}-22`,
      description: `Quarterly GSTR-3B for Q${quarterNum} for Category 1 States (TN, KA, MH, AP, TS, GJ, KL, Goa).`,
      active: true,
      deadline_key: 'QRMP_SCHEME',
    });

    deadlines.push({
      title: `GSTR-3B Quarterly (QRMP Category 2 States)`,
      category: 'GSTR-3B',
      due_date: `${year}-${monthStr}-24`,
      description: `Quarterly GSTR-3B for Q${quarterNum} for Category 2 States (Delhi, UP, Haryana, Punjab, WB, etc.).`,
      active: true,
      deadline_key: 'QRMP_SCHEME',
    });

    const lastDay = new Date(year, month, 0).getDate();
    deadlines.push({
      title: `TDS Quarterly Return - Form 24Q & 26Q (Q${quarterNum})`,
      category: 'TDS',
      due_date: `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
      description: `Quarterly statement of TDS for salary (24Q) and non-salary (26Q) payments for Quarter ${quarterNum}.`,
      active: true,
      deadline_key: 'TDS_RETURNS',
    });
  } else {
    deadlines.push({
      title: 'IFF (Invoice Furnishing Facility - QRMP)',
      category: 'GST',
      due_date: `${year}-${monthStr}-13`,
      description: `Optional B2B invoice upload for QRMP quarterly filers for ${prevMonthName} ${prevYear}.`,
      active: true,
      deadline_key: 'QRMP_SCHEME',
    });

    deadlines.push({
      title: 'PMT-06 (Challan Payment for QRMP Filers)',
      category: 'GST',
      due_date: `${year}-${monthStr}-25`,
      description: `Challan payment of 35% fixed sum or self-assessed tax for QRMP scheme filers for ${prevMonthName} ${prevYear}.`,
      active: true,
      deadline_key: 'QRMP_SCHEME',
    });
  }

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  deadlines.push({
    title: 'TDS on Property / Rent (Form 26QB / 26QC)',
    category: 'TDS',
    due_date: `${year}-${monthStr}-${String(Math.min(30, lastDayOfMonth)).padStart(2, '0')}`,
    description: `Challan-cum-statement for TDS on purchase of property (Sec 194-IA) or high rent (Sec 194-IB) in ${prevMonthName}.`,
    active: true,
    deadline_key: 'TDS_RETURNS',
  });

  if (month === 6) {
    deadlines.push({
      title: 'Advance Income Tax - 1st Instalment (15%)',
      category: 'INCOME_TAX',
      due_date: `${year}-${monthStr}-15`,
      description: `Payment of 1st instalment of advance tax for FY ${year}-${(year + 1).toString().slice(2)}.`,
      active: true,
      deadline_key: 'ADVANCE_TAX',
    });
  } else if (month === 9) {
    deadlines.push({
      title: 'Advance Income Tax - 2nd Instalment (45%)',
      category: 'INCOME_TAX',
      due_date: `${year}-${monthStr}-15`,
      description: `Payment of 2nd instalment of advance tax (cumulative 45%) for FY ${year}-${(year + 1).toString().slice(2)}.`,
      active: true,
      deadline_key: 'ADVANCE_TAX',
    });
  } else if (month === 12) {
    deadlines.push({
      title: 'Advance Income Tax - 3rd Instalment (75%)',
      category: 'INCOME_TAX',
      due_date: `${year}-${monthStr}-15`,
      description: `Payment of 3rd instalment of advance corporate and non-corporate tax (cumulative 75%).`,
      active: true,
      deadline_key: 'ADVANCE_TAX',
    });
    deadlines.push({
      title: 'GSTR-9 & GSTR-9C (Annual Return & Reconciliation)',
      category: 'ANNUAL',
      due_date: `${year}-${monthStr}-31`,
      description: `Annual Return (GSTR-9) and Reconciliation Statement (GSTR-9C) for regular taxpayers.`,
      active: true,
      deadline_key: 'ANNUAL_RETURNS',
    });
  } else if (month === 3) {
    deadlines.push({
      title: 'Advance Income Tax - 4th Instalment (100%)',
      category: 'INCOME_TAX',
      due_date: `${year}-${monthStr}-15`,
      description: `Final 100% instalment of advance income tax for financial year ${year - 1}-${year.toString().slice(2)}.`,
      active: true,
      deadline_key: 'ADVANCE_TAX',
    });
  }

  return deadlines;
}

export const STATUTORY_REQUIREMENT_PRESETS = [
  { key: 'GSTR-1', label: 'GSTR-1 (Monthly / Quarterly Outward Supplies)', defaultEnabled: true },
  { key: 'GSTR-3B', label: 'GSTR-3B (Monthly Summary & Tax Payment)', defaultEnabled: true },
  { key: 'TDS_DEPOSIT', label: 'TDS / TCS Monthly Deposit (Challan 281)', defaultEnabled: true },
  { key: 'TDS_RETURNS', label: 'TDS / TCS Quarterly Statements (24Q / 26Q / 27EQ)', defaultEnabled: false },
  { key: 'GST_TDS_TCS', label: 'GST TDS & TCS (GSTR-7 & GSTR-8)', defaultEnabled: false },
  { key: 'QRMP_SCHEME', label: 'QRMP Scheme Filings (IFF & PMT-06)', defaultEnabled: false },
  { key: 'COMPOSITION', label: 'Composition Scheme Statement (CMP-08)', defaultEnabled: false },
  { key: 'ADVANCE_TAX', label: 'Advance Income Tax Instalments', defaultEnabled: false },
  { key: 'ANNUAL_RETURNS', label: 'Annual Returns & Reconciliation (GSTR-9 / 9C)', defaultEnabled: true },
];

export function isDeadlineApplicableToRequirements(
  deadline: { title: string; category: string; deadline_key?: string },
  applicableKeys: string[]
): boolean {
  if (!applicableKeys || applicableKeys.length === 0) return true;
  const titleUpper = deadline.title.toUpperCase();
  const catUpper = deadline.category.toUpperCase();
  const key = deadline.deadline_key || '';

  return applicableKeys.some((req) => {
    if (key === req) return true;
    switch (req) {
      case 'GSTR-1':
        return titleUpper.includes('GSTR-1') || catUpper.includes('GSTR-1');
      case 'GSTR-3B':
        return titleUpper.includes('GSTR-3B') || catUpper.includes('GSTR-3B') || titleUpper.includes('GSTR-2B');
      case 'TDS_DEPOSIT':
        return titleUpper.includes('CHALLAN ITNS 281') || titleUpper.includes('TDS / TCS MONTHLY DEPOSIT') || key === 'TDS_DEPOSIT';
      case 'TDS_RETURNS':
        return titleUpper.includes('24Q') || titleUpper.includes('26Q') || titleUpper.includes('27EQ') || titleUpper.includes('PROPERTY / RENT');
      case 'GST_TDS_TCS':
        return titleUpper.includes('GSTR-7') || titleUpper.includes('GSTR-8') || catUpper.includes('GST TDS') || catUpper.includes('GST TCS');
      case 'QRMP_SCHEME':
        return titleUpper.includes('IFF') || titleUpper.includes('PMT-06') || titleUpper.includes('QRMP');
      case 'COMPOSITION':
        return titleUpper.includes('CMP-08') || titleUpper.includes('COMPOSITION');
      case 'ADVANCE_TAX':
        return titleUpper.includes('ADVANCE') || catUpper === 'INCOME_TAX';
      case 'ANNUAL_RETURNS':
        return titleUpper.includes('GSTR-9') || catUpper === 'ANNUAL';
      default:
        return titleUpper.includes(req.toUpperCase()) || catUpper.includes(req.toUpperCase());
    }
  });
}

// Generate rolling 2-month official baseline
const _now = new Date();
const _curYr = _now.getFullYear();
const _curMo = _now.getMonth() + 1;
const _nextMoDate = new Date(_curYr, _curMo, 1);
export const OFFICIAL_STATUTORY_DUE_DATES = [
  ...generateStatutoryDeadlinesForMonth(_curYr, _curMo),
  ...generateStatutoryDeadlinesForMonth(_nextMoDate.getFullYear(), _nextMoDate.getMonth() + 1),
].map((item, idx) => ({
  id: `11111111-1111-4111-8111-${String(idx + 1).padStart(12, '0')}`,
  ...item,
}));

export async function ensureMonthlyDeadlinesExist(): Promise<StatutoryDeadlineTemplate[]> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const nextMonthDate = new Date(currentYear, currentMonth, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;

  const generated = [
    ...generateStatutoryDeadlinesForMonth(currentYear, currentMonth),
    ...generateStatutoryDeadlinesForMonth(nextYear, nextMonth),
  ];

  try {
    const { data: existingRows } = await supabase
      .from('due_dates')
      .select('*')
      .eq('active', true)
      .order('due_date', { ascending: true });

    const existingKeySet = new Set((existingRows || []).map((r) => `${r.title}|${r.due_date}`));
    const missing = generated.filter((g) => !existingKeySet.has(`${g.title}|${g.due_date}`));

    if (missing.length > 0) {
      try {
        const toInsert = missing.map(({ deadline_key: _k, id: _id, ...rest }) => rest);
        const { data: inserted } = await supabase
          .from('due_dates')
          .insert(toInsert)
          .select('*');

        if (inserted && inserted.length > 0) {
          const combined = [...(existingRows || []), ...inserted];
          return combined.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        }
      } catch (err: any) {
        console.warn('Could not auto-insert monthly deadlines into due_dates:', err?.message);
      }
    }

    if (existingRows && existingRows.length > 0) {
      return existingRows;
    }
  } catch (err: any) {
    console.warn('due_dates query error:', err?.message);
  }

  return OFFICIAL_STATUTORY_DUE_DATES;
}

export function isDeadlineCompletedForClient(
  deadline: { id?: string; title: string; category: string; due_date: string; deadline_key?: string },
  completedByPeriod: Record<string, string[]>,
  clientGstRows: Array<{ period: string; gstr1?: unknown; gstr3b?: unknown }>
): boolean {
  const dueDateStr = deadline.due_date || '';
  const dueYear = parseInt(dueDateStr.slice(0, 4), 10);
  const dueMonth = parseInt(dueDateStr.slice(5, 7), 10);
  if (!dueYear || !dueMonth) return false;

  const prevMonthDate = new Date(dueYear, dueMonth - 2, 1);
  const prevPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentPeriod = `${dueYear}-${String(dueMonth).padStart(2, '0')}`;

  const periodsToCheck = [prevPeriod, currentPeriod];

  for (const period of periodsToCheck) {
    const completedList = completedByPeriod[period] || [];
    const titleUpper = deadline.title.toUpperCase();
    const key = (deadline.deadline_key || '').toUpperCase();

    const marked = completedList.some((item) => {
      const itemUpper = item.toUpperCase();
      if (item === deadline.id) return true;
      if (key && itemUpper === key) return true;
      if (itemUpper === 'GSTR-1' && (titleUpper.includes('GSTR-1') || key.includes('GSTR-1'))) return true;
      if (itemUpper === 'GSTR-3B' && (titleUpper.includes('GSTR-3B') || key.includes('GSTR-3B'))) return true;
      if (itemUpper === 'TDS_DEPOSIT' && (titleUpper.includes('CHALLAN ITNS 281') || titleUpper.includes('TDS / TCS MONTHLY DEPOSIT'))) return true;
      return titleUpper.includes(itemUpper) || (deadline.category && deadline.category.toUpperCase().includes(itemUpper));
    });

    if (marked) return true;

    // Auto-detect ARN in filed returns for this period
    const gstRow = clientGstRows.find((r) => r.period === period);
    if (gstRow) {
      const g1 = (gstRow.gstr1 || {}) as Record<string, unknown>;
      const g3b = (gstRow.gstr3b || {}) as Record<string, unknown>;
      if ((titleUpper.includes('GSTR-1') || key.includes('GSTR-1')) && (g1.arn || g1.arnDate)) {
        return true;
      }
      if ((titleUpper.includes('GSTR-3B') || key.includes('GSTR-3B')) && (g3b.arn || g3b.arnDate)) {
        return true;
      }
    }
  }

  return false;
}

export async function workflowRoutes(app: FastifyInstance) {
  app.get('/api/client/fees', { preHandler: [authenticate, requireRole('CLIENT')] }, async (request) => {
    const { data } = await supabase.from('fee_invoices').select('*, fee_payments(*)').eq('client_user_id', request.user.id).order('due_date', { ascending: false });
    return { invoices: data ?? [] };
  });

  app.post('/api/admin/fees', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    const body = z
      .object({
        clientUserId: uuidParamSchema,
        invoiceNumber: z.string().trim().min(1, 'Invoice number is required').max(50, 'Invoice number exceeds 50 characters'),
        description: z.string().trim().min(1, 'Description is required').max(500, 'Description exceeds 500 characters'),
        amount: z.number().nonnegative('Amount cannot be negative').max(100_000_000, 'Amount exceeds maximum limit'),
        gstAmount: z.number().nonnegative('GST amount cannot be negative').max(100_000_000).default(0),
        dueDate: dateParamSchema,
        invoiceUrl: z.string().trim().url('Invalid invoice URL').max(1000).optional(),
      })
      .strict()
      .parse(request.body);

    const safeDescription = sanitizeText(body.description, 500);

    const { data, error } = await supabase.from('fee_invoices').insert({
      client_user_id: body.clientUserId,
      invoice_number: body.invoiceNumber,
      description: safeDescription,
      amount: body.amount,
      gst_amount: body.gstAmount,
      due_date: body.dueDate,
      invoice_url: body.invoiceUrl,
      created_by: request.user.id,
    }).select().single();

    if (error) return reply.status(500).send({ error: 'Failed to create fee invoice' });
    return { invoice: data };
  });

  app.post('/api/admin/fees/:id/payments', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    const body = z
      .object({
        amount: z.number().positive('Payment amount must be positive').max(100_000_000),
        paidAt: z.string().trim().max(50).optional(),
        receiptUrl: z.string().trim().url('Invalid receipt URL').max(1000).optional(),
      })
      .strict()
      .parse(request.body);

    const { data: invoice } = await supabase.from('fee_invoices').select('id, amount').eq('id', id).single();
    if (!invoice) return reply.status(404).send({ error: 'Invoice not found' });
    const { data: payments } = await supabase.from('fee_payments').select('amount').eq('invoice_id', id);
    const paid = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0) + body.amount;
    if (paid > Number(invoice.amount)) return reply.status(400).send({ error: 'Payment exceeds outstanding balance' });
    const { error } = await supabase.from('fee_payments').insert({ invoice_id: id, amount: body.amount, paid_at: body.paidAt, receipt_url: body.receiptUrl, recorded_by: request.user.id });
    if (error) return reply.status(500).send({ error: 'Failed to record payment' });
    await supabase.from('fee_invoices').update({ status: paid >= Number(invoice.amount) ? 'PAID' : 'PARTIALLY_PAID' }).eq('id', id);
    return { success: true };
  });

  // Helper to enrich messages with sender role and display name
  async function enrichMessagesWithSender(messages: any[]) {
    if (!messages || !messages.length) return [];
    const senderIds = Array.from(new Set(messages.map((m) => m.sender_user_id).filter(Boolean)));
    if (!senderIds.length) return messages;

    const { data: users } = await supabase
      .from('users')
      .select('id, name, role, email')
      .in('id', senderIds);

    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    return messages.map((m) => {
      const sender = userMap.get(m.sender_user_id);
      const senderRole = sender?.role || (m.sender_user_id === m.client_user_id ? 'CLIENT' : 'TEAM');
      const defaultName = senderRole === 'ADMIN' ? 'GSTBro Admin' : senderRole === 'TEAM' ? (sender?.name || 'GSTBro Team') : (sender?.name || 'Client');
      return {
        ...m,
        sender_name: sender?.name || defaultName,
        sender_role: senderRole,
        sender_email: sender?.email || '',
      };
    });
  }

  // Client Messages — permanently preserved compliance audit thread
  app.get('/api/client/messages', { preHandler: [authenticate, requireRole('CLIENT')] }, async (request) => {
    const { data } = await supabase
      .from('client_messages')
      .select('id, message, sender_user_id, created_at, read_at')
      .eq('client_user_id', request.user.id)
      .order('created_at', { ascending: true });

    const enriched = await enrichMessagesWithSender(data ?? []);
    return { messages: enriched };
  });

  app.post('/api/client/messages', { preHandler: [authenticate, requireRole('CLIENT')] }, async (request, reply) => {
    const body = z
      .object({
        message: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
      })
      .strict()
      .parse(request.body);

    const safeMessage = sanitizeText(body.message, 4000, true);

    const { data: assignment } = await supabase
      .from('team_assignments')
      .select('team_user_id')
      .eq('client_user_id', request.user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    const recipient = assignment?.team_user_id;
    if (!recipient) return reply.status(400).send({ error: 'No team member is assigned to this client yet.' });

    const { data, error } = await supabase
      .from('client_messages')
      .insert({ client_user_id: request.user.id, sender_user_id: request.user.id, message: safeMessage })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to send message' });

    await logActivity(request, {
      actionType: 'MESSAGE',
      actionCategory: 'COMMUNICATION',
      resourceType: 'MESSAGE',
      resourceId: data.id,
      clientUserId: request.user.id,
      clientName: (request.user as any).name || request.user.email,
      description: `Client ${(request.user as any).name || request.user.email} sent a support message`,
    });

    const enriched = (await enrichMessagesWithSender([data]))[0];
    return { message: enriched };
  });

  // Team Member Messages — view and reply to assigned client (team cannot delete messages)
  app.get('/api/team/clients/:id/messages', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const { data } = await supabase
      .from('client_messages')
      .select('id, message, sender_user_id, created_at, read_at')
      .eq('client_user_id', id)
      .order('created_at', { ascending: true });

    const enriched = await enrichMessagesWithSender(data ?? []);
    return { messages: enriched };
  });

  app.post('/api/team/clients/:id/messages', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const body = z
      .object({
        message: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
      })
      .strict()
      .parse(request.body);

    const safeMessage = sanitizeText(body.message, 4000, true);

    const { data, error } = await supabase
      .from('client_messages')
      .insert({
        client_user_id: id,
        sender_user_id: request.user.id,
        message: safeMessage,
      })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to send reply' });

    const { data: targetClient } = await supabase.from('users').select('name, business_name').eq('id', id).maybeSingle();
    const clientName = targetClient?.business_name || targetClient?.name || 'Client';

    await logActivity(request, {
      actionType: 'MESSAGE',
      actionCategory: 'COMMUNICATION',
      resourceType: 'MESSAGE',
      resourceId: data.id,
      clientUserId: id,
      clientName,
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} sent message to ${clientName}`,
    });

    const enriched = (await enrichMessagesWithSender([data]))[0];
    return { message: enriched };
  });

  // Admin Conversation Oversight — view all client-team communications
  app.get('/api/admin/conversations', { preHandler: [authenticate, requireRole('ADMIN')] }, async () => {
    const { data: clients } = await supabase
      .from('users')
      .select('id, name, email, business_name, gstin, state')
      .eq('role', 'CLIENT')
      .order('name');

    const conversations = await Promise.all(
      (clients ?? []).map(async (client) => {
        const [
          { data: assignment },
          { data: latest },
          { count },
        ] = await Promise.all([
          supabase
            .from('team_assignments')
            .select('team_user:users!team_assignments_team_user_id_fkey(id, name, email)')
            .eq('client_user_id', client.id)
            .eq('active', true)
            .maybeSingle(),
          supabase
            .from('client_messages')
            .select('id, message, sender_user_id, created_at')
            .eq('client_user_id', client.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('client_messages')
            .select('id', { count: 'exact', head: true })
            .eq('client_user_id', client.id),
        ]);

        return {
          clientId: client.id,
          clientName: client.business_name || client.name,
          clientEmail: client.email,
          clientGstin: client.gstin,
          assignedTeam: assignment?.team_user ?? null,
          totalMessages: count || 0,
          latestMessage: latest ?? null,
        };
      })
    );

    return { conversations };
  });

  app.get('/api/admin/conversations/:clientId', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    const { clientId } = z.object({ clientId: uuidParamSchema }).parse(request.params);
    const [{ data: client }, { data: messages }, { data: assignment }] = await Promise.all([
      supabase.from('users').select('id, name, email, business_name, gstin, phone, state').eq('id', clientId).single(),
      supabase.from('client_messages').select('id, message, sender_user_id, created_at, read_at').eq('client_user_id', clientId).order('created_at', { ascending: true }),
      supabase.from('team_assignments').select('team_user:users!team_assignments_team_user_id_fkey(id, name, email)').eq('client_user_id', clientId).eq('active', true).maybeSingle(),
    ]);

    if (!client) return reply.status(404).send({ error: 'Client not found' });

    await logActivity(request, {
      actionType: 'VIEW',
      actionCategory: 'LOOKED',
      resourceType: 'MESSAGE_THREAD',
      resourceId: clientId,
      clientUserId: clientId,
      clientName: client.business_name || client.name,
      description: `Admin inspected message thread for ${client.business_name || client.name}`,
    });

    const enriched = await enrichMessagesWithSender(messages ?? []);

    return {
      client,
      assignedTeam: assignment?.team_user ?? null,
      messages: enriched,
    };
  });

  // Admin Direct Message Route — send messages to clients directly as Admin
  app.post('/api/admin/conversations/:clientId/messages', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    const { clientId } = z.object({ clientId: uuidParamSchema }).parse(request.params);
    const body = z
      .object({
        message: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
      })
      .strict()
      .parse(request.body);

    const safeMessage = sanitizeText(body.message, 4000, true);

    const { data, error } = await supabase
      .from('client_messages')
      .insert({
        client_user_id: clientId,
        sender_user_id: request.user.id,
        message: safeMessage,
      })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to dispatch message as Admin' });

    const { data: targetClient } = await supabase.from('users').select('name, business_name').eq('id', clientId).maybeSingle();
    const clientName = targetClient?.business_name || targetClient?.name || 'Client';

    await logActivity(request, {
      actionType: 'MESSAGE',
      actionCategory: 'COMMUNICATION',
      resourceType: 'MESSAGE',
      resourceId: data.id,
      clientUserId: clientId,
      clientName,
      description: `Admin sent official management message to ${clientName}`,
    });

    const enriched = (await enrichMessagesWithSender([data]))[0];
    return { message: enriched };
  });

  // Admin Delete Message (Admin-only capability)
  app.delete('/api/admin/messages/:id', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);

    const { data: existingMsg } = await supabase.from('client_messages').select('*').eq('id', id).maybeSingle();
    const { error } = await supabase.from('client_messages').delete().eq('id', id);
    if (error) return reply.status(500).send({ error: 'Failed to delete message' });

    await logActivity(request, {
      actionType: 'DELETE',
      actionCategory: 'CHANGED',
      resourceType: 'MESSAGE',
      resourceId: id,
      clientUserId: existingMsg?.client_user_id,
      description: `Admin permanently purged message ID ${id}`,
    });

    return { success: true };
  });

  // Activity Logs Retrieval — Admin Only & Strictly Read-Only (Immutable Audit Trail)
  app.get('/api/admin/activity-logs', { preHandler: [authenticate, requireRole('ADMIN')] }, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(30),
        role: z.string().trim().max(20).default('ALL'),
        actionCategory: z.string().trim().max(20).default('ALL'),
        actionType: z.string().trim().max(50).default('ALL'),
        clientUserId: z.string().trim().uuid().optional(),
        search: z.string().trim().max(100).optional(),
      })
      .parse(request.query);

    return getActivityLogs(query);
  });

  app.get('/api/client/dashboard', { preHandler: [authenticate, requireRole('CLIENT')] }, async (request, reply) => {
    const [
      { data: gstData },
      { data: documents },
      { data: client },
      { data: fees },
      { data: folder },
      { data: assignment },
    ] = await Promise.all([
      supabase.from('client_gst_data').select('*').eq('client_user_id', request.user.id).order('period', { ascending: false }),
      supabase.from('client_documents').select('*').eq('client_user_id', request.user.id).order('uploaded_at', { ascending: false }),
      supabase.from('users').select('id, name, business_name, email, phone, gstin, state, address').eq('id', request.user.id).single(),
      supabase.from('fee_invoices').select('*, fee_payments(*)').eq('client_user_id', request.user.id).order('due_date', { ascending: false }),
      supabase.from('drive_folders').select('drive_folder_url').eq('owner_type', 'CLIENT').eq('owner_id', request.user.id).eq('is_shortcut', false).maybeSingle(),
      supabase.from('team_assignments').select('team_user:users!team_assignments_team_user_id_fkey(name, email, phone)').eq('client_user_id', request.user.id).eq('active', true).maybeSingle(),
    ]);
    if (!client) return reply.status(404).send({ error: 'Client not found' });

    const rawDueDates = await ensureMonthlyDeadlinesExist();

    let assignedMisReportType: 'INDIVIDUAL' | 'CORPORATE' | null = null;
    let assignedDashboardMode: 'STANDARD' | 'SIMPLE' = 'STANDARD';
    let applicableRequirements: string[] = ['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS'];
    const completedByPeriod: Record<string, string[]> = {};

    for (const r of gstData ?? []) {
      const salesObj = (r.sales || {}) as Record<string, unknown>;
      if (salesObj.dashboardMode === 'STANDARD' || salesObj.dashboardMode === 'SIMPLE') {
        assignedDashboardMode = salesObj.dashboardMode;
      }
      if (!assignedMisReportType) {
        if (salesObj.misReportType === 'INDIVIDUAL' || salesObj.misReportType === 'CORPORATE') {
          assignedMisReportType = salesObj.misReportType;
        } else {
          const finRep = salesObj.financialReport as Record<string, unknown> | undefined;
          if (finRep?.reportType === 'INDIVIDUAL' || finRep?.reportType === 'CORPORATE') {
            assignedMisReportType = finRep.reportType as 'INDIVIDUAL' | 'CORPORATE';
          }
        }
      }
      if (Array.isArray(salesObj.applicableRequirements) && salesObj.applicableRequirements.length > 0) {
        applicableRequirements = salesObj.applicableRequirements as string[];
      }
      if (Array.isArray(salesObj.completedDeadlines)) {
        completedByPeriod[r.period] = salesObj.completedDeadlines as string[];
      }
    }

    const clientDueDates = rawDueDates.filter((item) => {
      if (!isDeadlineApplicableToRequirements(item, applicableRequirements)) {
        return false;
      }
      const isCompleted = isDeadlineCompletedForClient(item, completedByPeriod, (gstData ?? []) as any[]);
      return !isCompleted;
    });

    return {
      client: {
        ...client,
        display_name: client.business_name ?? client.name,
        assignedMisReportType,
        assignedDashboardMode,
        applicableRequirements,
      },
      gstData: gstData ?? [],
      documents: documents ?? [],
      dueDates: clientDueDates,
      completedByPeriod,
      fees: fees ?? [],
      driveFolderUrl: folder?.drive_folder_url ?? null,
      assignedTeam: assignment?.team_user ?? null,
    };
  });

  app.get('/api/due-dates', { preHandler: authenticate }, async () => {
    const dueDates = await ensureMonthlyDeadlinesExist();
    return { dueDates };
  });

  app.post('/api/admin/due-dates/reset-defaults', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request) => {
    try {
      await supabase.from('due_dates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {}

    try {
      const toInsert = OFFICIAL_STATUTORY_DUE_DATES.map(({ id: _id, ...item }) => ({
        ...item,
        created_by: request.user.id,
      }));
      const { data: inserted } = await supabase
        .from('due_dates')
        .insert(toInsert)
        .select('*')
        .order('due_date', { ascending: true });

      if (inserted && inserted.length > 0) {
        return { dueDates: inserted };
      }
    } catch {}

    return { dueDates: OFFICIAL_STATUTORY_DUE_DATES };
  });

  // Automatic Statutory Deadline Generator for any month & year
  app.post('/api/admin/due-dates/generate-month', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const body = z
      .object({
        year: z.number().int().min(2020).max(2035),
        month: z.number().int().min(1).max(12),
        overwrite: z.boolean().optional(),
      })
      .strict()
      .parse(request.body);

    const generated = generateStatutoryDeadlinesForMonth(body.year, body.month);
    const toInsert = generated.map(({ deadline_key: _k, id: _id, ...rest }) => ({
      ...rest,
      created_by: request.user.id,
    }));

    const monthStr = String(body.month).padStart(2, '0');
    const startPrefix = `${body.year}-${monthStr}`;

    const { data: existingRows } = await supabase
      .from('due_dates')
      .select('*')
      .like('due_date', `${startPrefix}%`);

    let insertedCount = 0;

    if (body.overwrite && existingRows && existingRows.length > 0) {
      const existingIds = existingRows.map((r) => r.id);
      await supabase.from('due_dates').delete().in('id', existingIds);
      const { data: inserted } = await supabase.from('due_dates').insert(toInsert).select('*');
      insertedCount = inserted?.length || 0;
    } else {
      const existingTitles = new Set((existingRows || []).map((r) => `${r.title}|${r.due_date}`));
      const toAdd = toInsert.filter((item) => !existingTitles.has(`${item.title}|${item.due_date}`));

      if (toAdd.length > 0) {
        const { data: inserted } = await supabase.from('due_dates').insert(toAdd).select('*');
        insertedCount = inserted?.length || 0;
      }
    }

    const { data: allDeadlines } = await supabase
      .from('due_dates')
      .select('*')
      .eq('active', true)
      .order('due_date', { ascending: true });

    await logActivity(request, {
      actionType: 'COMPLIANCE',
      actionCategory: 'CHANGED',
      resourceType: 'STATUTORY_DEADLINE',
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} automatically generated statutory compliance deadlines for ${body.year}-${monthStr}`,
    });

    return {
      success: true,
      generatedCount: generated.length,
      insertedCount,
      period: `${body.year}-${monthStr}`,
      dueDates: allDeadlines || generated,
    };
  });

  app.post('/api/admin/due-dates', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const body = z
      .object({
        title: z.string().trim().min(2, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
        description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
        dueDate: dateParamSchema,
        category: z.string().trim().min(2).max(50).default('GST'),
      })
      .strict()
      .parse(request.body);

    const safeTitle = sanitizeText(body.title, 200);
    const safeDesc = body.description ? sanitizeText(body.description, 2000) : null;

    const { data, error } = await supabase
      .from('due_dates')
      .insert({
        title: safeTitle,
        description: safeDesc,
        due_date: body.dueDate,
        category: body.category,
        created_by: request.user.id,
      })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to create due date' });
    return { dueDate: data };
  });

  app.patch('/api/admin/due-dates/:id', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    const body = z
      .object({
        title: z.string().trim().min(2).max(200).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        dueDate: dateParamSchema.optional(),
        category: z.string().trim().min(2).max(50).optional(),
        active: z.boolean().optional(),
      })
      .strict()
      .parse(request.body);

    const updates: Record<string, unknown> = { ...body };
    if (body.dueDate) {
      updates.due_date = body.dueDate;
      delete updates.dueDate;
    }
    if (body.title) updates.title = sanitizeText(body.title, 200);
    if (body.description) updates.description = sanitizeText(body.description, 2000);

    const { data, error } = await supabase.from('due_dates').update(updates).eq('id', id).select().single();
    if (error) {
      return reply.status(500).send({ error: 'Failed to update due date' });
    }
    return { dueDate: data };
  });

  app.delete('/api/admin/due-dates/:id', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    try {
      await supabase.from('due_dates').delete().eq('id', id);
    } catch {
      await supabase.from('due_dates').update({ active: false }).eq('id', id);
    }
    return { success: true };
  });

  app.get('/api/team/dashboard', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request) => {
    const teamId = request.user.role === 'ADMIN' ? undefined : request.user.id;
    let assignmentQuery = supabase
      .from('team_assignments')
      .select('*, client:users!team_assignments_client_user_id_fkey(id, name, email, business_name, gstin, state)')
      .eq('active', true);

    if (teamId) assignmentQuery = assignmentQuery.eq('team_user_id', teamId);

    const { data: assignments } = await assignmentQuery;
    const clients = await Promise.all(
      (assignments ?? []).map(async (assignment) => {
        const { data: folder } = await supabase
          .from('drive_folders')
          .select('drive_folder_url')
          .eq('owner_type', 'CLIENT')
          .eq('owner_id', assignment.client_user_id)
          .eq('is_shortcut', false)
          .single();

        const { data: gstData } = await supabase
          .from('client_gst_data')
          .select('*')
          .eq('client_user_id', assignment.client_user_id)
          .order('period', { ascending: false })
          .limit(1)
          .single();

        return { ...assignment.client, driveFolderUrl: folder?.drive_folder_url, latestGstData: gstData };
      })
    );

    const dueDates = await ensureMonthlyDeadlinesExist();

    return { clients, dueDates };
  });

  app.get('/api/clients/:id/workspace', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const { data: client } = await supabase
      .from('users')
      .select('id, name, email, phone, business_name, gstin, state, address')
      .eq('id', id)
      .single();

    if (!client) return reply.status(404).send({ error: 'Client not found' });

    const [{ data: gstData }, { data: documents }, { data: folder }] = await Promise.all([
      supabase.from('client_gst_data').select('*').eq('client_user_id', id).order('period', { ascending: false }),
      supabase.from('client_documents').select('*').eq('client_user_id', id).order('uploaded_at', { ascending: false }),
      supabase
        .from('drive_folders')
        .select('drive_folder_url')
        .eq('owner_type', 'CLIENT')
        .eq('owner_id', id)
        .eq('is_shortcut', false)
        .single(),
    ]);

    let assignedMisReportType: 'INDIVIDUAL' | 'CORPORATE' | null = null;
    let assignedDashboardMode: 'STANDARD' | 'SIMPLE' = 'STANDARD';
    let applicableRequirements: string[] = ['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS'];
    const completedByPeriod: Record<string, string[]> = {};

    for (const r of gstData ?? []) {
      const salesObj = (r.sales || {}) as Record<string, unknown>;
      if (salesObj.dashboardMode === 'STANDARD' || salesObj.dashboardMode === 'SIMPLE') {
        assignedDashboardMode = salesObj.dashboardMode;
      }
      if (!assignedMisReportType) {
        if (salesObj.misReportType === 'INDIVIDUAL' || salesObj.misReportType === 'CORPORATE') {
          assignedMisReportType = salesObj.misReportType;
        } else {
          const finRep = salesObj.financialReport as Record<string, unknown> | undefined;
          if (finRep?.reportType === 'INDIVIDUAL' || finRep?.reportType === 'CORPORATE') {
            assignedMisReportType = finRep.reportType as 'INDIVIDUAL' | 'CORPORATE';
          }
        }
      }
      if (Array.isArray(salesObj.applicableRequirements) && salesObj.applicableRequirements.length > 0) {
        applicableRequirements = salesObj.applicableRequirements as string[];
      }
      if (Array.isArray(salesObj.completedDeadlines)) {
        completedByPeriod[r.period] = salesObj.completedDeadlines as string[];
      }
    }

    const allDeadlines = await ensureMonthlyDeadlinesExist();

    await logActivity(request, {
      actionType: 'VIEW',
      actionCategory: 'LOOKED',
      resourceType: 'CLIENT_WORKSPACE',
      resourceId: id,
      clientUserId: id,
      clientName: client.business_name || client.name,
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} viewed Client Workspace for ${client.business_name || client.name}`,
    });

    return {
      client: {
        ...client,
        assignedMisReportType,
        assignedDashboardMode,
        applicableRequirements,
      },
      gstData: gstData ?? [],
      documents: documents ?? [],
      driveFolderUrl: folder?.drive_folder_url,
      completedByPeriod,
      availableRequirements: STATUTORY_REQUIREMENT_PRESETS,
      dueDates: allDeadlines,
    };
  });

  app.put(
    '/api/clients/:id/gst-data/:period',
    { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')], config: { rateLimit: HEAVY_DATA_RATE_LIMIT } },
    async (request, reply) => {
    const { id, period } = z
      .object({ id: uuidParamSchema, period: periodParamSchema })
      .parse(request.params);

    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const body = z
      .object({
        itc: jsonRecord.optional(),
        sales: jsonRecord.optional(),
        purchases: jsonRecord.optional(),
        gstr1: jsonRecord.optional(),
        gstr3b: jsonRecord.optional(),
      })
      .strict()
      .parse(request.body);

    const { data: existing } = await supabase
      .from('client_gst_data')
      .select('*')
      .eq('client_user_id', id)
      .eq('period', period)
      .maybeSingle();

    const existingGstr1 = (existing?.gstr1 || {}) as Record<string, unknown>;
    const existingGstr3b = (existing?.gstr3b || {}) as Record<string, unknown>;
    const existingSales = (existing?.sales || {}) as Record<string, unknown>;
    const existingPurchases = (existing?.purchases || {}) as Record<string, unknown>;
    const existingItc = (existing?.itc || {}) as Record<string, unknown>;

    const incomingGstr1 = (body.gstr1 || {}) as Record<string, unknown>;
    const hasGstr1 = body.gstr1 !== undefined && Object.keys(incomingGstr1).length > 0;

    const incomingGstr3b = (body.gstr3b || {}) as Record<string, unknown>;
    const hasGstr3b = body.gstr3b !== undefined && Object.keys(incomingGstr3b).length > 0;

    const mergedGstr1 = hasGstr1 ? { ...existingGstr1, ...incomingGstr1 } : existingGstr1;
    const mergedGstr3b = hasGstr3b ? { ...existingGstr3b, ...incomingGstr3b } : existingGstr3b;

    const mergedSales = {
      ...existingSales,
      ...body.sales,
      taxableSales: body.sales?.taxableSales ?? existingSales.taxableSales ?? mergedGstr1.taxableSales ?? (mergedGstr3b.outwardTaxable as number) ?? 0,
      outputTax: body.sales?.outputTax ?? existingSales.outputTax ?? mergedGstr1.totalTax ?? (mergedGstr3b.outwardTotalTax as number) ?? 0,
      cashTaxPaid: body.sales?.cashTaxPaid ?? existingSales.cashTaxPaid ?? (mergedGstr3b.cashPaid as number) ?? 0,
    };

    const mergedItc = {
      ...existingItc,
      ...body.itc,
      totalItc: body.itc?.totalItc ?? existingItc.totalItc ?? (mergedGstr3b.itcNet as Record<string, unknown>)?.total ?? (mergedGstr3b.itcAvailable as number) ?? 0,
    };

    const mergedPurchases = {
      ...existingPurchases,
      ...body.purchases,
    };

    const { data, error } = await supabase
      .from('client_gst_data')
      .upsert(
        {
          client_user_id: id,
          period,
          itc: mergedItc,
          sales: mergedSales,
          purchases: mergedPurchases,
          gstr1: mergedGstr1,
          gstr3b: mergedGstr3b,
          entered_by: request.user.id,
        },
        { onConflict: 'client_user_id,period' }
      )
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to save GST data' });

    const { data: targetClient } = await supabase.from('users').select('name, business_name').eq('id', id).maybeSingle();
    const clientName = targetClient?.business_name || targetClient?.name || 'Client';

    await logActivity(request, {
      actionType: 'UPDATE',
      actionCategory: 'CHANGED',
      resourceType: 'GST_DATA',
      resourceId: id,
      clientUserId: id,
      clientName,
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} updated GST Return data for ${clientName} (${period})`,
      details: { period },
    });

    return { gstData: data };
  });

  app.put('/api/client/gst-data/:period', { preHandler: [authenticate, requireRole('CLIENT')] }, async (request, reply) => {
    const { period } = z.object({ period: periodParamSchema }).parse(request.params);
    const body = z
      .object({
        itc: jsonRecord.optional(),
        sales: jsonRecord.optional(),
        purchases: jsonRecord.optional(),
        gstr1: jsonRecord.optional(),
        gstr3b: jsonRecord.optional(),
      })
      .strict()
      .parse(request.body);

    const { data: existing } = await supabase
      .from('client_gst_data')
      .select('*')
      .eq('client_user_id', request.user.id)
      .eq('period', period)
      .maybeSingle();

    const existingGstr1 = (existing?.gstr1 || {}) as Record<string, unknown>;
    const existingGstr3b = (existing?.gstr3b || {}) as Record<string, unknown>;
    const existingSales = (existing?.sales || {}) as Record<string, unknown>;
    const existingPurchases = (existing?.purchases || {}) as Record<string, unknown>;
    const existingItc = (existing?.itc || {}) as Record<string, unknown>;

    const incomingGstr1 = (body.gstr1 || {}) as Record<string, unknown>;
    const hasGstr1 = body.gstr1 !== undefined && Object.keys(incomingGstr1).length > 0;

    const incomingGstr3b = (body.gstr3b || {}) as Record<string, unknown>;
    const hasGstr3b = body.gstr3b !== undefined && Object.keys(incomingGstr3b).length > 0;

    const mergedGstr1 = hasGstr1 ? { ...existingGstr1, ...incomingGstr1 } : existingGstr1;
    const mergedGstr3b = hasGstr3b ? { ...existingGstr3b, ...incomingGstr3b } : existingGstr3b;

    const mergedSales = {
      ...existingSales,
      ...body.sales,
      taxableSales: body.sales?.taxableSales ?? existingSales.taxableSales ?? mergedGstr1.taxableSales ?? (mergedGstr3b.outwardTaxable as number) ?? 0,
      outputTax: body.sales?.outputTax ?? existingSales.outputTax ?? mergedGstr1.totalTax ?? (mergedGstr3b.outwardTotalTax as number) ?? 0,
      cashTaxPaid: body.sales?.cashTaxPaid ?? existingSales.cashTaxPaid ?? (mergedGstr3b.cashPaid as number) ?? 0,
    };

    const mergedItc = {
      ...existingItc,
      ...body.itc,
      totalItc: body.itc?.totalItc ?? existingItc.totalItc ?? (mergedGstr3b.itcNet as Record<string, unknown>)?.total ?? (mergedGstr3b.itcAvailable as number) ?? 0,
    };

    const mergedPurchases = {
      ...existingPurchases,
      ...body.purchases,
    };

    const { data, error } = await supabase
      .from('client_gst_data')
      .upsert(
        {
          client_user_id: request.user.id,
          period,
          itc: mergedItc,
          sales: mergedSales,
          purchases: mergedPurchases,
          gstr1: mergedGstr1,
          gstr3b: mergedGstr3b,
          entered_by: request.user.id,
        },
        { onConflict: 'client_user_id,period' }
      )
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to save GST data' });
    return { gstData: data };
  });

  app.put('/api/clients/:id/mis-config', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const body = z
      .object({
        misReportType: z.enum(['INDIVIDUAL', 'CORPORATE']).optional(),
        dashboardMode: z.enum(['STANDARD', 'SIMPLE']).optional(),
      })
      .strict()
      .parse(request.body);

    const { data: rows } = await supabase
      .from('client_gst_data')
      .select('*')
      .eq('client_user_id', id)
      .order('period', { ascending: false });

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const targetPeriod = rows && rows.length > 0 ? rows[0].period : currentPeriod;
    const existingSales = ((rows && rows.length > 0 ? rows[0].sales : {}) || {}) as Record<string, unknown>;

    const existingReport = existingSales.financialReport as Record<string, unknown> | undefined;
    const updatedReport = (body.misReportType && existingReport) ? { ...existingReport, reportType: body.misReportType } : existingReport;

    const updatedSales = {
      ...existingSales,
      ...(body.misReportType ? { misReportType: body.misReportType } : {}),
      ...(body.dashboardMode ? { dashboardMode: body.dashboardMode } : {}),
      ...(updatedReport ? { financialReport: updatedReport } : {}),
    };

    const { data, error } = await supabase
      .from('client_gst_data')
      .upsert(
        {
          client_user_id: id,
          period: targetPeriod,
          itc: rows?.[0]?.itc || {},
          sales: updatedSales,
          purchases: rows?.[0]?.purchases || {},
          gstr1: rows?.[0]?.gstr1 || {},
          gstr3b: rows?.[0]?.gstr3b || {},
          entered_by: request.user.id,
        },
        { onConflict: 'client_user_id,period' }
      )
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to update configuration' });

    const { data: targetClient } = await supabase.from('users').select('name, business_name').eq('id', id).maybeSingle();
    const clientName = targetClient?.business_name || targetClient?.name || 'Client';

    await logActivity(request, {
      actionType: 'UPDATE',
      actionCategory: 'CHANGED',
      resourceType: 'MIS_CONFIG',
      resourceId: id,
      clientUserId: id,
      clientName,
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} updated MIS / Dashboard settings for ${clientName}`,
    });

    return { success: true, misReportType: body.misReportType, dashboardMode: body.dashboardMode, period: targetPeriod, gstData: data };
  });

  app.get('/api/clients/:id/compliance', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const { data: rows } = await supabase
      .from('client_gst_data')
      .select('*')
      .eq('client_user_id', id)
      .order('period', { ascending: false });

    let applicableRequirements: string[] = ['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS'];
    const completedByPeriod: Record<string, string[]> = {};

    for (const r of rows ?? []) {
      const s = (r.sales || {}) as Record<string, unknown>;
      if (Array.isArray(s.applicableRequirements) && s.applicableRequirements.length > 0) {
        applicableRequirements = s.applicableRequirements as string[];
      }
      if (Array.isArray(s.completedDeadlines)) {
        completedByPeriod[r.period] = s.completedDeadlines as string[];
      }
    }

    const allDeadlines = await ensureMonthlyDeadlinesExist();

    return {
      applicableRequirements,
      completedByPeriod,
      availableRequirements: STATUTORY_REQUIREMENT_PRESETS,
      dueDates: allDeadlines,
    };
  });

  app.post('/api/clients/:id/compliance', { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')] }, async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const body = z
      .object({
        applicableRequirements: z.array(z.string().trim().max(100)).max(50).optional(),
        period: periodParamSchema.optional(),
        deadlineKey: z.string().trim().min(1).max(200).optional(),
        completed: z.boolean().optional(),
      })
      .strict()
      .parse(request.body);

    const { data: rows } = await supabase
      .from('client_gst_data')
      .select('*')
      .eq('client_user_id', id)
      .order('period', { ascending: false });

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const targetPeriod = body.period || (rows && rows.length > 0 ? rows[0].period : currentPeriod);

    const existingRow = rows?.find((r) => r.period === targetPeriod) || rows?.[0];
    const existingSales = ((existingRow ? existingRow.sales : {}) || {}) as Record<string, unknown>;

    let updatedApplicable = body.applicableRequirements;
    if (!updatedApplicable) {
      for (const r of rows ?? []) {
        const s = (r.sales || {}) as Record<string, unknown>;
        if (Array.isArray(s.applicableRequirements) && s.applicableRequirements.length > 0) {
          updatedApplicable = s.applicableRequirements as string[];
          break;
        }
      }
    }
    if (!updatedApplicable) {
      updatedApplicable = ['GSTR-1', 'GSTR-3B', 'TDS_DEPOSIT', 'ANNUAL_RETURNS'];
    }

    let completedList: string[] = Array.isArray(existingSales.completedDeadlines)
      ? [...(existingSales.completedDeadlines as string[])]
      : [];

    if (body.deadlineKey !== undefined && body.completed !== undefined) {
      const key = body.deadlineKey;
      if (body.completed) {
        if (!completedList.includes(key)) completedList.push(key);
      } else {
        completedList = completedList.filter((k) => k !== key);
      }
    }

    const updatedSales = {
      ...existingSales,
      applicableRequirements: updatedApplicable,
      completedDeadlines: completedList,
    };

    const { data, error } = await supabase
      .from('client_gst_data')
      .upsert(
        {
          client_user_id: id,
          period: targetPeriod,
          itc: existingRow?.itc || {},
          sales: updatedSales,
          purchases: existingRow?.purchases || {},
          gstr1: existingRow?.gstr1 || {},
          gstr3b: existingRow?.gstr3b || {},
          entered_by: request.user.id,
        },
        { onConflict: 'client_user_id,period' }
      )
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to update compliance settings' });

    // Sync applicable requirements across all other periods for this client
    if (body.applicableRequirements && rows && rows.length > 1) {
      for (const otherRow of rows) {
        if (otherRow.period !== targetPeriod) {
          const otherSales = ((otherRow.sales || {}) as Record<string, unknown>);
          await supabase
            .from('client_gst_data')
            .update({ sales: { ...otherSales, applicableRequirements: updatedApplicable } })
            .eq('id', otherRow.id);
        }
      }
    }

    const { data: targetClient } = await supabase.from('users').select('name, business_name').eq('id', id).maybeSingle();
    const clientName = targetClient?.business_name || targetClient?.name || 'Client';

    await logActivity(request, {
      actionType: 'COMPLIANCE',
      actionCategory: 'CHANGED',
      resourceType: 'COMPLIANCE',
      resourceId: id,
      clientUserId: id,
      clientName,
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} updated compliance deadlines for ${clientName}`,
    });

    return {
      success: true,
      applicableRequirements: updatedApplicable,
      period: targetPeriod,
      completedDeadlines: completedList,
      gstData: data,
    };
  });

  app.post(
    '/api/clients/:id/documents',
    { preHandler: [authenticate, requireRole('TEAM', 'ADMIN')], config: { rateLimit: UPLOAD_RATE_LIMIT } },
    async (request, reply) => {
    const { id } = z.object({ id: uuidParamSchema }).parse(request.params);
    if (!(await canAccessClient(request.user, id))) return reply.status(403).send({ error: 'Forbidden' });

    const file = await request.file();
    if (!file) return reply.status(400).send({ error: 'No file uploaded' });

    if (file.file.truncated) {
      return reply.status(413).send({ error: 'Uploaded document exceeds allowable size limit of 25 MB' });
    }

    const categoryField = file.fields.category;
    const rawCategory = !Array.isArray(categoryField) && categoryField && 'value' in categoryField
      ? String(categoryField.value).trim().toUpperCase()
      : 'CLIENT_DOCS';

    const validCategory = z.enum(['ITC', 'SALES', 'PURCHASES', 'GSTR1', 'GSTR3B', 'CLIENT_DOCS']).safeParse(rawCategory);
    if (!validCategory.success) {
      return reply.status(400).send({ error: 'Invalid document category' });
    }
    const category = validCategory.data;

    const financialYearField = file.fields.financialYear;
    const monthField = file.fields.month;
    const rawFinancialYear = !Array.isArray(financialYearField) && financialYearField && 'value' in financialYearField ? String(financialYearField.value).trim() : '';
    const rawMonth = !Array.isArray(monthField) && monthField && 'value' in monthField ? String(monthField.value).trim() : '';

    let financialYear = '';
    let month = '';
    if (category === 'SALES' || category === 'PURCHASES') {
      const fyParsed = financialYearParamSchema.safeParse(rawFinancialYear);
      const moParsed = monthParamSchema.safeParse(rawMonth);
      if (!fyParsed.success || !moParsed.success) {
        return reply.status(400).send({ error: 'Valid financial year (YYYY-YY) and month (01-12) are required for Sales/Purchases documents.' });
      }
      financialYear = fyParsed.data;
      month = moParsed.data;
    }

    const buffer = await file.toBuffer();
    const validation = validateUploadFile(file.filename, file.mimetype, buffer.length, {
      maxSizeBytes: 25 * 1024 * 1024,
      buffer,
    });

    if (!validation.valid || !validation.sanitizedName) {
      return reply.status(400).send({ error: validation.error || 'Invalid uploaded document' });
    }

    const { data: clientFolder } = await supabase
      .from('drive_folders')
      .select('*')
      .eq('owner_type', 'CLIENT')
      .eq('owner_id', id)
      .eq('is_shortcut', false)
      .single();

    if (!clientFolder) return reply.status(400).send({ error: 'Client Drive folder not set up' });

    const folderMap: Record<string, string> = {
      ITC: 'ITC',
      SALES: 'Sales',
      PURCHASES: 'Purchases',
      GSTR1: 'GSTR-1',
      GSTR3B: 'GSTR-3B',
      CLIENT_DOCS: 'Client Docs',
    };

    const drive = getDriveService();
    if (!drive) return reply.status(503).send({ error: 'Google Drive not configured' });

    const targetFolderId = category === 'SALES' || category === 'PURCHASES'
      ? await drive.getOrCreateClientPeriodFolder(clientFolder.drive_folder_id, folderMap[category], financialYear, month)
      : await drive.getClientSubfolder(clientFolder.drive_folder_id, folderMap[category] ?? 'Client Docs');

    const fileNameField = file.fields.fileName || file.fields.customFileName;
    const rawCustomName = !Array.isArray(fileNameField) && fileNameField && 'value' in fileNameField
      ? String(fileNameField.value).trim()
      : '';

    let finalFileName = validation.sanitizedName;
    if (rawCustomName) {
      const customValidation = validateUploadFile(rawCustomName, file.mimetype, buffer.length, {
        maxSizeBytes: 25 * 1024 * 1024,
      });
      if (customValidation.valid && customValidation.sanitizedName) {
        finalFileName = customValidation.sanitizedName;
      }
    }

    const uploaded = await drive.uploadFile(targetFolderId, finalFileName, file.mimetype, buffer);

    const { data: document, error } = await supabase
      .from('client_documents')
      .insert({
        client_user_id: id,
        category,
        file_name: finalFileName,
        drive_file_id: uploaded.fileId,
        drive_web_view_link: uploaded.webViewLink,
        drive_download_link: uploaded.downloadLink,
        mime_type: file.mimetype,
        uploaded_by: request.user.id,
      })
      .select()
      .single();

    if (error) return reply.status(500).send({ error: 'Failed to save document record' });

    const { data: targetClient } = await supabase.from('users').select('name, business_name').eq('id', id).maybeSingle();
    const clientName = targetClient?.business_name || targetClient?.name || 'Client';

    await logActivity(request, {
      actionType: 'UPLOAD',
      actionCategory: 'CHANGED',
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      clientUserId: id,
      clientName,
      description: `${request.user.role === 'ADMIN' ? 'Admin' : 'Team Member'} uploaded document "${finalFileName}" (${category}) for ${clientName}`,
      details: { fileName: finalFileName, category, driveFileId: uploaded.fileId },
    });

    return { document };
  });
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../lib/api';
import { SingleInvoicePage } from './SingleInvoicePage';
import { InvoiceGeneratorPage } from './InvoiceGeneratorPage';
import { InvoiceListPage } from './InvoiceListPage';
import { InvoiceItemsPage } from './InvoiceItemsPage';
import { InvoiceCustomersPage } from './InvoiceCustomersPage';
import { InvoiceSeriesPage } from './InvoiceSeriesPage';
import { InvoiceTemplatePage } from './InvoiceTemplatePage';
import { InvoiceProfilePage } from './InvoiceProfilePage';
import { InvoiceReportsPage } from './InvoiceReportsPage';

export type InvoiceTab =
  | 'SINGLE'
  | 'GENERATOR'
  | 'INVOICES'
  | 'ITEMS'
  | 'CUSTOMERS'
  | 'SERIES'
  | 'TEMPLATES'
  | 'PROFILE'
  | 'REPORTS';

export function InvoiceDashboard({ clientId }: { clientId?: string }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<InvoiceTab>('SINGLE');

  // Multi-vendor selection for Staff, Owners, Team, and Admin roles
  const [clients, setClients] = useState<Array<{ id: string; name: string; business_name?: string; email: string }>>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(clientId || user?.id || '');

  const canSwitchVendor = ['ADMIN', 'SUPER_ADMIN', 'TEAM', 'FIRM_OWNER', 'FIRM_PARTNER', 'FIRM_STAFF'].includes(user?.role || '');

  useEffect(() => {
    if (clientId) {
      setSelectedVendorId(clientId);
    }
  }, [clientId]);

  useEffect(() => {
    if (canSwitchVendor) {
      loadClients();
    }
  }, [canSwitchVendor]);

  async function loadClients() {
    try {
      let endpoint = '/api/admin/clients';
      if (user?.role === 'FIRM_OWNER' || user?.role === 'FIRM_PARTNER' || user?.role === 'FIRM_STAFF') {
        endpoint = '/api/firm/clients';
      } else if (user?.role === 'TEAM') {
        endpoint = '/api/team/dashboard';
      }
      const res: any = await apiFetch(endpoint);
      const list = res.clients || res.assignedClients || [];
      setClients(list);
    } catch {
      // fallback
    }
  }

  const effectiveVendorId = selectedVendorId || user?.id || '';

  return (
    <div className="space-y-6">
      {/* Vendor Switcher Bar for Team, Firm, and Admin */}
      {canSwitchVendor && (
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">
              {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
                ? '👑 Super Admin Tool Mode'
                : user?.role === 'FIRM_OWNER' || user?.role === 'FIRM_PARTNER'
                ? '🏛️ CA Firm Practice Tool'
                : user?.role === 'FIRM_STAFF'
                ? '👨‍💼 Article / Staff Workbench'
                : '👨‍💻 Specialist Workspace'}
            </span>
            <span className="text-slate-400">| Managing Invoices For:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full sm:w-auto bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 font-bold text-xs outline-none focus:border-blue-500"
            >
              <option value={user?.id}>
                ⚡ Standalone Tool / My Account ({user?.businessName || user?.name || 'Self'})
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.business_name || c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 shadow-sm flex overflow-x-auto scrollbar-none gap-1 sm:gap-1.5 text-xs font-semibold -mx-2 sm:mx-0 px-2 sm:px-2">
        {[
          { key: 'SINGLE', label: '✍️ Single Invoice', icon: '✍️' },
          { key: 'GENERATOR', label: '⚡ Bulk Generator', icon: '⚡' },
          { key: 'INVOICES', label: '🧾 Invoices Archive', icon: '🧾' },
          { key: 'ITEMS', label: '📦 Items Catalog', icon: '📦' },
          { key: 'CUSTOMERS', label: '👥 Customers Directory', icon: '👥' },
          { key: 'SERIES', label: '🔢 Series & FY Numbering', icon: '🔢' },
          { key: 'TEMPLATES', label: '🎨 Template Designer', icon: '🎨' },
          { key: 'PROFILE', label: '🏢 Billing Profile', icon: '🏢' },
          { key: 'REPORTS', label: '📊 Reports & GSTR-1', icon: '📊' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as InvoiceTab)}
            className={`px-3 sm:px-3.5 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 shrink-0 select-none ${
              activeTab === key
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Sub-View Container */}
      <div className="transition-all">
        {activeTab === 'SINGLE' && (
          <SingleInvoicePage
            vendorId={effectiveVendorId}
            onIssued={() => setActiveTab('INVOICES')}
            onViewArchive={() => setActiveTab('INVOICES')}
          />
        )}
        {activeTab === 'GENERATOR' && (
          <InvoiceGeneratorPage
            vendorId={effectiveVendorId}
            onGenerated={() => setActiveTab('INVOICES')}
          />
        )}
        {activeTab === 'INVOICES' && (
          <InvoiceListPage
            vendorId={effectiveVendorId}
            onNewSingleInvoice={() => setActiveTab('SINGLE')}
          />
        )}
        {activeTab === 'ITEMS' && <InvoiceItemsPage vendorId={effectiveVendorId} />}
        {activeTab === 'CUSTOMERS' && <InvoiceCustomersPage vendorId={effectiveVendorId} />}
        {activeTab === 'SERIES' && <InvoiceSeriesPage vendorId={effectiveVendorId} />}
        {activeTab === 'TEMPLATES' && <InvoiceTemplatePage vendorId={effectiveVendorId} />}
        {activeTab === 'PROFILE' && <InvoiceProfilePage vendorId={effectiveVendorId} />}
        {activeTab === 'REPORTS' && <InvoiceReportsPage vendorId={effectiveVendorId} />}
      </div>
    </div>
  );
}

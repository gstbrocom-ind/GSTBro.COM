import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type DriveConfig = {
  id?: string;
  auth_type: 'OAUTH' | 'SERVICE_ACCOUNT';
  root_folder_id?: string | null;
  root_folder_name?: string | null;
  is_connected: boolean;
  updated_at?: string;
};

type RoutingRule = {
  id: string;
  category: 'SALES' | 'PURCHASES' | 'BANK' | 'FILED_RETURNS' | 'NOTICES' | 'CLIENT_DOCS' | 'CUSTOM';
  rule_name: string;
  custom_folder_name?: string | null;
  target_path_template: string;
  google_folder_id?: string | null;
  auto_create_subfolders: boolean;
  is_active: boolean;
  priority: number;
};

const CATEGORY_LABELS: Record<string, { label: string; badgeColor: string; defaultFolder: string }> = {
  SALES: { label: 'Sales Records & Invoices', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', defaultFolder: 'Folder X: Sales Data' },
  PURCHASES: { label: 'Purchase Bills & ITC', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', defaultFolder: 'Folder Y: Purchase Bills' },
  BANK: { label: 'Bank Statements', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200', defaultFolder: 'Folder Z: Bank Statements' },
  FILED_RETURNS: { label: 'Filed Returns & ARNs', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200', defaultFolder: 'Filed Tax Filings' },
  NOTICES: { label: 'Department Notices & Scrutiny', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200', defaultFolder: 'Notices & Scrutiny' },
  CLIENT_DOCS: { label: 'General Client KYC & Docs', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200', defaultFolder: 'Client KYC' },
  CUSTOM: { label: 'Custom Destination', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200', defaultFolder: 'Custom Folder' },
};

export function FirmDriveRoutingPage() {
  const [driveConfig, setDriveConfig] = useState<DriveConfig | null>(null);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connect Drive Modal
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveForm, setDriveForm] = useState({
    rootFolderId: '',
    rootFolderName: '',
    authType: 'OAUTH' as 'OAUTH' | 'SERVICE_ACCOUNT',
    serviceAccountJson: '',
  });

  // Add/Edit Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    category: 'SALES' as keyof typeof CATEGORY_LABELS,
    ruleName: '',
    customFolderName: '',
    targetPathTemplate: '{Client_Name}/{Category}/{Year}_{Month}',
    autoCreateSubfolders: true,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [driveRes, rulesRes] = await Promise.all([
        api<{ driveConfig: DriveConfig }>('/api/firm/drive'),
        api<{ rules: RoutingRule[] }>('/api/firm/routing-rules'),
      ]);
      setDriveConfig(driveRes.driveConfig);
      setRules(rulesRes.rules || []);
      if (driveRes.driveConfig?.root_folder_name) {
        setDriveForm({
          rootFolderId: driveRes.driveConfig.root_folder_id || '',
          rootFolderName: driveRes.driveConfig.root_folder_name || '',
          authType: driveRes.driveConfig.auth_type || 'OAUTH',
          serviceAccountJson: '',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load drive settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/firm/drive', {
        method: 'POST',
        body: JSON.stringify(driveForm),
      });
      setShowDriveModal(false);
      await fetchData();
    } catch (err: any) {
      alert(`Error connecting drive: ${err?.message || 'Failed'}`);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/firm/routing-rules', {
        method: 'POST',
        body: JSON.stringify({
          category: ruleForm.category,
          ruleName: ruleForm.ruleName || `${ruleForm.category} Direction Rule`,
          customFolderName: ruleForm.customFolderName,
          targetPathTemplate: ruleForm.targetPathTemplate,
          autoCreateSubfolders: ruleForm.autoCreateSubfolders,
        }),
      });
      setShowRuleModal(false);
      await fetchData();
    } catch (err: any) {
      alert(`Error saving routing rule: ${err?.message || 'Failed'}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this folder routing rule?')) return;
    try {
      await api(`/api/firm/routing-rules/${ruleId}`, { method: 'DELETE' });
      await fetchData();
    } catch (err: any) {
      alert(`Error deleting rule: ${err?.message || 'Failed'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Your Google Drive & Document Routing</h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect your CA firm's Google Drive. All client bills, returns, and registers are stored in your own storage with custom folder directions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Drive Connection Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Firm Google Drive Storage</h2>
                {driveConfig?.is_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {driveConfig?.is_connected
                  ? `Active Root Folder: "${driveConfig.root_folder_name || 'My CA Archive'}" (Folder ID: ${driveConfig.root_folder_id})`
                  : 'Connect your Google Drive so documents uploaded by your team and clients land in your own storage.'}
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => setShowDriveModal(true)}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              {driveConfig?.is_connected ? 'Reconfigure Drive' : 'Connect Google Drive'}
            </button>
          </div>
        </div>
      </div>

      {/* Document Routing Directions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Document Direction & Folder Rules</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify where incoming client files go. For example: Sales data goes to <strong>Folder X</strong>, Purchases to <strong>Folder Y</strong>.
            </p>
          </div>
          <button
            onClick={() => {
              setRuleForm({
                category: 'SALES',
                ruleName: 'Sales Invoices to Folder X',
                customFolderName: 'Folder X: Sales Data',
                targetPathTemplate: '{Client_Name}/Sales/{Year}_{Month}',
                autoCreateSubfolders: true,
              });
              setShowRuleModal(true);
            }}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition inline-flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Folder Direction Rule</span>
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Routing Rules Configured</h3>
              <p className="text-xs text-slate-500">
                Click "Add Folder Direction Rule" above to create rules like directing Sales to Folder X and Purchases to Folder Y.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => {
              const meta = CATEGORY_LABELS[rule.category] || CATEGORY_LABELS.CUSTOM;
              return (
                <div key={rule.id} className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm space-y-3 hover:border-indigo-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${meta.badgeColor}`}>
                        {meta.label}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{rule.rule_name}</h3>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="Delete rule"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {rule.custom_folder_name && (
                    <div className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded inline-block">
                      Destination Folder: <span className="font-semibold text-indigo-700">{rule.custom_folder_name}</span>
                    </div>
                  )}

                  <div className="bg-slate-900 text-slate-200 font-mono text-xs p-2.5 rounded-lg overflow-x-auto">
                    {rule.target_path_template}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                    <span>Auto-creates monthly subfolders: {rule.auto_create_subfolders ? 'Yes' : 'No'}</span>
                    <span className="text-emerald-600 font-medium">Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drive Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Connect Your Google Drive</h3>
            <p className="text-xs text-slate-500">
              Provide your Google Drive root folder details where all practice client documents will be stored.
            </p>
            <form onSubmit={handleSaveDrive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Root Folder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma & Associates - GST Archive"
                  value={driveForm.rootFolderName}
                  onChange={(e) => setDriveForm({ ...driveForm, rootFolderName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Google Drive Folder ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1A2b3C4d5E6f_folder_id_from_url"
                  value={driveForm.rootFolderId}
                  onChange={(e) => setDriveForm({ ...driveForm, rootFolderId: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Found in the URL of your Google Drive folder: drive.google.com/drive/folders/<strong>[ID]</strong>
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDriveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add Folder Direction Rule</h3>
            <p className="text-xs text-slate-500">
              Direct specific document categories (e.g. Sales, Purchases) to dedicated target folders.
            </p>
            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                <select
                  value={ruleForm.category}
                  onChange={(e) => {
                    const cat = e.target.value as keyof typeof CATEGORY_LABELS;
                    setRuleForm({
                      ...ruleForm,
                      category: cat,
                      customFolderName: CATEGORY_LABELS[cat]?.defaultFolder || '',
                      ruleName: `${CATEGORY_LABELS[cat]?.label || cat} Rule`,
                    });
                  }}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Sales Invoices to Folder X"
                  value={ruleForm.ruleName}
                  onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Folder Name / Label (e.g. Folder X)</label>
                <input
                  type="text"
                  placeholder="e.g. Folder X: Sales"
                  value={ruleForm.customFolderName}
                  onChange={(e) => setRuleForm({ ...ruleForm, customFolderName: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Path Template</label>
                <input
                  type="text"
                  required
                  placeholder="{Client_Name}/{Category}/{Year}_{Month}"
                  value={ruleForm.targetPathTemplate}
                  onChange={(e) => setRuleForm({ ...ruleForm, targetPathTemplate: e.target.value })}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Placeholders: {'{Client_Name}'}, {'{Category}'}, {'{Year}'}, {'{Month}'}, {'{FY}'}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

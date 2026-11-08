import { useState } from 'react';
import { apiFetch, getToken } from '../../lib/api';

function currentUserId() {
  const token = getToken();
  if (!token) return '';
  try { return JSON.parse(atob(token.split('.')[1])).id as string; } catch { return ''; }
}

export function RegisterUploadPanel({ category }: { category: 'SALES' | 'PURCHASES' }) {
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [month, setMonth] = useState('April');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const upload = async () => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { setMessage('File must be 100 MB or smaller.'); return; }
    const body = new FormData();
    body.append('file', file); body.append('category', category); body.append('financialYear', financialYear); body.append('month', month);
    try { await apiFetch(`/api/clients/${currentUserId()}/documents`, { method: 'POST', body }); setMessage('Document uploaded successfully.'); setFile(null); } catch (error) { setMessage(error instanceof Error ? error.message : 'Upload failed'); }
  };
  return <div className="register-upload"><div className="register-upload-fields"><select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}><option>2026-27</option><option>2025-26</option><option>2024-25</option></select><select value={month} onChange={(e) => setMonth(e.target.value)}>{['April','May','June','July','August','September','October','November','December','January','February','March'].map((item) => <option key={item}>{item}</option>)}</select><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><button className="primary-button" onClick={upload} disabled={!file}>Add document</button></div><small>Maximum file size: 100 MB</small>{message && <p className="muted">{message}</p>}</div>;
}

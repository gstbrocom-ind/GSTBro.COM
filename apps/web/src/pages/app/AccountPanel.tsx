type AccountDetails = { name?: string | null; business_name?: string | null; email?: string | null; phone?: string | null; gstin?: string | null; state?: string | null; address?: string | null };

export function AccountPanel({ client }: { client?: AccountDetails }) {
  const details: [string, string][]= [['Name', client?.name ?? '—'], ['Business name', client?.business_name ?? '—'], ['Email', client?.email ?? '—'], ['Phone', client?.phone ?? '—'], ['GSTIN', client?.gstin ?? '—'], ['State', client?.state ?? '—'], ['Address', client?.address ?? '—']];
  return <section className="panel inner-page account-panel"><div className="panel-heading"><div><p className="eyebrow">ACCOUNT</p><h2>Client account</h2><p>Your registered details and GST profile.</p></div></div><div className="account-details">{details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}

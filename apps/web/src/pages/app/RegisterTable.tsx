import { useEffect, useState } from 'react';

export type RegisterRow = { year: string; month: string; taxableValue: string; cgst: string; sgst: string; igst: string; totalInvoiceValue: string };
const blank = (): RegisterRow => ({ year: '', month: '', taxableValue: '', cgst: '', sgst: '', igst: '', totalInvoiceValue: '' });

export function RegisterTable({ title, rows, editable, onSave }: { title: string; rows: RegisterRow[]; editable?: boolean; onSave?: (rows: RegisterRow[]) => void }) {
  const [items, setItems] = useState<RegisterRow[]>(rows.length ? rows : [blank()]);
  useEffect(() => setItems(rows.length ? rows : [blank()]), [rows]);
  const update = (index: number, key: keyof RegisterRow, value: string) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  return <section className="panel register-table-panel"><div className="panel-heading"><div><h2>{title}</h2><p>{editable ? 'Enter monthly register values.' : 'Values entered by your assigned team.'}</p></div>{editable && <button className="primary-button" onClick={() => onSave?.(items)}>Save register</button>}</div><div className="register-table-wrap"><table className="register-table"><thead><tr>{['Year', 'Month', 'Taxable value', editable ? 'Input GST (CGST)' : 'Output GST (CGST)', editable ? 'Input GST (SGST)' : 'Output GST (SGST)', editable ? 'Input GST (IGST)' : 'Output GST (IGST)', 'Total invoice value'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{items.map((row, index) => <tr key={index}>{(['year', 'month', 'taxableValue', 'cgst', 'sgst', 'igst', 'totalInvoiceValue'] as const).map((key) => <td key={key}><input value={row[key]} onChange={(event) => update(index, key, event.target.value)} readOnly={!editable} placeholder={key === 'month' ? 'April' : '-'} /></td>)}</tr>)}</tbody></table></div>{editable && <button className="text-button" onClick={() => setItems((current) => [...current, blank()])}>＋ Add row</button>}</section>;
}

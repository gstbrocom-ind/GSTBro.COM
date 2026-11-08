export interface InvoiceFontDefinition {
  id: string;
  name: string;
  family: string;
  category: 'Sans-Serif' | 'Serif' | 'Monospace / ERP';
  badge: string;
  recommendedFor: string;
  previewSample: string;
}

export const INVOICE_FONTS: InvoiceFontDefinition[] = [
  // --------------------------------------------------------------------------
  // SANS-SERIF: Modern, Clean & High-Legibility
  // --------------------------------------------------------------------------
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter', system-ui, -apple-system, sans-serif",
    category: 'Sans-Serif',
    badge: 'Modern Standard',
    recommendedFor: 'Fintech, SaaS, Consultancy, Digital Services',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: "'Roboto', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Google Standard',
    recommendedFor: 'Traders, B2B Wholesalers, General Commercial',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'plus_jakarta_sans',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Fintech & Modern',
    recommendedFor: 'Modern Startups, Tech Agencies, Clean Invoicing',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Geometric & Crisp',
    recommendedFor: 'Creative Studios, Architecture, Design Agencies',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'dm_sans',
    name: 'DM Sans',
    family: "'DM Sans', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Precision Numbers',
    recommendedFor: 'Accounting, Financial Reports, High-density Tables',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: "'Poppins', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Friendly & Bold',
    recommendedFor: 'Retailers, E-commerce, Lifestyle, Consumer Goods',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: "'Montserrat', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Executive Corporate',
    recommendedFor: 'Industrial Manufacturing, Real Estate, Heavy Machinery',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'open_sans',
    name: 'Open Sans',
    family: "'Open Sans', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Universal Clarity',
    recommendedFor: 'Government Suppliers, Pharma, Healthcare, Hospitals',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'lato',
    name: 'Lato',
    family: "'Lato', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Warm Corporate',
    recommendedFor: 'Corporate Vendors, Hospitality, Transport & Logistics',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'space_grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk', system-ui, sans-serif",
    category: 'Sans-Serif',
    badge: 'Industrial Tech',
    recommendedFor: 'Electronics, CNC Jobwork, Aerospace, Engineering',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },

  // --------------------------------------------------------------------------
  // SERIF: Formal, Legal, Chartered Accountant & Luxury
  // --------------------------------------------------------------------------
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: "'Merriweather', Georgia, serif",
    category: 'Serif',
    badge: 'CA & Legal Formal',
    recommendedFor: 'Chartered Accountants, Tax Advocates, Law Firms',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: "'Playfair Display', Georgia, serif",
    category: 'Serif',
    badge: 'Prestige & Luxury',
    recommendedFor: 'Jewellery, Luxury Fashion, High-end Boutiques, Interior Design',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'lora',
    name: 'Lora',
    family: "'Lora', Times New Roman, serif",
    category: 'Serif',
    badge: 'Literary & Elegant',
    recommendedFor: 'Publishers, Educational Institutions, Elite Consultancy',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    family: "'Cinzel', Georgia, serif",
    category: 'Serif',
    badge: 'Classical Roman',
    recommendedFor: 'High-Value Contracts, Heritage Brands, Antique Traders',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },

  // --------------------------------------------------------------------------
  // MONOSPACE: Tally ERP, Dot-Matrix & Tabular Technical
  // --------------------------------------------------------------------------
  {
    id: 'jetbrains_mono',
    name: 'JetBrains Mono',
    family: "'JetBrains Mono', 'Courier New', monospace",
    category: 'Monospace / ERP',
    badge: 'Tally & ERP Standard',
    recommendedFor: 'Tally ERP Style Invoices, Tabular Numbers, Strict Columns',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'courier_prime',
    name: 'Courier Prime',
    family: "'Courier Prime', Courier, monospace",
    category: 'Monospace / ERP',
    badge: 'Dot Matrix Memo',
    recommendedFor: 'Classic Dot-Matrix Bills, Cash Memos, Wholesale Mandi',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
  {
    id: 'fira_code',
    name: 'Fira Code',
    family: "'Fira Code', 'Courier New', monospace",
    category: 'Monospace / ERP',
    badge: 'Technical Accounting',
    recommendedFor: 'Hardware Specs, Manufacturing BOMs, Clear Column Alignment',
    previewSample: 'Tax Invoice INV-2026/0042 • ₹1,45,280.00',
  },
];

/**
 * Returns CSS font-family string with safe fallbacks for a given font ID or raw font string
 */
export function getFontFamilyCss(fontIdOrRaw?: string): string {
  if (!fontIdOrRaw) return "'Inter', system-ui, -apple-system, sans-serif";

  const clean = fontIdOrRaw.toLowerCase().trim();

  // Backward compatibility with legacy keywords
  if (clean === 'sans-serif') return "'Inter', system-ui, -apple-system, sans-serif";
  if (clean === 'serif') return "'Merriweather', Georgia, serif";
  if (clean === 'mono' || clean === 'monospace') return "'JetBrains Mono', 'Courier New', monospace";

  const match = INVOICE_FONTS.find((f) => f.id.toLowerCase() === clean);
  if (match) return match.family;

  // If already a valid CSS font-family string, return it directly
  if (fontIdOrRaw.includes(',') || fontIdOrRaw.includes("'") || fontIdOrRaw.includes('"')) {
    return fontIdOrRaw;
  }

  return `'${fontIdOrRaw}', system-ui, sans-serif`;
}

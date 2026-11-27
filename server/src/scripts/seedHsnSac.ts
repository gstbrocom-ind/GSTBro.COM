import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importHsnSacRows, parseHsnSacWorkbook, type ParsedHsnSacRow } from '../services/hsnSacService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Curated GST 2.0 rate overlays (post 56th & 57th GST Council Reforms)
const CURATED_GST_2_OVERLAYS: Omit<ParsedHsnSacRow, 'source'>[] = [
  { code: '0401', type: 'HSN', category: 'Dairy & Essentials', description: 'Fresh milk and cream, not concentrated nor containing added sugar', gst_rate: 0, keywords: ['milk', 'dairy', 'fresh milk', 'cream', 'exempt'], note: null },
  { code: '1001', type: 'HSN', category: 'Agricultural Staples', description: 'Wheat and meslin (unbranded / loose)', gst_rate: 0, keywords: ['wheat', 'grain', 'flour', 'staples', 'unbranded'], note: 'Pre-packaged and labeled retail packs attract 5%.' },
  { code: '1006', type: 'HSN', category: 'Agricultural Staples', description: 'Rice (unbranded / loose)', gst_rate: 0, keywords: ['rice', 'paddy', 'basmati', 'grain', 'unbranded'], note: 'Pre-packaged and labeled retail packs (<=25 kg) attract 5%.' },
  { code: '3004', type: 'HSN', category: 'Life-Saving Medicines', description: '33 notified critical life-saving drugs and medicines (exempt list)', gst_rate: 0, keywords: ['medicine', 'life saving', 'pharma', 'drugs', 'healthcare'], note: 'Reduced to 0% under GST 2.0; rare-disease & cancer drugs are 5%.' },
  { code: '997132', type: 'SAC', category: 'Life Insurance Services', description: 'Individual life insurance policies (term, ULIP, endowment) & reinsurance', gst_rate: 0, keywords: ['life insurance', 'term plan', 'insurance', 'lic', 'policy'], note: 'Exempted (0%) for individual policies under 56th GST Council reforms.' },
  { code: '997133', type: 'SAC', category: 'Health Insurance Services', description: 'Individual health / medical insurance policies & family floater plans', gst_rate: 0, keywords: ['health insurance', 'mediclaim', 'medical policy', 'insurance'], note: 'Exempted (0%) for individual health insurance under GST 2.0.' },
  { code: '9992', type: 'SAC', category: 'Education Services', description: 'Educational services by schools, colleges, and recognized universities', gst_rate: 0, keywords: ['education', 'school', 'college', 'tuition', 'university'], note: null },
  { code: '9993', type: 'SAC', category: 'Healthcare Services', description: 'Clinical, hospital, and diagnostic healthcare services by authorized establishments', gst_rate: 0, keywords: ['healthcare', 'hospital', 'doctor', 'clinic', 'medical'], note: null },
  { code: '7102', type: 'HSN', category: 'Precious Stones', description: 'Rough diamonds (unworked or simply sawn)', gst_rate: 0.25, keywords: ['diamond', 'rough diamond', 'gem'], note: null },
  { code: '7108', type: 'HSN', category: 'Precious Metals', description: 'Gold bullion, bars, coins, and unwrought gold', gst_rate: 3, keywords: ['gold', 'bullion', 'coin', 'precious metal'], note: null },
  { code: '7113', type: 'HSN', category: 'Jewellery', description: 'Articles of gold, silver, and platinum jewellery', gst_rate: 3, keywords: ['jewellery', 'gold jewellery', 'silver', 'ornaments'], note: null },
  { code: '3401', type: 'HSN', category: 'Daily Essentials', description: 'Toilet soap, soap bars, and organic surface-active bars', gst_rate: 5, keywords: ['soap', 'bath soap', 'toiletries', 'fmcg'], note: 'Reduced from 18% to 5% under GST 2.0.' },
  { code: '3305', type: 'HSN', category: 'Personal Care', description: 'Shampoos, hair oils, and hair care preparations', gst_rate: 5, keywords: ['shampoo', 'hair oil', 'personal care', 'fmcg'], note: 'Reduced from 18% to 5% under GST 2.0.' },
  { code: '3306', type: 'HSN', category: 'Oral Hygiene', description: 'Toothpaste, tooth powder, and dental floss', gst_rate: 5, keywords: ['toothpaste', 'dental', 'oral care', 'fmcg'], note: 'Reduced from 18% to 5% under GST 2.0.' },
  { code: '854143', type: 'HSN', category: 'Renewable Energy', description: 'Photovoltaic solar cells, solar panels, and modules', gst_rate: 5, keywords: ['solar', 'solar panel', 'photovoltaic', 'renewable'], note: 'Reduced from 12% to 5% merit rate under GST 2.0.' },
  { code: '8701', type: 'HSN', category: 'Agricultural Machinery', description: 'Agricultural tractors and farming power tillers', gst_rate: 5, keywords: ['tractor', 'agriculture', 'farming', 'machinery'], note: null },
  { code: '6203', type: 'HSN', category: 'Apparel & Textiles', description: 'Readymade garments and apparel (retail sale value <= Rs 2,500 per piece)', gst_rate: 5, keywords: ['clothes', 'garments', 'apparel', 'shirt', 'textile'], note: 'Garments above Rs 2,500 attract 18%.' },
  { code: '996331', type: 'SAC', category: 'Food & Hospitality', description: 'Restaurant, café, and catering services (non-luxury / standalone)', gst_rate: 5, keywords: ['restaurant', 'food', 'cafe', 'dining', 'catering'], note: '5% without ITC; specified luxury hotel restaurants attract 18% with ITC.' },
  { code: '9965', type: 'SAC', category: 'Logistics & GTA', description: 'Goods Transport Agency (GTA) road freight services (without ITC)', gst_rate: 5, keywords: ['gta', 'transport', 'freight', 'logistics', 'truck'], note: '5% under RCM/FCM without ITC, or 18% with ITC.' },
  { code: '2523', type: 'HSN', category: 'Construction Material', description: 'Portland cement, aluminous cement, slag cement', gst_rate: 18, keywords: ['cement', 'construction', 'building material'], note: 'Reduced from 28% to 18% under GST 2.0.' },
  { code: '8471', type: 'HSN', category: 'IT & Electronics', description: 'Laptops, desktop computers, servers, and automatic data processing machines', gst_rate: 18, keywords: ['laptop', 'computer', 'pc', 'server', 'hardware'], note: null },
  { code: '8517', type: 'HSN', category: 'Telecom & Mobile', description: 'Smartphones, mobile handsets, routers, and telecom equipment', gst_rate: 18, keywords: ['mobile', 'smartphone', 'phone', 'router', 'telecom'], note: null },
  { code: '8415', type: 'HSN', category: 'Consumer Appliances', description: 'Air conditioning machines and split/window ACs', gst_rate: 18, keywords: ['ac', 'air conditioner', 'hvac', 'appliance'], note: 'Reduced from 28% to 18% under GST 2.0.' },
  { code: '8528', type: 'HSN', category: 'Consumer Electronics', description: 'LED/OLED televisions and computer monitors', gst_rate: 18, keywords: ['tv', 'television', 'monitor', 'led'], note: 'Reduced from 28% to 18% under GST 2.0.' },
  { code: '870321', type: 'HSN', category: 'Automobiles (Small Cars)', description: 'Small passenger cars (petrol <=1200cc / diesel <=1500cc & length <=4m)', gst_rate: 18, keywords: ['small car', 'hatchback', 'automobile', 'car'], note: 'Reduced from 28% + cess to 18% under GST 2.0; luxury SUVs are 40%.' },
  { code: '871120', type: 'HSN', category: 'Two-Wheelers (<=350cc)', description: 'Motorcycles and scooters with engine capacity not exceeding 350cc', gst_rate: 18, keywords: ['bike', 'scooter', 'motorcycle', 'two wheeler'], note: 'Reduced from 28% to 18% under GST 2.0; >350cc motorcycles are 40%.' },
  { code: '998314', type: 'SAC', category: 'IT & SaaS Services', description: 'IT design, software development, SaaS, cloud hosting, and consulting', gst_rate: 18, keywords: ['software', 'saas', 'it', 'web development', 'cloud'], note: null },
  { code: '998221', type: 'SAC', category: 'Professional Services', description: 'Chartered Accountant, audit, tax advisory, and GST compliance services', gst_rate: 18, keywords: ['ca', 'chartered accountant', 'audit', 'gst', 'tax'], note: null },
  { code: '998311', type: 'SAC', category: 'Business Consulting', description: 'Management consulting, strategy, and financial advisory services', gst_rate: 18, keywords: ['consulting', 'advisory', 'management'], note: null },
  { code: '997212', type: 'SAC', category: 'Commercial Real Estate', description: 'Rental or leasing services of commercial offices, shops, and warehouses', gst_rate: 18, keywords: ['commercial rent', 'lease', 'office rent', 'warehouse'], note: null },
  { code: '9954', type: 'SAC', category: 'Works Contract & Construction', description: 'General construction and works contract services', gst_rate: 18, keywords: ['construction', 'contractor', 'works contract', 'civil'], note: null },
  { code: '998361', type: 'SAC', category: 'Advertising & Marketing', description: 'Digital marketing, SEO, media buying, and advertising agency services', gst_rate: 18, keywords: ['marketing', 'advertising', 'seo', 'digital ads'], note: null },
  { code: '220210', type: 'HSN', category: 'Aerated & Caffeinated Drinks', description: 'Aerated waters containing added sugar, sweetener, or flavour & caffeinated beverages', gst_rate: 40, keywords: ['soda', 'soft drink', 'aerated', 'energy drink'], note: 'Moved to 40% demerit slab (replacing 28% + compensation cess).' },
  { code: '21069020', type: 'HSN', category: 'Demerit Goods', description: 'Pan masala and tobacco-related preparations', gst_rate: 40, keywords: ['pan masala', 'tobacco', 'sin tax'], note: '40% demerit slab under GST 2.0.' },
  { code: '8703', type: 'HSN', category: 'Luxury Vehicles & SUVs', description: 'Large passenger cars, luxury sedans, and SUVs (>1200cc petrol / >1500cc diesel)', gst_rate: 40, keywords: ['suv', 'luxury car', 'sedan', 'automobile'], note: '40% demerit slab (replaced 28% + cess).' },
  { code: '871140', type: 'HSN', category: 'High-Capacity Motorcycles', description: 'Motorcycles with reciprocating internal combustion engine exceeding 350cc', gst_rate: 40, keywords: ['superbike', 'motorcycle', '350cc', 'bike'], note: 'Motorcycles >350cc attract 40%; <=350cc attract 18%.' },
  { code: '8903', type: 'HSN', category: 'Luxury Vessels & Aircraft', description: 'Yachts and other vessels for pleasure or sports (and personal aircraft under 8802)', gst_rate: 40, keywords: ['yacht', 'luxury boat', 'personal aircraft', 'jet'], note: null },
  { code: '999692', type: 'SAC', category: 'Gaming & Casinos', description: 'Online money gaming, casinos, horse racing, and betting services', gst_rate: 40, keywords: ['casino', 'online gaming', 'betting', 'gambling'], note: 'Unified under 40% demerit slab.' },
];

async function main() {
  const filePathArg = process.argv[2];
  const defaultPath = path.resolve(__dirname, '../../data/HSN_SAC.xlsx');
  const targetPath = filePathArg ? path.resolve(filePathArg) : defaultPath;

  const allRowsMap = new Map<string, ParsedHsnSacRow>();

  if (fs.existsSync(targetPath)) {
    console.log(`Reading GST Portal Excel: ${targetPath}`);
    const buffer = fs.readFileSync(targetPath);
    const parsed = parseHsnSacWorkbook(buffer);
    console.log(`Parsed ${parsed.hsnCount} HSN rows and ${parsed.sacCount} SAC rows from sheets: ${parsed.sheetsProcessed.join(', ')}`);
    for (const row of parsed.rows) {
      allRowsMap.set(`${row.type}:${row.code.toUpperCase()}`, row);
    }
  } else {
    console.warn(`Excel file not found at ${targetPath}; seeding curated GST 2.0 entries only.`);
  }

  for (const curated of CURATED_GST_2_OVERLAYS) {
    const key = `${curated.type}:${curated.code.toUpperCase()}`;
    const existing = allRowsMap.get(key);
    allRowsMap.set(key, {
      ...curated,
      description: existing?.description || curated.description,
      source: 'curated',
    });
  }

  const finalRows = Array.from(allRowsMap.values());
  console.log(`Importing ${finalRows.length} total HSN/SAC entries into Supabase...`);

  const summary = await importHsnSacRows(finalRows, {
    mode: 'upsert',
    fileName: fs.existsSync(targetPath) ? path.basename(targetPath) : 'curated-gst-2.0',
    updatedUpTo: '27 Nov 2026',
  });

  console.log('Seed completed:', summary);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

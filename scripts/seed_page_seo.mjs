import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const defaultPages = [
  {
    route_path: '/',
    meta_title: 'GST Services End to End | GSTBro',
    meta_description: 'Complete GST registration, return filing, and cancellation services across India. Expert support from GSTBro — your trusted GST partner.',
    meta_keywords: 'gst services, gstbro, gst registration, gst returns, gst cancellation, india gst',
    robots: 'index, follow',
  },
  {
    route_path: '/services',
    meta_title: 'GST Services | GSTBro',
    meta_description: 'Explore GST registration, return filing, and cancellation services from GSTBro. End-to-end compliance support for businesses across India.',
    meta_keywords: 'gst services, gstbro services, gst compliance india',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-registration',
    meta_title: 'GST Registration Services | GSTBro',
    meta_description: 'Professional GST registration services for businesses across India. Fast, compliant, end-to-end support from application to GSTIN issuance.',
    meta_keywords: 'gst registration, gstbro registration, new gst registration, gstin registration india',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-returns',
    meta_title: 'GST Return Filing Services | GSTBro',
    meta_description: 'Timely and accurate GST return filing — GSTR-1, GSTR-3B, and annual returns handled by GSTBro experts. Never miss a deadline.',
    meta_keywords: 'gst return filing, gstbro return filing, gstr-3b filing, gstr-1 filing',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-cancellation',
    meta_title: 'GST Cancellation Services | GSTBro',
    meta_description: 'Hassle-free GST cancellation and surrender services with full compliance support. GSTBro handles the entire process for you.',
    meta_keywords: 'gst cancellation, gstbro cancellation, gst surrender, cancel gst registration',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-compliance',
    meta_title: 'GST Compliance Services | GSTBro',
    meta_description: 'Complete GST compliance management for businesses across India. Stay compliant, avoid penalties, and keep your GST records accurate with GSTBro experts.',
    meta_keywords: 'gst compliance services, gst compliance consultant, gst compliance india, gst penalty help',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-refund',
    meta_title: 'GST Refund Services | GSTBro',
    meta_description: 'Fast and hassle-free GST refund assistance for exporters, businesses, and eligible taxpayers. GSTBro handles documentation, filing, and follow-up.',
    meta_keywords: 'gst refund services, gst refund consultant, gst refund claim, gst refund india',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-audit',
    meta_title: 'GST Audit and Assessment Services | GSTBro',
    meta_description: 'Professional GST audit and assessment support including notice handling, reconciliation, departmental representation, and litigation assistance.',
    meta_keywords: 'gst audit services, gst assessment, gst audit consultant, gst notice reply',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-advisory',
    meta_title: 'GST Advisory Services | GSTBro',
    meta_description: 'Expert GST advisory and planning to optimize tax liability, reduce compliance risk, improve efficiency, and support better business decisions.',
    meta_keywords: 'gst advisory services, gst consultant, gst tax planning, gst compliance advisory',
    robots: 'index, follow',
  },
  {
    route_path: '/services/gst-tds-tcs',
    meta_title: 'GST TDS & TCS Compliance Services (GSTR-7 & GSTR-8) | GSTBro',
    meta_description: 'Professional GST TDS (Section 51) and TCS (Section 52) filing services for government entities, PSUs, and e-commerce operators across India. Error-free GSTR-7 and GSTR-8 filing with CA certification.',
    meta_keywords: 'gst tds compliance, gst tcs compliance, gstr-7 filing, gstr-8 filing, section 51 gst, section 52 gst, e-commerce tcs india',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses',
    meta_title: 'Business Licenses & Registrations India | GSTBro',
    meta_description: 'End-to-end statutory business licensing services in India. Fast support for Shop Act, Trade License, FSSAI, Udyam MSME, IEC, Professional Tax, DSC & Startup India.',
    meta_keywords: 'business licenses india, commercial permits, company registrations, fssai, udyam, trade license, shop establishment, startup india, iec dgft',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/shop-establishment',
    meta_title: 'Shop and Establishment Act Registration Online | GSTBro',
    meta_description: 'Apply for Shop and Establishment Registration online across all Indian states. 100% compliant documentation, fast government approval, and zero penalty guarantee.',
    meta_keywords: 'shop and establishment registration, shop act license, gumasta license, commercial establishment registration, retail store permit',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/trade-license',
    meta_title: 'Trade License Registration & Municipal Approval | GSTBro',
    meta_description: 'Get your municipal Trade License online with GSTBro. Comprehensive document verification, municipal liaison, and fast issuance for commercial retail & manufacturing.',
    meta_keywords: 'trade license online, municipal trade license, commercial trading permit, municipal corporation license, business trade certificate',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/fssai',
    meta_title: 'FSSAI Food License & Registration Online | GSTBro',
    meta_description: 'Complete FSSAI food business registration and state/central licensing for restaurants, cloud kitchens, manufacturers & retailers. Fast 7-day turnaround.',
    meta_keywords: 'fssai registration, food license online, fssai certificate, cloud kitchen license, food business operator fbo, fssai state license',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/udyam',
    meta_title: 'MSME Udyam Registration Online (Govt Benefits & Subsidies) | GSTBro',
    meta_description: 'Fast MSME / Udyam registration for small businesses, startups and manufacturers. Unlock government subsidies, priority bank lending, and tender exemptions.',
    meta_keywords: 'udyam registration, msme registration online, udyam certificate, micro small medium enterprises, msme loan benefits',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/iec',
    meta_title: 'Import Export Code (IEC) Registration with DGFT | GSTBro',
    meta_description: 'Mandatory 10-digit Import Export Code (IEC) registration from DGFT for global trade and e-commerce exporters. Issued in 1-3 working days.',
    meta_keywords: 'iec registration, import export code online, dgft iec code, export license india, customs clearance iec, international trade permit',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/professional-tax',
    meta_title: 'Professional Tax Registration & PT Return Filing | GSTBro',
    meta_description: 'State-wise Professional Tax (PT) employer registration and enrollment certificate (PTEC & PTRC). Avoid penalty notices with managed compliance.',
    meta_keywords: 'professional tax registration, pt registration online, ptrc ptec, state professional tax, pt return filing india',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/dsc',
    meta_title: 'Digital Signature Certificate (Class 3 DSC) Online | GSTBro',
    meta_description: 'Buy Class 3 Digital Signature Certificate (DSC) with USB crypto token for GST, MCA, Income Tax, and e-Tendering portals. Issued same day.',
    meta_keywords: 'dsc online, class 3 digital signature, digital signature certificate, usb token dsc, mca gst tender dsc',
    robots: 'index, follow',
  },
  {
    route_path: '/services/business-licenses/startup-india',
    meta_title: 'DPIIT Startup India Recognition & Tax Exemptions | GSTBro',
    meta_description: 'Get official DPIIT Startup India recognition, Section 80-IAC tax holiday, angel tax exemption, and seed fund support with expert CA guidance.',
    meta_keywords: 'startup india registration, dpiit recognition, section 80iac exemption, startup tax benefits, government startup scheme',
    robots: 'index, follow',
  },
  {
    route_path: '/pricing',
    meta_title: 'Pricing | GSTBro',
    meta_description: 'Transparent pricing for GST registration, returns, and cancellation services. No hidden fees — know exactly what you pay with GSTBro.',
    meta_keywords: 'gstbro pricing, gst registration price, gst return filing cost',
    robots: 'index, follow',
  },
  {
    route_path: '/how-it-works',
    meta_title: 'How It Works | GSTBro',
    meta_description: 'Simple 4-step process for GST services with GSTBro — sign up, submit documents, we handle compliance, you stay focused on business.',
    meta_keywords: 'gstbro how it works, gst process, gst registration process',
    robots: 'index, follow',
  },
  {
    route_path: '/resources',
    meta_title: 'GST Resources & FAQs | GSTBro',
    meta_description: 'Guides, FAQs, and resources for GST registration, returns, and compliance. Everything you need to know about GST in India.',
    meta_keywords: 'gst faq, gst registration documents, gst guides, gstbro resources',
    robots: 'index, follow',
  },
  {
    route_path: '/contact',
    meta_title: 'Contact GSTBro',
    meta_description: 'Get in touch with GSTBro for GST registration, returns, and cancellation services. We respond within 24 hours.',
    meta_keywords: 'gstbro contact, gst help, gst consultation',
    robots: 'index, follow',
  },
  {
    route_path: '/login',
    meta_title: 'Login | GSTBro Client Portal',
    meta_description: 'Login to your GSTBro client portal to track cases, upload documents, and manage your GST compliance.',
    meta_keywords: 'gstbro login, gst client portal, gstbro sign in',
    robots: 'index, follow',
  },
  {
    route_path: '/signup',
    meta_title: 'Sign Up | GSTBro',
    meta_description: 'Create your GSTBro account to access GST registration, return filing, and cancellation services with expert support.',
    meta_keywords: 'gstbro signup, gstbro register, create gstbro account',
    robots: 'index, follow',
  },
  {
    route_path: '/privacy',
    meta_title: 'Privacy Policy | GSTBro',
    meta_description: 'GSTBro privacy policy — how we collect, use, and protect your personal and business data.',
    meta_keywords: 'privacy policy, gstbro privacy, data protection',
    robots: 'index, follow',
  },
  {
    route_path: '/terms',
    meta_title: 'Terms of Service | GSTBro',
    meta_description: 'GSTBro terms of service — the agreement governing use of our GST services platform.',
    meta_keywords: 'terms of service, gstbro terms, user agreement',
    robots: 'index, follow',
  },
];

async function seed() {
  console.log(`Upserting ${defaultPages.length} routes into page_seo...`);
  for (const page of defaultPages) {
    const { error } = await supabase
      .from('page_seo')
      .upsert(
        {
          route_path: page.route_path,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          meta_keywords: page.meta_keywords,
          canonical_url: `https://gstbro.in${page.route_path === '/' ? '' : page.route_path}`,
          robots: page.robots || 'index, follow',
          og_title: page.meta_title,
          og_description: page.meta_description,
          og_image_url: 'https://gstbro.in/og-default.jpg',
        },
        { onConflict: 'route_path' }
      );
    if (error) {
      console.error(`Error upserting ${page.route_path}:`, error.message);
    } else {
      console.log(`✓ ${page.route_path}`);
    }
  }
  console.log('Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

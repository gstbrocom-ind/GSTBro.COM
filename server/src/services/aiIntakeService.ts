/**
 * GSTBro Day-One AI Client Intake Engine
 * Parses raw messy WhatsApp chats, call notes, or emails into structured client profiles.
 */

export interface ParsedClientIntake {
  tradeName: string;
  legalName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
  address: string;
  constitutionType: 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'OTHER';
  services: string[];
  agreedMonthlyFee: number;
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  previousAuditor: string;
  notes: string;
  extractionConfidence: number;
  detectedEntities: string[];
}

const GST_STATE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

/**
 * Intelligent entity extractor for unstructured Indian business communications
 */
export function parseRawClientNotes(rawText: string): ParsedClientIntake {
  const text = (rawText || '').trim();
  const detectedEntities: string[] = [];

  // 1. Extract GSTIN (15 alphanumeric characters matching Indian GSTIN format)
  const gstinRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i;
  const gstinMatch = text.match(gstinRegex);
  const gstin = gstinMatch ? gstinMatch[1].toUpperCase() : '';
  if (gstin) detectedEntities.push('GSTIN');

  // 2. Extract PAN (10 chars, or derive from GSTIN characters 2 to 12)
  const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/i;
  const panMatch = text.match(panRegex);
  let pan = panMatch ? panMatch[1].toUpperCase() : '';
  if (!pan && gstin && gstin.length === 15) {
    pan = gstin.substring(2, 12);
  }
  if (pan) detectedEntities.push('PAN');

  // 3. Extract State & State Code
  let stateCode = '';
  let state = '';
  if (gstin && gstin.length >= 2) {
    stateCode = gstin.substring(0, 2);
    state = GST_STATE_MAP[stateCode] || '';
  }
  if (!state) {
    for (const [code, sName] of Object.entries(GST_STATE_MAP)) {
      if (new RegExp(`\\b${sName}\\b`, 'i').test(text)) {
        state = sName;
        stateCode = code;
        break;
      }
    }
  }
  if (state) detectedEntities.push('State');

  // 4. Extract Email
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
  const emailMatch = text.match(emailRegex);
  const email = emailMatch ? emailMatch[1].toLowerCase().trim() : '';
  if (email) detectedEntities.push('Email');

  // 5. Extract Phone / Mobile (Indian formats: +91, 0, or bare 10 digits starting with 6-9)
  const phoneRegex = /(?:(?:\+91|91|0)?[-\s]?)?([6-9]\d{4}[-\s]?\d{5})\b/;
  const phoneMatch = text.match(phoneRegex);
  let phone = '';
  if (phoneMatch) {
    phone = phoneMatch[1].replace(/[-\s]/g, '');
    detectedEntities.push('Phone');
  }

  // 6. Extract Agreed Monthly Retainer Fee
  let agreedMonthlyFee = 3000; // default baseline practice retainer
  const feeRegexes = [
    /(?:fee|fees|retainer|charges|amount|price|cost|quote|budget)[:\s]*(?:rs\.?|inr|₹)?\s*([0-9,]+)/i,
    /(?:rs\.?|inr|₹)\s*([0-9,]+)\s*(?:per\s*month|\/pm|\/mo|\/month|monthly|retainer)?/i,
    /([0-9,]+)\s*(?:per\s*month|\/pm|\/mo|\/month|monthly\s*retainer)/i,
  ];

  for (const regex of feeRegexes) {
    const match = text.match(regex);
    if (match) {
      const parsedNum = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(parsedNum) && parsedNum >= 500 && parsedNum <= 500000) {
        agreedMonthlyFee = parsedNum;
        detectedEntities.push('Agreed Fee');
        break;
      }
    }
  }

  // 7. Extract Constitution / Entity Type
  let constitutionType: ParsedClientIntake['constitutionType'] = 'PROPRIETORSHIP';
  if (/pvt\.?\s*ltd|private\s*limited/i.test(text)) {
    constitutionType = 'PRIVATE_LIMITED';
  } else if (/limited\b|public\s*ltd/i.test(text)) {
    constitutionType = 'PUBLIC_LIMITED';
  } else if (/\bllp\b|limited\s*liability\s*partnership/i.test(text)) {
    constitutionType = 'LLP';
  } else if (/partnership|firm\b/i.test(text)) {
    constitutionType = 'PARTNERSHIP';
  } else if (pan && pan.length === 10) {
    const fourthChar = pan[3];
    if (fourthChar === 'C') constitutionType = 'PRIVATE_LIMITED';
    else if (fourthChar === 'F') constitutionType = 'PARTNERSHIP';
    else if (fourthChar === 'P') constitutionType = 'PROPRIETORSHIP';
  }

  // 8. Extract Business / Trade Name & Contact Person
  let tradeName = '';
  let contactPerson = '';

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Look for explicit business name lines
  const bizRegex = /(?:company|business|client|firm|trade|enterprise|m\/s|name)[:\s]+([^,\n]+)/i;
  for (const line of lines) {
    const m = line.match(bizRegex);
    if (m && !m[1].includes('@') && m[1].length > 3) {
      tradeName = m[1].trim().replace(/^m\/s\.?\s*/i, '');
      break;
    }
  }

  // Look for explicit person name
  const personRegex = /(?:contact|person|director|proprietor|partner|owner|speaking\s*to|mr\.|mrs\.|ms\.)[:\s]+([a-zA-Z\s.]+)/i;
  for (const line of lines) {
    const m = line.match(personRegex);
    if (m && m[1].length > 2 && m[1].length < 40) {
      contactPerson = m[1].trim();
      break;
    }
  }

  // Fallback heuristic: First capitalized non-numeric line that isn't a header or label
  if (!tradeName) {
    for (const line of lines) {
      if (
        line.length >= 4 &&
        line.length <= 60 &&
        !line.includes('@') &&
        !/\d{10}/.test(line) &&
        !/gstin|pan|phone|email|fee|dear|hello|hi|sir|madam|regards|thanks/i.test(line)
      ) {
        tradeName = line.replace(/^[-\s*•]+/, '').trim();
        break;
      }
    }
  }

  if (!tradeName) {
    tradeName = contactPerson ? `${contactPerson}'s Enterprise` : 'New Client Enterprise';
  }
  if (!contactPerson) {
    contactPerson = tradeName.replace(/\s+(pvt\.?\s*ltd|ltd|llp|enterprises|consulting|industries|corporation)$/i, '');
  }

  // 9. Detect Requested Services
  const services: string[] = ['GSTR_1', 'GSTR_3B', 'RECONCILIATION_2B']; // Standard core package
  if (/audit|tax\s*audit|3cb|3cd/i.test(text)) {
    services.push('TAX_AUDIT');
  }
  if (/annual\s*return|gstr-?9|9c/i.test(text)) {
    services.push('GSTR_9_ANNUAL');
  }
  if (/tds|tcs|form\s*26q/i.test(text)) {
    services.push('TDS_COMPLIANCE');
  }
  if (/registration|new\s*gst|amendment/i.test(text)) {
    services.push('GST_REGISTRATION');
  }
  if (/notice|scrutiny|appeal|asmt-?10/i.test(text)) {
    services.push('NOTICE_DEFENSE');
  }

  // 10. Extract Previous Auditor (if mentioned)
  let previousAuditor = '';
  const prevAuditorMatch = text.match(/(?:previous|past|earlier|old)\s*(?:auditor|ca|accountant)[:\s]+([^,\n.]+)/i);
  if (prevAuditorMatch) {
    previousAuditor = prevAuditorMatch[1].trim();
    detectedEntities.push('Previous Auditor');
  }

  // Calculate Confidence Score
  let confidenceScore = 0.3; // baseline for unstructured input
  if (gstin) confidenceScore += 0.25;
  if (pan) confidenceScore += 0.15;
  if (phone) confidenceScore += 0.15;
  if (email) confidenceScore += 0.1;
  if (tradeName && tradeName !== 'New Client Enterprise') confidenceScore += 0.05;

  return {
    tradeName,
    legalName: tradeName,
    contactPerson,
    phone,
    email,
    gstin,
    pan,
    state,
    stateCode,
    address: `${state || 'India'}`,
    constitutionType,
    services,
    agreedMonthlyFee,
    billingFrequency: 'MONTHLY',
    previousAuditor,
    notes: text,
    extractionConfidence: Math.min(1.0, Math.round(confidenceScore * 100) / 100),
    detectedEntities,
  };
}

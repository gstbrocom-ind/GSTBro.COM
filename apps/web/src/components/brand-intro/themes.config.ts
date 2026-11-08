export type ThemeCategory = 'festival' | 'national_day' | 'tax_ca_day' | 'corporate';
export type FxType =
  | 'none'
  | 'fireworks'
  | 'petals_marigold'
  | 'petals_jasmine'
  | 'petals_rose'
  | 'petals_mixed'
  | 'flag_india'
  | 'flag_uae'
  | 'flag_usa'
  | 'flag_singapore'
  | 'flag_ca_day';

export interface FestivalThemeConfig {
  id: string;
  name: string;
  category: ThemeCategory;
  badge: string;
  greeting: string;
  tagline: string;
  bgGradient: string;
  accentColor: string;
  trailColors: [string, string];
  particleColors: string[];
  fxType: FxType;
  flagCountry?: 'india' | 'uae' | 'usa' | 'singapore' | 'ca_day';
  icon?: string;
  activePeriod?: {
    startMonth: number; // 1-12
    startDay: number;
    endMonth: number;
    endDay: number;
  };
}

export const FESTIVAL_THEMES: Record<string, FestivalThemeConfig> = {
  // 1. DEFAULT CORPORATE (YEAR ROUND)
  corporate: {
    id: 'corporate',
    name: 'Default Corporate',
    category: 'corporate',
    badge: 'Institutional Indirect Tax Infrastructure',
    greeting: 'Your Trusted GST Partner',
    tagline: 'Trust • Transparency • Commitment',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #07173D 0%, #030C22 55%, #01050F 100%)',
    accentColor: '#F59E0B',
    trailColors: ['#06B6D4', '#2563EB'],
    particleColors: ['#38BDF8', '#60A5FA', '#FBBF24', '#E0F2FE'],
    fxType: 'none',
    icon: '⚡',
  },

  // 2. DIWALI (FESTIVAL OF LIGHTS - WITH CRACKERS & FOUNTAIN SPARK SHELLS)
  diwali: {
    id: 'diwali',
    name: 'Diwali Celebration',
    category: 'festival',
    badge: 'Festival of Lights & Prosperity',
    greeting: 'Wishing You a Prosperous Diwali',
    tagline: 'Powering Indian Business Growth & Abundance',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #2A0845 0%, #150024 55%, #07000C 100%)',
    accentColor: '#FBBF24',
    trailColors: ['#F59E0B', '#DC2626'],
    particleColors: ['#FDE68A', '#F59E0B', '#EF4444', '#FCD34D', '#F43F5E'],
    fxType: 'fireworks',
    icon: '🪔',
    activePeriod: {
      startMonth: 10,
      startDay: 15,
      endMonth: 11,
      endDay: 15,
    },
  },

  // 3. NEW YEAR (CELEBRATORY SPARKS & CHAMPAGNE FIREWORKS)
  new_year: {
    id: 'new_year',
    name: 'Happy New Year',
    category: 'festival',
    badge: 'Statutory Excellence & Fresh Milestones',
    greeting: 'Happy New Year',
    tagline: 'Elevate Your Business Compliance in 2026',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #0A1931 0%, #050E1D 55%, #01040A 100%)',
    accentColor: '#FCD34D',
    trailColors: ['#FCD34D', '#38BDF8'],
    particleColors: ['#F8FAFC', '#FCD34D', '#93C5FD', '#CBD5E1', '#E2E8F0'],
    fxType: 'fireworks',
    icon: '✨',
    activePeriod: {
      startMonth: 12,
      startDay: 28,
      endMonth: 1,
      endDay: 6,
    },
  },

  // 4. INDIA INDEPENDENCE DAY (15th AUGUST - TRICOLOR SILK FLAG & SAFFRON ROCKETS)
  independence_day: {
    id: 'independence_day',
    name: 'Independence Day (15th Aug)',
    category: 'national_day',
    badge: '79th Independence Day • Atmanirbhar Bharat',
    greeting: 'Happy Independence Day',
    tagline: 'Proudly Safeguarding Indian Enterprise Compliance',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #0C1E3C 0%, #061124 55%, #020710 100%)',
    accentColor: '#FB923C',
    trailColors: ['#F97316', '#10B981'],
    particleColors: ['#FB923C', '#FFFFFF', '#34D399', '#38BDF8'],
    fxType: 'flag_india',
    flagCountry: 'india',
    icon: '🇮🇳',
    activePeriod: {
      startMonth: 8,
      startDay: 10,
      endMonth: 8,
      endDay: 18,
    },
  },

  // 5. INDIA REPUBLIC DAY (26th JANUARY - CONSTITUTIONAL TRICOLOR)
  republic_day: {
    id: 'republic_day',
    name: 'Republic Day (26th Jan)',
    category: 'national_day',
    badge: 'Constitutional Indirect Tax Governance',
    greeting: 'Happy Republic Day',
    tagline: 'Committed to India’s Economic Integrity & Growth',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #0B1C38 0%, #050F21 55%, #01050D 100%)',
    accentColor: '#38BDF8',
    trailColors: ['#F97316', '#10B981'],
    particleColors: ['#FB923C', '#FFFFFF', '#10B981', '#60A5FA'],
    fxType: 'flag_india',
    flagCountry: 'india',
    icon: '🇮🇳',
    activePeriod: {
      startMonth: 1,
      startDay: 20,
      endMonth: 1,
      endDay: 28,
    },
  },

  // 6. ONAM HARVEST (JASMINE & KASAVU FLOWER PETAL SHOWER)
  onam: {
    id: 'onam',
    name: 'Onam Harvest',
    category: 'festival',
    badge: 'Harvest of Prosperity & Abundance',
    greeting: 'Happy Onam Wishes',
    tagline: 'Wishing Boundless Prosperity to All Enterprises',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #06281E 0%, #03140F 55%, #010604 100%)',
    accentColor: '#F59E0B',
    trailColors: ['#10B981', '#F59E0B'],
    particleColors: ['#34D399', '#FBBF24', '#FDE68A', '#A7F3D0'],
    fxType: 'petals_jasmine',
    icon: '🌸',
    activePeriod: {
      startMonth: 8,
      startDay: 25,
      endMonth: 9,
      endDay: 10,
    },
  },

  // 7. DUSSEHRA & NAVRATRI (MARIGOLD FLOWER SHOWER & VICTORY AURA)
  dussehra: {
    id: 'dussehra',
    name: 'Dussehra & Navratri',
    category: 'festival',
    badge: 'Victory of Truth & Enterprise Milestones',
    greeting: 'Subho Bijoya & Happy Dussehra',
    tagline: 'May Every Audit & Business Goal Triumph',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #251003 0%, #160701 55%, #0A0200 100%)',
    accentColor: '#F59E0B',
    trailColors: ['#F59E0B', '#DC2626'],
    particleColors: ['#FBBF24', '#EA580C', '#FCD34D', '#EF4444'],
    fxType: 'petals_marigold',
    icon: '🏹',
    activePeriod: {
      startMonth: 9,
      startDay: 25,
      endMonth: 10,
      endDay: 14,
    },
  },

  // 8. HOLI (FESTIVAL OF COLORS - ORGANIC GULAL SMOKE EMBER SHOWER)
  holi: {
    id: 'holi',
    name: 'Holi Festival of Colors',
    category: 'festival',
    badge: 'Celebration of Harmony & Vivid Growth',
    greeting: 'Happy Holi Wishes',
    tagline: 'Adding Vibrant Growth & Financial Clarity to Your Books',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #280826 0%, #150214 55%, #080007 100%)',
    accentColor: '#F43F5E',
    trailColors: ['#EC4899', '#06B6D4'],
    particleColors: ['#EC4899', '#38BDF8', '#FBBF24', '#10B981', '#A855F7'],
    fxType: 'petals_mixed',
    icon: '🎨',
    activePeriod: {
      startMonth: 3,
      startDay: 15,
      endMonth: 3,
      endDay: 28,
    },
  },

  // 9. MAKAR SANKRANTI / PONGAL / UGADI (GOLDEN HARVEST)
  pongal_sankranti: {
    id: 'pongal_sankranti',
    name: 'Makar Sankranti & Pongal',
    category: 'festival',
    badge: 'Auspicious Solar Transition & Harvest',
    greeting: 'Happy Makar Sankranti & Pongal',
    tagline: 'Harvesting Greater Profits & Seamless Compliance',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #2B1D04 0%, #170E01 55%, #0B0600 100%)',
    accentColor: '#F59E0B',
    trailColors: ['#FBBF24', '#38BDF8'],
    particleColors: ['#FDE68A', '#F59E0B', '#60A5FA', '#34D399'],
    fxType: 'petals_marigold',
    icon: '🪁',
    activePeriod: {
      startMonth: 1,
      startDay: 12,
      endMonth: 1,
      endDay: 18,
    },
  },

  // 10. EID AL-FITR / EID AL-ADHA (CRESCENT & GOLD STARS)
  eid: {
    id: 'eid',
    name: 'Eid Mubarak',
    category: 'festival',
    badge: 'Peace, Abundance & Generosity',
    greeting: 'Eid Mubarak Wishes',
    tagline: 'May Peace, Prosperity & Growth Bless Your Enterprise',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #04251B 0%, #01140E 55%, #000705 100%)',
    accentColor: '#FCD34D',
    trailColors: ['#10B981', '#FCD34D'],
    particleColors: ['#34D399', '#FCD34D', '#E0F2FE', '#6EE7B7'],
    fxType: 'petals_rose',
    icon: '🌙',
    activePeriod: {
      startMonth: 3,
      startDay: 29,
      endMonth: 4,
      endDay: 10,
    },
  },

  // 11. CHRISTMAS & YEAR-END (FALLING CRYSTALLINE SNOWFLAKES)
  christmas: {
    id: 'christmas',
    name: 'Merry Christmas',
    category: 'festival',
    badge: 'Joy, Fellowship & Year-End Preparedness',
    greeting: 'Merry Christmas & Joyful Wishes',
    tagline: 'Closing Q3 with Accurate Books & Peace of Mind',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #1F070A 0%, #100305 55%, #070102 100%)',
    accentColor: '#EF4444',
    trailColors: ['#DC2626', '#10B981'],
    particleColors: ['#FFFFFF', '#F87171', '#34D399', '#FEE2E2'],
    fxType: 'petals_jasmine',
    icon: '🎄',
    activePeriod: {
      startMonth: 12,
      startDay: 20,
      endMonth: 12,
      endDay: 27,
    },
  },

  // 12. USA INDEPENDENCE DAY (4th OF JULY - STAR-SPANGLED CROSS-BORDER PARTNERS)
  usa_independence: {
    id: 'usa_independence',
    name: 'USA 4th of July',
    category: 'national_day',
    badge: 'Saluting US-India Tech & Export Partners',
    greeting: 'Happy 4th of July',
    tagline: 'Powering Bilateral Cross-Border Software & MSME Trade',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #071536 0%, #030A1F 55%, #01040F 100%)',
    accentColor: '#EF4444',
    trailColors: ['#2563EB', '#EF4444'],
    particleColors: ['#FFFFFF', '#EF4444', '#60A5FA', '#F8FAFC'],
    fxType: 'flag_usa',
    flagCountry: 'usa',
    icon: '🇺🇸',
    activePeriod: {
      startMonth: 7,
      startDay: 2,
      endMonth: 7,
      endDay: 6,
    },
  },

  // 13. UAE NATIONAL DAY (2nd DECEMBER - GULF NRI ENTERPRISES)
  uae_national_day: {
    id: 'uae_national_day',
    name: 'UAE National Day (2nd Dec)',
    category: 'national_day',
    badge: 'Celebrating UAE-India Trade & Enterprise',
    greeting: 'Happy UAE National Day',
    tagline: 'Dedicated Indirect Tax Infrastructure for Gulf NRI Businesses',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #062217 0%, #02120C 55%, #000704 100%)',
    accentColor: '#10B981',
    trailColors: ['#EF4444', '#10B981'],
    particleColors: ['#EF4444', '#10B981', '#FFFFFF', '#F59E0B'],
    fxType: 'flag_uae',
    flagCountry: 'uae',
    icon: '🇦🇪',
    activePeriod: {
      startMonth: 11,
      startDay: 30,
      endMonth: 12,
      endDay: 4,
    },
  },

  // 14. SINGAPORE NATIONAL DAY (9th AUGUST - ASEAN TRADE)
  singapore_national_day: {
    id: 'singapore_national_day',
    name: 'Singapore National Day (9th Aug)',
    category: 'national_day',
    badge: 'Partnering with Southeast Asian Indian Traders',
    greeting: 'Happy Singapore National Day',
    tagline: 'Facilitating Seamless Cross-Border GST & Duty Compliance',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #200508 0%, #100204 55%, #060102 100%)',
    accentColor: '#EF4444',
    trailColors: ['#EF4444', '#FFFFFF'],
    particleColors: ['#EF4444', '#FFFFFF', '#FDA4AF', '#F8FAFC'],
    fxType: 'flag_singapore',
    flagCountry: 'singapore',
    icon: '🇸🇬',
    activePeriod: {
      startMonth: 8,
      startDay: 7,
      endMonth: 8,
      endDay: 11,
    },
  },

  // 15. NATIONAL CA DAY & GST DAY (1st JULY - ICAI CHARTERED ACCOUNTANT HOMAGE)
  gst_ca_day: {
    id: 'gst_ca_day',
    name: 'National CA Day & GST Day (1st July)',
    category: 'tax_ca_day',
    badge: 'Pillars of Indian Economy • ICAI Governance',
    greeting: 'Happy National CA Day & GST Day',
    tagline: 'Honoring Chartered Accountants & Historic Indirect Tax Reform',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #1C1502 0%, #0E0A00 55%, #050300 100%)',
    accentColor: '#F59E0B',
    trailColors: ['#F59E0B', '#38BDF8'],
    particleColors: ['#FCD34D', '#F59E0B', '#93C5FD', '#FFFFFF'],
    fxType: 'flag_ca_day',
    flagCountry: 'ca_day',
    icon: '⚖️',
    activePeriod: {
      startMonth: 6,
      startDay: 29,
      endMonth: 7,
      endDay: 4,
    },
  },

  // 16. NEW FINANCIAL YEAR (1st APRIL - AUSPICIOUS SHUBH LABH & BOOKS START)
  new_fiscal_year: {
    id: 'new_fiscal_year',
    name: 'New Financial Year (1st April)',
    category: 'tax_ca_day',
    badge: 'Auspicious Fiscal Year Kickoff',
    greeting: 'Auspicious New Financial Year',
    tagline: 'Fresh Books, Zero Late Fees & 100% Reconciled Returns',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #031D2E 0%, #010E18 55%, #00060B 100%)',
    accentColor: '#F59E0B',
    trailColors: ['#06B6D4', '#F59E0B'],
    particleColors: ['#38BDF8', '#FCD34D', '#6EE7B7', '#FFFFFF'],
    fxType: 'petals_marigold',
    icon: '💼',
    activePeriod: {
      startMonth: 3,
      startDay: 30,
      endMonth: 4,
      endDay: 7,
    },
  },

  // 17. UNION BUDGET DAY (1st FEBRUARY - ECONOMIC ROADMAP)
  budget_day: {
    id: 'budget_day',
    name: 'Union Budget Day (1st Feb)',
    category: 'tax_ca_day',
    badge: 'National Fiscal Policy & Reform Blueprint',
    greeting: 'Union Budget Day Analysis',
    tagline: 'Delivering Strategic Indirect Tax Clarity for Enterprises',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #071E3D 0%, #030F21 55%, #010610 100%)',
    accentColor: '#38BDF8',
    trailColors: ['#2563EB', '#10B981'],
    particleColors: ['#60A5FA', '#34D399', '#FBBF24', '#FFFFFF'],
    fxType: 'fireworks',
    icon: '📊',
    activePeriod: {
      startMonth: 1,
      startDay: 31,
      endMonth: 2,
      endDay: 3,
    },
  },
};

/**
 * Resolves active theme based on admin setting or automatic calendar matching.
 */
export function resolveActiveTheme(
  adminThemeSetting: string = 'auto',
  now: Date = new Date()
): FestivalThemeConfig {
  if (adminThemeSetting && adminThemeSetting !== 'auto' && FESTIVAL_THEMES[adminThemeSetting]) {
    return FESTIVAL_THEMES[adminThemeSetting];
  }

  // Automatic calendar date matching across all Indian & International events
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  for (const theme of Object.values(FESTIVAL_THEMES)) {
    if (theme.activePeriod) {
      const { startMonth, startDay, endMonth, endDay } = theme.activePeriod;
      if (startMonth === endMonth) {
        if (month === startMonth && day >= startDay && day <= endDay) {
          return theme;
        }
      } else {
        // Crosses month boundary (e.g. Dec 28 - Jan 6)
        if (startMonth > endMonth) {
          if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
            return theme;
          }
        } else {
          if (
            (month === startMonth && day >= startDay) ||
            (month > startMonth && month < endMonth) ||
            (month === endMonth && day <= endDay)
          ) {
            return theme;
          }
        }
      }
    }
  }

  return FESTIVAL_THEMES.corporate;
}

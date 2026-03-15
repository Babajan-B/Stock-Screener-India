export interface SectorDefinition {
  slug: string;
  name: string;
  description: string;
  symbols: string[];
  accent: string;
}

export const SECTOR_DEFINITIONS: SectorDefinition[] = [
  {
    slug: 'banking',
    name: 'Banking',
    description: 'Large private and public banks with strong retail and corporate lending footprints.',
    symbols: ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK', 'INDUSINDBK'],
    accent: '#22c55e',
  },
  {
    slug: 'it',
    name: 'IT Services',
    description: 'Large-cap software services and digital transformation leaders.',
    symbols: ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM', 'LTIM'],
    accent: '#0ea5e9',
  },
  {
    slug: 'auto',
    name: 'Automobiles',
    description: 'Passenger vehicles, commercial vehicles, and auto platform leaders.',
    symbols: ['MARUTI', 'TATAMOTORS', 'M&M', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT'],
    accent: '#f97316',
  },
  {
    slug: 'energy',
    name: 'Energy & Utilities',
    description: 'Integrated energy, power, and utility majors tied to India growth and infrastructure.',
    symbols: ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'COALINDIA', 'ADANIPOWER'],
    accent: '#eab308',
  },
  {
    slug: 'pharma',
    name: 'Pharma & Healthcare',
    description: 'Drug makers, hospital operators, and healthcare compounders.',
    symbols: ['SUNPHARMA', 'CIPLA', 'DRREDDY', 'DIVISLAB', 'LUPIN', 'MAXHEALTH'],
    accent: '#ec4899',
  },
  {
    slug: 'fmcg',
    name: 'FMCG & Consumption',
    description: 'Defensive consumer franchises with broad household brand exposure.',
    symbols: ['ITC', 'HINDUNILVR', 'NESTLEIND', 'DABUR', 'GODREJCP', 'TATACONSUM'],
    accent: '#a855f7',
  },
];

export const SECTOR_MAP = Object.fromEntries(
  SECTOR_DEFINITIONS.map((sector) => [sector.slug, sector])
) as Record<string, SectorDefinition>;

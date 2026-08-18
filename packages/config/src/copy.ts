export const HOME_PATHS = [
  {
    href: '/professionals',
    title: 'Verify an investment professional',
    body: 'Research registration, firm relationships, and official disclosures.',
    status: 'foundation' as const,
  },
  {
    href: '/firms',
    title: 'Research an investment firm',
    body: 'Understand registration, business practices, fees, conflicts, and regulatory evidence.',
    status: 'foundation' as const,
  },
  {
    href: '/tools',
    title: 'Understand what you are paying',
    body: 'Future Advisor Fee Decoder — translate fee language into dollars under stated assumptions.',
    status: 'coming_soon' as const,
  },
  {
    href: '/tools',
    title: 'Understand what you own',
    body: 'Future Portfolio X-Ray — holdings, overlap, and fund evidence. Not a buy/sell engine.',
    status: 'coming_soon' as const,
  },
  {
    href: '/tools',
    title: 'Explore retirement decisions',
    body: 'Future Retirement Scenario Lab — assumptions in, scenarios out. You decide.',
    status: 'coming_soon' as const,
  },
  {
    href: '/research',
    title: 'Research an investment offer',
    body: 'Future verification workflow for pitches, solicitations, and product claims.',
    status: 'coming_soon' as const,
  },
] as const;

export const WHAT_WE_ARE_NOT = [
  'Not a stock-picking service',
  'Not an investment recommendation engine',
  'Not an advisor lead-generation marketplace',
  'Not a ranking or paid-placement directory',
  'Not a brokerage or robo-advisor',
  'Not a financial-advice service',
  'Not a generic finance blog',
] as const;

export const DECISION_LAB_TOOLS = [
  {
    slug: 'advisor-fee-decoder',
    name: 'Advisor Fee Decoder',
    purpose: 'Translate advisory fee language into dollar estimates under user-stated assumptions.',
  },
  {
    slug: 'portfolio-xray',
    name: 'Portfolio X-Ray / Fund Overlap',
    purpose: 'Show what a portfolio actually holds and where funds overlap.',
  },
  {
    slug: 'statement-analyzer',
    name: 'Investment Statement Analyzer',
    purpose: 'Help a consumer organize statement facts. No account aggregation in Task 001.',
  },
  {
    slug: 'can-i-retire-yet',
    name: 'Can I Retire Yet?',
    purpose: 'Scenario framing around spending, horizon, and withdrawal assumptions.',
  },
  {
    slug: 'retirement-scenario-lab',
    name: 'Retirement Scenario Lab',
    purpose: 'Compare user-selected retirement assumptions side by side.',
  },
  {
    slug: 'social-security-claiming',
    name: 'Social Security Claiming Explorer',
    purpose: 'Show claiming-age math. Not a claim that a person should file at a given age.',
  },
  {
    slug: 'roth-conversion',
    name: 'Roth Conversion Explorer',
    purpose: 'Show tax-year scenarios. Not advice to convert a specific amount.',
  },
  {
    slug: 'rmd-forecast',
    name: 'RMD Forecast',
    purpose: 'Project required minimum distributions from stated balances and tables.',
  },
  {
    slug: 'irmaa-watch',
    name: 'IRMAA Watch',
    purpose: 'Explain Medicare IRMAA brackets against stated income assumptions.',
  },
  {
    slug: 'retirement-paycheck',
    name: 'Retirement Paycheck Builder',
    purpose: 'Assemble income sources into a monthly picture under assumptions.',
  },
  {
    slug: '401k-xray',
    name: '401(k) X-Ray',
    purpose: 'Research plan lineup options from public and user-provided facts.',
  },
  {
    slug: 'sequence-risk',
    name: 'Market Crash / Sequence-Risk Stress Test',
    purpose: 'Show path-dependency under stated crash and withdrawal assumptions.',
  },
  {
    slug: 'offer-analyzer',
    name: 'Investment Offer Analyzer',
    purpose: 'A research checklist for an unsolicited or marketed investment offer.',
  },
  {
    slug: 'annuity-decoder',
    name: 'Annuity / Structured Product Decoder',
    purpose: 'Translate product features into plain-language questions and source facts.',
  },
  {
    slug: 'retirement-location',
    name: 'Retirement Location Comparison',
    purpose: 'Compare tax and cost assumptions across user-selected locations.',
  },
] as const;

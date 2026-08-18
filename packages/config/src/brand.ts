/**
 * InvestorTrustHub vertical identity inside the AskTrustHub family.
 *
 * Shared family tokens: navy #0A2540, ink #1E293B, border #E2E8F0.
 * Vertical accent: Ledger Teal — calm stewardship, not market-ticker green.
 */

export const BRAND = {
  name: 'InvestorTrustHub',
  networkName: 'AskTrustHub',
  tagline: 'Research before you invest.',
  philosophy: 'We organize the evidence. The consumer decides.',
  layerLabel: 'Investing & retirement research',
  navy: '#0A2540',
  ink: '#1E293B',
  canvas: '#F6F4EF',
  paper: '#FFFCF7',
  white: '#FFFFFF',
  border: '#E2E8F0',
  teal: '#0F766E',
  tealDeep: '#115E59',
  tealSoft: '#CCFBF1',
  tealMist: '#F0FDFA',
  bronze: '#92400E',
  bronzeSoft: '#FEF3C7',
  conflict: '#9F1239',
  conflictSoft: '#FFE4E6',
} as const;

export const NETWORK_LINKS = [
  { id: 'ask', label: 'AskTrustHub', href: 'https://www.asktrusthub.com' },
  { id: 'insurance', label: 'InsuranceTrustHub', href: 'https://www.insurancetrusthub.com' },
  { id: 'contractor', label: 'ContractorTrustHub', href: 'https://www.contractortrusthub.com' },
  { id: 'lender', label: 'LenderTrustHub', href: 'https://www.lendertrusthub.com' },
] as const;

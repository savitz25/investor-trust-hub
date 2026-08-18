/**
 * InvestorTrustHub vertical identity inside the AskTrustHub family.
 *
 * Shared family tokens: navy #0A2540, ink #1E293B, border #E2E8F0.
 * UI chrome accent stays Ledger Teal. The official lockup uses sampled
 * logo greens/navy and the four molecular node colors — do not recolor
 * those nodes in full-color artwork.
 */

export const BRAND = {
  name: 'InvestorTrustHub',
  networkName: 'AskTrustHub',
  tagline: 'Research before you invest.',
  lockupTagline: 'Research smarter. Invest better.',
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
  logoNavy: '#001F52',
  logoGreenTop: '#12D63A',
  logoGreenBottom: '#006C14',
  logoGreenMid: '#00A828',
  logoGreenTag: '#0A8A18',
  nodeOrange: '#FB7307',
  nodeBlue: '#0083FC',
  nodeTeal: '#01A199',
  nodePurple: '#641FFB',
} as const;

export const NETWORK_LINKS = [
  { id: 'ask', label: 'AskTrustHub', href: 'https://www.asktrusthub.com' },
  { id: 'insurance', label: 'InsuranceTrustHub', href: 'https://www.insurancetrusthub.com' },
  { id: 'contractor', label: 'ContractorTrustHub', href: 'https://www.contractortrusthub.com' },
  { id: 'lender', label: 'LenderTrustHub', href: 'https://www.lendertrusthub.com' },
] as const;

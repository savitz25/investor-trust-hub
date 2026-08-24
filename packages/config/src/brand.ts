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
  publicContactEmail: 'hello@asktrusthub.com',
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

export const ASK_NETWORK_STANDARD_VERSION = '2026.08.18-network-v2';
export const ASK_NETWORK_STANDARD_URL = 'https://www.asktrusthub.com/methodology';
export const ASK_NETWORK_OWNERSHIP_SHORT =
  'Common ownership · Separated research and listing order · No paid placements';

export const NETWORK_LINKS = [
  { id: 'ask', label: 'Ask Trust Hub', href: 'https://www.asktrusthub.com', blurb: 'Parent research & standards layer' },
  { id: 'move', label: 'Move Trust Hub', href: 'https://www.movetrusthub.com', blurb: 'FMCSA / SAFER mover research' },
  { id: 'lender', label: 'Lender Trust Hub', href: 'https://www.lendertrusthub.com', blurb: 'NMLS / CFPB / FDIC financing research' },
  { id: 'insurance', label: 'Insurance Trust Hub', href: 'https://www.insurancetrusthub.com', blurb: 'State DOI / NAIC coverage research' },
  { id: 'contractor', label: 'Contractor Trust Hub', href: 'https://www.contractortrusthub.com', blurb: 'State licensing-board contractor research' },
  { id: 'senior', label: 'SeniorTrustHub', href: 'https://www.seniortrusthub.com', blurb: 'CMS / supported state senior-care research' },
  { id: 'investor', label: 'InvestorTrustHub', href: 'https://www.investortrusthub.com', blurb: 'SEC / IARD investment-firm research' },
] as const;

import { parsePublicEnv } from '@ith/config';

export function getSiteEnv() {
  return parsePublicEnv();
}

export const SITE_NAME = 'InvestorTrustHub';
export const SITE_DESCRIPTION =
  'Research investment professionals, firms, fees, and financial decisions using regulatory and public-source evidence.';

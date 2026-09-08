export type InvestorSearchAnalytics = {
  hub: 'investor'; intent: string; firmClass: string; state: string; hasIdentifier: boolean;
  identifierType: 'firm_crd' | 'sec_file_number' | 'none'; raumBand: string; compensationMethod: string;
  affiliation: string; evidenceFamily: string; coverageState: string; resultCountBucket?: string;
};
export function resultCountBucket(count: number) { return count === 0 ? '0' : count === 1 ? '1' : count <= 10 ? '2-10' : count <= 50 ? '11-50' : '51+'; }

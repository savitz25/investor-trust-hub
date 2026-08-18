import type { RegistrationStatusValue } from './status';

export const CONSUMER_FIRM_CLASSES = [
  'reported_as_registered',
  'pending_120_day',
  'exempt_reporting_adviser',
] as const;

export type ConsumerFirmClass = (typeof CONSUMER_FIRM_CLASSES)[number];

export interface ConsumerClassification {
  class: ConsumerFirmClass;
  headline: string;
  supportingCopy: string;
  registrationType: 'registered_investment_adviser' | 'exempt_reporting_adviser';
  registrationStatus: Extract<RegistrationStatusValue, 'registered' | 'pending' | 'reporting'>;
}

export function classifyConsumerFirm(input: {
  registrationType: string | null | undefined;
  registrationStatus: string | null | undefined;
  sourceStatusText?: string | null;
}): ConsumerClassification | null {
  const type = (input.registrationType ?? '').trim();
  const status = (input.registrationStatus ?? '').trim();
  const source = (input.sourceStatusText ?? '').trim().toLowerCase();

  if (type === 'exempt_reporting_adviser') {
    return {
      class: 'exempt_reporting_adviser',
      headline: 'Exempt Reporting Adviser',
      supportingCopy:
        'The cited SEC/IARD dataset reports this firm as an Exempt Reporting Adviser. That is a different regulatory category from a registered investment adviser. It is not SEC approval, endorsement, or a finding that the firm is trustworthy.',
      registrationType: 'exempt_reporting_adviser',
      registrationStatus: 'reporting',
    };
  }

  if (type === 'registered_investment_adviser') {
    if (status === 'pending' || source === '120-day approval') {
      return {
        class: 'pending_120_day',
        headline: 'Pending / 120-Day Approval',
        supportingCopy:
          'The cited SEC/IARD source reports a 120-Day Approval or other pending status as of the source date shown. That is not a current “reported as registered” status, and it is not SEC endorsement.',
        registrationType: 'registered_investment_adviser',
        registrationStatus: 'pending',
      };
    }
    if (status === 'registered') {
      return {
        class: 'reported_as_registered',
        headline: 'Reported as registered',
        supportingCopy:
          "The firm's Form ADV/IARD record in the cited SEC dataset reports it as a registered investment adviser as of the source date shown. That is not SEC approval, certification, endorsement, or a finding that the firm is safe or trustworthy.",
        registrationType: 'registered_investment_adviser',
        registrationStatus: 'registered',
      };
    }
  }

  return null;
}

export const REGISTRATION_EXPLAINERS = [
  {
    id: 'ria',
    title: 'What is an RIA?',
    body: 'A registered investment adviser is a firm whose Form ADV/IARD record reports it as registered with the SEC or, in other contexts, a state. InvestorTrustHub shows what the cited official dataset reports. Registration is a regulatory category, not a quality rating.',
  },
  {
    id: 'era',
    title: 'What is an Exempt Reporting Adviser?',
    body: 'An Exempt Reporting Adviser files a limited Form ADV report because it qualifies for an exemption from full SEC registration. It is not a registered investment adviser. Exemption from full registration is not a finding of safety, quality, or honesty.',
  },
  {
    id: 'crd',
    title: 'What is a CRD number?',
    body: 'A CRD number is the Central Registration Depository identifier assigned to a firm or individual in the IARD/CRD system. InvestorTrustHub uses the firm CRD as the stable identity key. A CRD is an identifier, not an endorsement.',
  },
  {
    id: 'sec-file',
    title: 'What is an SEC file number?',
    body: 'An SEC file number (often beginning 801- for registered advisers or 802- for exempt reporting advisers) is an official file identifier in SEC/IARD records. If this source record does not include one, that absence is not proof that no file number exists in another source.',
  },
  {
    id: 'reported-as-registered',
    title: 'What does “reported as registered” mean?',
    body: 'It means the cited official dataset reports the firm as a registered investment adviser as of the source date. It does not mean InvestorTrustHub or the SEC approved, certified, or recommended the firm.',
  },
  {
    id: 'not-mean',
    title: 'What does it NOT mean?',
    body: 'Registration does not establish investment quality, performance, honesty, suitability, low risk, fiduciary compliance in every circumstance, or the absence of regulatory problems. Missing research is not a clean record.',
  },
] as const;

export const NOT_YET_RESEARCHED_ITEMS = [
  'Individual professionals associated with this firm',
  'FINRA BrokerCheck research',
  'Detailed disciplinary history',
  'State-specific enforcement records',
  'Fund and product relationships',
  'Investment performance',
  'Portfolio holdings',
  'Consumer reviews',
] as const;

export const US_STATE_CODES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DC',
  'DE',
  'FL',
  'GA',
  'HI',
  'IA',
  'ID',
  'IL',
  'IN',
  'KS',
  'KY',
  'LA',
  'MA',
  'MD',
  'ME',
  'MI',
  'MN',
  'MO',
  'MS',
  'MT',
  'NC',
  'ND',
  'NE',
  'NH',
  'NJ',
  'NM',
  'NV',
  'NY',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VA',
  'VT',
  'WA',
  'WI',
  'WV',
  'WY',
] as const;

export type UsStateCode = (typeof US_STATE_CODES)[number];

export function isUsStateCode(value: string | null | undefined): value is UsStateCode {
  if (!value) return false;
  return (US_STATE_CODES as readonly string[]).includes(value.trim().toUpperCase());
}

export function displayCountry(normalized: string | null | undefined): {
  code: string | null;
  label: string;
  usable: boolean;
} {
  const code = (normalized ?? '').trim().toUpperCase();
  if (!code || code === 'ZZ') {
    return {
      code: null,
      label: 'Country not normalized from source record',
      usable: false,
    };
  }
  if (code === 'US') {
    return { code: 'US', label: 'United States', usable: true };
  }
  return { code, label: code, usable: true };
}

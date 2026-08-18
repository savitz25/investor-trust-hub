import { z } from 'zod';
import { REGISTRATION_STATUSES } from './status';

export const REGISTRATION_TYPES = [
  'investment_adviser_representative',
  'broker',
  'registered_investment_adviser',
  'exempt_reporting_adviser',
  'broker_dealer',
  'commodity_trading_adviser',
  'commodity_pool_operator',
  'futures_commission_merchant',
  'introducing_broker',
  'associated_person',
  'other',
] as const;

export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const REGISTRATION_TYPE_LABELS: Record<RegistrationType, string> = {
  investment_adviser_representative: 'Investment adviser representative',
  broker: 'Broker / registered representative',
  registered_investment_adviser: 'Registered investment adviser',
  exempt_reporting_adviser: 'Exempt reporting adviser',
  broker_dealer: 'Broker-dealer',
  commodity_trading_adviser: 'Commodity trading adviser',
  commodity_pool_operator: 'Commodity pool operator',
  futures_commission_merchant: 'Futures commission merchant',
  introducing_broker: 'Introducing broker',
  associated_person: 'Associated person',
  other: 'Other registration',
};

export const SUBJECT_KINDS = ['person', 'firm', 'product', 'issuer', 'branch'] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

export const registrationSchema = z
  .object({
    id: z.string().uuid(),
    subjectKind: z.enum(['person', 'firm']),
    personId: z.string().uuid().optional(),
    firmId: z.string().uuid().optional(),
    regulatorAuthorityId: z.string().min(1),
    registrationType: z.enum(REGISTRATION_TYPES),
    status: z.enum(REGISTRATION_STATUSES),
    commencedOn: z.string().date().optional(),
    endedOn: z.string().date().optional(),
    isCurrent: z.boolean(),
    evidenceId: z.string().uuid().optional(),
    isSynthetic: z.boolean(),
  })
  .superRefine((row, ctx) => {
    if (row.subjectKind === 'person' && !row.personId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['personId'],
        message: 'Person registrations require personId',
      });
    }
    if (row.subjectKind === 'firm' && !row.firmId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firmId'],
        message: 'Firm registrations require firmId',
      });
    }
  });

export type Registration = z.infer<typeof registrationSchema>;

export const personFirmAssociationSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  firmId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  role: z.string().min(1).max(120),
  startedOn: z.string().date().optional(),
  endedOn: z.string().date().optional(),
  isCurrent: z.boolean(),
  evidenceId: z.string().uuid().optional(),
  isSynthetic: z.boolean(),
});

export type PersonFirmAssociation = z.infer<typeof personFirmAssociationSchema>;

export const DISCLOSURE_EVENT_KINDS = [
  'regulatory',
  'civil',
  'criminal',
  'customer_complaint',
  'termination',
  'financial',
  'investigation',
  'other',
] as const;

export type DisclosureEventKind = (typeof DISCLOSURE_EVENT_KINDS)[number];

export const DISCLOSURE_EVENT_KIND_LABELS: Record<DisclosureEventKind, string> = {
  regulatory: 'Regulatory event (as reported)',
  civil: 'Civil event (as reported)',
  criminal: 'Criminal event (as reported)',
  customer_complaint: 'Customer complaint (as reported)',
  termination: 'Termination (as reported)',
  financial: 'Financial disclosure (as reported)',
  investigation: 'Investigation (as reported)',
  other: 'Other disclosure (as reported)',
};

export const disclosureEventSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid().optional(),
  firmId: z.string().uuid().optional(),
  eventKind: z.enum(DISCLOSURE_EVENT_KINDS),
  reportedStatus: z.string().max(200).optional(),
  occurredOn: z.string().date().optional(),
  reportedOn: z.string().date().optional(),
  summarySourceText: z.string().max(4000),
  sourceSystemId: z.string().min(1),
  sourceRecordIdentifier: z.string().min(1),
  evidenceId: z.string().uuid().optional(),
  isSynthetic: z.boolean(),
});

export type DisclosureEvent = z.infer<typeof disclosureEventSchema>;

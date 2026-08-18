import { z } from 'zod';

/**
 * Provenance is a first-class product feature.
 * Every material fact should be traceable to evidence.
 */

export const INGESTION_RUN_STATUSES = [
  'pending',
  'downloading',
  'checksum',
  'archiving',
  'parsing',
  'validating',
  'normalizing',
  'resolving',
  'staging',
  'publishing',
  'published',
  'failed',
  'rolled_back',
] as const;

export type IngestionRunStatus = (typeof INGESTION_RUN_STATUSES)[number];

export const sourceReleaseSchema = z.object({
  id: z.string().uuid(),
  sourceDatasetId: z.string().min(1),
  releaseLabel: z.string().min(1).max(120),
  publishedAt: z.string().datetime().optional(),
  retrievedAt: z.string().datetime(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  archiveUri: z.string().max(1000).optional(),
});

export type SourceRelease = z.infer<typeof sourceReleaseSchema>;

export const ingestionRunSchema = z.object({
  id: z.string().uuid(),
  sourceReleaseId: z.string().uuid().optional(),
  pipelineVersion: z.string().min(1),
  transformVersion: z.string().min(1),
  status: z.enum(INGESTION_RUN_STATUSES),
  idempotencyKey: z.string().min(1),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
});

export type IngestionRun = z.infer<typeof ingestionRunSchema>;

export const fieldProvenanceSchema = z.object({
  subjectKind: z.string().min(1),
  subjectId: z.string().uuid(),
  fieldName: z.string().min(1),
  evidenceId: z.string().uuid(),
  observedAt: z.string().datetime(),
  isCurrent: z.boolean(),
});

export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>;

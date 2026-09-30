import 'server-only';

import { query } from '../db';
import { publicFirmSql, publishedStateRegistrationSql } from './publication-count';

export interface PublishedStateRegistration {
  state: string;
  registrationDate: string | null;
  sourceLabel: string;
  retrievedAt: string | null;
}

export interface PublishedStateAdviser {
  firmId: string;
  slug: string;
  displayName: string;
  legalName: string;
  crd: string;
  createdByBatch: boolean;
  registrations: PublishedStateRegistration[];
}

type StateRow = {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string;
  crd: string;
  jurisdiction: string;
  effective_date: Date | string | null;
  release_label: string;
  retrieved_at: Date | string | null;
  created_by_batch: boolean;
};

function iso(value: Date | string | null): string | null {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : null;
}

const STATE_FROM = `
  FROM jurisdiction_registrations j
  JOIN firms f ON f.id=j.firm_id
  JOIN firm_identifiers crd ON crd.firm_id=f.id
    AND crd.identifier_type='crd' AND crd.identifier_value=j.raw->>'firm_crd'
  JOIN source_releases rel ON rel.id=j.source_release_id
  WHERE ${publicFirmSql()} AND ${publishedStateRegistrationSql('j')}
`;

/** The same read serves both a new minimal profile and legacy profile additions. */
async function getPublishedStateAdviser(where: string, value: string): Promise<PublishedStateAdviser | null> {
  const result = await query<StateRow>(`
    SELECT f.id, f.slug, f.display_name, f.legal_name, crd.identifier_value AS crd,
           j.jurisdiction, j.effective_date, rel.release_label, rel.retrieved_at,
           (j.raw->>'b1_created_firm')='true' AS created_by_batch
    ${STATE_FROM} AND ${where}=$1
    ORDER BY j.jurisdiction
  `, [value]);
  const rows = result.rows;
  const first = rows[0];
  if (!first) return null;
  return {
    firmId: first.id,
    slug: first.slug,
    displayName: first.display_name,
    legalName: first.legal_name,
    crd: first.crd,
    createdByBatch: first.created_by_batch,
    registrations: rows.map((row) => ({
      state: row.jurisdiction,
      registrationDate: iso(row.effective_date),
      sourceLabel: row.release_label,
      retrievedAt: iso(row.retrieved_at),
    })),
  };
}

export function getPublishedStateAdviserBySlug(slug: string): Promise<PublishedStateAdviser | null> {
  return getPublishedStateAdviser('f.slug', slug);
}

export function getPublishedStateAdviserByCrd(crd: string): Promise<PublishedStateAdviser | null> {
  return getPublishedStateAdviser('crd.identifier_value', crd);
}

export interface StateAdviserLensRow {
  slug: string;
  displayName: string;
  crd: string;
  state: string;
  registrationDate: string | null;
}

export async function listPublishedStateAdvisers(state: string | null, page: number): Promise<{
  rows: StateAdviserLensRow[];
  registrations: number;
  firms: number;
}> {
  const offset = (page - 1) * 25;
  const stateWhere = ` AND ($1::text IS NULL OR j.jurisdiction=$1)`;
  const counts = await query<{ registrations: number; firms: number }>(`
    SELECT count(DISTINCT (crd.identifier_value,j.jurisdiction))::int AS registrations,
           count(DISTINCT crd.identifier_value)::int AS firms
    ${STATE_FROM}${stateWhere}
  `, [state]);
  const result = await query<{
    slug: string; display_name: string; crd: string; jurisdiction: string; effective_date: Date | string | null;
  }>(`
    SELECT DISTINCT ON (crd.identifier_value,j.jurisdiction)
      f.slug, f.display_name, crd.identifier_value AS crd, j.jurisdiction, j.effective_date
    ${STATE_FROM}${stateWhere}
    ORDER BY crd.identifier_value,j.jurisdiction,j.effective_date DESC NULLS LAST
    LIMIT 25 OFFSET $2
  `, [state, offset]);
  return {
    rows: result.rows.map((row) => ({
      slug: row.slug,
      displayName: row.display_name,
      crd: row.crd,
      state: row.jurisdiction,
      registrationDate: iso(row.effective_date),
    })),
    registrations: counts.rows[0]?.registrations ?? 0,
    firms: counts.rows[0]?.firms ?? 0,
  };
}

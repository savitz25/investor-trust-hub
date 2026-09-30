import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { mapSearchHit } from '../src/lib/firms/map-report';
import { B1_STATE_RELEASE_ID, publicFirmSql, publishedStateRegistrationSql } from '../src/lib/firms/publication-count';
import type { FirmRecordRow } from '../src/lib/firms/types';

const base: FirmRecordRow = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'sec-crd-8250',
  legal_name: 'Example State Adviser',
  display_name: 'Example State Adviser',
  is_synthetic: false,
  current_as_of: null,
  crd: '8250',
  sec_file_number: null,
  registration_type: null,
  registration_status: null,
  source_status_text: null,
  address_line_1: null,
  address_line_2: null,
  city: null,
  region: null,
  postal_code: null,
  country: null,
  organization_form: null,
  website: null,
  raum_amount: null,
  disclosure_indicator: null,
  dataset_kind: null,
  source_dataset_id: null,
  release_label: null,
  retrieved_at: null,
  evidence_count: 0,
  snapshot_count: 0,
  observed: null,
  search_indexable: null,
  state_registration_state: null,
  state_release_label: null,
  state_retrieved_at: null,
};

describe('September IAPD publication wiring', () => {
  it('requires the exact batch flag for B1-created firms and leaves legacy firms on their existing path', () => {
    const sql = publicFirmSql();
    expect(sql).toContain("batch_firm.raw->>'b1_created_firm' = 'true'");
    expect(sql).toContain('batch_public.publication_allowed = true');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain(B1_STATE_RELEASE_ID);
  });

  it('requires firm grain, APPROVED status, exact CRD and source provenance for state surfaces', () => {
    const sql = publishedStateRegistrationSql('j');
    expect(sql).toContain("j.subject_kind = 'firm'");
    expect(sql).toContain("j.status = 'APPROVED'");
    expect(sql).toContain("b1_crd.identifier_value = j.raw->>'firm_crd'");
    expect(sql).toContain('j.publication_allowed = true');
  });

  it('does not create a search card for an unpublished state-only firm', () => {
    expect(mapSearchHit(base)).toBeNull();
  });

  it('renders an activated state adviser separately from SEC RIA/ERA copy', () => {
    const hit = mapSearchHit({
      ...base,
      state_registration_state: 'CA',
      state_release_label: 'IA_FIRM_STATE_Feed_09_30_2026',
      state_retrieved_at: '2026-09-30',
    });
    expect(hit?.classification.headline).toBe('Reported as state-registered');
    expect(hit?.region).toBeNull();
    expect(hit?.stateRegistrationState).toBe('CA');
    expect(hit?.releaseLabel).toBe('IA_FIRM_STATE_Feed_09_30_2026');
  });

  it('preserves the legacy RIA classification and source fields', () => {
    const hit = mapSearchHit({
      ...base,
      registration_type: 'registered_investment_adviser',
      registration_status: 'registered',
      release_label: 'legacy-source',
      state_registration_state: 'CA',
    });
    expect(hit?.classification.headline).toBe('Reported as registered');
    expect(hit?.releaseLabel).toBe('legacy-source');
  });

  it('uses the shared firm predicate in directory, search, profile, sitemap and Ask reads', () => {
    const repo = readFileSync(new URL('../src/lib/firms/repository.ts', import.meta.url), 'utf8');
    const ask = readFileSync(new URL('../src/lib/ask/execute.ts', import.meta.url), 'utf8');
    const state = readFileSync(new URL('../src/lib/firms/state-advisers.ts', import.meta.url), 'utf8');
    expect((repo.match(/publicFirmCountWhere\(\)/g) ?? []).length).toBeGreaterThanOrEqual(7);
    expect(ask).toContain('getPublishedStateAdviserByCrd(identifier.value)');
    expect(state).toContain("publishedStateRegistrationSql('j')");
    expect(state).toContain('count(DISTINCT (crd.identifier_value,j.jurisdiction))');
  });

  it('uses a gated state profile and content-indexing metadata without altering the legacy report', () => {
    const route = readFileSync(new URL('../src/app/firm/[slug]/page.tsx', import.meta.url), 'utf8');
    expect(route).toContain('getPublishedStateAdviserBySlug(slug)');
    expect(route).toContain('<StateAdviserFirmReport adviser={stateAdviser} />');
    expect(route).toContain('<FirmTrustReport report={report} />');
    expect(route).toContain('<StateRegistrationPanel adviser={stateAdviser} />');
    expect(route).toContain('indexable,');
  });

  it('keeps state evidence separate from office geography and bounds the sitemap', () => {
    const sitemap = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
    const page = readFileSync(new URL('../src/app/california/page.tsx', import.meta.url), 'utf8');
    const stage = readFileSync(new URL('../../../artifacts/th-investor-r2-search-documents.sql', import.meta.url), 'utf8');
    expect(sitemap).toContain('listIndexableFirmSlugs(10_000, 0)');
    expect(page).toContain('<StateAdviserStatePanel state="CA" />');
    expect(stage).toContain('indexable');
    expect(stage).toContain("j.raw->>'firm_crd'=crd.identifier_value");
    expect(stage).not.toContain('INSERT INTO registrations');
  });
});

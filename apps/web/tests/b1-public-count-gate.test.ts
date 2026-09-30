import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicFirmCountWhere, publicReleaseWhere } from '../src/lib/firms/publication-count';

describe('September IAPD public count and release summary', () => {
  it('computes eligibility from the exact batch marker and flag without a fixed denominator', () => {
    const sql = publicFirmCountWhere();
    expect(sql).toContain("batch_firm.raw->>'b1_created_firm' = 'true'");
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('batch_public.publication_allowed = true');
    expect(sql).toContain("batch_public.status = 'APPROVED'");
    expect(sql).toContain("batch_crd.identifier_type = 'crd'");
    expect(sql).not.toContain('25777');
  });

  it('keeps the held release out of consumer summaries', () => {
    const sql = publicReleaseWhere();
    expect(sql).toContain("j.publication_allowed = true");
    expect(sql).toContain("batch_public.publication_allowed = true");
    expect(sql).toContain('23cdfeba5d68d8dce93137ec76e91e26960abc2edaca1d57852373ef8e5f9a5c');
  });

  it('uses the same predicate in the directory metric and search count/results', () => {
    const repository = readFileSync(new URL('../src/lib/firms/repository.ts', import.meta.url), 'utf8');
    const search = repository.slice(repository.indexOf('export async function searchOfficialFirms'), repository.indexOf('export async function getFirmDirectoryMetrics'));
    const metrics = repository.slice(repository.indexOf('export async function getFirmDirectoryMetrics'), repository.indexOf('export async function listIndexableFirmSlugs'));
    expect(search).toContain('${publicFirmCountWhere()}');
    expect(search).toContain('WHERE ${where}');
    expect(metrics).toContain('FROM firms f WHERE ${publicFirmCountWhere()}');
    expect(metrics).toContain('${publicReleaseWhere()}');
    expect(metrics).not.toContain('FROM firms WHERE is_synthetic = false');
  });

  it('separates old search and metric cache entries from the corrected counts', () => {
    const cached = readFileSync(new URL('../src/lib/firms/cached.ts', import.meta.url), 'utf8');
    expect(cached).toContain('firm-directory-metrics-b1-count-gate');
    expect(cached).toContain('official-firm-search-b1-count-gate');
  });
});

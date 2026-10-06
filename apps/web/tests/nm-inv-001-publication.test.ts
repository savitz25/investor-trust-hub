import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_PATHS, shouldNoIndex } from '@ith/config';
import census from '../../../data/new-mexico/nm-inv-001/iapd-nm-census.json';
import approved from '../../../data/new-mexico/nm-inv-001/iapd-nm-ia-approved-crds.json';

const webRoot = join(import.meta.dirname, '..');
const repoRoot = join(webRoot, '..', '..');

describe('NM-INV-001 New Mexico publication', () => {
  it('publishes 81, 1394, 17, and 27 with overlap 2 and no ratings', () => {
    expect(census.state.nm_state_ia_approved_distinct_crd).toBe(81);
    expect(census.state.nm_state_ia_registration_rows).toBe(81);
    expect(census.state.nm_state_ia_distinct_crd).toBe(81);
    expect(census.sec.nm_notice_filed_distinct_crd).toBe(1394);
    expect(census.sec.nm_notice_rows).toBe(1394);
    expect(census.state.nm_state_era_active_distinct_crd).toBe(17);
    expect(census.state.nm_state_era_registration_rows).toBe(17);
    expect(census.sec.nm_principal_office_distinct_crd).toBe(27);
    expect(census.overlaps.state_ia_approved_and_notice_filed).toBe(2);
    expect(census.overlaps.state_ia_approved_and_notice_filed_crds).toHaveLength(2);
    expect(census.overlaps.state_ia_and_state_era).toBe(0);
    expect(census.sec.nm_notice_era_any_status).toBe(0);
    expect(census.state.sha256).toBe('5fa17c38ae2e812dbd4d58c359c4d624a54417e3f794a3287c3414ccfdaa6a02');
    expect(census.state.bytes).toBe(5080393);
    expect(census.sec.sha256).toBe('f01d6b17a7ed631125e76d3c1e5965f178235273eea6699c15400473cb2f1f22');
    expect(census.sec.bytes).toBe(7301907);
    expect(approved.crds).toHaveLength(81);
    expect(new Set(approved.crds).size).toBe(81);

    const page = readFileSync(join(webRoot, 'src/app/new-mexico/page.tsx'), 'utf8');
    expect(page).toContain('state.nm_state_ia_approved_distinct_crd');
    expect(page).toContain('sec.nm_notice_filed_distinct_crd');
    expect(page).toContain('state.nm_state_era_active_distinct_crd');
    expect(page).toContain('sec.nm_principal_office_distinct_crd');
    expect(page).toContain('firm CRDs are in both sets');
    expect(page).toContain('New Mexico Regulation and Licensing Department, Securities Division');
    expect(page).toContain('jurisdiction code NM');
    expect(page).toContain('NOT_ACQUIRED');
    expect(page).toContain('Albuquerque, Santa Fe, Las Cruces, Rio Rancho, Roswell, and Farmington');
    expect(page).toContain('must not be added');
    expect(page).not.toContain('AggregateRating');
    expect(page).not.toMatch(/Trust Score/);
    expect(INDEXABLE_PATHS.some((path) => /\/new-mexico\/.+/.test(path))).toBe(false);
    expect(`${census.overlaps.state_ia_approved_and_notice_filed} firm CRDs are in both sets`).toBe(
      '2 firm CRDs are in both sets',
    );
    expect(existsSync(join(webRoot, 'src/app/new-mexico/albuquerque'))).toBe(false);
    expect(existsSync(join(webRoot, 'src/app/new-mexico/santa-fe'))).toBe(false);
    expect(INDEXABLE_PATHS).toContain('/new-mexico');
    expect(shouldNoIndex('/new-mexico')).toBe(false);
    expect(page).toContain("path: '/new-mexico'");

    const unionSource = readFileSync(
      join(repoRoot, 'packages/domain/src/investor-home-evidence-inventory.ts'),
      'utf8',
    );
    const unionLine = unionSource
      .split(/\r?\n/)
      .find((line) => line.includes("code:") && line.includes("| 'UT'"));
    expect(unionLine).toContain("'NM'");
    expect(unionLine).toContain("'UT'");
    expect(unionLine).toContain("'OK'");
    expect(unionLine).toContain("'AR'");
    expect(unionLine).not.toMatch(/'UT'\s*;/);
  });
});

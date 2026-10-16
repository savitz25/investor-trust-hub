import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  mode: 'ok' as 'ok' | 'down',
  inFlight: 0,
  maxInFlight: 0,
  releases: 0,
  connects: 0,
  attempts: 0,
}));

vi.mock('server-only', () => ({}));

vi.mock('pg', () => {
  function rowsFor(text: string) {
    if (text.includes('official_firms')) {
      return {
        rows: [{
          official_firms: 1,
          state_registration_rows: 0,
          ria_registered: 1,
          ria_pending: 0,
          era_reporting: 0,
          latest_release_label: '2026-09-17',
          latest_retrieved_at: '2026-09-17T00:00:00.000Z',
        }],
      };
    }
    if (text.startsWith('select 1')) return { rows: [{ ok: true }] };
    if (/^\s*select\s+count\s*\(/i.test(text)) {
      return { rows: [{ n: 1, total: 0, ria: 0, era: 0 }] };
    }
    if (text.includes('display_name') || text.includes('AS crd')) {
      return {
        rows: [{
          id: '11111111-1111-4111-8111-111111111111',
          slug: 'sec-crd-105958',
          legal_name: 'VANGUARD GROUP INC',
          display_name: 'VANGUARD GROUP INC',
          is_synthetic: false,
          current_as_of: '2026-09-17',
          crd: '105958',
          sec_file_number: '801-11953',
          registration_type: 'registered_investment_adviser',
          registration_status: 'registered',
          source_status_text: 'Approved',
          address_line_1: '100 Vanguard Blvd',
          address_line_2: null,
          city: 'Malvern',
          region: 'PA',
          postal_code: '19355',
          country: 'USA',
          organization_form: 'Corporation',
          website: null,
          raum_amount: null,
          disclosure_indicator: null,
          dataset_kind: 'ria',
          source_dataset_id: 'iapd',
          release_label: '2026-09-17',
          retrieved_at: '2026-09-17T00:00:00.000Z',
          published_at: '2026-09-17',
          checksum_sha256: null,
          evidence_count: 1,
          snapshot_count: 1,
          observed: true,
          search_indexable: true,
          indexable: true,
          state_registration_state: null,
          state_release_label: null,
          state_retrieved_at: null,
        }],
      };
    }
    return { rows: [] };
  }

  class Pool {
    async query(text: string) {
      state.attempts += 1;
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      await new Promise((resolve) => setTimeout(resolve, 25));
      const overlapped = state.inFlight > 1;
      state.inFlight -= 1;
      if (state.mode === 'down') throw new Error('connect ECONNREFUSED');
      if (overlapped) throw new Error('timeout exceeded when trying to connect');
      return rowsFor(text);
    }

    async connect() {
      state.connects += 1;
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      if (state.mode === 'down') {
        state.inFlight -= 1;
        throw new Error('connect ECONNREFUSED');
      }
      return {
        query: async (text: string) => rowsFor(text),
        release: () => {
          state.releases += 1;
          state.inFlight -= 1;
        },
      };
    }
  }

  return { Pool };
});

process.env.DATABASE_URL = 'postgres://example.invalid/investor_research';

import { parseFirmSearchInput } from '@ith/domain';
import { executeInvestorAsk } from '../src/lib/ask/execute';
import { DatabaseUnavailableError, query, withClient } from '../src/lib/db';
import { getOfficialFirmBySlug, searchOfficialFirms, getFirmDirectoryMetrics } from '../src/lib/firms/repository';

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  state.mode = 'ok';
  state.inFlight = 0;
  state.maxInFlight = 0;
  state.releases = 0;
  state.connects = 0;
  state.attempts = 0;
});

describe('research checkout lane', () => {
  it('runs overlapping research queries one checkout at a time', async () => {
    const [left, right] = await Promise.all([query('select 1 as left'), query('select 1 as right')]);
    expect(left.rows).toHaveLength(1);
    expect(right.rows).toHaveLength(1);
    expect(state.maxInFlight).toBe(1);
  });

  it('releases the client after a held profile read and after an error', async () => {
    const held = withClient(async (client) => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      const result = await client.query('select 1');
      return result.rows.length;
    });
    const other = query('select 1 as waiting');
    const [heldRows, otherResult] = await Promise.all([held, other]);
    expect(heldRows).toBe(1);
    expect(otherResult.rows).toHaveLength(1);
    expect(state.maxInFlight).toBe(1);
    expect(state.releases).toBe(1);

    await expect(withClient(async () => {
      throw new Error('profile read failed');
    })).rejects.toThrow('profile read failed');
    expect(state.releases).toBe(2);
  });

  it('reports a connection failure instead of an empty research result', async () => {
    state.mode = 'down';
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args);
    });
    await expect(query('select 1')).rejects.toBeInstanceOf(DatabaseUnavailableError);
    await expect(query('select 1')).rejects.toThrow('connect ECONNREFUSED');
    expect(state.attempts).toBe(6);
    expect(errors.some((entry) => Array.isArray(entry) && entry[0] === 'database_query_failed')).toBe(true);
    spy.mockRestore();
  });

  it('returns the exact CRD firm and does not turn a connection failure into no records', async () => {
    const found = await executeInvestorAsk('CRD 105958');
    expect(found.terminalState).toBe('COMPLETE');
    expect(found.results).toHaveLength(1);
    expect(found.results[0]?.crd).toBe('105958');
    expect(found.results[0]?.displayName).toBe('VANGUARD GROUP INC');
    expect(found.results[0]?.slug).toBe('sec-crd-105958');

    state.mode = 'down';
    state.attempts = 0;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(executeInvestorAsk('CRD 105958')).rejects.toBeInstanceOf(DatabaseUnavailableError);
    expect(state.attempts).toBe(3);
  });

  it('keeps firm search, directory metrics, and firm detail on one checkout', async () => {
    const parsed = parseFirmSearchInput({ q: '105958' });
    const [search, metrics, detail] = await Promise.all([
      searchOfficialFirms(parsed),
      getFirmDirectoryMetrics(),
      getOfficialFirmBySlug('sec-crd-105958'),
    ]);
    expect(search.total).toBe(1);
    expect(search.hits[0]?.crd).toBe('105958');
    expect(search.hits[0]?.displayName).toBe('VANGUARD GROUP INC');
    expect(metrics.officialFirms).toBe(1);
    expect(detail?.crd).toBe('105958');
    expect(detail?.slug).toBe('sec-crd-105958');
    expect(detail?.intelligence).not.toBeNull();
    expect(state.maxInFlight).toBe(1);
    expect(state.releases).toBe(state.connects);
    expect(state.connects).toBeGreaterThan(0);
  });

  it('fails firm search closed when the database cannot be checked out', async () => {
    state.mode = 'down';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const parsed = parseFirmSearchInput({ q: '105958' });
    await expect(searchOfficialFirms(parsed)).rejects.toBeInstanceOf(DatabaseUnavailableError);
    await expect(getOfficialFirmBySlug('sec-crd-105958')).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });

  it('keeps the public service-failure copy distinct from an empty result', () => {
    const root = new URL('../src/', import.meta.url);
    const ask = readFileSync(new URL('app/ask/page.tsx', root), 'utf8');
    const firms = readFileSync(new URL('app/firms/page.tsx', root), 'utf8');
    const firm = readFileSync(new URL('app/firm/[slug]/page.tsx', root), 'utf8');
    const intelligence = readFileSync(new URL('lib/firms/profile-intelligence.ts', root), 'utf8');
    expect(ask).toContain('The research database is temporarily unavailable. Try again shortly.');
    expect(ask).toContain('error instanceof DatabaseUnavailableError');
    expect(firms).toContain('This is a service error, not a finding about any firm.');
    expect(firm).toContain('This is a service error, not a finding about the firm.');
    expect(intelligence).toContain('withClient');
    expect(intelligence).not.toContain('getPool()');
  });
});

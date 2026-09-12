import { describe, expect, it, vi } from 'vitest';
import {
  interpretInvestorAskQuery,
  structuredRequestToParsed,
  specialistExecutionRequestSchema,
} from '@ith/domain';
vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({
  query: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>>(
    async () => ({ rows: [] }),
  ),
}));
vi.mock('../src/lib/db', () => db);
import { executeInvestorAsk, executeParsedInvestorAsk, publicAskPayload } from '../src/lib/ask/execute';
import { readInvestorRequest } from '../src/lib/ask/request';
import { INVESTOR_OFFICIAL_RESEARCH } from '../src/lib/ask/recovery';
import { GET } from '../src/app/api/ask/route';
import AskPage from '../src/app/ask/page';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../src/components/specialist-search/search-analytics',()=>({SearchAnalytics:()=>null}));
vi.mock('../src/components/specialist-search/search-shell-analytics',()=>({SearchShellAnalytics:()=>null}));

describe('R1-012 original research defects', () => {
  it('portfolio service requests never become firm names or call a directory', async () => {
    db.query.mockClear();
    const p = interpretInvestorAskQuery('manage my portfolio');
    expect(p.query.nameQuery).toBeUndefined();
    expect(p.query.mode).toBe('fail_closed');
    await executeInvestorAsk('manage my portfolio');
    expect(db.query).not.toHaveBeenCalled();
  });
  it('unspecified Form ADV needs identity, not a cohort', () => {
    expect(interpretInvestorAskQuery('show me Form ADV for this firm').query.mode).toBe('fail_closed');
  });
  it('unspecified disclosure research needs identity', () => {
    expect(interpretInvestorAskQuery('does this firm have disclosures?').query.mode).toBe('fail_closed');
  });
  it('Austin is retained with Texas', () => {
    expect(interpretInvestorAskQuery('investment advisers in Austin Texas').query.geography).toMatchObject({
      type: 'principal_office_city',
      value: 'Austin',
      state: 'TX',
    });
  });
  it('Wyoming registration cannot execute the office cohort', async () => {
    db.query.mockClear();
    const p = interpretInvestorAskQuery('state-registered investment advisers in Wyoming');
    expect(p.query.mode).toBe('fail_closed');
    await executeInvestorAsk('state-registered investment advisers in Wyoming');
    expect(db.query).not.toHaveBeenCalled();
  });
  it.each(['find investment advisers in Austin Texas','research state-registered investment advisers in Wyoming'])('discovery verbs do not manufacture names: %s',(raw)=>{const q=interpretInvestorAskQuery(raw).query;expect(q.nameQuery).toBeUndefined();if(raw.includes('Austin'))expect(q.geography).toMatchObject({value:'Austin',state:'TX'});else expect(q.registrationJurisdictions).toEqual(['WY']);});
  it('a labeled identifier is not also an inferred name',async()=>{fixtureDb();const r=await executeInvestorAsk('CRD 9999999999');expect(r.parsed.query.conditions?.some(c=>c.kind==='name')).toBe(false);expect(r.answer).toBeUndefined();expect(r.results).toEqual([]);});
  it('named research preserves a following registration condition',()=>{const q=interpretInvestorAskQuery('research Alpha Capital registered in Florida with an office in New York').query;expect(q.nameQuery).toBe('Alpha Capital');expect(q.registrationJurisdictions).toEqual(['FL']);expect(q.geography?.value).toBe('NY');expect(q.mode).toBe('fail_closed');});
  it('unknown row publication date never borrows the reference snapshot clock',async()=>{fixtureDb();const r=await executeInvestorAsk('CRD 105958');expect(r.results[0]?.officialAsOf).toBeNull();expect(r.provenance.officialAsOf).toBe('Not established for all returned rows');expect(r.provenance.retrievedAt).toBe('2026-08-18');expect(publicAskPayload(r).results[0]?.sourceRelease).toMatchObject({releaseLabel:'2026-08-03',officialAsOf:null,sha256:null});});
  it('existing Form ADV definition remains a definition', () => {
    expect(interpretInvestorAskQuery('what is Form ADV?').query.definitionId).toBe('form_adv');
  });
});

const fixture = [
  {
    id: 'a',
    crd: '105958',
    display_name: 'ALPHA ADVISORS LLC',
    legal_name: 'ALPHA ADVISORS LLC',
    city: 'Austin',
    region: 'TX',
    dataset_kind: 'ria',
    indexable: true,
    slug: 'alpha',
    registration_status: 'registered',
    source_status_text: 'Approved',
    raum_amount: '2000000000',
    latest_adv_filing_date: '2026-01-01',
    retrieved_at: '2026-08-18',
    published_at: null,
    source_dataset_id: 'sec_ia_ria',
    release_label: '2026-08-03',
    checksum_sha256: null,
  },
  {
    id: 'b',
    crd: '105',
    display_name: 'ALPHA ADVISORS TEXAS LLC',
    legal_name: 'ALPHA ADVISORS TEXAS LLC',
    city: 'Dallas',
    region: 'TX',
    dataset_kind: 'ria',
    indexable: false,
    registration_status: 'registered',
  },
  {
    id: 'c',
    crd: '77',
    display_name: 'BETA ERA',
    legal_name: 'BETA ERA',
    city: 'Austin',
    region: 'TX',
    dataset_kind: 'era',
    indexable: false,
    registration_status: 'reporting',
  },
  {
    id: 'd',
    crd: '88',
    display_name: 'AUSTIN ELSEWHERE LLC',
    legal_name: 'AUSTIN ELSEWHERE LLC',
    city: 'Austin',
    region: 'MN',
    dataset_kind: 'ria',
    indexable: false,
    registration_status: 'registered',
  },
  {
    id: 'e',
    crd: '99',
    display_name: 'WY OFFICE ONLY LLC',
    legal_name: 'WY OFFICE ONLY LLC',
    city: 'Cheyenne',
    region: 'WY',
    dataset_kind: 'ria',
    indexable: false,
    registration_status: 'registered',
  },
];
function fixtureDb() {
  db.query.mockReset();
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes('SELECT firm_id, field_name')) return { rows: [] };
    let rows = fixture.slice();
    const param = (re: RegExp) => {
      const m = sql.match(re);
      return m ? String(params[Number(m[1]) - 1]) : undefined;
    };
    const city = param(/lower\(b.city\) = lower\(\$(\d+)\)/);
    if (city) rows = rows.filter((r) => r.city.toLowerCase() === city.toLowerCase());
    const state = param(/b.region = \$(\d+)/);
    if (state) rows = rows.filter((r) => r.region === state);
    const crd = param(/crd.identifier_value = \$(\d+)/);
    if (crd) rows = rows.filter((r) => r.crd === crd);
    const name = param(/f.display_name ILIKE \$(\d+)/);
    if (name)
      rows = rows.filter((r) => r.display_name.toLowerCase().includes(name.slice(1, -1).toLowerCase()));
    if (sql.includes("adv.dataset_kind = 'ria'")) rows = rows.filter((r) => r.dataset_kind === 'ria');
    if (sql.includes("adv.dataset_kind = 'era'")) rows = rows.filter((r) => r.dataset_kind === 'era');
    if (sql.includes('count(')) return { rows: [{ n: rows.length }] };
    const limit = param(/LIMIT \$(\d+)/);
    return { rows: rows.slice(0, limit ? Number(limit) : 20) };
  });
}

describe('R1-012 typed plan and production source predicates', () => {
  it('native page/API share the same full fixture identity and scope',async()=>{
    fixtureDb();const params={q:'investment advisers in Austin Texas',firmType:'RIA'};
    const api=await(await GET(new Request('https://www.investortrusthub.com/api/ask?'+new URLSearchParams(params)))).json();
    const html=renderToStaticMarkup(await AskPage({searchParams:Promise.resolve(params)}));
    expect(api.results.map((r:{crd:string})=>r.crd)).toEqual(['105958']);
    expect(html).toContain('ALPHA ADVISORS LLC');expect(html).not.toContain('BETA ERA');expect(html).not.toContain('WY OFFICE ONLY');expect(api.query.geography).toMatchObject({value:'Austin',state:'TX'});
  });
  it('native/API reject full oversized input rather than discarding its suffix',async()=>{fixtureDb();const q='CRD 105958 '+('x'.repeat(400));const api=await GET(new Request('https://www.investortrusthub.com/api/ask?'+new URLSearchParams({q})));expect(api.status).toBe(400);const html=renderToStaticMarkup(await AskPage({searchParams:Promise.resolve({q})}));expect(html).toContain('not truncated');expect(db.query).not.toHaveBeenCalled();});
  it('structured unspecified evidence cannot bypass identity requirement',async()=>{fixtureDb();const p=structuredRequestToParsed(specialistExecutionRequestSchema.parse({queryType:'evidence',requestedEvidence:['disclosures']}));const r=await executeParsedInvestorAsk(p);expect(r.terminalState).toBe('NEEDS_CLARIFICATION');expect(db.query).not.toHaveBeenCalled();});
  it('city counts execute the same full compound cohort before pagination',async()=>{fixtureDb();const r=await executeInvestorAsk('How many investment advisers in Austin Texas?');expect(r.counts.map(c=>c.value)).toEqual([1,1]);expect(db.query.mock.calls.every(([s])=>s.includes('lower(b.city)')&&s.includes('b.region ='))).toBe(true);});
  it('held profiles and separate identities remain separate',async()=>{fixtureDb();const r=await executeInvestorAsk('research "Alpha Advisors"');expect(r.results).toHaveLength(2);expect(r.results.find(r=>r.crd==='105')?.href).toBeNull();expect(new Set(r.results.map(r=>r.crd)).size).toBe(2);});
  it('name predicates and exact-name relevance precede the limit',async()=>{fixtureDb();await executeInvestorAsk('show me Form ADV for Alpha');const s=db.query.mock.calls.find(([s])=>s.includes('LIMIT'))![0];expect(s).toMatch(/WHERE[\s\S]*ILIKE[\s\S]*ORDER BY CASE WHEN lower\(f.legal_name\)[\s\S]*LIMIT/);});
  it('SQL wildcard characters remain bound and escaped',async()=>{fixtureDb();await executeInvestorAsk('research "Alpha_% LLC"');const call=db.query.mock.calls.find(([s])=>s.includes('WHERE'))!;expect(call[0]).not.toContain('Alpha_%');expect(call[1]).toContain('%Alpha\\_\\% LLC%');});
  it('exact identity retains unsupported additional registration condition without substitution',async()=>{fixtureDb();const r=await executeInvestorAsk('CRD 105958 registered in Wyoming');expect(r.results.map(r=>r.crd)).toEqual(['105958']);expect(r.parsed.query.conditions).toContainEqual(expect.objectContaining({kind:'registration_jurisdiction',requested:'WY',outcome:'NEEDS_CLARIFICATION'}));expect(r.results[0]?.whyMatched).not.toContain('Wyoming');});
  it.each([
    'manage my portfolio',
    'pick stocks for me',
    'what should I invest in',
    'which adviser should I hire',
    'who will make me the most money',
  ])('personal boundary: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.parsed.query.nameQuery).toBeUndefined();
    expect(r.results).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });
  it.each(['CRD 105958', 'find CRD 105 958', 'CRD #105958'])('exact full family: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.results.map((x) => x.crd)).toEqual(['105958']);
    expect(r.parsed.query.identifier?.value).toBe('105958');
    expect(r.results[0]?.whyMatched).toContain('105958');
  });
  it('exact miss never broadens', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('CRD 9999999999');
    expect(r.terminalState).toBe('NO_MATCH');
    expect(r.results).toEqual([]);
    expect(
      db.query.mock.calls
        .filter(([s]) => s.includes('WHERE'))
        .every(([s]) => s.includes('crd.identifier_value =')),
    ).toBe(true);
  });
  it.each(['CRD 105,958', 'CRD 105 and 958', 'CRD 105.958', 'CRD 1e5', 'CRD 105958 CRD 77'])(
    'does not invent an identifier: %s',
    (raw) => {
      expect(interpretInvestorAskQuery(raw).query.mode).toBe('fail_closed');
    },
  );
  it.each([
    'state-registered investment advisers in Wyoming',
    'advisers registered in Wyoming',
    'notice-filed advisers in Wyoming',
    'Wyoming state ERAs',
  ])('unavailable jurisdiction does not call office rows: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.results).toEqual([]);
    expect(r.parsed.query.registrationJurisdictions).toEqual(['WY']);
    expect(db.query).not.toHaveBeenCalled();
  });
  it('office WY is a separate supported operation', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('investment advisers based in Wyoming');
    expect(r.results.map((x) => x.crd)).toEqual(['99']);
    expect(r.parsed.query.registrationJurisdictions).toBeUndefined();
  });
  it.each([
    'investment advisers in Austin Texas',
    'RIA firms in Austin TX',
    'investment advisers in Austin, TX',
  ])('compound office before limits: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.results.length).toBeGreaterThan(0);
    expect(
      r.results.every((x) => x.recordedOffice?.city === 'Austin' && x.recordedOffice.state === 'TX'),
    ).toBe(true);
    for (const [sql] of db.query.mock.calls.filter(([s]) => s.includes('LIMIT')))
      expect(sql).toMatch(/lower\(b.city\)[\s\S]*b.region[\s\S]*LIMIT/);
  });
  it('Dallas and another explicit city use the same parser', () => {
    for (const city of ['Dallas', 'Houston', 'Springfield'])
      expect(interpretInvestorAskQuery(`investment advisers in ${city} Texas`).query.geography).toMatchObject(
        { value: city, state: 'TX' },
      );
  });
  it('city-only clarifies then typed state completes', async () => {
    fixtureDb();
    expect((await executeInvestorAsk('investment advisers in Austin')).terminalState).toBe(
      'NEEDS_CLARIFICATION',
    );
    expect(db.query).not.toHaveBeenCalled();
    const r = await executeInvestorAsk('investment advisers in Austin', { state: 'TX' });
    expect(r.results.every((x) => x.recordedOffice?.state === 'TX')).toBe(true);
    expect(r.results.length).toBe(2);
  });
  it('explicit broadening is visible and validated', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('investment advisers in Austin Texas', { broaden: 'TX' });
    expect(r.results.map((x) => x.crd)).toContain('105');
    expect(r.parsed.query.conditions).toContainEqual(
      expect.objectContaining({
        kind: 'office_city',
        requested: 'Austin',
        effective: 'TX',
        outcome: 'USER_APPROVED_RELAXATION',
      }),
    );
    expect(
      interpretInvestorAskQuery('investment advisers in Austin Texas', { broaden: 'FL' }).query.terminalState,
    ).toBe('INVALID_INPUT');
  });
  it('registration NY and office FL remain distinct', () => {
    const q = interpretInvestorAskQuery('adviser registered in New York with an office in Florida').query;
    expect(q.registrationJurisdictions).toEqual(['NY']);
    expect(q.geography?.value).toBe('FL');
    expect(q.mode).toBe('fail_closed');
  });
  it('multi-registration jurisdictions require resolution', () => {
    const q = interpretInvestorAskQuery('advisers registered in New York and Florida').query;
    expect(q.registrationJurisdictions).toEqual(['NY', 'FL']);
    expect(q.terminalState).toBe('NEEDS_CLARIFICATION');
  });
  it('SEC current RIA uses actual current SEC registration predicate', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('SEC-registered advisers in Texas');
    expect(r.results.every((x) => x.firmType === 'ria')).toBe(true);
    expect(
      db.query.mock.calls.some(
        ([s]) =>
          s.includes("sr.regulator_authority_id = 'sec'") &&
          s.includes("sr.registration_type = 'registered_investment_adviser'") &&
          s.includes('sr.is_current'),
      ),
    ).toBe(true);
  });
  it.each([
    'find Form ADV filings',
    'does this firm have disclosures?',
    'which firms have disclosures',
    'show me Form ADV for this firm',
    "how do I find an adviser's Form ADV?",
  ])('research is not a name: %s', async (raw) => {
    fixtureDb();
    const r = await executeInvestorAsk(raw);
    expect(r.parsed.query.nameQuery).toBeUndefined();
    expect(db.query).not.toHaveBeenCalled();
  });
  it('unique exact source name preserves the Form ADV question', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('show me Form ADV for ALPHA ADVISORS LLC');
    expect(r.results.map((x) => x.crd)).toEqual(['105958']);
    expect(r.answer).toMatch(/not the complete filing/);
  });
  it('ambiguous firm selection is revalidated and preserves evidence', async () => {
    fixtureDb();
    const raw = 'show me Form ADV for Alpha';
    const r = await executeInvestorAsk(raw);
    expect(r.candidateSelection).toBe(true);
    expect(r.results.length).toBe(2);
    expect(r.results[0]?.selectionHref).toContain('selected=105958');
    const selected = await executeInvestorAsk(raw, { selected: '105958' });
    expect(selected.results.map((x) => x.crd)).toEqual(['105958']);
    expect(selected.parsed.query.intent).toBe('FORM_ADV_RESEARCH');
    expect(selected.results[0]?.whyMatched).toContain('CRD is 105958');
    const tampered = await executeInvestorAsk(raw, { selected: '88' });
    expect(tampered.terminalState).toBe('INVALID_INPUT');
    expect(tampered.results).toEqual([]);
  });
  it('disclosures do not expose internal fields or promise clean history', async () => {
    fixtureDb();
    const r = await executeInvestorAsk('does ALPHA ADVISORS LLC have disclosures?');
    expect(r.results.map((x) => x.crd)).toEqual(['105958']);
    expect(r.answer).toMatch(/not a clean history/);
    expect(db.query.mock.calls.every(([s]) => !s.includes('disclosure_indicator'))).toBe(true);
  });
  it('structured compound city/state reaches the same predicate', async () => {
    fixtureDb();
    const p = structuredRequestToParsed(
      specialistExecutionRequestSchema.parse({
        queryType: 'cohort',
        geography: { city: 'Austin', stateCode: 'TX', intent: 'PRINCIPAL_OFFICE' },
      }),
    );
    const r = await executeParsedInvestorAsk(p);
    expect(r.results.map((x) => x.crd)).toEqual(['105958', '77']);
    expect(publicAskPayload(r).results[0]?.recordedOffice).toEqual({ city: 'Austin', state: 'TX' });
  });
  it('missing source is an error, not zero', async () => {
    db.query.mockRejectedValueOnce(new Error('fixture source unavailable'));
    await expect(executeInvestorAsk('CRD 105958')).rejects.toThrow('fixture source unavailable');
  });
  it('common request rejects duplicate/overlong/unsafe pagination and keeps typed filters', () => {
    for (const s of ['q=a&q=b', 'q=a&page=1.5', 'q=a&page=-1', 'q=a&state=XX', 'q=' + 'a'.repeat(401)])
      expect(() => readInvestorRequest(new URLSearchParams(s))).toThrow();
    const p = readInvestorRequest(
      new URLSearchParams({
        q: 'investment advisers in Austin Texas',
        state: 'TX',
        firmType: 'RIA',
        raum: '$10B+',
        compensation: 'Hourly',
      }),
    );
    expect(p.raw).toBe('investment advisers in Austin Texas');
    expect(p.overrides.raum?.min).toBe(10000000000);
    expect(p.overrides.compensationMethods).toEqual(['hourly_charges']);
  });
  it('official recovery is the maintained allowlisted HTTPS destination', () => {
    const u = new URL(INVESTOR_OFFICIAL_RESEARCH.url);
    expect(u.protocol).toBe('https:');
    expect(u.hostname).toBe('adviserinfo.sec.gov');
    expect(u.search).toBe('');
  });
});

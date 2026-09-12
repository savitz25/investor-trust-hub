import type { InvestorAskOverrides, InvestorResearchQuery, ParsedInvestorAsk } from './investor-ask';
import { REGION_NAMES } from './investor-home-intel';

export type InvestorResearchIntent =
  | 'IDENTITY_BY_IDENTIFIER'
  | 'IDENTITY_BY_NAME'
  | 'FIRM_DISCOVERY'
  | 'REGISTRATION_RESEARCH'
  | 'FORM_ADV_RESEARCH'
  | 'DISCLOSURE_RESEARCH'
  | 'RAUM_RESEARCH'
  | 'EXPLANATION'
  | 'UNSUPPORTED_PERSONAL_ADVICE'
  | 'NEEDS_CLARIFICATION';
export type InvestorCondition = {
  kind:
    | 'office_city'
    | 'office_state'
    | 'registration_jurisdiction'
    | 'registration_type'
    | 'service_area'
    | 'evidence'
    | 'name';
  requested: string;
  effective?: string;
  outcome: 'APPLIED' | 'NEEDS_CLARIFICATION' | 'UNSUPPORTED' | 'USER_APPROVED_RELAXATION';
  meaning: string;
  sourceField?: string;
};
type Core = (raw: string, overrides: InvestorAskOverrides) => ParsedInvestorAsk;
const states = Object.entries(REGION_NAMES).filter(([c]) => /^[A-Z]{2}$/.test(c));
const statePattern = states
  .map(([c, n]) => `${n}|${c}`)
  .sort((a, b) => b.length - a.length)
  .join('|');
function stateCode(s: string) {
  return states.find(([c, n]) => c === s.toUpperCase() || n.toLowerCase() === s.toLowerCase())?.[0];
}
function foundStates(s: string) {
  const out: string[] = [];
  for (const m of s.matchAll(new RegExp(`\\b(${statePattern})\\b`, 'gi'))) {
    if (/^(in|or|me|hi)$/i.test(m[0]) && m[0] !== m[0].toUpperCase()) continue;
    const c = stateCode(m[0]);
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}
const officeMeaning =
  'Recorded principal office, not client geography, registration jurisdiction or service territory';
const personal =
  /\b(?:manage my (?:portfolio|assets|money)|pick stocks? for me|what should i invest in|which advis[eo]r should i hire|who will make me the most money|execute (?:a |my )?trades?)\b/i;
const evidenceTask = (s: string): InvestorResearchIntent | undefined =>
  /\b(?:disclosures?|disciplinary|regulatory history)\b/i.test(s)
    ? 'DISCLOSURE_RESEARCH'
    : /\b(?:form adv|sec[- ]file|filings?)\b/i.test(s)
      ? 'FORM_ADV_RESEARCH'
      : undefined;

function finish(raw: string, q: InvestorResearchQuery): ParsedInvestorAsk {
  const interpretation: ParsedInvestorAsk['interpretation'] = [
    { label: 'Research task', value: (q.intent ?? q.mode).replaceAll('_', ' ').toLowerCase() },
  ];
  if (q.identifier)
    interpretation.push({
      label: 'Identifier',
      value: `${q.identifier.type === 'crd' ? 'CRD' : 'SEC file'} ${q.identifier.value}`,
    });
  if (q.nameQuery || q.originalName)
    interpretation.push({ label: 'Requested firm name', value: q.originalName ?? q.nameQuery! });
  if (q.firmType)
    interpretation.push({
      label: 'Firm class',
      value: q.firmType === 'all' ? 'RIA + ERA (separate classes)' : q.firmType.toUpperCase(),
    });
  for (const c of q.conditions ?? [])
    interpretation.push({
      label: c.kind.replaceAll('_', ' '),
      value: `${c.requested}${c.effective && c.effective !== c.requested ? ` → ${c.effective}` : ''} — ${c.outcome}`,
    });
  if (q.raum)
    interpretation.push({ label: 'RAUM', value: JSON.stringify(q.raum) + ' (Form ADV Item 5F(2)(c), USD)' });
  if (q.compensationMethods?.length)
    interpretation.push({ label: 'Compensation methods', value: q.compensationMethods.join(', ') });
  return { raw, query: q, interpretation };
}
function stop(
  raw: string,
  q: InvestorResearchQuery,
  reason: string,
  terminal: InvestorResearchQuery['terminalState'] = 'NEEDS_CLARIFICATION',
) {
  return finish(raw, {
    ...q,
    conditions: q.conditions?.map((c) =>
      c.outcome === 'APPLIED'
        ? { ...c, outcome: terminal === 'UNSUPPORTED' ? 'UNSUPPORTED' : 'NEEDS_CLARIFICATION' }
        : c,
    ),
    mode: 'fail_closed',
    terminalState: terminal,
    failReason: reason,
  });
}

/** Authoritative planning refinement of the existing supported research operations. No source-hit-dependent interpretation. */
export function planInvestorResearch(raw: string, o: InvestorAskOverrides, core: Core): ParsedInvestorAsk {
  const text = raw.trim();
  let q: InvestorResearchQuery = {
    mode: 'fail_closed',
    page: o.page ?? 1,
    conditions: [],
    inputOverrides: o,
  };
  if (
    !text ||
    raw.length > 400 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw) ||
    !Number.isInteger(q.page) ||
    q.page < 1 ||
    q.page > 200 ||
    (o.state && !stateCode(o.state)) ||
    (o.selected && !/^\d{1,10}$/.test(o.selected))
  )
    return stop(
      text,
      q,
      'Enter a complete question of at most 400 characters and valid bounded filters. Nothing was searched.',
      'INVALID_INPUT',
    );
  const task = /\bhow many form adv observations\b/i.test(text) ? undefined : evidenceTask(text);
  // A labeled family span ends before another label/word; never strip digits from the whole sentence.
  const ids = [
    ...text.matchAll(/\b(?:crd\s*(?:number|id)?|sec(?:\s+file)?(?:\s+number)?|file)\s*#?\s*([0-9][0-9 \t-]*)/gi),
  ];
  let canonicalText = text;
  if (ids.length > 1)
    return stop(text, q, 'Use one labeled firm identifier. Multiple identifiers require clarification.');
  if (ids.length === 1) {
    const m = ids[0]!;
    const span = m[1]!.trim();
    const isCrd = /^crd/i.test(m[0]);
    const value = isCrd ? span.replace(/[ \t]/g, '') : span.replace(/\s*-\s*/g, '-');
    const tail = text.slice(m.index! + m[0].length);
    if (
      !(isCrd ? /^\d{1,10}$/ : /^801-\d{1,8}$/).test(value) ||
      (/[0-9]$/.test(m[0]) && /^[A-Za-z]/.test(tail)) ||
      /^\s*(?:[.,/]\s*\d|and\s+\d|e[+-]?\d)/i.test(tail)
    )
      return stop(
        text,
        q,
        'The labeled identifier is malformed or contains separate numbers. Enter one complete firm CRD or supported SEC file number.',
        'INVALID_INPUT',
      );
    canonicalText = text.slice(0, m.index) + `${isCrd ? 'CRD' : 'SEC file'} ${value} ` + tail;
    q = {
      ...q,
      mode: task ? 'evidence' : 'identifier',
      intent: task ?? 'IDENTITY_BY_IDENTIFIER',
      identifier: { type: isCrd ? 'crd' : 'sec_file_number', value },
      evidenceFamilies: task ? ['identity', 'filing'] : ['identity'],
      sort: 'crd',
    };
    if (/\b(?:iar|individual|person)\b/i.test(text))
      return stop(
        text,
        q,
        'An individual/IAR identifier cannot be resolved as a firm. Use a labeled firm CRD.',
        'UNSUPPORTED',
      );
  } else if (/\b(?:crd|sec file (?:number|lookup))\b/i.test(text) && !/^what\b/i.test(text))
    return stop(text, q, 'Enter a complete labeled firm CRD or SEC file number.');
  if (
    !q.identifier &&
    personal.test(text) &&
    !/\b(?:check|verify|research) the advis[eo]r (?:who|that)\b/i.test(text)
  )
    return stop(
      text,
      { ...q, intent: 'UNSUPPORTED_PERSONAL_ADVICE' },
      'InvestorTrustHub does not manage portfolios, execute trades, give individualized investment advice, predict returns, or choose an adviser for you. You can research firm registrations, Form ADV, reported assets, office locations and available evidence. Choose a research topic or identify a firm.',
      'UNSUPPORTED',
    );
  if (
    !q.identifier &&
    /^(?:what (?:is|does)|how (?:do|can)|where (?:can|do))\b/i.test(text) &&
    /\b(?:form adv|check an? advis[eo]r|find an? advis[eo]r.?s form adv)\b/i.test(text)
  ) {
    const p = core('what is Form ADV?', o);
    p.raw = text;
    p.query.intent = 'EXPLANATION';
    p.query.inputOverrides = o;
    return p;
  }
  const quoted = text.match(/[“"]([^”"]{2,120})[”"]/);
  let name =
    quoted?.[1] ??
    text.match(/\b(?:named|called|firm name)\s+(.+?)(?:\s+(?:in|with|registered)\s+|[?!.]?$)/i)?.[1];
  if (!name && task) {
    name =
      text.match(/\b(?:for|about)\s+(.+?)[?.]?$/i)?.[1] ??
      text.match(/^does\s+(.+?)\s+have\s+(?:any\s+)?disclosures?/i)?.[1];
    if (name && /^(?:this|that|an?|the)\s+(?:firm|advis[eo]r)$/i.test(name.trim())) name = undefined;
  }
  if (!name && !task)
    name = text.match(
      /^(?:find|research|check|verify)\s+(.+?\b(?:capital|advisors?|advisers?|llc|inc|group|management)\b.*?)[?.]?$/i,
    )?.[1];
  if (
    !name &&
    !task &&
    !q.identifier &&
    /^[A-Z][\w&'.-]*(?:\s+[\w&'.-]+){0,7}$/.test(text) &&
    !/\b(?:manage|pick|show|find|firms?|advisers?|advisors?|registered|rias?|eras?|portfolio|stocks?|what|how|in)\b/i.test(
      text,
    )
  )
    name = text;
  if (name && !quoted && !/\b(?:named|called|firm name)\b/i.test(text) && /^(?:(?:sec|state)[- ]registered\s+)?(?:investment\s+)?(?:advisers?|advisors?|ria\s+firms?|era\s+firms?)(?:\s+(?:in|based|registered|with)\b|$)/i.test(name)) name = undefined;
  if (name && !quoted) name = name.split(/\s+(?:with (?:an? )?offices?|registered in|based in|headquartered in|in)\s+/i)[0]!.trim();
  if (o.identity) {
    if (q.identifier || name || !task || o.identity.length > 120 || /[<>\x00-\x1f]/.test(o.identity))
      return stop(text, q, 'Identity entry cannot replace an already supplied firm.', 'INVALID_INPUT');
    name = o.identity.trim();
  }
  const structure = quoted ? text.replace(quoted[0], '') : name ? text.replace(name, '') : text;
  const registration =
    /\b(?:state[- ]registered|state rias?|state eras?|registered in|registration in|notice[- ]fil(?:ed|ing|ings)?|licensed (?:investment )?advis[eo]rs? in)\b/i.test(
      structure,
    );
  const regType: InvestorResearchQuery['registrationType'] = /notice[- ]fil/i.test(structure)
    ? 'notice'
    : /state eras?|exempt reporting/i.test(structure)
      ? 'state_era'
      : /sec[- ]registered/i.test(structure)
        ? 'sec_ria'
        : registration
          ? 'state_ria'
          : undefined;
  let regStates: string[] = [];
  let officeText = structure;
  if (registration) {
    const parts = structure.split(
      /\b(?:with (?:an? )?(?:office|offices|principal office)|whose (?:principal )?office|based|headquartered)\b/i,
    );
    regStates = foundStates(parts[0]!);
    officeText = parts.length > 1 ? parts.slice(1).join(' ') : '';
  }
  const officeStates = foundStates(officeText);
  const place = officeText.match(
    new RegExp(
      `\\b(?:in|based in|headquartered in)\\s+([A-Za-z][A-Za-z .'-]*?)\\s*,?\\s+(${statePattern})\\b`,
      'i',
    ),
  );
  let city = place?.[1]?.trim();
  let state = place ? stateCode(place[2]!) : officeStates[0];
  if (city && /\b(?:registered|advisers?|firms?|office|rias?|eras?|and|with)\b/i.test(city)) city = undefined;
  if (!city && !officeStates.length) {
    const local = officeText.match(/\b(?:in|based in|headquartered in)\s+([A-Za-z][A-Za-z .'-]*?)[?.]?$/i);
    if (local && !/\b(?:raum|firms?|ria|era|form adv)\b/i.test(local[1]!)) city = local[1]!.trim();
  }
  if (o.state) {
    if (state && state !== o.state && city)
      return stop(
        text,
        {
          ...q,
          conditions: [
            { kind: 'office_city', requested: city, outcome: 'NEEDS_CLARIFICATION', meaning: officeMeaning },
            {
              kind: 'office_state',
              requested: state,
              outcome: 'NEEDS_CLARIFICATION',
              meaning: officeMeaning,
            },
          ],
        },
        'The state filter conflicts with the named city/state. Edit the place or explicitly choose a broader scope.',
      );
    state = o.state;
  }
  const conditions: InvestorCondition[] = [];
  if (city)
    conditions.push({
      kind: 'office_city',
      requested: city,
      effective: city,
      outcome: state ? 'APPLIED' : 'NEEDS_CLARIFICATION',
      meaning: officeMeaning,
      sourceField: 'branches.city (is_main_office)',
    });
  if (state)
    conditions.push({
      kind: 'office_state',
      requested: state,
      effective: state,
      outcome: 'APPLIED',
      meaning: officeMeaning,
      sourceField: 'branches.region (is_main_office)',
    });
  for (const r of regStates)
    conditions.push({
      kind: 'registration_jurisdiction',
      requested: r,
      outcome: 'UNSUPPORTED',
      meaning: 'Registration/notice jurisdiction, not principal office',
      sourceField:
        regType === 'notice'
          ? 'NoticeFiled/States/@RgltrCd'
          : regType === 'state_era'
            ? 'ERA/Rgltr/@Cd'
            : 'StateRgstn/Rgltr/@Cd + APPROVED',
    });
  if (regType)
    conditions.push({
      kind: 'registration_type',
      requested: regType,
      outcome: regType === 'sec_ria' ? 'APPLIED' : 'UNSUPPORTED',
      meaning: 'Source-native registration class; RIA, ERA and notice filing remain separate',
      sourceField: regType === 'sec_ria' ? 'registrations regulator=sec, registered RIA, current' : undefined,
    });
  if (/\b(?:serves?|serving|clients in|near me|within \d+|radius)\b/i.test(structure))
    conditions.push({
      kind: 'service_area',
      requested: structure,
      outcome: 'UNSUPPORTED',
      meaning: 'Service territory or radius is not principal-office geography',
    });
  if (q.identifier && name)
    conditions.push({
      kind: 'name',
      requested: name,
      outcome: 'NEEDS_CLARIFICATION',
      meaning: 'Exact identifier resolves identity; additional name is not asserted to match',
    });
  if (!q.identifier) {
    const p = core(canonicalText, { ...o, state: undefined });
    q = { ...p.query, inputOverrides: o };
    if (name) {
      q = {
        ...q,
        mode: 'entity',
        nameQuery: name.trim(),
        intent: task ?? 'IDENTITY_BY_NAME',
        firmType: o.firmType,
        geography: undefined,
      };
    } else if (
      task &&
      !/\b(?:how many form adv observations|compensation|performance-based|raum)\b/i.test(text)
    ) {
      q = { ...q, mode: 'fail_closed', nameQuery: undefined, intent: task };
    } else if (
      q.mode === 'entity' &&
      !q.firmType &&
      !q.raum &&
      !q.compensationMethods?.length &&
      !q.affiliationField &&
      !city &&
      !state
    ) {
      return stop(
        text,
        { ...q, nameQuery: undefined, intent: 'NEEDS_CLARIFICATION' },
        'What would you like to research? Enter a clearly named firm, labeled firm identifier, office location, or Form ADV topic.',
      );
    } else
      q.intent =
        q.mode === 'definition'
          ? 'EXPLANATION'
          : q.raum
            ? 'RAUM_RESEARCH'
            : registration
              ? 'REGISTRATION_RESEARCH'
              : 'FIRM_DISCOVERY';
  }
  q.conditions = conditions;
  q.registrationJurisdictions = regStates.length ? regStates : undefined;
  q.registrationType = regType;
  if (o.firmType === 'era' && (o.raum || o.compensationMethods?.length))
    return stop(
      text,
      q,
      'ERA filers do not report RIA RAUM or Item 5.E. Choose compatible firm-class filters.',
      'UNSUPPORTED',
    );
  if (o.raum) {
    q.raum = o.raum;
    q.firmType = 'ria';
  }
  if (o.compensationMethods?.length) {
    q.compensationMethods = o.compensationMethods;
    q.firmType = 'ria';
  }
  if (state)
    q.geography = city
      ? { type: 'principal_office_city', value: city, state, meaning: officeMeaning }
      : { type: 'principal_office_state', value: state, meaning: officeMeaning };
  if (city && !state)
    q.geography = { type: 'principal_office_city', value: city, ambiguous: true, meaning: officeMeaning };
  if (o.broaden) {
    if (!city || !state || o.broaden !== state)
      return stop(
        text,
        q,
        'The broader state choice does not match this city/state request.',
        'INVALID_INPUT',
      );
    q.geography = { type: 'principal_office_state', value: state, meaning: officeMeaning };
    const c = conditions.find((c) => c.kind === 'office_city')!;
    c.outcome = 'USER_APPROVED_RELAXATION';
    c.effective = state;
  }
  if (!q.identifier && regStates.length > 1)
    return stop(
      text,
      q,
      'Multiple registration jurisdictions were requested. Choose the jurisdiction or clarify whether every jurisdiction is required.',
    );
  if (q.mode === 'fail_closed' && /what changed|no disclosures?|clean (?:history|disciplinary)/i.test(text))
    return finish(text, q);
  if (!q.identifier && registration) {
    const old = core(text, o).query.failReason;
    return stop(
      text,
      q,
      old ??
        'The current searchable SEC/IARD firm corpus does not establish the requested state-registration or notice-filing jurisdiction. An office in that state is not a substitute. Use the applicable official jurisdiction search or published state research.',
      'UNSUPPORTED',
    );
  }
  if (!q.identifier && officeStates.length > 1 && !/\bcompar(?:e|ison)\b/i.test(text))
    return stop(
      text,
      q,
      'More than one office state was requested. Choose one location or an explicit supported comparison.',
    );
  if (!q.identifier && conditions.some((c) => c.kind === 'service_area')) {
    if (q.geography) q.geography.ambiguous = true;
    return stop(
      text,
      q,
      'Service territory, distance and radius are not established by principal-office records. Keep the requested place and choose office research explicitly.',
      'UNSUPPORTED',
    );
  }
  if (city && !state && !q.identifier)
    return stop(
      text,
      q,
      `Which state is ${city} in? The city remains requested; no national cohort was searched.`,
    );
  if (task && !q.identifier && !name) {
    return stop(
      text,
      q,
      /\b(?:firms|which|find)\b/i.test(text) && !/\bthis firm\b/i.test(text)
        ? 'This evidence cohort is not available as a published search filter. Identify a firm to research its available Form ADV and official evidence.'
        : 'Which firm do you mean? Enter a firm name or labeled CRD/SEC file number. No evidence has been attached to an unspecified firm.',
    );
  }
  if (q.mode === 'aggregate' && q.aggregateMetric !== 'raum_bands' && conditions.length)
    return stop(
      text,
      q,
      'This distribution does not support the requested combined filters. They have been retained; no broader aggregate was executed.',
      'UNSUPPORTED',
    );
  if (task) {
    q.intent = task;
    q.evidenceFamilies = task === 'FORM_ADV_RESEARCH' ? ['identity', 'filing'] : ['identity'];
    q.answer =
      task === 'DISCLOSURE_RESEARCH'
        ? 'Firm identity can be researched here. A public disclosure determination is not established by this search: Item 11 detail is not a published cohort filter. Review the official firm record; no indexed evidence is not a clean history.'
        : 'Current indexed Form ADV identity, filing date, reported RAUM and compensation fields are shown where available. These selected fields are not the complete filing; use the official firm record for Form ADV.';
  }
  if (o.selected) {
    if (!name || !task)
      return stop(text, q, 'Select a candidate from this specific firm evidence question.', 'INVALID_INPUT');
    q.selectedCrd = o.selected;
  }
  if (regType === 'sec_ria') {
    q.status = 'registered';
    q.firmType = 'ria';
  }
  return finish(text, q);
}

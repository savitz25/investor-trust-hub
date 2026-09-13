import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {count,validateInvestor} from './reconcile-network-metrics-r2-04.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const m=read('data/home/investor-network-metrics-v1.json'), census=read('data/home/investor-national-census-r2-04.json'),home=m.homepageInputs;
const sources=Object.fromEntries(['CO','VA','NY','IL'].map(c=>[c,m.acceptedStateSnapshots[c]]));
const clone=x=>structuredClone(x);
test('canonical firm spine reconciles; registrations, office overlays and evidence cannot inflate it',()=>{
 validateInvestor(sources,census,home);
 assert.equal(m.identity.canonicalFirms,25777);assert.equal(m.identity.rosterFirms,23622);
 assert.equal(m.reconciliation.identity.withoutCurrentAdvFacts,2155);assert.equal(m.reconciliation.identity.unexplainedDelta,0);
 const bad=clone(census);bad.counts.canonicalFirms+=sources.CO.stateEra.activeDistinctCrd;assert.throws(()=>validateInvestor(sources,bad,home));
 const changed=clone(sources);changed.IL.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS=1;assert.throws(()=>validateInvestor(changed,census,home));
});
test('four-state IA / ERA / notice / office classes export independently, with exact overlap evidence',()=>{
 const expected={CO:[740,209,3673,589,6],VA:[697,107,3289,339,4],NY:[1297,327,5856,3152,27],IL:[855,55,3560,793,1]};
 for(const [c,s] of Object.entries(sources)) {
  assert.deepEqual([s.stateRia.approvedDistinctCrd,s.stateEra.activeDistinctCrd,s.federalNotice.noticeRows,s.nationalOverlay[`${c.toLowerCase()}PrincipalOfficeSecIardFirms`],s.federalNotice.overlapApprovedStateIa],expected[c]);
  assert.equal(m.reconciliation.states[c].statusPartition.unexplainedDelta,0);
  for(const field of ['stateEra.activeDistinctCrd','federalNotice.noticeRows','stateRia.approvedDistinctCrd']) assert.equal(m.reconciliation.states[c].capabilities[field].count,count(s,field));
 }
 assert.deepEqual(sources.IL.federalNotice.overlapApprovedStateIaCrds,['290683']);
});
test('exact identifier bridge and adverse attachment are different permissions; name-only activity stays unattached',()=>{
 for(const [c,s] of Object.entries(sources)) {assert.deepEqual(s.enforcement.profileAttachments,[]);assert.equal(m.reconciliation.states[c].exactAdverseProfileAttachments,0);}
 assert.equal(sources.VA.enforcement.observationRows,146);assert.equal(sources.VA.enforcement.distinctCaseNumbers,113);
 const bad=clone(sources);bad.VA.enforcement.profileAttachments.push({name:'Sample Name'});assert.throws(()=>validateInvestor(bad,census,home));
 const bridge=clone(sources);bridge.IL.federalNotice.overlapApprovedStateIaCrds=['Sample Name'];assert.throws(()=>validateInvestor(bridge,census,home));
});
test('unknown regulatory universes stay null; successful known zero stays zero; absent field fails',()=>{
 for(const c of ['NY','IL']) {
  const v=m.reconciliation.states[c].capabilities['enforcement.observationRows'];assert.equal(v.count,null);assert.equal(v.status,'PUBLIC_RESEARCH_PATH');
 }
 assert.equal(count({n:0},'n'),0);assert.equal(count({n:null},'n'),null);assert.throws(()=>count({},'n'));
 const bad=clone(sources);bad.IL.enforcement.observationRows=0;assert.throws(()=>validateInvestor(bad,census,home));
});
test('source clocks are independent of generation and every exported number traces to accepted inputs',()=>{
 for(const r of m.reconciliation.measures){const s=sources[r.key.slice(0,2).toUpperCase()];assert.equal(r.value,count(s,r.sourceField));assert.notEqual(r.sourceAsOf,m.generatedAt);}
 assert.equal(sources.IL.stateRia.sourceAsOf,'2026-08-27');assert.equal(sources.IL.enforcement.sourceAsOf,null);
});

test('snapshot dates cannot masquerade as official source freshness',()=>{
 assert.equal(m.newestDocumentedSourceAsOf,'2026-08-27');
 for(const key of ['nj_state_ria_roster','ca_state_ria_roster','published_state_intelligence_pages']) assert.equal(m.metrics.find(r=>r.key===key).sourceAsOf,null);
});

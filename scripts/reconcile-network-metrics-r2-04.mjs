import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read = (root,path) => JSON.parse(readFileSync(join(root,path),"utf8"));
export function count(source,path) {
 const value=path.split(".").reduce((v,k)=>v?.[k],source);
 assert(value===null || (Number.isSafeInteger(value)&&value>=0),`Missing/invalid accepted count: ${path}`);
 return value;
}
export function validateInvestor(sources,census,home) {
 const n=census.counts,r=home.roster;
 assert.equal(n.canonicalFirms,n.rosterFirms+r.extraFirmsWithoutAdvFacts);
 assert.equal(n.rosterFirms,n.riaFacts+n.eraFacts);
 assert.equal(n.canonicalFirms,r.allCanonicalFirms);
 assert.equal(n.rosterFirms,r.totalFacts);
 assert.equal(n.riaFacts,r.riaFacts);
 assert.equal(n.eraFacts,r.eraFacts);
 assert.equal(Object.values(home.raumBands).reduce((a,b)=>a+b,0),n.riaFacts);
 assert.equal(home.principalOfficeStates.reduce((a,b)=>a+b.count,0),r.rosterPrincipalOfficeWithRegion);
 assert.equal(r.rosterPrincipalOfficeWithRegion+r.rosterPrincipalOfficeNullRegion,n.rosterFirms);
 for(const m of home.compensation){assert.equal(m.reportedYes+m.reportedNo,m.eligibleDenominator);assert.equal(m.eligibleDenominator,n.riaFacts);assert.equal(m.notFiledByFormType,n.eraFacts);}
 for(const [code,s] of Object.entries(sources)) {
  const a=s.stateRia,e=s.enforcement,f=s.federalNotice;
  assert.equal(a.distinctFirmCrd,a.approvedDistinctCrd+a.termrequestDistinctCrd,`${code} IA status remainder`);
  assert.equal(a.registrationRows,a.distinctFirmCrd,`${code} source rows vs distinct IDs changed; review deduplication`);
  assert.equal(s.stateEra.registrationRows,s.stateEra.distinctFirmCrd);
  assert.equal(s.stateEra.activeDistinctCrd,s.stateEra.distinctFirmCrd);
  assert.equal(f.overlapApprovedStateIa,new Set(f.overlapApprovedStateIaCrds).size);
  assert(f.overlapApprovedStateIaCrds.every(crd=>/^\d+$/.test(crd)),"Bridge requires exact CRD");
  assert.equal(e.nameOnly,"UNSAFE");
  assert.deepEqual(e.profileAttachments,[],"No source-proven adverse profile attachment is accepted in these four layers");
  assert.equal(s.expansionLedger.NET_NEW_CANONICAL_ORGANIZATIONS,0,"Registration rows must not create canonical firms");
  if(code==="NY"||code==="IL") {assert.equal(e.observationRows,null);assert.equal(e.distinctCaseNumbers,null);}
 }
}
export function reconcile(manifest,root,census) {
 const codes=["NJ","CA","TX","WA","AZ","CO","VA","NY","IL"];
 const paths=Object.fromEntries(codes.map(c=>[c,`artifacts/${c.toLowerCase()}-inv-${c==="NJ"?"003":"001"}-public-snapshot.json`]));
 const all=Object.fromEntries(codes.map(c=>[c,read(root,paths[c])]));
 const sources=Object.fromEntries(["CO","VA","NY","IL"].map(c=>[c,all[c]]));
 const home=read(root,"data/home/investor-home-census-r2-04.json");
 validateInvestor(sources,census,home);
 const states={}, measures=[];
 for(const [code,s] of Object.entries(sources)) {
  const state=states[code]={status:"STATE_SOURCE_LIVE",scope:"IARD-derived state registration intelligence; not a separately acquired state-agency roster",specialistComplete:null,sourceArtifact:paths[code],identityImpact:s.expansionLedger,capabilities:{}};
  const add=(path,label,grain,status="STATE_SOURCE_LIVE",valueOverride)=>{
   const value=valueOverride===undefined?count(s,path):valueOverride;
   const section=s[path.split(".")[0]];
   const m={key:`${code.toLowerCase()}_${path.replaceAll(".","_")}`,label:`${s.state ?? code}: ${label}`,value,valueState:value===null?"UNKNOWN":"KNOWN",grain,capabilityStatus:status,
    sourceArtifact:paths[code],sourceField:path,sourceAsOf:section.sourceAsOf??null,snapshotAsOf:section.snapshotAsOf??null,retrievedAt:section.retrievedAt??null,generatedAt:manifest.generatedAt,
    counts:label,doesNotCount:"Additional canonical firms, a combined adviser denominator, or adverse profile attachments",publicationStatus:value===null?"PUBLIC_UNKNOWN":"PUBLIC",destination:s.route};
   measures.push(m);
   state.capabilities[path]={status,count:value,grain,sourceField:path,sourceAsOf:m.sourceAsOf,snapshotAsOf:m.snapshotAsOf,retrievedAt:m.retrievedAt};
  };
  add("stateRia.registrationRows","State IA source registration rows (all source statuses)","state_ia_registration_row");
  add("stateRia.distinctFirmCrd","Distinct state IA CRDs (all source statuses)","state_ia_crd");
  add("stateRia.approvedDistinctCrd","Approved state IA CRDs","approved_state_ia_crd");
  add("stateRia.termrequestDistinctCrd","State IA CRDs with termination requested","state_ia_termrequest_crd");
  add("stateEra.activeDistinctCrd","Active state ERA reporting CRDs","state_era_crd");
  add("federalNotice.noticeRows","Federal notice filing rows","federal_notice_filing");
  add("federalNotice.noticeFiledDistinctCrd","Distinct CRDs with a federal notice filing","federal_notice_crd");
  add(`nationalOverlay.${code.toLowerCase()}PrincipalOfficeSecIardFirms`,"SEC/IARD principal-office overlay","principal_office_overlay","FEDERAL_BASELINE");
  add("federalNotice.overlapApprovedStateIa","Exact state IA / federal notice CRD bridges","exact_crd_bridge");
  if(code==="CO") add("enforcement.sanctionsNarrativeEntries","Sanctions narrative observations (unattached)","regulatory_narrative_observation");
  else {
   add("enforcement.observationRows","Regulatory activity observations (unattached)","regulatory_activity_observation",s.enforcement.observationRows===null?"PUBLIC_RESEARCH_PATH":"STATE_SOURCE_LIVE");
   add("enforcement.distinctCaseNumbers","Distinct regulatory case numbers","regulatory_case",s.enforcement.distinctCaseNumbers===null?"PUBLIC_RESEARCH_PATH":"STATE_SOURCE_LIVE");
  }
  state.exactStateIaNoticeBridges={count:s.federalNotice.overlapApprovedStateIa,crds:s.federalNotice.overlapApprovedStateIaCrds,method:s.federalNotice.overlapApprovedStateIaJoinMethod};
  state.statusPartition={sourceRows:s.stateRia.registrationRows,distinctCrds:s.stateRia.distinctFirmCrd,approved:s.stateRia.approvedDistinctCrd,termrequest:s.stateRia.termrequestDistinctCrd,unexplainedDelta:0};
  state.exactAdverseProfileAttachments=s.enforcement.profileAttachments.length;
 }
 manifest.contractRevision="ATH-METRICS-R2-04";
 manifest.homepageInputs=home;
 manifest.acceptedStateSnapshots=all;
 manifest.reconciliation={states,measures,identity:{canonicalFirms:census.counts.canonicalFirms,rosterFirms:census.counts.rosterFirms,withoutCurrentAdvFacts:home.roster.extraFirmsWithoutAdvFacts,deltaFromStateRegistrations:0,deltaFromPrincipalOffice:0,deltaFromRegulatoryEvidence:0,unexplainedDelta:0},aggregationPolicy:"Never sum state IA, ERA, notice filings, principal office or activity into firms. Exact CRD bridges are relationships, not additional firms."};
 const inputs=["data/home/investor-national-census-r2-04.json","data/home/investor-home-census-r2-04.json",...Object.values(paths),"packages/config/src/routes.ts","scripts/publication_metric_inputs.mjs","scripts/build_network_metrics_v1.mjs","scripts/reconcile-network-metrics-r2-04.mjs"];
 manifest.acceptedInputHashes=Object.fromEntries(inputs.map(p=>[p,createHash("sha256").update(readFileSync(join(root,p),"utf8").replace(/\r\n/g,"\n")).digest("hex")]));
 manifest.sourceFingerprint=createHash("sha256").update(JSON.stringify({base:manifest.sourceFingerprint,inputs:manifest.acceptedInputHashes,reconciliation:manifest.reconciliation},(key,value)=>key==="generatedAt"?undefined:value)).digest("hex");
}

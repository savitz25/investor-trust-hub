/**
 * Parse publication catalogs the Investor network rollup must track.
 * A new state intelligence page or indexable-path change fails CI until
 * investor-network-metrics-v1 is regenerated.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

export function publicationMetricInputs() {
  const routes = read("packages/config/src/routes.ts");
  const home = JSON.parse(read("data/home/investor-home-census-r2-04.json"));
  const nj = JSON.parse(read("artifacts/nj-inv-003-public-snapshot.json"));
  const ca = JSON.parse(read("artifacts/ca-inv-001-public-snapshot.json"));
  const tx = JSON.parse(read("artifacts/tx-inv-001-public-snapshot.json"));
  const wa = JSON.parse(read("artifacts/wa-inv-001-public-snapshot.json"));
  const az = JSON.parse(read("artifacts/az-inv-001-public-snapshot.json"));
  const co = JSON.parse(read("artifacts/co-inv-001-public-snapshot.json"));
  const va = JSON.parse(read("artifacts/va-inv-001-public-snapshot.json"));
  const ny = JSON.parse(read("artifacts/ny-inv-001-public-snapshot.json"));
  const il = JSON.parse(read("artifacts/il-inv-001-public-snapshot.json"));

  const stateBlock = routes.match(/export const STATE_DISCOVERY_ROUTES = \[([\s\S]*?)\] as const/)[1];
  const publishedStateIntelligencePaths = [...stateBlock.matchAll(/href: '(\/[^']+)'/g)].map((m) => m[1]);

  const indexable = [
    ...routes.match(/export const INDEXABLE_PATHS = \[([\s\S]*?)\] as const/)[1].matchAll(/'([^']+)'/g),
  ].map((m) => m[1]);

  const ria = home.roster.riaFacts;
  const era = home.roster.eraFacts;
  const total = home.roster.totalFacts;
  const indexableTrustReports = home.roster.indexableTrustReports;
  const attributes = home.roster.advReportedAttributes;
  const publishedAt = home.source.publishedAt;
  const releaseLabel = home.source.releaseLabel;

  return {
    publishedStateIntelligencePaths,
    indexablePaths: indexable,
    riaFacts: ria,
    eraFacts: era,
    rosterFirms: total,
    indexableTrustReports,
    advReportedAttributes: attributes,
    publishedAt,
    releaseLabel,
    njPrincipalOfficeFirms: nj.nationalOverlay.njPrincipalOfficeSecIardFirms,
    njEnforcementDocumentsAcquired: nj.enforcement.acquiredDocuments,
    njRoute: nj.route,
    caPrincipalOfficeFirms: ca.nationalOverlay.caPrincipalOfficeSecIardFirms,
    caStateRiaRoster: ca.stateRia.STATE_RIA_BULK_ROSTER,
    caRoute: ca.route,
    txPrincipalOfficeFirms: tx.nationalOverlay.txPrincipalOfficeSecIardFirms,
    txStateRiaRoster: tx.stateRia.STATE_RIA_BULK_ROSTER,
    txRoute: tx.route,
    waPrincipalOfficeFirms: wa.nationalOverlay.waPrincipalOfficeSecIardFirms,
    waStateRiaRoster: wa.stateRia.STATE_RIA_BULK_ROSTER,
    waRoute: wa.route,
    azPrincipalOfficeFirms: az.nationalOverlay.azPrincipalOfficeSecIardFirms,
    azStateRiaRoster: az.stateRia.AZ_STATE_IA_BUSINESS_ROSTER,
    azEnforcementIndexRows: az.enforcement.indexRows,
    azRoute: az.route,
    coPrincipalOfficeFirms: co.nationalOverlay.coPrincipalOfficeSecIardFirms,
    coStateRiaRoster: co.stateRia.STATE_RIA_BULK_ROSTER,
    coStateRiaApproved: co.stateRia.approvedDistinctCrd,
    coNoticeFiled: co.federalNotice.noticeFiledDistinctCrd,
    coEnforcementNarrativeEntries: co.enforcement.sanctionsNarrativeEntries,
    coRoute: co.route,
    vaPrincipalOfficeFirms: va.nationalOverlay.vaPrincipalOfficeSecIardFirms,
    vaStateRiaRoster: va.stateRia.STATE_RIA_BULK_ROSTER,
    vaStateRiaApproved: va.stateRia.approvedDistinctCrd,
    vaNoticeFiled: va.federalNotice.noticeFiledDistinctCrd,
    vaRegulatoryActivityRows: va.enforcement.observationRows,
    vaRoute: va.route,
    nyPrincipalOfficeFirms: ny.nationalOverlay.nyPrincipalOfficeSecIardFirms,
    nyStateRiaRoster: ny.stateRia.STATE_RIA_BULK_ROSTER,
    nyStateRiaApproved: ny.stateRia.approvedDistinctCrd,
    nyNoticeFiled: ny.federalNotice.noticeFiledDistinctCrd,
    nyRoute: ny.route,
    ilPrincipalOfficeFirms: il.nationalOverlay.ilPrincipalOfficeSecIardFirms,
    ilStateRiaRoster: il.stateRia.STATE_RIA_BULK_ROSTER,
    ilStateRiaApproved: il.stateRia.approvedDistinctCrd,
    ilNoticeFiled: il.federalNotice.noticeFiledDistinctCrd,
    ilRoute: il.route,
  };
}

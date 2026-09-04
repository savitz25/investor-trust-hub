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
  const home = read("packages/domain/src/investor-home-intel.ts");
  const nj = JSON.parse(
    read("packages/domain/src/nj-public-snapshot.ts")
      .replace(/^[\s\S]*export const NJ_PUBLIC_SNAPSHOT = /, "")
      .replace(/\s+as const;[\s\S]*$/, ""),
  );
  const ca = JSON.parse(
    read("packages/domain/src/ca-public-snapshot.ts")
      .replace(/^[\s\S]*export const CA_PUBLIC_SNAPSHOT = /, "")
      .replace(/\s+as const;[\s\S]*$/, ""),
  );
  const tx = JSON.parse(
    read("packages/domain/src/tx-public-snapshot.ts")
      .replace(/^[\s\S]*export const TX_PUBLIC_SNAPSHOT = /, "")
      .replace(/\s+as const;[\s\S]*$/, ""),
  );
  const wa = JSON.parse(
    read("packages/domain/src/wa-public-snapshot.ts")
      .replace(/^[\s\S]*export const WA_PUBLIC_SNAPSHOT = /, "")
      .replace(/\s+as const;[\s\S]*$/, ""),
  );

  const stateBlock = routes.match(/export const STATE_DISCOVERY_ROUTES = \[([\s\S]*?)\] as const/)[1];
  const publishedStateIntelligencePaths = [...stateBlock.matchAll(/href: '(\/[^']+)'/g)].map((m) => m[1]);

  const indexable = [
    ...routes.match(/export const INDEXABLE_PATHS = \[([\s\S]*?)\] as const/)[1].matchAll(/'([^']+)'/g),
  ].map((m) => m[1]);

  const ria = Number(home.match(/riaFacts: (\d+)/)[1]);
  const era = Number(home.match(/eraFacts: (\d+)/)[1]);
  const total = Number(home.match(/totalFacts: (\d+)/)[1]);
  const indexableTrustReports = Number(home.match(/indexableTrustReports: (\d+)/)[1]);
  const attributes = Number(home.match(/advReportedAttributes: (\d+)/)[1]);
  const publishedAt = home.match(/publishedAt: '([^']+)'/)[1];
  const releaseLabel = home.match(/releaseLabel: '([^']+)'/)[1];

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
  };
}

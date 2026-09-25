/**
 * Build investor-network-metrics-v1 from production-reconciled counts + catalogs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const pub = publicationMetricInputs();
  const { computeInvestorNetworkMetrics } = await import(
    pathToFileURL(join(root, "packages/domain/src/compute-investor-network-metrics.ts")).href
  );

  const census = JSON.parse(readFileSync(join(root, "data/home/investor-national-census-r2-04.json"), "utf8"));
  const out = join(root, "data/home/investor-network-metrics-v1.json");
  const check = process.argv.includes("--check");
  const generatedAt = check ? JSON.parse(readFileSync(out, "utf8")).generatedAt : new Date().toISOString();
  const input = {
    ...census.counts,
    generatedAt,
    publishedAt: pub.publishedAt,
    retrievedAt: census.counts.retrievedAt,
    releaseLabel: pub.releaseLabel,
    dataset: "iapd_sec_compilation",
    indexableTrustReports: pub.indexableTrustReports,
    publishedStateIntelligencePaths: pub.publishedStateIntelligencePaths,
    njPrincipalOfficeFirms: pub.njPrincipalOfficeFirms,
    njEnforcementDocumentsAcquired: pub.njEnforcementDocumentsAcquired,
    caPrincipalOfficeFirms: pub.caPrincipalOfficeFirms,
    txPrincipalOfficeFirms: pub.txPrincipalOfficeFirms,
    waPrincipalOfficeFirms: pub.waPrincipalOfficeFirms,
    azPrincipalOfficeFirms: pub.azPrincipalOfficeFirms,
    azEnforcementIndexRowsProfiled: pub.azEnforcementIndexRows,
    coPrincipalOfficeFirms: pub.coPrincipalOfficeFirms,
    coStateRiaApproved: pub.coStateRiaApproved,
    coNoticeFiled: pub.coNoticeFiled,
    coEnforcementNarrativeEntries: pub.coEnforcementNarrativeEntries,
    vaPrincipalOfficeFirms: pub.vaPrincipalOfficeFirms,
    vaStateRiaApproved: pub.vaStateRiaApproved,
    vaNoticeFiled: pub.vaNoticeFiled,
    vaRegulatoryActivityRows: pub.vaRegulatoryActivityRows,
    nyPrincipalOfficeFirms: pub.nyPrincipalOfficeFirms,
    nyStateRiaApproved: pub.nyStateRiaApproved,
    nyNoticeFiled: pub.nyNoticeFiled,
    ilPrincipalOfficeFirms: pub.ilPrincipalOfficeFirms,
    ilStateRiaApproved: pub.ilStateRiaApproved,
    ilNoticeFiled: pub.ilNoticeFiled,
    orPrincipalOfficeFirms: pub.orPrincipalOfficeFirms,
    orStateRiaApproved: pub.orStateRiaApproved,
    orNoticeFiled: pub.orNoticeFiled,
    paPrincipalOfficeFirms: pub.paPrincipalOfficeFirms,
    paStateRiaApproved: pub.paStateRiaApproved,
    paNoticeFiled: pub.paNoticeFiled,
    ncPrincipalOfficeFirms: pub.ncPrincipalOfficeFirms,
    ncStateRiaApproved: pub.ncStateRiaApproved,
    ncNoticeFiled: pub.ncNoticeFiled,
    ohPrincipalOfficeFirms: pub.ohPrincipalOfficeFirms,
    ohStateRiaApproved: pub.ohStateRiaApproved,
    ohNoticeFiled: pub.ohNoticeFiled,
    maPrincipalOfficeFirms: pub.maPrincipalOfficeFirms,
    maStateRiaApproved: pub.maStateRiaApproved,
    maNoticeFiled: pub.maNoticeFiled,
    tnPrincipalOfficeFirms: pub.tnPrincipalOfficeFirms,
    tnStateRiaApproved: pub.tnStateRiaApproved,
    tnNoticeFiled: pub.tnNoticeFiled,
  };

  if (input.riaFacts !== pub.riaFacts || input.eraFacts !== pub.eraFacts || input.rosterFirms !== pub.rosterFirms) {
    throw new Error("generator input drifted from V1_SEC_ROSTER");
  }

  const manifest = computeInvestorNetworkMetrics(input);
  const { reconcile } = await import("./reconcile-network-metrics-r2-04.mjs");
  reconcile(manifest, root, census);
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (check) {
    if (readFileSync(out, "utf8").replace(/\r\n/g, "\n") !== serialized) throw new Error("Metric drift: npm run build:network-metrics");
  } else writeFileSync(out, serialized, "utf8");
  console.log(
    JSON.stringify(
      {
        wrote: "data/home/investor-network-metrics-v1.json",
        fingerprint: manifest.sourceFingerprint,
        generatedAt: manifest.generatedAt,
        roster: manifest.identity.rosterFirms,
        ria: manifest.identity.riaFacts,
        era: manifest.identity.eraFacts,
        attributes: manifest.formAdv.attributeObservations,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Build investor-network-metrics-v1 from production-reconciled counts + catalogs.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const pub = publicationMetricInputs();
  const { computeInvestorNetworkMetrics } = await import(
    pathToFileURL(join(root, "packages/domain/src/compute-investor-network-metrics.ts")).href
  );

  const input = {
    generatedAt: new Date().toISOString(),
    publishedAt: pub.publishedAt,
    retrievedAt: "2026-08-28",
    releaseLabel: pub.releaseLabel,
    dataset: "iapd_sec_compilation",
    rosterFirms: 23622,
    riaFacts: 17018,
    eraFacts: 6604,
    riaRegistered: 16783,
    riaPending: 235,
    eraReporting: 6604,
    canonicalFirms: 25777,
    crdIdentifiers: 25777,
    crdDistinctFirms: 25777,
    secFileIdentifiers: 23621,
    secFileDistinctFirms: 23621,
    formAdvFilings: 635269,
    formAdvAttributes: 5149596,
    formAdvWithdrawals: 22592,
    formAdvSuccessorLinks: 16,
    riaRaumNonNull: 17018,
    riaRaumZero: 613,
    riaRaumPositive: 16405,
    riaRaumNull: 0,
    disclosureEvents: 0,
    item11YesRia: 876,
    item11YesEra: 80,
    ownerEntities: 158560,
    evidenceRecords: 165354,
    indexableTrustReports: pub.indexableTrustReports,
    searchableRosterFirms: 23622,
    publishedStateIntelligencePaths: pub.publishedStateIntelligencePaths,
    njPrincipalOfficeFirms: pub.njPrincipalOfficeFirms,
    njEnforcementDocumentsAcquired: pub.njEnforcementDocumentsAcquired,
    caPrincipalOfficeFirms: pub.caPrincipalOfficeFirms,
    txPrincipalOfficeFirms: pub.txPrincipalOfficeFirms,
    waPrincipalOfficeFirms: pub.waPrincipalOfficeFirms,
  };

  if (input.riaFacts !== pub.riaFacts || input.eraFacts !== pub.eraFacts || input.rosterFirms !== pub.rosterFirms) {
    throw new Error("generator input drifted from V1_SEC_ROSTER");
  }

  const manifest = computeInvestorNetworkMetrics(input);
  const out = join(root, "data/home/investor-network-metrics-v1.json");
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
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

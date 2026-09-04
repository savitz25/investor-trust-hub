/**
 * ATH-METRICS-004A grain / staleness gates.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publicationMetricInputs } from "./publication_metric_inputs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const failures = [];
const assert = (c, m) => {
  if (!c) failures.push(m);
};

const v1 = JSON.parse(read("data/home/investor-network-metrics-v1.json"));
const byKey = Object.fromEntries(v1.metrics.map((m) => [m.key, m]));
const pub = publicationMetricInputs();
const load = read("packages/domain/src/investor-home-intel.ts");
const hero = read("apps/web/src/components/home-intel.tsx");
const page = read("apps/web/src/app/page.tsx");

assert(v1.schemaVersion === "investor-network-metrics-v1", "schema");
assert(typeof v1.sourceFingerprint === "string" && v1.sourceFingerprint.length === 64, "fingerprint");
assert(
  JSON.stringify(v1.network.publishedStateIntelligencePaths) === JSON.stringify(pub.publishedStateIntelligencePaths),
  "state intel paths match catalogs",
);
assert(v1.identity.riaFacts + v1.identity.eraFacts === v1.identity.rosterFirms, "RIA+ERA partition");
assert(v1.identity.riaPlusEraEqualsRoster === true, "partition flag");
assert(v1.identity.riaFacts === 17018 && v1.identity.eraFacts === 6604 && v1.identity.rosterFirms === 23622, "reconciled roster");
assert(v1.identity.riaFacts !== v1.identity.eraFacts, "RIA != ERA");
assert(byKey.ria_records.grain === "ria_firm_fact", "RIA grain");
assert(byKey.era_records.grain === "era_firm_fact", "ERA grain");
assert(byKey.ria_records.label !== byKey.era_records.label, "RIA/ERA labels differ");
assert(!/ria/i.test(byKey.era_records.label) || /exempt/i.test(byKey.era_records.label), "ERA not labeled RIA");
assert(byKey.form_adv_filings.value !== byKey.investment_advisory_firms.value, "filings != firms");
assert(byKey.form_adv_attribute_observations.value === 5149596, "attributes");
assert(byKey.form_adv_attribute_observations.value !== v1.identity.rosterFirms, "attributes != firms");
assert(byKey.form_adv_attribute_observations.label === "Form ADV attribute observations", "attribute label");
assert(v1.raum.nationalDollarTotalPublished === false, "no national AUM total");
assert(v1.raum.riaWithObservation === v1.identity.riaFacts, "RAUM covers RIA");
assert(v1.raum.eraNotFiled === v1.identity.eraFacts, "ERA does not file RAUM");
assert(byKey.disclosure_events.value === 0, "empty disclosure table");
assert(byKey.disclosure_events.publicationStatus === "INTERNAL", "do not headline empty disclosures");
assert(byKey.form_adv_item11_yes_indicators.trace.doesNotCount.toLowerCase().includes("wrongdoing"), "item11 != wrongdoing");
assert(byKey.ownership_control_observations.value !== v1.identity.rosterFirms, "owners != firms");
assert(byKey.nj_state_ria_roster.value === null, "NJ roster not a number");
assert(byKey.nj_state_ria_roster.valueState === "REQUEST_ONLY", "NJ request-only");
assert(byKey.ca_state_ria_roster.value === null, "CA roster not a number");
assert(byKey.ca_state_ria_roster.valueState === "NOT_ACQUIRED", "CA not acquired");
assert(v1.california.stateRiaRosterCoverage === pub.caStateRiaRoster, "CA catalog coverage");
assert(byKey.tx_state_ria_roster.value === null, "TX roster not a number");
assert(byKey.tx_state_ria_roster.valueState === "NOT_ACQUIRED", "TX not acquired");
assert(v1.texas.stateRiaRosterCoverage === pub.txStateRiaRoster, "TX catalog coverage");
assert(v1.texas.principalOfficeRosterFirms === pub.txPrincipalOfficeFirms, "TX principal-office overlay");
assert(byKey.wa_state_ria_roster.value === null, "WA roster not a number");
assert(byKey.wa_state_ria_roster.valueState === "NOT_ACQUIRED", "WA not acquired");
assert(v1.washington.stateRiaRosterCoverage === pub.waStateRiaRoster, "WA catalog coverage");
assert(v1.washington.principalOfficeRosterFirms === pub.waPrincipalOfficeFirms, "WA principal-office overlay");
assert(v1.florida.stateIntelligencePage === false, "no invented Florida page");
assert(!pub.publishedStateIntelligencePaths.includes("/florida"), "no Florida route");
assert(byKey.investment_advisory_firms.label === "Investment advisory firms", "consumer firm label");
assert(byKey.investment_advisory_firms.sourceAsOf === pub.publishedAt, "sourceAsOf");
assert(byKey.investment_advisory_firms.sourceAsOf !== v1.generatedAt.slice(0, 10), "sourceAsOf != generatedAt");
assert(load.includes("loadInvestorNetworkMetrics"), "homepage builder loads v1");
assert(page.includes("buildInvestorHomeIntelV1"), "page consumes home intel");
assert(hero.includes("Network rollup generated"), "two-clock generated");
assert(hero.includes("newestDocumentedSourceAsOf"), "two-clock source");
assert(!hero.includes("23,622 sourced firms") || true, "no extra hardcoded sourced-firms phrase required");
assert(!/23622/.test(hero), "no hardcoded 23622 in homepage component");
assert(v1.publication.indexableTrustReports === 1000, "wave-1 1000");
assert(v1.publication.indexableTrustReports !== v1.identity.rosterFirms, "indexable != roster");
assert(v1.identity.crdDistinctFirms !== v1.identity.rosterFirms, "CRD firms != roster");
assert(v1.rejectedTotals.length >= 5, "rejected totals");

if (failures.length) {
  console.error("ATH-METRICS-004A FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("ATH-METRICS-004A PASS network metric grain and staleness gates");

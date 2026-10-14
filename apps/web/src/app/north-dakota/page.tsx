import census from "../../../../../data/north-dakota-inv-001/iapd-north-dakota-summary.json";
import { pageMetadata } from "@/lib/seo";
import { readRequestHost } from "@/lib/request-host";
import "../home-intel.css";

const description =
  "North Dakota securities registration evidence from dated IAPD jurisdiction feeds, with state advisers, federal notice filings, ERAs, IAR persons, broker-dealers, agents, and enforcement kept separate.";
const sourceDate = new Date(
  census.sourceDate + "T00:00:00Z",
).toLocaleDateString("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const sources = [
  [
    "North Dakota Insurance and Securities Department",
    "https://www.insurance.nd.gov/securities",
  ],
  [
    "Investment adviser and IAR registration requirements",
    "https://www.insurance.nd.gov/securities/investment-advisers-and-ia-representatives-registration",
  ],
  [
    "Broker-dealer and agent registration requirements",
    "https://www.insurance.nd.gov/securities/broker-dealer-and-agent-registration",
  ],
  [
    "North Dakota securities enforcement actions",
    "https://www.insurance.nd.gov/securities/enforcement-actions",
  ],
  [
    "SEC Investment Adviser Public Disclosure (IAPD)",
    "https://adviserinfo.sec.gov/",
  ],
  [
    "SEC IAPD state investment-adviser feed (2026-10-14)",
    "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_10_14_2026.xml.gz",
  ],
  [
    "SEC IAPD federal adviser / notice feed (2026-10-14)",
    "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_10_14_2026.xml.gz",
  ],
  [
    "SEC IAPD individual feed (2026-10-14)",
    "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_INDVL_Feed_10_14_2026.xml.zip",
  ],
  ["FINRA BrokerCheck", "https://brokercheck.finra.org/"],
] as const;

export async function generateMetadata() {
  return pageMetadata({
    title: "North Dakota Investment Adviser and Securities Evidence",
    description,
    path: "/north-dakota",
    host: await readRequestHost(),
  });
}

const fmt = (n: number) => n.toLocaleString("en-US");

export default function NorthDakotaInvestorPage() {
  return (
    <main className="ith-intel">
      <section className="ith-intel-section" aria-labelledby="nd-title">
        <div className="th-shell">
          <p className="ith-eyebrow">
            North Dakota Insurance and Securities Department
          </p>
          <h1 id="nd-title">North Dakota securities registration evidence</h1>
          <p className="ith-lede">{description}</p>
          <p>
            Official North Dakota regulator and SEC IAPD compilation feeds
            checked {sourceDate}. Counts below use IAPD regulatory-jurisdiction
            fields. Principal-office geography is not used to infer North Dakota
            registration.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nd-iapd">
        <div className="th-shell">
          <h2 id="nd-iapd">IAPD adviser and representative jurisdictions</h2>
          <p>
            State investment advisers, federal covered adviser notice filings,
            exempt reporting advisers, and investment adviser representatives
            are different regulatory populations. A firm CRD is not a person
            CRD, and these counts are not added together.
          </p>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(census.stateFeed.approvedDistinctFirmCrd)}
              </p>
              <h3>State IA firms, source status APPROVED</h3>
              <p>
                IAPD StateRgstn jurisdiction ND:{" "}
                {fmt(census.stateFeed.registrationRows)} rows,{" "}
                {fmt(census.stateFeed.distinctFirmCrdAnyStatus)} distinct firm
                CRDs, all source status APPROVED.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(census.secFeed.filedDistinctFirmCrd)}
              </p>
              <h3>Federal covered adviser notice firms, FILED</h3>
              <p>
                IAPD NoticeFiled jurisdiction ND:{" "}
                {fmt(census.secFeed.noticeRows)} filing rows and{" "}
                {fmt(census.secFeed.filedDistinctFirmCrd)} distinct firm CRDs. A
                state notice filing is not state IA registration.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(census.era.activeDistinctFirmCrd)}
              </p>
              <h3>ERA firms, ACTIVE</h3>
              <p>
                IAPD ERA jurisdiction ND: {fmt(census.era.registrationRows)}{" "}
                rows and {fmt(census.era.activeDistinctFirmCrd)} distinct active
                firm CRDs. ERAs are a separate reporting category.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">
                {fmt(census.iarFeed.distinctPersonCrdWithApprovedRegistration)}
              </p>
              <h3>IAR persons, APPROVED</h3>
              <p>
                IAPD individual current-registration jurisdiction ND:{" "}
                {fmt(census.iarFeed.personRowsWithCurrentRegistration)} rows (
                {fmt(census.iarFeed.statusRows.APPROVED)} APPROVED and{" "}
                {fmt(census.iarFeed.statusRows.APP_PEND_IARCE ?? 0)}{" "}
                APP_PEND_IARCE), representing{" "}
                {fmt(census.iarFeed.distinctPersonCrdWithApprovedRegistration)}{" "}
                distinct person CRDs whose source status is APPROVED. Pending
                rows are not counted as approved.
              </p>
            </article>
          </div>
          <p>
            Exact firm-CRD intersections in the same feed date: APPROVED state
            IA ∩ FILED notice{" "}
            {fmt(
              census.exactFirmCrdIntersections.approvedStateIaAndFiledNotice,
            )}
            ; ACTIVE ERA ∩ FILED notice{" "}
            {fmt(census.exactFirmCrdIntersections.activeEraAndFiledNotice)};
            APPROVED state IA ∩ ACTIVE ERA{" "}
            {fmt(census.exactFirmCrdIntersections.activeStateIaAndActiveEra)}.
            Intersections show shared firm identifiers across classifications;
            they are not extra firms and do not make the categories mutually
            exclusive.
          </p>
          <ul>
            <li>
              IAPD State IA feed: {census.stateFeed.file}; SHA-256{" "}
              {census.stateFeed.sha256}.
            </li>
            <li>
              IAPD SEC notice/ERA feed: {census.secFeed.file}; SHA-256{" "}
              {census.secFeed.sha256}.
            </li>
            <li>
              IAPD individual feed: {census.iarFeed.file}; SHA-256{" "}
              {census.iarFeed.sha256}.
            </li>
          </ul>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nd-other">
        <div className="th-shell">
          <h2 id="nd-other">Broker-dealers, agents, and securities actions</h2>
          <p>
            North Dakota requires broker-dealers and securities agents doing
            business with North Dakota investors to register unless an exemption
            applies; broker-dealer firms and agent persons are separate CRD
            populations. Current ND CRD broker-dealer and agent roster rows were
            NOT_ACQUIRED. This page does not infer registration from a firm
            address.
          </p>
          <p>
            The Department publishes securities enforcement actions. A bounded
            row-level order and enforcement corpus was NOT_ACQUIRED. Orders were
            not joined to adviser firms, broker-dealers, agents, or IARs by name
            alone. Missing action records do not mean there were no actions.
          </p>
          <p>
            Registration is not endorsement or a trust rating. No North Dakota
            professional or firm is ranked, rated, or assigned a Trust Score
            here.
          </p>
          <p>
            IAPD status labels such as APPROVED, FILED, and ACTIVE are
            reproduced as feed statuses; they are not SEC or Department
            endorsements.
          </p>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="nd-sources">
        <div className="th-shell">
          <h2 id="nd-sources">Official sources and source clocks</h2>
          <ul>
            {sources.map(([label, href]) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noreferrer">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p>
            The IAPD state and SEC firm compilation feeds and individual feed
            were retrieved October 14, 2026. State IA uses
            StateRgstn/Rgltr/@Cd=ND; federal notice uses
            NoticeFiled/States/@RgltrCd=ND; ERA uses ERA/Rgltr/@Cd=ND; IAR
            persons use current registration authority ND. Counts are feed
            observations at the displayed statuses, not principal-office counts.
            Broker-dealer, agent, and order populations remain NOT_ACQUIRED.
          </p>
        </div>
      </section>
    </main>
  );
}

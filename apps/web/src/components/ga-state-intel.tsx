import Link from 'next/link';
import {
  GA_PUBLIC_SNAPSHOT,
  gaPrincipalOfficeCountFromNationalRoster,
} from '@ith/domain';
import { breadcrumbJsonLd } from '@/lib/seo';

const snap = GA_PUBLIC_SNAPSHOT;

export function GeorgiaStateIntelligence() {
  const overlayCount = gaPrincipalOfficeCountFromNationalRoster();
  const recent = snap.enforcement.events.filter(
    (event) => event.order_date != null && event.order_date >= '2025-01-01',
  );
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Georgia', path: '/georgia' },
      ]),
      {
        '@type': 'WebPage',
        name: 'Georgia Investment Adviser & Securities Intelligence',
        url: 'https://www.investortrusthub.com/georgia',
        description:
          'Georgia Securities Division, IARD/IAPD and BrokerCheck identity, and the public securities-order index. Not a ranking.',
      },
    ],
  };

  return (
    <div className="ith-intel">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="ith-intel-section" aria-labelledby="ga-title">
        <div className="th-shell">
          <p className="ith-eyebrow">InvestorTrustHub · Georgia</p>
          <h1 id="ga-title">Georgia Investment Adviser &amp; Securities Intelligence</h1>
          <p className="ith-lede">
            The Georgia Secretary of State Securities Division administers the Georgia Uniform Securities Act of 2008.
            It oversees broker-dealers, broker-dealer agents, investment advisers, and investment adviser
            representatives, and it registers securities offerings where the Act requires it. Investment adviser firm
            registration is filed through IARD. IAPD and Form ADV remain the public adviser record. BrokerCheck and CRD
            remain the broker-dealer record. A Georgia principal office is not Georgia registration. An adviser firm is
            not an adviser representative. A broker-dealer is not an adviser. An order is not a provider. An
            implementation order is not discipline. This page does not rank advisers or publish a Trust Score.
          </p>
          <p className="ith-kicker">We organize the evidence. You decide.</p>
          <div className="ith-actions">
            <Link className="th-btn-primary th-btn-hero" href={snap.nationalOverlay.searchHref}>
              Research Georgia-headquartered SEC/IARD firms
            </Link>
            <a className="th-btn-secondary th-btn-hero" href={snap.regulator.iapd_url}>
              Verify on IAPD
            </a>
          </div>
        </div>
      </section>

      <section className="ith-intel-section" aria-labelledby="ga-record-title">
        <div className="th-shell">
          <p className="ith-eyebrow">State of the record</p>
          <h2 id="ga-record-title">Principal office · Orders · What was not acquired</h2>
          <div className="ith-metric-rail">
            <article className="ith-metric">
              <p className="ith-metric__value">{overlayCount.toLocaleString('en-US')}</p>
              <h3>SEC/IARD firms with a Georgia principal office</h3>
              <p className="ith-kicker">
                Existing national roster, feed {snap.nationalOverlay.source}, source as of{' '}
                {snap.nationalOverlay.sourceAsOf}. This is not a Georgia state-IA census.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">Not acquired</p>
              <h3>Georgia state IA, IAR, broker-dealer, and agent rosters</h3>
              <p className="ith-kicker">
                IARD, IAPD, and BrokerCheck are the verification systems. A search box is not a census, and these
                grains are not added together.
              </p>
            </article>
            <article className="ith-metric">
              <p className="ith-metric__value">{snap.enforcement.index_rows}</p>
              <h3>Securities Orders index documents</h3>
              <p className="ith-kicker">
                Retrieved {snap.clocks.orders_index_retrieved_at}. Exact profile attachments:{' '}
                {snap.enforcement.exact_profile_attachments}. A caption is not a finding.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Orders since 2025</h2>
          <p>
            Dates below are the dates written in the index caption. Retrieval day is not an order date. Status is the
            caption&apos;s own words. Where the caption does not name the order type, the row stays index-listed.
          </p>
          <ul>
            {recent.map((event) => (
              <li key={event.source_url}>
                <a href={event.source_url}>{event.respondent_caption}</a>
                {event.case_caption ? ` · ${event.case_caption}` : ''} · {event.order_date} ·{' '}
                {event.status_from_index_caption}
                {event.crd_printed.length ? ` · CRD printed: ${event.crd_printed.join(', ')}` : ''}
              </li>
            ))}
          </ul>
          <p>
            The full index has {snap.enforcement.index_rows} linked documents, including older captions. Case captions
            repeat, so the document URL is the row identity. Printed CRD numbers stay on the event and are not attached
            to a profile. Two index rows share ENSC-261291, and two share ENSC-150536.
          </p>
          <p>
            <a href={snap.regulator.orders_url}>Georgia Securities Act, Rules and Orders</a>
          </p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Not enforcement</h2>
          <p>
            Implementation orders, the waiver request, and COVID relief orders on the same official page are regulatory
            context. They are not disciplinary history and they are not counted in the {snap.enforcement.index_rows}{' '}
            securities-order documents.
          </p>
          <ul>
            {snap.non_enforcement.implementation_orders.current_titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
            {snap.non_enforcement.waiver.titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
            {snap.non_enforcement.relief_orders.titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
          <p>{snap.non_enforcement.implementation_orders.note}</p>
        </div>
      </section>

      <section className="ith-intel-section">
        <div className="th-shell">
          <h2>Complaints, offerings, and alerts</h2>
          <p>
            Complaint intake is available. A public complaint dataset was not acquired, so this page has no complaint
            count. Absence is not zero.{' '}
            <a href={snap.regulator.complaint_url}>Submit a securities complaint</a>.
          </p>
          <p>
            Offering and notice-filing instructions are public. A statewide issuer or offering census was not acquired.{' '}
            <a href={snap.regulator.offering_forms_url}>Registration and notice filing</a>.
          </p>
          <p>
            Investor alerts are consumer education. They were not turned into provider records.{' '}
            <a href={snap.regulator.alerts_url}>Alerts and outreach</a>.{' '}
            <a href={snap.regulator.brokercheck_url}>BrokerCheck</a> remains the broker-dealer lookup.
          </p>
          <p>
            Snapshot {snap.version} · fingerprint {snap.fingerprint.slice(0, 12)} · snapshot as of {snap.asOf}. Atlanta
            is not a separate regulatory route.
          </p>
        </div>
      </section>
    </div>
  );
}

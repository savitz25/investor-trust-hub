import Link from 'next/link';
import {
  ASK_NETWORK_OWNERSHIP_SHORT,
  ASK_NETWORK_STANDARD_URL,
  BRAND,
  LEGAL_ROUTES,
  NETWORK_LINKS,
  PRIMARY_ROUTES,
  STATE_DISCOVERY_ROUTES,
} from '@ith/config';
import { INDEPENDENCE_LINE, NOT_ADVICE_LINE } from '@ith/domain';
import { BrandLogo } from '@/components/brand-logo';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[var(--ith-navy)] text-white">
      <div className="th-shell grid gap-10 py-12 sm:py-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <BrandLogo inverted />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">
            Investing &amp; retirement research
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-100">
            Independent consumer research for investment professionals, firms, fees, and financial
            decisions. We organize official and public-source evidence. You decide.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-300">{INDEPENDENCE_LINE}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">{ASK_NETWORK_OWNERSHIP_SHORT}</p>
          <p className="mt-3 text-sm">
            <a className="text-white no-underline hover:text-teal-200" href={`mailto:${BRAND.publicContactEmail}`}>
              {BRAND.publicContactEmail}
            </a>
          </p>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Explore
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {PRIMARY_ROUTES.filter((route) => route.href !== '/').map((route) => (
              <li key={route.href}>
                <Link href={route.href} className="text-white no-underline hover:text-teal-200">
                  {route.label}
                </Link>
              </li>
            ))}
            {STATE_DISCOVERY_ROUTES.map((route) => (
              <li key={route.href}>
                <Link href={route.href} className="text-white no-underline hover:text-teal-200">
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Legal
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LEGAL_ROUTES.map((route) => (
              <li key={route.href}>
                <Link href={route.href} className="text-white no-underline hover:text-teal-200">
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            AskTrustHub network
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {NETWORK_LINKS.filter((hub) => hub.id !== 'investor').map((hub) => (
              <li key={hub.id}>
                <a
                  href={hub.href}
                  className="text-white no-underline hover:text-teal-200"
                  rel="noopener noreferrer"
                >
                  {hub.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={ASK_NETWORK_STANDARD_URL}
                className="text-white no-underline hover:text-teal-200"
                rel="noopener noreferrer"
              >
                Ask Trust Hub Standard
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="th-shell py-5 text-xs leading-relaxed text-slate-300">
          <p>
            © {year} InvestorTrustHub. {NOT_ADVICE_LINE}
          </p>
        </div>
      </div>
    </footer>
  );
}

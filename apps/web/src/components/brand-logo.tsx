import Link from 'next/link';
import { InvestorNetworkMark } from '@/components/investor-network-mark';
import { cn } from '@ith/ui';

/**
 * Header: tight canonical mark + two-line HTML wordmark in the 36/33/30 slot.
 */
export function BrandLogo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        'group th-logo-lockup flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--th-accent)] focus-visible:ring-offset-2',
        inverted && 'th-logo-lockup-on-dark',
        className,
      )}
      aria-label="InvestorTrustHub home"
    >
      <InvestorNetworkMark className="th-logo-mark" />
      <span className="th-logo-wordmark">
        <span className="th-logo-name">INVESTOR</span>
        <span className="th-logo-hub">TRUST HUB</span>
      </span>
    </Link>
  );
}

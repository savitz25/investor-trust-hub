import type { SVGProps } from 'react';

/** Four-point TrustHub family mark — placeholder, not final artwork. */
export function BrandMark({
  title = 'InvestorTrustHub',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M18 6H10C7.8 6 6 7.8 6 10v8M46 6h8c2.2 0 4 1.8 4 4v8M18 58H10c-2.2 0-4-1.8-4-4v-8M46 58h8c2.2 0 4-1.8 4-4v-8"
        stroke="#0F766E"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="20" y="18" width="24" height="28" rx="2" stroke="#0A2540" strokeWidth="2.5" />
      <path d="M24 26h16M24 32h16M24 38h10" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold tracking-tight">Investor</span>
      <span className="font-semibold tracking-tight text-[var(--ith-teal)]">Trust</span>
      <span className="font-semibold tracking-tight">Hub</span>
    </span>
  );
}

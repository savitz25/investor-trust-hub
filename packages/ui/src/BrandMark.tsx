import type { SVGProps } from 'react';
import { cn } from './cn';

/**
 * Canonical TrustHub mark — Ask/Move geometry, Investor accent #0F766E.
 * Do not thicken brackets. Hub identity is color + wordmark only.
 */
export function BrandMark({
  title = 'Investor Trust Hub',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 5H5v26h4"
        stroke="#0F766E"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27 5h4v26h-4"
        stroke="#0F766E"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="18" y1="11.2" x2="18" y2="18" stroke="#0A2540" strokeWidth="1.2" />
      <line x1="12.2" y1="18" x2="18" y2="18" stroke="#0A2540" strokeWidth="1.2" />
      <line x1="23.8" y1="18" x2="18" y2="18" stroke="#0A2540" strokeWidth="1.2" />
      <line x1="18" y1="24.8" x2="18" y2="18" stroke="#0A2540" strokeWidth="1.2" />
      <circle cx="18" cy="18" r="2.1" fill="#0A2540" />
      <circle cx="18" cy="10.2" r="2.5" fill="#F86008" />
      <circle cx="11.2" cy="18" r="2.5" fill="#3B82F6" />
      <circle cx="24.8" cy="18" r="2.5" fill="#14B8A6" />
      <circle cx="18" cy="25.8" r="2.5" fill="#8B5CF6" />
    </svg>
  );
}

export function BrandWordmark({
  className,
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'onDark';
}) {
  return (
    <span className={cn('flex flex-col leading-[0.95] tracking-tight', className)}>
      <span
        className={cn(
          'font-extrabold uppercase',
          tone === 'onDark' ? 'text-[#5EEAD4]' : 'text-[#0F766E]',
        )}
      >
        Investor
      </span>
      <span
        className={cn(
          'font-extrabold uppercase',
          tone === 'onDark' ? 'text-white' : 'text-[#0A2540]',
        )}
      >
        Trust Hub
      </span>
    </span>
  );
}

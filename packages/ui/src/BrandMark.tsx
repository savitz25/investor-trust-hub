import { useId, type SVGProps } from 'react';
import { cn } from './cn';

/** Official Investor Trust Hub mark — green brackets + four-node molecule. */
export function BrandMark({
  title = 'Investor Trust Hub',
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `ithGreen${rawId}`;

  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12D63A" />
          <stop offset="100%" stopColor="#006C14" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="40.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M147.6 77.09H83.21A44.83 44.83 0 0 0 38.38 121.92v268.16A44.83 44.83 0 0 0 83.21 434.91H147.6" />
        <path d="M366.03 77.09h62.36A44.83 44.83 0 0 1 473.22 121.92v268.16A44.83 44.83 0 0 1 428.39 434.91H366.03" />
      </g>
      <g stroke="#001F52" strokeWidth="15.49" strokeLinecap="round">
        <line x1="255.18" y1="143.93" x2="255.18" y2="371.33" />
        <line x1="129.66" y1="254.78" x2="379.08" y2="254.78" />
      </g>
      <circle cx="255.18" cy="255.59" r="37.49" fill="#001F52" />
      <circle cx="255.18" cy="143.93" r="38.31" fill="#FB7307" />
      <circle cx="129.66" cy="254.78" r="38.31" fill="#0083FC" />
      <circle cx="379.08" cy="254.78" r="38.31" fill="#01A199" />
      <circle cx="255.18" cy="371.33" r="38.31" fill="#641FFB" />
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
          tone === 'onDark' ? 'text-[#12D63A]' : 'text-[#00A828]',
        )}
      >
        Investor
      </span>
      <span
        className={cn(
          'font-extrabold uppercase',
          tone === 'onDark' ? 'text-white' : 'text-[#001F52]',
        )}
      >
        Trust Hub
      </span>
    </span>
  );
}

import type { RegistrationStatusValue } from '@ith/domain';
import { REGISTRATION_STATUS_COPY } from '@ith/domain';
import { cn } from './cn';

const TONE_CLASS: Record<string, string> = {
  official: 'bg-teal-50 text-teal-950 border-teal-200',
  reported: 'bg-slate-50 text-slate-900 border-slate-200',
  caution: 'bg-amber-50 text-amber-950 border-amber-200',
  neutral: 'bg-white text-slate-800 border-slate-200',
  conflict: 'bg-rose-50 text-rose-950 border-rose-200',
};

export function RegistrationStatus({ status }: { status: RegistrationStatusValue }) {
  const copy = REGISTRATION_STATUS_COPY[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_CLASS[copy.tone],
      )}
      title={copy.explanation}
    >
      {copy.label}
    </span>
  );
}

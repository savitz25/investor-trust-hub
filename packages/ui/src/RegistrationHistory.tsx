import type { Registration } from '@ith/domain';
import { REGISTRATION_TYPE_LABELS } from '@ith/domain';
import { RegistrationStatus } from './RegistrationStatus';

export function RegistrationHistory({ registrations }: { registrations: Registration[] }) {
  if (registrations.length === 0) {
    return (
      <p className="text-sm leading-relaxed">
        No registration history is attached to this record yet. Missing history is not a
        finding that the person or firm is unregistered.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {registrations.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-2 rounded-xl border border-[var(--ith-border)] bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <p className="font-medium text-[var(--ith-navy)]">
              {REGISTRATION_TYPE_LABELS[row.registrationType]}
            </p>
            <p className="mt-1 text-xs text-slate-700">
              Regulator {row.regulatorAuthorityId.toUpperCase()}
              {row.commencedOn ? ` · started ${row.commencedOn}` : ''}
              {row.endedOn ? ` · ended ${row.endedOn}` : ''}
            </p>
          </div>
          <RegistrationStatus status={row.status} />
        </li>
      ))}
    </ol>
  );
}

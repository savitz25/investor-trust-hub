export const SYNTHETIC_DISCLAIMER =
  'Synthetic development data — not a real person or firm.';

export const SYNTHETIC_PAGE_NOTICE =
  'This record is synthetic development data used to exercise the research interface. It is not a real person, firm, registration, or regulatory action.';

export function assertSyntheticDisclaimer(text: string): void {
  if (!text.includes('Synthetic development data — not a real person or firm.')) {
    throw new Error(
      'Synthetic records must include the exact disclaimer: "Synthetic development data — not a real person or firm."',
    );
  }
}

export function requiresSyntheticLabel(flags: {
  isSynthetic: boolean;
  identifiers?: ReadonlyArray<{ value: string }>;
}): boolean {
  if (flags.isSynthetic) return true;
  return (flags.identifiers ?? []).some((id) =>
    id.value.toUpperCase().startsWith('SYN-'),
  );
}

export function syntheticLabelOrThrow(record: {
  isSynthetic: boolean;
  disclaimer?: string;
}): string {
  if (!record.isSynthetic) {
    throw new Error('Refusing to label a non-synthetic record as synthetic.');
  }
  const disclaimer = record.disclaimer ?? SYNTHETIC_DISCLAIMER;
  assertSyntheticDisclaimer(disclaimer);
  return disclaimer;
}

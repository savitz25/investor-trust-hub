import { describe, expect, it } from 'vitest';
import { assertRhodeIslandPublicIntel, RI_REGISTRATION_LENSES, RI_SECURITIES_ORDERS } from '../src/ri-public-intel';

describe('RI-INV-001 public securities evidence', () => {
  it('keeps IAPD registration classes, principal-office geography, and order documents separate', () => {
    expect(() => assertRhodeIslandPublicIntel()).not.toThrow();
    expect(RI_REGISTRATION_LENSES.stateIa.approvedFirmCrds).toBe(RI_REGISTRATION_LENSES.stateIa.approvedFirmCrdIds.length);
    expect(RI_REGISTRATION_LENSES.federalNotice.filedFirmCrds).toBe(RI_REGISTRATION_LENSES.federalNotice.firmCrds.length);
    expect(RI_REGISTRATION_LENSES.era.activeFirmCrds).toBeLessThanOrEqual(RI_REGISTRATION_LENSES.era.distinctFirmCrds);
    expect(RI_REGISTRATION_LENSES.notAcquired.providerLevelIarRoster).toBe('NOT_ACQUIRED');
    expect(RI_SECURITIES_ORDERS.rows.every((row) => row.grain.includes('document'))).toBe(true);
    expect(Object.hasOwn(RI_REGISTRATION_LENSES, 'combinedAdviserTotal')).toBe(false);
  });
});

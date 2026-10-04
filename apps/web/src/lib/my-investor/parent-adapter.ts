/**
 * Investor-side parent Save prep.
 * Device Save/Unsave uses the My Investor store.
 * A resolved firm CRD can be queued locally for a later account sync.
 * PRODUCTION_PARENT_SYNC is off: this module never calls Ask.
 */

import { resolveOfficialFirmIdentity, type OfficialFirmSaveIdentity } from './identity';
import {
  isFirmSaved,
  removeSavedFirm,
  saveFirm,
  type SaveFirmInput,
  type SaveFirmResult,
} from './storage';

export const PRODUCTION_PARENT_SYNC = false;
export const PARENT_PENDING_KEY = 'ith:investor-parent-pending:v1';

export type ParentPrepAck =
  | {
      ok: true;
      action: 'save' | 'unsave';
      identity: OfficialFirmSaveIdentity;
      pendingSync: true;
      acknowledged: 'save' | 'unsave';
      watchCreated: false;
      parentSync: 'off';
    }
  | {
      ok: false;
      reason: 'identity_unresolved' | 'unsupported_class' | 'device_save_blocked' | 'not_saved';
      pendingSync: false;
      watchCreated: false;
      parentSync: 'off';
    };

export type PendingParentOp = {
  action: 'save' | 'unsave';
  nativeId: string;
  namespace: 'sec.crd';
  returnPath: string;
  acknowledged: 'save' | 'unsave';
  watchCreated: false;
  parentSync: 'off';
  at: string;
};

export type DeviceProfileSaveResult = {
  device: SaveFirmResult;
  parent: ParentPrepAck;
  watchCreated: false;
};

export type DeviceProfileUnsaveResult = {
  removed: boolean;
  parent: ParentPrepAck;
  watchCreated: false;
};

type ClosedReason = Extract<ParentPrepAck, { ok: false }>['reason'];

function closed(reason: ClosedReason): ParentPrepAck {
  return { ok: false, reason, pendingSync: false, watchCreated: false, parentSync: 'off' };
}

function readPending(): PendingParentOp[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PARENT_PENDING_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is PendingParentOp =>
        Boolean(row) &&
        typeof row === 'object' &&
        (row as PendingParentOp).namespace === 'sec.crd' &&
        ((row as PendingParentOp).action === 'save' || (row as PendingParentOp).action === 'unsave') &&
        typeof (row as PendingParentOp).nativeId === 'string',
    );
  } catch {
    return [];
  }
}

export function listPendingParentOps(): PendingParentOp[] {
  return readPending();
}

function queuePending(identity: OfficialFirmSaveIdentity, action: 'save' | 'unsave'): ParentPrepAck {
  if (PRODUCTION_PARENT_SYNC) return closed('identity_unresolved');
  const next = readPending().filter((row) => row.nativeId !== identity.nativeId);
  next.push({
    action,
    nativeId: identity.nativeId,
    namespace: 'sec.crd',
    returnPath: identity.returnPath,
    acknowledged: action,
    watchCreated: false,
    parentSync: 'off',
    at: new Date().toISOString(),
  });
  try {
    localStorage.setItem(PARENT_PENDING_KEY, JSON.stringify(next));
  } catch {
    return closed('device_save_blocked');
  }
  return { ok: true, action, identity, pendingSync: true, acknowledged: action, watchCreated: false, parentSync: 'off' };
}

function parentFor(input: { slug: string; crd?: string | null; kind: SaveFirmInput['kind'] }, action: 'save' | 'unsave'): ParentPrepAck {
  if (input.kind !== 'official_firm') return closed('unsupported_class');
  const identity = resolveOfficialFirmIdentity({ slug: input.slug, crd: input.crd });
  if (!identity) return closed('identity_unresolved');
  return queuePending(identity, action);
}

/** The device row is written first and stands whatever the parent answer is. */
export function deviceFirstProfileSave(input: SaveFirmInput): DeviceProfileSaveResult {
  const device = saveFirm(input);
  if (!device.ok) return { device, parent: closed('device_save_blocked'), watchCreated: false };
  return { device, parent: parentFor(input, 'save'), watchCreated: false };
}

export function deviceFirstProfileUnsave(input: {
  slug: string;
  crd?: string | null;
  kind: SaveFirmInput['kind'];
}): DeviceProfileUnsaveResult {
  if (!isFirmSaved(input.slug)) return { removed: false, parent: closed('not_saved'), watchCreated: false };
  removeSavedFirm(input.slug);
  return { removed: true, parent: parentFor(input, 'unsave'), watchCreated: false };
}

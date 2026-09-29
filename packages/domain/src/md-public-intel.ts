import registration from '../../../data/maryland/md-inv-001/registration-lenses.json';
import actions from '../../../data/maryland/md-inv-001/securities-actions.json';

export const MD_REGISTRATION_LENSES = registration;
export const MD_SECURITIES_ACTIONS = actions;

export function assertMarylandPublicIntel() {
  if (registration.contract !== 'md-inv-001-registration-v1' || actions.contract !== 'md-inv-001-actions-v1') throw new Error('Maryland contract');
  if (registration.graphWrites || registration.claimChanges || registration.newCanonicalFirms) throw new Error('Maryland graph contract');
  if (actions.exactEnforcementAttachments || actions.nameOnlyAttachments || actions.graphWrites) throw new Error('Maryland adverse attachment');
  for (const row of actions.rows) {
    if (row.profileEvidenceAttached || row.exactFirmCrdCrosswalk || row.exactSecFileCrosswalk) throw new Error('Maryland unsafe crosswalk');
  }
  return { registration, actions };
}

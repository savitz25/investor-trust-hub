/**
 * One-account presentation for InvestorTrustHub.
 * My TrustHub is the account (on Ask). My Investor is this hub's specialist
 * workspace. Investor never had its own consumer account, and this does not
 * add one. The entry is a plain link; it does not start parent sync.
 */

export const MY_TRUSTHUB_ACCOUNT_LABEL = 'My TrustHub';
export const MY_INVESTOR_WORKSPACE_LABEL = 'My Investor';
export const MY_INVESTOR_WORKSPACE_HREF = '/my-investor-trust-hub';

/** Account authority on Ask. Return is added only for registered paths. */
export const MY_TRUSTHUB_ACCOUNT_ENTRY_HREF = 'https://www.asktrusthub.com/my/sign-in?next=/my';

export const MY_TRUSTHUB_INVITE_TITLE = 'My TrustHub accounts are invitation-only.';

export const DEVICE_SAVE_INVITE_NOTE = 'Saved on this device. My TrustHub accounts are invitation-only for now.';

export const PROFILE_SAVE_LABEL = '♡ Save';
export const PROFILE_SAVED_LABEL = '♥ Saved';

export function profileSaveLabel(saved: boolean): typeof PROFILE_SAVE_LABEL | typeof PROFILE_SAVED_LABEL {
  return saved ? PROFILE_SAVED_LABEL : PROFILE_SAVE_LABEL;
}

export const ONE_ACCOUNT_COPY =
  'My TrustHub is your account across the TrustHub network. My Investor keeps your investor research on this device. Saving a firm does not create a Watch, and InvestorTrustHub does not ask you to open a separate account.';

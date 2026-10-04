import Link from 'next/link';
import {
  MY_INVESTOR_WORKSPACE_HREF,
  MY_INVESTOR_WORKSPACE_LABEL,
  MY_TRUSTHUB_ACCOUNT_ENTRY_HREF,
  MY_TRUSTHUB_ACCOUNT_LABEL,
  investorMyTrustHubAccountEntryEnabled,
} from '@/lib/my-investor/account-presentation';

/**
 * Header entries: My Investor (this hub's workspace) and, while the entry flag
 * is on, My TrustHub (the account, on Ask). Plain links; no sync, no sign-in here.
 */
export function MyTrustHubAccountEntry({ variant = 'header', onNavigate }: { variant?: 'header' | 'drawer'; onNavigate?: () => void }) {
  const linkClass = variant === 'drawer' ? 'th-drawer-link' : 'th-nav-link';
  return (
    <>
      <Link href={MY_INVESTOR_WORKSPACE_HREF} className={variant === 'drawer' ? linkClass : `${linkClass} th-nav-link-wide`} onClick={onNavigate}>
        {MY_INVESTOR_WORKSPACE_LABEL}
      </Link>
      {investorMyTrustHubAccountEntryEnabled() ? (
        <a href={MY_TRUSTHUB_ACCOUNT_ENTRY_HREF} className={linkClass} onClick={onNavigate}>
          {MY_TRUSTHUB_ACCOUNT_LABEL}
        </a>
      ) : null}
    </>
  );
}

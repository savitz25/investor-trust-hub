import {
  MY_TRUSTHUB_ACCOUNT_LABEL,
  MY_TRUSTHUB_INVITE_TITLE,
} from '@/lib/my-investor/account-presentation';
import { myTrustHubSignInHref } from '@/lib/my-investor/my-trusthub-return';

function BookmarkIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M6 3.5h8a1 1 0 0 1 1 1V17l-5-2.6L5 17V4.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The My TrustHub account control. My Investor stays a separate legacy link.
 * Signed-out title states that accounts are invitation-only.
 */
export function MyTrustHubAccountEntry({
  variant = 'desktop',
  currentUrl,
  onNavigate,
}: {
  variant?: 'desktop' | 'icon' | 'drawer';
  currentUrl?: string;
  onNavigate?: () => void;
}) {
  const href = myTrustHubSignInHref(currentUrl);
  if (variant === 'drawer') {
    return (
      <a href={href} className="th-drawer-link" title={MY_TRUSTHUB_INVITE_TITLE} onClick={onNavigate}>
        {MY_TRUSTHUB_ACCOUNT_LABEL}
      </a>
    );
  }
  if (variant === 'icon') {
    return (
      <a href={href} className="th-btn-icon" aria-label={MY_TRUSTHUB_ACCOUNT_LABEL} title={MY_TRUSTHUB_INVITE_TITLE} onClick={onNavigate}>
        <BookmarkIcon className="h-5 w-5" />
      </a>
    );
  }
  return (
    <a href={href} className="th-btn-secondary" title={MY_TRUSTHUB_INVITE_TITLE} onClick={onNavigate}>
      <BookmarkIcon className="h-4 w-4 shrink-0" />
      {MY_TRUSTHUB_ACCOUNT_LABEL}
    </a>
  );
}

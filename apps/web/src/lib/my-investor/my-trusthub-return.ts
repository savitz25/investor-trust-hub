/**
 * HUB-RETURN for Investor. Ask validates return; this helper only attaches it
 * when the current path is a registered prefix and the URL is safe to send.
 */
export const INVESTOR_RETURN_PREFIXES = ['/firms', '/advisers', '/auth/network-handoff'] as const;

export const MY_TRUSTHUB_SIGN_IN_HREF = 'https://www.asktrusthub.com/my/sign-in?next=/my';

export const RETURN_URL_MAX_LENGTH = 512;

function matchesPrefix(pathname: string): boolean {
  return INVESTOR_RETURN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hostile(currentUrl: string, url: URL): boolean {
  if (url.username || url.password) return true;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return true;
  const rest = currentUrl.slice(url.origin.length);
  if (/[\u0000-\u001F\u007F\\]/.test(currentUrl)) return true;
  if (rest.includes('..') || rest.includes('//')) return true;
  if (/%2e%2e|%2f%2f/i.test(rest)) return true;
  return false;
}

/** Sign-in href. `return` is omitted when the path is outside the registry or the URL is hostile or longer than 512 characters. */
export function myTrustHubSignInHref(currentUrl: string | null | undefined): string {
  if (!currentUrl || currentUrl.length > RETURN_URL_MAX_LENGTH) return MY_TRUSTHUB_SIGN_IN_HREF;
  let url: URL;
  try {
    url = new URL(currentUrl);
  } catch {
    return MY_TRUSTHUB_SIGN_IN_HREF;
  }
  if (hostile(currentUrl, url) || !matchesPrefix(url.pathname)) return MY_TRUSTHUB_SIGN_IN_HREF;
  return `${MY_TRUSTHUB_SIGN_IN_HREF}&return=${encodeURIComponent(currentUrl)}`;
}

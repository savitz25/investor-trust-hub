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

/** A segment that is `.`, `..`, or the same written with `%2e`. Matches Ask. */
const DOT_SEGMENT = /^(\.|%2e){1,2}$/i;

function rawPath(currentUrl: string, url: URL): string {
  const rest = currentUrl.slice(url.origin.length);
  const cut = rest.search(/[?#]/);
  return cut === -1 ? rest : rest.slice(0, cut);
}

function hasBackslash(value: string): boolean {
  return value.includes('\\') || /%5c/i.test(value);
}

function badSegment(path: string): boolean {
  return path.split('/').some((segment) => segment === '.' || segment === '..' || DOT_SEGMENT.test(segment));
}

/** Percent-decode until stable, at most 3 rounds. Still-encoded input is hostile. */
function fullyDecode(path: string): { value: string; stillEncoded: boolean } {
  let current = path;
  for (let round = 0; round < 3; round += 1) {
    if (!/%[0-9a-fA-F]{2}/.test(current)) return { value: current, stillEncoded: false };
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return { value: current, stillEncoded: true };
    }
    if (next === current) return { value: current, stillEncoded: false };
    current = next;
  }
  if (!/%[0-9a-fA-F]{2}/.test(current)) return { value: current, stillEncoded: false };
  try {
    return { value: current, stillEncoded: decodeURIComponent(current) !== current };
  } catch {
    return { value: current, stillEncoded: true };
  }
}

function hostilePath(path: string): boolean {
  if (hasBackslash(path) || path.includes('//') || badSegment(path)) return true;
  const decoded = fullyDecode(path);
  if (decoded.stillEncoded) return true;
  return hasBackslash(decoded.value) || decoded.value.includes('//') || decoded.value.includes('..') || badSegment(decoded.value);
}

function hostile(currentUrl: string, url: URL): boolean {
  if (url.username || url.password) return true;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return true;
  const rest = currentUrl.slice(url.origin.length);
  if (/[\u0000-\u001F\u007F\\]/.test(currentUrl)) return true;
  if (rest.includes('..') || rest.includes('//')) return true;
  if (/%2e%2e|%2f%2f/i.test(rest)) return true;
  return hostilePath(rawPath(currentUrl, url)) || hostilePath(url.pathname);
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

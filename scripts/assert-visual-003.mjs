/**
 * VISUAL-003 Investor network shell — source contract.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const tokens = read('apps/web/src/lib/design/trusthub-visual-standard.ts');
const markGeom = read('apps/web/src/lib/design/trusthub-mark-geometry.ts');
const mark = read('apps/web/src/components/investor-network-mark.tsx');
const css = read('apps/web/src/app/globals.css');
const nav = read('apps/web/src/components/site-header.tsx');
const logo = read('apps/web/src/components/brand-logo.tsx');
const switcher = read('apps/web/src/components/switch-hub-menu.tsx');
const registry = read('apps/web/src/lib/network/registry.ts');
const layout = read('apps/web/src/app/layout.tsx');
const hero = read('apps/web/src/components/home-hero.tsx');

assert(tokens.includes('2026.08.21-visual-v1'), 'chassis version');
assert(tokens.includes("investor: '#0F766E'"), 'Investor accent #0F766E');
assert(!tokens.includes('#4F46E5') || tokens.includes("ask: '#4F46E5'"), 'Ask indigo only as registry accent');
assert(markGeom.includes('immutable network geometry'), 'canonical mark rule');
assert(mark.includes('strokeWidth="2.4"'), 'canonical stroke 2.4');
assert(mark.includes('r="2.5"'), 'canonical outer dots');
assert(mark.includes('r="2.1"'), 'canonical center dot');
assert(mark.includes('#0F766E'), 'Investor bracket accent');
assert(!mark.includes('40.75'), 'old heavy stroke removed from header mark');
assert(css.includes('--th-header-desktop: 69px'), '69px desktop header');
assert(css.includes('--th-header-tablet: 65px'), '65px tablet');
assert(css.includes('--th-header-mobile: 57px'), '57px mobile');
assert(css.includes('--th-logo-desktop: 36px'), '36px logo slot');
assert(css.includes('--th-logo-tablet: 33px'), '33px tablet logo');
assert(css.includes('--th-logo-mobile: 30px'), '30px mobile logo');
assert(css.includes('--th-control: 44px'), '44px controls');
assert(css.includes('--th-control-hero: 48px'), '48px hero');
assert(css.includes('--th-radius-control: 12px'), '12px control radius');
assert(css.includes('--th-radius-card: 16px'), '16px card radius');
assert(css.includes('--th-shell-max: 1200px'), '1200 shell');
assert(css.includes('--th-gutter-desktop: 24px'), '24 desktop gutter');
assert(css.includes('--th-gutter-mobile: 16px'), '16 mobile gutter');
assert(css.includes('--th-accent: #0f766e'), 'Investor green accent token');
assert(!css.includes('backdrop-filter'), 'no backdrop-filter on shell (clips drawer)');
assert(css.includes('height: var(--th-control)'), 'control height not min-height');
assert(nav.includes('th-header'), 'reference header class');
assert(nav.includes('variant="embedded"'), 'Switch Hub in drawer');
assert(nav.includes('th-header-actions'), 'desktop actions cluster');
assert(!nav.includes('Concierge'), 'no invented Concierge action');
assert(logo.includes('InvestorNetworkMark'), 'tight SVG mark');
assert(logo.includes('th-logo-wordmark'), 'HTML wordmark');
assert(switcher.includes('switcherEntries()'), 'registry order');
assert(switcher.includes('hub.switcherLabel'), 'canonical blurbs');
assert(switcher.includes('ASK TRUST HUB NETWORK'), 'network panel title');
assert(switcher.includes('Current'), 'Current label');
assert(switcher.includes('aria-current'), 'aria-current');
assert(switcher.includes("CURRENT_NETWORK_HUB_ID"), 'current hub from registry');
assert(registry.includes("'ask'") && registry.includes("'investor'"), 'full hub order');
assert(layout.includes('data-th-chassis'), 'chassis stamp');
assert(layout.includes("from 'next/font/google'"), 'next font');
assert(layout.includes('Inter'), 'Inter chrome font');
assert(layout.includes('Source_Serif_4'), 'Source Serif retained');
assert(!layout.includes('Source_Sans_3'), 'Source Sans 3 removed from chrome');
assert(layout.includes('id="main"'), 'skip target');
assert(hero.includes('font-serif'), 'editorial serif hero');
assert(hero.includes('th-btn-hero'), '48px hero CTAs');

const order = ["'ask'", "'move'", "'lender'", "'insurance'", "'contractor'", "'senior'", "'investor'"];
let last = -1;
for (const id of order) {
  const i = registry.indexOf(`id: ${id}`);
  assert(i > last, `registry order ${id}`);
  last = i;
}

if (failures.length) {
  console.error('VISUAL-003 assertions failed:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('VISUAL-003 Investor network-shell assertions passed.');

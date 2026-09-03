import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pageMetadata } from '../src/lib/seo';
import {
  investorOfficialFirmShareModel,
  investorResearchShareModel,
  investorSyntheticFirmShareModel,
  publicCrdLabel,
  truncateShareText,
} from '../src/lib/share-card-model';
import { SHARE_HUB, shareRouteOgImage } from '../src/lib/share-hub';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('SHARE-003 InvestorTrustHub contextual cards', () => {
  it('points firm and research metadata at stable /share-og URLs', () => {
    const og = shareRouteOgImage('/firm/northbridge-ledger-advisors', 'Northbridge');
    expect(og.url).toBe(
      'https://www.investortrusthub.com/firm/northbridge-ledger-advisors/share-og',
    );
    expect(og.width).toBe(1200);
    expect(og.height).toBe(630);

    const meta = pageMetadata({
      title: 'Northbridge Ledger Advisors (synthetic)',
      description: 'Synthetic development Trust Report — not a real firm.',
      path: '/firm/northbridge-ledger-advisors',
      indexable: false,
      imageUrl: og.url,
      imageAlt: og.alt,
    });
    const blob = JSON.stringify(meta);
    expect(blob).toContain('Northbridge Ledger Advisors');
    expect(blob).toContain(og.url);
    expect(blob).toContain('https://www.investortrusthub.com/firm/northbridge-ledger-advisors');
    expect(blob).not.toContain('localhost');
    expect(blob).not.toContain('movetrusthub.com');
    expect(blob).not.toContain('lendertrusthub.com');
    expect(meta.twitter?.card).toBe('summary_large_image');
  });

  it('keeps Hub fallback PNG for pages without contextual cards', () => {
    const meta = pageMetadata({ title: 'About', path: '/about' });
    expect(JSON.stringify(meta)).toContain(SHARE_HUB.ogImagePath);
  });

  it('truncates long names and omits missing location', () => {
    expect(truncateShareText('A'.repeat(80), 48).length).toBeLessThanOrEqual(48);
    const missing = investorOfficialFirmShareModel({ name: 'Harborline Advisors' });
    expect(missing.subtitle).toBeUndefined();
    expect(missing.fact).toContain('Registration · disclosures · public research');
    expect(missing.fact).not.toMatch(/no disclosure|fully verified|approved|trusted/i);
  });

  it('does not publish synthetic CRD identifiers', () => {
    expect(publicCrdLabel('SYN-CRD-F1001')).toBeUndefined();
    expect(publicCrdLabel('123456')).toBe('CRD 123456');
    const synthetic = investorSyntheticFirmShareModel({
      name: "Northbridge Ledger Advisors",
      city: 'Portland',
      region: 'OR',
      kindLabel: 'Registered investment adviser',
    });
    expect(synthetic.eyebrow).toBe('SYNTHETIC FIRM RESEARCH');
    expect(synthetic.subtitle).toBe('Portland, Oregon');
    expect(synthetic.fact).toContain('not a real firm');
    expect(JSON.stringify(synthetic)).not.toMatch(/SYN-CRD|raum|AUM|performance/i);
  });

  it('uses research labels, not quality claims', () => {
    const official = investorOfficialFirmShareModel({
      name: 'Example Advisers LLC',
      city: 'New York',
      region: 'NY',
      crd: '999001',
    });
    expect(official.fact).toContain('CRD 999001');
    expect(official.fact).not.toMatch(/best|safe|approved|no complaints/i);
    expect(investorResearchShareModel().title).toBe('Research questions');
  });

  it('has share-og routes and SHARE-002 PNG fallback', () => {
    expect(existsSync(join(root, 'src/app/firm/[slug]/share-og/route.tsx'))).toBe(true);
    expect(existsSync(join(root, 'src/app/research/share-og/route.tsx'))).toBe(true);
    const route = read('src/app/firm/[slug]/share-og/route.tsx');
    const helper = read('src/og/investor-share-og.ts');
    expect(route).toContain('investorFallbackPng');
    expect(helper).toContain('renderInvestorFallbackImage');
    expect(helper).not.toMatch(/google|places\.googleapis|raum|website/i);
    expect(helper).not.toMatch(/disclosure_indicator|matchConfidence/);
  });
});

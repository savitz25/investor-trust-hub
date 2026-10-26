import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sourceDateForSitemap } from '../src/lib/sitemap-last-modified';

describe('Investor V1 sitemap source lastmod', () => {
  it('uses a valid official filing date as a stable UTC calendar date', () => {
    expect(sourceDateForSitemap('2026-09-30')?.toISOString())
      .toBe('2026-09-30T00:00:00.000Z');
    expect(sourceDateForSitemap(new Date('2026-09-30T18:22:14.000Z'))?.toISOString())
      .toBe('2026-09-30T00:00:00.000Z');
  });

  it('omits lastmod when no defensible source date exists', () => {
    expect(sourceDateForSitemap(null)).toBeUndefined();
    expect(sourceDateForSitemap(undefined)).toBeUndefined();
    expect(sourceDateForSitemap('not-a-date')).toBeUndefined();
    expect(sourceDateForSitemap('2026-02-30')).toBeUndefined();
  });

  it('uses official Form ADV submission dates, never ingestion clocks, for gated firm URLs', () => {
    const repository = readFileSync(new URL('../src/lib/firms/repository.ts', import.meta.url), 'utf8');
    const sitemap = readFileSync(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
    const query = repository.slice(
      repository.indexOf('export async function listIndexableFirmsForSitemap'),
      repository.indexOf('export async function countIndexableFirms'),
    );
    expect(query).toContain('max(filing.date_submitted)');
    expect(query).toContain('WHERE ${publicFirmCountWhere()} AND sd.indexable = true');
    expect(query).not.toContain('retrieved_at');
    expect(query).not.toContain('current_as_of');
    expect(sitemap).toContain('lastModified');
    expect(sitemap).toContain('isHostLaunchIndexable(host)');
    expect(sitemap).toContain('if (!hasDatabaseUrl())');
  });

  it('serializes indexable dated and undated entries as well-formed sitemap XML', () => {
    const entries = [
      { url: 'https://www.investortrusthub.com/firm/sec-crd-8250', lastmod: '2026-09-30' },
      { url: 'https://www.investortrusthub.com/firm/sec-crd-8251', lastmod: undefined },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(({ url, lastmod }) =>
      `<url><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
    ).join('')}</urlset>`;

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect([...xml.matchAll(/<url>/g)]).toHaveLength(2);
    expect([...xml.matchAll(/<\/url>/g)]).toHaveLength(2);
    expect([...xml.matchAll(/<lastmod>/g)]).toHaveLength(1);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.endsWith('</urlset>')).toBe(true);
    expect(xml).not.toContain('undefined');
  });
});

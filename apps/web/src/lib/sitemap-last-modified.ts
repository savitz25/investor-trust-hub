/**
 * Preserve only source-provided calendar dates for sitemap lastmod.
 * Ingestion timestamps (for example firms.current_as_of) are not publication dates.
 */
export function sourceDateForSitemap(
  value: Date | string | null | undefined,
): Date | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return new Date(`${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : undefined;
}

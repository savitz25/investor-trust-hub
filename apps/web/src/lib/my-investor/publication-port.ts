import 'server-only';

import { query } from '../db';
import { mapClassification } from '../firms/map-report';
import { publicFirmCountWhere } from '../firms/publication-count';
import type { FirmPublicationPort, PublishedFirmRow } from './publication';

type Row = {
  id: string;
  slug: string;
  is_synthetic: boolean;
  crd: string | null;
  registration_type: string | null;
  registration_status: string | null;
  source_status_text: string | null;
};

/**
 * Production publication source for a parent Save: the firms table under the
 * profile page's own publication rule, one exact CRD equality.
 *
 * The profile page renders an official Firm Trust Report when the firm row is
 * not synthetic, has a CRD and its registration classifies (mapFirmReport). A
 * firm can hold several registration rows and the page reads one of them, so
 * the report counts as official here only when EVERY registration row of the
 * firm classifies. A firm with no registration row, or with a mixed set, is
 * not the official_firm grain and stays device Save only.
 */
export const firmPublicationPort: FirmPublicationPort = {
  async byCrd(crd) {
    const result = await query<Row>(
      `
      SELECT f.id, f.slug, f.is_synthetic,
             crd.identifier_value AS crd,
             r.registration_type, r.status AS registration_status, r.source_status_text
      FROM firms f
      JOIN firm_identifiers crd ON crd.firm_id = f.id AND crd.identifier_type = 'crd'
      LEFT JOIN registrations r ON r.firm_id = f.id AND r.subject_kind = 'firm'
      WHERE crd.identifier_value = $1 AND ${publicFirmCountWhere()}
      ORDER BY f.id
      LIMIT 60
      `,
      [crd],
    );
    const firms = new Map<string, PublishedFirmRow>();
    for (const row of result.rows) {
      const official = row.is_synthetic !== true && Boolean(row.crd) && mapClassification(row) !== null;
      const seen = firms.get(row.id);
      if (seen) seen.officialReport = seen.officialReport && official;
      else firms.set(row.id, { slug: String(row.slug), crd: String(row.crd ?? ''), officialReport: official });
    }
    return [...firms.values()].slice(0, 3);
  },
};

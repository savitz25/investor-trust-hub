import { publicFirmCountWhere, publishedStateRegistrationSql } from '../apps/web/src/lib/firms/publication-count.ts';

const phase = process.argv[2];
if (!['off', 'on', 'rollback'].includes(phase)) throw new Error('Expected off, on, or rollback');
const active = phase === 'on';
const publicFirms = active ? 5942 : 451;
const registrations = active ? 6602 : 0;
const stateCounts = active ? [['CA', 3336], ['TX', 1992], ['AZ', 674], ['WA', 600]] : [['CA', 0], ['TX', 0], ['AZ', 0], ['WA', 0]];
const samples = [['CA', '8250'], ['TX', '13037'], ['AZ', '19537'], ['WA', '25706']];

process.stdout.write(`
DO $$
DECLARE actual integer; sample_count integer;
BEGIN
  SELECT count(*) INTO actual FROM firms f WHERE ${publicFirmCountWhere()};
  IF actual<>${publicFirms} THEN RAISE EXCEPTION 'R2 ${phase} public firms %',actual; END IF;
  SELECT count(*) INTO actual FROM jurisdiction_registrations j JOIN firms f ON f.id=j.firm_id
    WHERE ${publicFirmCountWhere()} AND ${publishedStateRegistrationSql('j')};
  IF actual<>${registrations} THEN RAISE EXCEPTION 'R2 ${phase} registrations %',actual; END IF;
  IF (SELECT count(*) FROM search_documents sd JOIN firms f ON f.id=sd.entity_id
      WHERE sd.entity_kind='firm' AND sd.indexable AND ${publicFirmCountWhere()}
        AND f.slug IN ('sec-crd-8250','sec-crd-13037','sec-crd-19537','sec-crd-25706'))<>${active ? 4 : 0}
    THEN RAISE EXCEPTION 'R2 ${phase} sitemap sample gate'; END IF;
  IF (SELECT count(*) FROM search_documents sd JOIN firms f ON f.id=sd.entity_id
      WHERE sd.entity_kind='firm' AND sd.indexable AND ${publicFirmCountWhere()}
        AND EXISTS (SELECT 1 FROM jurisdiction_registrations marker
          WHERE marker.firm_id=f.id AND marker.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'
            AND marker.raw->>'b1_created_firm'='true'))<>${active ? 5491 : 0}
    THEN RAISE EXCEPTION 'R2 ${phase} sitemap batch gate'; END IF;
  IF (SELECT count(*) FROM (SELECT j.raw->>'firm_crd',j.jurisdiction
       FROM jurisdiction_registrations j
       WHERE j.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'
       GROUP BY 1,2 HAVING count(*)<>1) d)<>0
    THEN RAISE EXCEPTION 'R2 duplicate CRD/state keys'; END IF;
${stateCounts.map(([state, count]) => `  SELECT count(*) INTO actual FROM jurisdiction_registrations j JOIN firms f ON f.id=j.firm_id WHERE ${publicFirmCountWhere()} AND ${publishedStateRegistrationSql('j')} AND j.jurisdiction='${state}';
  IF actual<>${count} THEN RAISE EXCEPTION 'R2 ${phase} ${state} registration count %',actual; END IF;`).join('\n')}
${samples.map(([state, crd]) => `  SELECT count(*) INTO sample_count FROM firms f
    JOIN firm_identifiers crd ON crd.firm_id=f.id AND crd.identifier_type='crd'
    JOIN jurisdiction_registrations j ON j.firm_id=f.id
    WHERE crd.identifier_value='${crd}' AND f.slug='sec-crd-${crd}'
      AND j.jurisdiction='${state}' AND ${publicFirmCountWhere()} AND ${publishedStateRegistrationSql('j')};
  IF sample_count<>${active ? 1 : 0} THEN RAISE EXCEPTION 'R2 ${phase} sample ${state}/${crd}: %',sample_count; END IF;`).join('\n')}
END $$;
`);

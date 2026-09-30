import { publicFirmCountWhere, publicReleaseWhere } from '../apps/web/src/lib/firms/publication-count.ts';

const phase = process.argv[2];
if (!['off', 'on', 'rollback'].includes(phase)) throw new Error('Expected off, on, or rollback');
const publicCount = phase === 'on' ? 5942 : 451;
const releaseCount = phase === 'on' ? 1 : 0;
process.stdout.write(`
DO $$
DECLARE eligible integer; canonical integer; releases integer; legacy integer;
BEGIN
  SELECT count(*) INTO eligible FROM firms f WHERE ${publicFirmCountWhere()};
  SELECT count(*) INTO canonical FROM firms WHERE is_synthetic=false;
  SELECT count(*) INTO releases FROM source_releases rel WHERE ${publicReleaseWhere()};
  SELECT count(*) INTO legacy FROM firms f WHERE f.is_synthetic=false AND NOT EXISTS (
    SELECT 1 FROM jurisdiction_registrations j WHERE j.firm_id=f.id
      AND j.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'
      AND j.raw->>'b1_created_firm'='true'
  );
  IF eligible<>${publicCount} OR canonical<>5942 OR releases<>${releaseCount} OR legacy<>451 THEN
    RAISE EXCEPTION 'Count gate ${phase}: public %, canonical %, releases %, legacy %',
      eligible,canonical,releases,legacy;
  END IF;
  IF (SELECT count(*) FROM firms f WHERE f.slug='sec-crd-8250' AND ${publicFirmCountWhere()})
     <>${phase === 'on' ? 1 : 0} THEN
    RAISE EXCEPTION 'Sample B1 search-count visibility failed';
  END IF;
  IF (SELECT count(*) FROM jurisdiction_registrations j WHERE j.source_release_id='a89165b8-b60a-4b31-9009-8b2a0291f8f8'
       AND j.publication_allowed)<>${phase === 'on' ? 6602 : 0} THEN
    RAISE EXCEPTION 'Batch flag count differs';
  END IF;
END $$;
`);

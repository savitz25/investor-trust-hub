import { publicFirmSql, publishedStateRegistrationSql } from '../apps/web/src/lib/firms/publication.ts';

const phase = process.argv[2];
if (!['off', 'on', 'rollback'].includes(phase)) throw new Error('Expected off, on or rollback');
const active = phase === 'on';
const expectedFirms = active ? 5942 : 451;
const expectedRegistrations = active ? 6602 : 0;
const expectedSample = active ? 1 : 0;
const sql = `
DO $$
DECLARE public_firms integer; state_rows integer; sample_profile integer;
        new_firm_rows integer; existing_firm_rows integer; duplicate_keys integer;
BEGIN
  SELECT count(*) INTO public_firms FROM firms f WHERE ${publicFirmSql()};
  SELECT count(*) INTO state_rows FROM jurisdiction_registrations j
    JOIN firms f ON f.id=j.firm_id
    WHERE ${publicFirmSql()} AND ${publishedStateRegistrationSql('j')};
  SELECT count(*) INTO sample_profile FROM firms f WHERE f.slug='sec-crd-8250' AND ${publicFirmSql()};
  SELECT count(*) INTO new_firm_rows FROM jurisdiction_registrations j
    JOIN firms f ON f.id=j.firm_id
    WHERE ${publicFirmSql()} AND ${publishedStateRegistrationSql('j')}
      AND j.raw->>'b1_created_firm'='true';
  SELECT count(*) INTO existing_firm_rows FROM jurisdiction_registrations j
    JOIN firms f ON f.id=j.firm_id
    WHERE ${publicFirmSql()} AND ${publishedStateRegistrationSql('j')}
      AND j.raw->>'b1_created_firm'='false';
  SELECT count(*)-count(DISTINCT (j.raw->>'firm_crd',j.jurisdiction)) INTO duplicate_keys
    FROM jurisdiction_registrations j JOIN firms f ON f.id=j.firm_id
    WHERE ${publicFirmSql()} AND ${publishedStateRegistrationSql('j')};
  IF public_firms<>${expectedFirms} OR state_rows<>${expectedRegistrations}
     OR sample_profile<>${expectedSample} OR duplicate_keys<>0
     OR new_firm_rows<>${active ? 5993 : 0}
     OR existing_firm_rows<>${active ? 609 : 0}
     OR (SELECT count(*) FROM firms)<>5942
     OR (SELECT count(*) FROM jurisdiction_registrations)<>6603 THEN
    RAISE EXCEPTION 'B1 publication % mismatch: firms %, states %, sample %, new %, existing %, duplicates %',
      '${phase}',public_firms,state_rows,sample_profile,new_firm_rows,existing_firm_rows,duplicate_keys;
  END IF;
END $$;
`;
process.stdout.write(sql);

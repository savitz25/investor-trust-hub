-- Read-only, bounded independent oracle. No consumer request text interpolation.
SELECT regulator_authority_id, registration_type, status, count(*)
FROM registrations WHERE NOT is_synthetic AND subject_kind='firm'
GROUP BY 1,2,3 ORDER BY 1,2,3 LIMIT 20;
SELECT a.dataset_kind, count(*) FROM form_adv_firm_facts a
JOIN firms f ON f.id=a.firm_id JOIN branches b ON b.firm_id=f.id AND b.is_main_office
WHERE NOT f.is_synthetic AND lower(b.city)='austin' AND b.region='TX' GROUP BY a.dataset_kind;
SELECT f.display_name, i.identifier_value, b.city, b.region
FROM firms f JOIN firm_identifiers i ON i.firm_id=f.id AND i.identifier_type='crd'
JOIN form_adv_firm_facts a ON a.firm_id=f.id
LEFT JOIN branches b ON b.firm_id=f.id AND b.is_main_office
WHERE i.identifier_value IN ('105958','106798','9999999999') AND NOT f.is_synthetic;

-- Source-clock reconciliation: actual releases attached to the selected office cohort.
SELECT a.dataset_kind,rel.id,rel.source_dataset_id,rel.release_label,rel.published_at,rel.retrieved_at,rel.checksum_sha256,count(*) AS n
FROM form_adv_firm_facts a JOIN firms f ON f.id=a.firm_id JOIN branches b ON b.firm_id=f.id AND b.is_main_office
LEFT JOIN source_releases rel ON rel.id=a.source_release_id
WHERE NOT f.is_synthetic AND lower(b.city)='austin' AND b.region='TX'
GROUP BY 1,2,3,4,5,6,7 ORDER BY 1,3 LIMIT 10;

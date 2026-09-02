-- NJ-INV-001 reconciliation. Run only against InvestorTrustHub.
-- Confirm target before any write.

SELECT current_database() AS db,
       current_user AS db_user,
       now() AS observed_at;

SELECT filename
FROM schema_migrations
WHERE filename LIKE '%0014%' OR filename LIKE '%regulatory_document%'
ORDER BY filename;

-- Pre / post counts for idempotent ledger tables.
SELECT 'regulatory_source_coverage' AS relation, count(*) FROM regulatory_source_coverage
UNION ALL SELECT 'regulatory_source_snapshots', count(*) FROM regulatory_source_snapshots
UNION ALL SELECT 'regulatory_source_occurrences', count(*) FROM regulatory_source_occurrences
UNION ALL SELECT 'regulatory_documents', count(*) FROM regulatory_documents
UNION ALL SELECT 'regulatory_events', count(*) FROM regulatory_events
UNION ALL SELECT 'regulatory_event_parties', count(*) FROM regulatory_event_parties
UNION ALL SELECT 'regulatory_identity_ledger', count(*) FROM regulatory_identity_ledger
UNION ALL SELECT 'regulatory_firm_attachments', count(*) FROM regulatory_firm_attachments
UNION ALL SELECT 'regulatory_monitoring_events', count(*) FROM regulatory_monitoring_events;

-- Duplicate hunters (must be zero extra groups).
SELECT source_dataset_id, source_url, content_hash, count(*) AS n
FROM regulatory_source_snapshots
GROUP BY 1, 2, 3
HAVING count(*) > 1;

SELECT source_dataset_id, occurrence_fingerprint, count(*) AS n
FROM regulatory_source_occurrences
GROUP BY 1, 2
HAVING count(*) > 1;

SELECT content_hash, count(*) AS n
FROM regulatory_documents
GROUP BY 1
HAVING count(*) > 1;

SELECT stable_event_id, count(*) AS n
FROM regulatory_events
GROUP BY 1
HAVING count(*) > 1;

SELECT source_dataset_id, event_record_identifier, legal_name, party_type, coalesce(crd, ''), count(*) AS n
FROM regulatory_event_parties
GROUP BY 1, 2, 3, 4, 5
HAVING count(*) > 1;

SELECT event_record_identifier, firm_id, attachment_reason, count(*) AS n
FROM regulatory_firm_attachments
GROUP BY 1, 2, 3
HAVING count(*) > 1;

-- Baseline-only: historical alerts must be zero.
SELECT count(*) AS monitoring_events_must_be_zero
FROM regulatory_monitoring_events;

SELECT monitoring_state, count(*)
FROM regulatory_events
GROUP BY 1;

-- Coverage must not treat WAF / 404 as zero-action complete history.
SELECT source_family, coverage_state, count(*)
FROM regulatory_source_coverage
GROUP BY 1, 2
ORDER BY 1, 2;

SELECT event_class, procedural_status, count(*)
FROM regulatory_events
GROUP BY 1, 2
ORDER BY 1, 2;

SELECT party_type, match_status, public_eligibility, count(*)
FROM regulatory_event_parties
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

-- Individuals must remain internal-only.
SELECT count(*) AS individuals_not_internal
FROM regulatory_event_parties
WHERE party_type IN ('INDIVIDUAL', 'IAR', 'AGENT')
  AND public_eligibility <> 'internal_only';

-- Do not copy individual-only events onto firms.
SELECT count(*) AS individual_copied_to_firm
FROM regulatory_firm_attachments a
JOIN regulatory_event_parties p
  ON p.event_record_identifier = a.event_record_identifier
WHERE p.party_type IN ('INDIVIDUAL', 'IAR', 'AGENT')
  AND NOT EXISTS (
      SELECT 1
      FROM regulatory_event_parties f
      WHERE f.event_record_identifier = a.event_record_identifier
        AND f.firm_id = a.firm_id
        AND f.party_type NOT IN ('INDIVIDUAL', 'IAR', 'AGENT')
  );

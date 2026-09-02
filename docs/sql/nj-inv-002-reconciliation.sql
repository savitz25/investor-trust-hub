-- NJ-INV-002 reconciliation. Run only against InvestorTrustHub.

SELECT current_database() AS db, current_user AS db_user, now() AS observed_at;

SELECT filename FROM schema_migrations
WHERE filename IN (
    '0014_regulatory_document_ledger.sql',
    '0015_state_regulatory_intelligence.sql'
)
ORDER BY filename;

SELECT 'regulatory_documents' AS relation, count(*) FROM regulatory_documents
UNION ALL SELECT 'regulatory_events', count(*) FROM regulatory_events
UNION ALL SELECT 'regulatory_monitoring_events', count(*) FROM regulatory_monitoring_events
UNION ALL SELECT 'state_registration_observations', count(*) FROM state_registration_observations
UNION ALL SELECT 'registration_transitions', count(*) FROM registration_transitions
UNION ALL SELECT 'state_exam_packages', count(*) FROM state_exam_packages
UNION ALL SELECT 'state_exam_questions', count(*) FROM state_exam_questions
UNION ALL SELECT 'state_exam_topics', count(*) FROM state_exam_topics
UNION ALL SELECT 'regulatory_policy_documents', count(*) FROM regulatory_policy_documents
UNION ALL SELECT 'issuer_filing_classes', count(*) FROM issuer_filing_classes
UNION ALL SELECT 'issuer_filing_observations', count(*) FROM issuer_filing_observations
UNION ALL SELECT 'state_market_metrics', count(*) FROM state_market_metrics;

-- Duplicates must be empty groups.
SELECT content_hash, count(*) FROM regulatory_documents GROUP BY 1 HAVING count(*) > 1;
SELECT source_dataset_id, exam_year, question_number, count(*) FROM state_exam_questions GROUP BY 1,2,3 HAVING count(*) > 1;
SELECT source_dataset_id, crd, from_status, to_status, count(*) FROM registration_transitions GROUP BY 1,2,3,4 HAVING count(*) > 1;

-- Baseline-only.
SELECT count(*) AS monitoring_events_must_be_zero FROM regulatory_monitoring_events;

-- Issuer filings must not attach to firms on name alone.
SELECT count(*) AS issuer_rows_with_firm_id FROM issuer_filing_observations WHERE firm_id IS NOT NULL;

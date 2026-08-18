-- Task 002 source datasets. Distinct RIA and ERA identities.

INSERT INTO source_datasets (id, source_system_id, name, description, expected_entity_kinds, official_url) VALUES
    (
        'sec_ia_ria',
        'form_adv',
        'SEC registered investment advisers (IARD firm roster)',
        'Monthly SEC bulk file of firms represented as registered investment advisers. Underlying information is filer-supplied Form ADV data. The SEC does not approve or endorse these firms.',
        ARRAY['firm', 'registration', 'filing'],
        'https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers'
    ),
    (
        'sec_ia_era',
        'form_adv',
        'SEC exempt reporting advisers (IARD firm roster)',
        'Monthly SEC bulk file of exempt reporting advisers. An ERA is not an SEC-registered investment adviser.',
        ARRAY['firm', 'registration', 'filing'],
        'https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    expected_entity_kinds = EXCLUDED.expected_entity_kinds,
    official_url = EXCLUDED.official_url;

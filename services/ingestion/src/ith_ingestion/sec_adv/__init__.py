"""SEC Form ADV / IARD investment-adviser firm ingestion."""

TRANSFORM_VERSION = "task-002-sec-adv-v1"
PARSER_VERSION = "task-002-sec-adv-v1"
PIPELINE_VERSION = "0.2.0"

CATALOG_URL = (
    "https://www.sec.gov/data-research/sec-markets-data/"
    "information-about-registered-investment-advisers-exempt-reporting-advisers"
)

DATASET_RIA = "sec_ia_ria"
DATASET_ERA = "sec_ia_era"
SOURCE_SYSTEM_ID = "form_adv"
SOURCE_AUTHORITY_ID = "sec"

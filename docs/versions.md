# Installed versions

Recorded after the Task 001 install (2026-08-18). If you change lockfiles, update this file.

## Runtime

| Tool | Installed |
| --- | --- |
| Node.js | 22.23.2 |
| npm | 10.9.8 |
| Python | 3.12.10 |
| PostgreSQL (CI) | 16 |

## JavaScript (resolved)

| Package | Version |
| --- | --- |
| next | 15.5.23 |
| react / react-dom | 19.1.0 |
| typescript | 5.9.3 |
| tailwindcss | 4.3.3 |
| @tailwindcss/postcss | 4.3.3 |
| zod | 3.25.76 |
| vitest | 3.2.7 |
| eslint | 9.39.5 |
| eslint-config-next | 15.5.23 |
| clsx | 2.1.1 |
| tailwind-merge | 3.3.1 |

Exact tree: root `package-lock.json`.

Next 15.5.23 still vendors PostCSS and sharp versions that `npm audit` reports. A forced upgrade would jump to Next 16. That jump is deferred so Task 001 stays on the 15.5 line used by sibling TrustHub apps.

## Python (resolved)

| Package | Version |
| --- | --- |
| pytest | 9.1.1 |
| ruff | (dev extra, `pip show ruff`) |

The ingestion service has no production third-party dependencies in Task 001.

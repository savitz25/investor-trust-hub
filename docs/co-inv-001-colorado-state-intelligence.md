# CO-INV-001 Colorado investor state intelligence

Accepted contract: `investor-co-state-intel-v1`. Public route: `/colorado`.

## Grains that stay separate

- SEC/IARD roster firms with a Colorado principal office: **589** (reconciled national geography table).
- Colorado state-registered investment-adviser firms (IAPD `IA_FIRM_STATE_Feed_08_27_2026`, `StateRgstn/Rgltr/@Cd=CO`, APPROVED): **740**.
- Registration rows vs distinct firm CRD: **741 / 741**.
- Colorado state ERA reporting: **209**.
- SEC/IARD Colorado notice filings (`NoticeFiled/States/@RgltrCd=CO`, FILED): **3,673**.

Do not add those numbers into one “Colorado advisers” denominator. Filter Colorado from the state compilation by registration jurisdiction, not address.

## What this ticket did not mint

- Net-new canonical organizations: 0
- Net-new public investor profiles: 0
- Exact adverse profile attachments: 0
- Denver or county routes: none

State-only CRDs remain in the state-intelligence layer. Search V1 remains the SEC/IARD roster.

## Backlog

`INV-STATE-IAPD-001` should retrofit NJ/CA/TX/WA/AZ using the same IAPD state compilation. That work is out of scope here.

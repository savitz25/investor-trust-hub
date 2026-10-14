/** Montana InvestorTrustHub source snapshot, counted from official IAPD feeds. */
export const MT_INVESTOR_INTEL = {
  sourceDate: "2026-10-14",
  retrievedAt: "2026-10-14",
  stateIa: {
    rows: 102,
    distinctFirmCrd: 102,
    approvedFirmCrd: 101,
    termRequestRows: 1,
  },
  notice: { rows: 1270, distinctFiledFirmCrd: 1270 },
  era: { rows: 15, distinctFirmCrd: 15, activeFirmCrd: 15 },
  iar: { registrationRows: 2884, distinctApprovedPersonCrd: 2857 },
  intersections: {
    approvedIaAndFiledNotice: 0,
    activeEraAndFiledNotice: 0,
    approvedIaAndActiveEra: 0,
  },
  brokerDealerSummary: { firms: 1229, asOf: "2026-06-30" },
  feeds: {
    state: {
      name: "IAPD IA Firm State Feed",
      url: "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_STATE_Feed_10_14_2026.xml.gz",
      sha256:
        "3B0D6FC23CB8A1C0077F8FACEAD179114E245F10F73E15AEA68FE314D6B46954",
    },
    sec: {
      name: "IAPD IA Firm SEC Feed",
      url: "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_FIRM_SEC_Feed_10_14_2026.xml.gz",
      sha256:
        "90B88F8713D471F759FFC2663031FB476A0FD263B9004CC04E647E0A9ED4404F",
    },
    iar: {
      name: "IAPD Individual Feed",
      url: "https://reports.adviserinfo.sec.gov/reports/CompilationReports/IA_INDVL_Feed_10_14_2026.xml.zip",
      sha256:
        "6E272CF6425143B4856730D4BFEDEE37134F3596555EB387B3892E4C45C0C4EA",
    },
  },
  regulator: {
    adviser:
      "https://csimt.gov/investment-advisers-investment-adviser-representatives/",
    securities: "https://csimt.gov/securities/",
    fees: "https://csimt.gov/registration-fees-2/",
    iapd: "https://adviserinfo.sec.gov/",
    brokerCheck: "https://brokercheck.finra.org/",
  },
  limits: {
    brokerDealerRows: "NOT_ACQUIRED",
    brokerDealerAgents: "NOT_ACQUIRED",
    orders: "NOT_ACQUIRED",
    existingCanonicalMatches: "NOT_RECONCILED",
  },
} as const;

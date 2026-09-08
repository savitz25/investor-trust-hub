import Link from 'next/link';
import { SearchShellAnalytics } from './search-shell-analytics';

const EXAMPLES = ['CRD 105958', 'SEC-registered RIAs in Florida', 'RIAs between $1 billion and $10 billion RAUM', 'What does RAUM mean?'];

export function InvestorSpecialistSearchShell({ query = '', compact = false }: { query?: string; compact?: boolean }) {
  const id = compact ? 'home-investor-search' : 'ask-investor-search';
  return <section className={`rounded-3xl border border-[var(--ith-border)] bg-white p-5 shadow-sm sm:p-7 ${compact ? '' : 'mx-auto max-w-5xl'}`} aria-labelledby={`${id}-title`}>
    <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-800">Research investment advisers</p>
    <h2 id={`${id}-title`} className="mt-2 font-serif text-2xl text-[var(--ith-navy)] sm:text-3xl">What do you want to find out?</h2>
    <form action="/ask" method="get" role="search" aria-label="Research investment adviser firms and Form ADV evidence" className="mt-5" data-specialist-search>
      <div className="flex flex-col gap-3 md:flex-row">
        <label className="sr-only" htmlFor={`${id}-q`}>Question, adviser firm, CRD, SEC file number, state, or Form ADV topic</label>
        <input id={`${id}-q`} name="q" type="search" maxLength={400} defaultValue={query} required placeholder="Ask a question, enter a firm, CRD, SEC file number, state or Form ADV topic..." className="min-h-12 min-w-0 flex-1 rounded-xl border border-[var(--ith-border)] px-4 text-base text-[var(--ith-navy)] outline-none focus-visible:ring-2 focus-visible:ring-teal-700" />
        <button type="submit" className="th-btn-primary min-h-12 px-7">Research</button>
      </div>
      <details className="mt-4 rounded-xl border border-[var(--ith-border)] bg-[var(--ith-canvas)] p-3">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--ith-navy)]">Advanced filters</summary>
        <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="Firm class" name="firmType" options={['Any explicit class', 'RIA', 'ERA']} />
          <Filter label="Principal-office state" name="state" options={['Any sourced state', 'FL', 'NJ', 'CA', 'TX', 'WA', 'AZ']} />
          <Filter label="RAUM" name="raum" options={['Any reported RAUM', 'Reported zero', 'Under $25M', '$25M–under $100M', '$100M–under $1B', '$1B–under $10B', '$10B+']} />
          <Filter label="Compensation" name="compensation" options={['Any reported method', 'Asset based', 'Hourly', 'Subscription', 'Fixed', 'Commission', 'Performance based']} />
        </div>
      </details>
    </form>
    <SearchShellAnalytics />
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Example investment adviser research questions">{EXAMPLES.map((x) => <Link key={x} href={`/ask?q=${encodeURIComponent(x)}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--ith-border)] px-3 text-sm font-medium text-teal-800 hover:bg-[var(--ith-teal-mist)]">{x}</Link>)}</nav>
    <p className="mt-4 text-sm leading-6 text-[var(--ith-ink)]">Natural language is mapped to bounded SEC/IARD and Form ADV research. Registration is not endorsement, and missing evidence is not a clean history.</p>
  </section>;
}
function Filter({ label, name, options }: { label: string; name: string; options: string[] }) { return <label className="grid gap-1 text-sm font-semibold text-[var(--ith-navy)]">{label}<select name={name} defaultValue={options[0]} className="min-h-11 min-w-0 rounded-lg border border-[var(--ith-border)] bg-white px-3 font-normal">{options.map((x) => <option key={x} value={x === options[0] ? '' : x}>{x}</option>)}</select></label>; }

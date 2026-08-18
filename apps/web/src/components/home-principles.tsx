import Link from 'next/link';
import { WHAT_WE_ARE_NOT } from '@ith/config';
import { RESEARCH_QUESTIONS } from '@ith/domain';

export function HomePrinciples() {
  return (
    <section className="border-b border-[var(--ith-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-3xl text-[var(--ith-navy)]">
            Questions this platform is built to help you ask
          </h2>
          <ol className="mt-6 space-y-3">
            {RESEARCH_QUESTIONS.map((question, index) => (
              <li key={question} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-serif text-lg text-teal-800">{index + 1}</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm">
            <Link href="/research" className="font-semibold text-teal-800 underline-offset-2 hover:underline">
              Read the research questions
            </Link>
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--ith-border)] bg-white p-6">
          <h2 className="font-serif text-2xl text-[var(--ith-navy)]">What this is not</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {WHAT_WE_ARE_NOT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

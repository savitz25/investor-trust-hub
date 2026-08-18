/**
 * Product copy constants and language guardrails.
 *
 * InvestorTrustHub organizes evidence. It does not give personalized
 * financial advice, pick stocks, or rank advisors.
 */

export const MISSION_LINE = 'Research before you invest.';

export const PHILOSOPHY_LINE = 'We organize the evidence. The consumer decides.';

export const SUPPORTING_MESSAGE =
  'Research investment professionals, firms, fees, and financial decisions using regulatory and public-source evidence.';

export const INDEPENDENCE_LINE =
  'Independent research. No paid rankings. No lead marketplace. No opaque trust score.';

export const NOT_ADVICE_LINE =
  'InvestorTrustHub is a research and education platform. It is not a broker-dealer, investment adviser, robo-advisor, or rating service.';

export const ALLOWED_RESEARCH_FRAMES = [
  'Here is how the scenario changes under these assumptions.',
  'Here is what the source reports.',
  'Here are questions you may want to investigate.',
  'We could not verify this claim from the identified sources.',
] as const;

/**
 * Phrases that must not appear in product UI as guidance.
 * Tests scan copy modules against this list.
 */
export const FORBIDDEN_GUIDANCE_PHRASES = [
  'you should buy',
  'sell this fund',
  'this advisor is best for you',
  'best advisor',
  'recommended advisor',
  'you should convert exactly',
  'retire at 62',
  'this investment is safe',
  'this investment is a scam',
  'trust score',
  'advisor score',
  'safety score',
  '#1 advisor',
  'number one advisor',
  'top ranked advisor',
  'pay-to-play',
  'sec approved',
  'sec verified advisor',
] as const;

export const ENDORSEMENT_FALSE_FRIENDS = [
  'verified advisor',
  'trusted advisor badge',
  'approved advisor',
  'safe investment',
  'guaranteed return',
] as const;

const NEGATION_RE = /\b(no|not|never|without|avoid|forbidden|isn't|is not)\b/;

export function findForbiddenGuidance(text: string): string[] {
  const haystack = text.toLowerCase();
  const hits: string[] = [];

  for (const phrase of FORBIDDEN_GUIDANCE_PHRASES) {
    let from = 0;
    while (from < haystack.length) {
      const index = haystack.indexOf(phrase, from);
      if (index === -1) break;
      const window = haystack.slice(Math.max(0, index - 48), index);
      if (!NEGATION_RE.test(window)) {
        hits.push(phrase);
        break;
      }
      from = index + phrase.length;
    }
  }

  return hits;
}

export function assertNoForbiddenGuidance(text: string, context: string): void {
  const hits = findForbiddenGuidance(text);
  if (hits.length > 0) {
    throw new Error(`Forbidden guidance language in ${context}: ${hits.join(', ')}`);
  }
}

export const SEC_ADV_SOURCE_NOTE =
  'InvestorTrustHub reports information from official SEC/IARD investment-adviser datasets. The underlying information is filed by regulated entities on Form ADV. The SEC has not approved these firms, endorsed them, validated performance, or certified every filer-supplied field. We organize the evidence. The consumer decides.';

export const RESEARCH_QUESTIONS = [
  'Who am I trusting?',
  'Is this person or firm properly registered?',
  'What does the regulatory record say?',
  'What am I paying?',
  'What do I actually own?',
  'What assumptions drive my retirement plan?',
  'What should I investigate before making a financial decision?',
] as const;

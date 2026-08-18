import { describe, expect, it } from 'vitest';
import {
  ALLOWED_RESEARCH_FRAMES,
  FORBIDDEN_GUIDANCE_PHRASES,
  INDEPENDENCE_LINE,
  MISSION_LINE,
  NOT_ADVICE_LINE,
  PHILOSOPHY_LINE,
  SEC_ADV_SOURCE_NOTE,
  assertNoForbiddenGuidance,
  findForbiddenGuidance,
} from '../src/copy';

describe('financial guidance guardrails', () => {
  it('keeps product constants free of forbidden advice language', () => {
    const corpus = [
      MISSION_LINE,
      PHILOSOPHY_LINE,
      INDEPENDENCE_LINE,
      NOT_ADVICE_LINE,
      SEC_ADV_SOURCE_NOTE,
      ...ALLOWED_RESEARCH_FRAMES,
    ].join('\n');
    expect(findForbiddenGuidance(corpus)).toEqual([]);
    assertNoForbiddenGuidance(corpus, 'domain copy');
  });

  it('detects endorsement and recommendation language', () => {
    expect(findForbiddenGuidance('This advisor is best for you')).toContain(
      'this advisor is best for you',
    );
    expect(findForbiddenGuidance('Our Trust Score is 92')).toContain('trust score');
    expect(FORBIDDEN_GUIDANCE_PHRASES.length).toBeGreaterThan(8);
  });

  it('allows scenario and source-report framing', () => {
    for (const frame of ALLOWED_RESEARCH_FRAMES) {
      expect(findForbiddenGuidance(frame)).toEqual([]);
    }
  });
});

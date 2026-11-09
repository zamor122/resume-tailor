import { describe, it, expect } from 'vitest';
import {
  sanitizeElicitationValue,
  parseElicitationQuestions,
  fallbackElicitationQuestions,
  buildUserSuppliedFactsBlock,
  buildElicitationQuestionPrompt,
} from '@/app/utils/elicitation';
import {
  ELICITATION_MIN_QUESTIONS,
  ELICITATION_MAX_QUESTIONS,
} from '@/app/types/elicitation';

describe('sanitizeElicitationValue', () => {
  it('returns "" for non-strings', () => {
    expect(sanitizeElicitationValue(undefined, 100)).toBe('');
    expect(sanitizeElicitationValue(null, 100)).toBe('');
    expect(sanitizeElicitationValue(42, 100)).toBe('');
    expect(sanitizeElicitationValue({ a: 1 }, 100)).toBe('');
  });

  it('returns "" for whitespace-only input', () => {
    expect(sanitizeElicitationValue('   \n\t  ', 100)).toBe('');
  });

  it('strips quote, backtick and backslash characters that could break a prompt slot', () => {
    expect(sanitizeElicitationValue('He said "we shipped it"', 100)).toBe('He said we shipped it');
    expect(sanitizeElicitationValue('back`tick` and \\slash', 100)).toBe('backtick and slash');
    expect(sanitizeElicitationValue("it's fine", 100)).toBe('its fine');
  });

  it('collapses runs of whitespace to single spaces and trims', () => {
    expect(sanitizeElicitationValue('  a    b\n\nc  ', 100)).toBe('a b c');
  });

  it('truncates to maxLength without leaving a trailing space', () => {
    expect(sanitizeElicitationValue('abcdefghijklmno', 10)).toBe('abcdefghij');
    // slice can land on a space; the trailing trim must remove it
    expect(sanitizeElicitationValue('abcde fghij rest', 10)).toBe('abcde fghi');
  });

  it('is weakening-only — it can never lengthen or strengthen a value', () => {
    const input = '20 people';
    expect(sanitizeElicitationValue(input, 400)).toBe('20 people');
    expect(sanitizeElicitationValue(input, 400).length).toBeLessThanOrEqual(input.length);
  });
});

describe('fallbackElicitationQuestions', () => {
  it('always returns at least the minimum number of concrete questions', () => {
    const qs = fallbackElicitationQuestions();
    expect(qs.length).toBeGreaterThanOrEqual(ELICITATION_MIN_QUESTIONS);
  });

  it('returns numbered ids and non-empty questions', () => {
    const qs = fallbackElicitationQuestions();
    qs.forEach((q, i) => {
      expect(q.id).toBe(`q${i + 1}`);
      expect(q.question.length).toBeGreaterThan(10);
    });
  });

  it('contains no jargon that would confuse a non-technical user', () => {
    const forbidden = ['token', 'temperature', 'prompt', 'parsed', 'model', 'embedding', 'vector', 'ats score', 'json'];
    for (const q of fallbackElicitationQuestions()) {
      const lower = q.question.toLowerCase();
      for (const term of forbidden) {
        expect(lower.includes(term)).toBe(false);
      }
    }
  });
});

describe('parseElicitationQuestions', () => {
  it('parses a plain JSON array of strings', () => {
    const raw = JSON.stringify([
      'How many people did your project affect?',
      'What changed for the business?',
      'How long did the project take?',
    ]);
    const qs = parseElicitationQuestions(raw);
    expect(qs.length).toBe(3);
    expect(qs[0].id).toBe('q1');
    expect(qs[0].question).toBe('How many people did your project affect?');
  });

  it('strips leading numbering and bullets the model may add', () => {
    const raw = JSON.stringify(['1. How many users?', '- What changed?', '• How long?']);
    const qs = parseElicitationQuestions(raw);
    expect(qs.map((q) => q.question)).toEqual(['How many users?', 'What changed?', 'How long?']);
  });

  it('accepts the [{question: "..."}] object form', () => {
    const raw = JSON.stringify([{ question: 'How many users?' }, { question: 'What changed?' }, { question: 'How long?' }]);
    const qs = parseElicitationQuestions(raw);
    expect(qs.length).toBe(3);
    expect(qs[0].question).toBe('How many users?');
  });

  it('extracts the array when the model wraps it in prose or a code fence', () => {
    const raw = 'Sure! Here you go:\n```json\n["How many users?", "What changed?", "How long?"]\n```';
    const qs = parseElicitationQuestions(raw);
    expect(qs.length).toBe(3);
  });

  it('drops questions containing forbidden jargon', () => {
    const raw = JSON.stringify([
      'What is your model output?',
      'How many users did you reach?',
      'How long was the project?',
    ]);
    const qs = parseElicitationQuestions(raw);
    expect(qs.some((q) => /model/i.test(q.question))).toBe(false);
    expect(qs.length).toBeGreaterThanOrEqual(ELICITATION_MIN_QUESTIONS);
  });

  it('deduplicates questions case-insensitively', () => {
    const raw = JSON.stringify(['How many users?', 'how many users?', 'How many users?', 'What changed?', 'How long?']);
    const qs = parseElicitationQuestions(raw);
    const lower = qs.map((q) => q.question.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('caps the list at the maximum and renumbers ids sequentially', () => {
    const raw = JSON.stringify(Array.from({ length: 8 }, (_, i) => `Question number ${i + 1} that is long enough?`));
    const qs = parseElicitationQuestions(raw);
    expect(qs.length).toBe(ELICITATION_MAX_QUESTIONS);
    expect(qs.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  it('pads to the minimum from the honest fallback when the model returns too few', () => {
    const qs = parseElicitationQuestions(JSON.stringify(['How many users were affected?']));
    expect(qs.length).toBeGreaterThanOrEqual(ELICITATION_MIN_QUESTIONS);
    // the one usable model question is preserved first, in order
    expect(qs[0].question).toBe('How many users were affected?');
  });

  it('always returns something usable for unparseable model output', () => {
    for (const junk of ['', 'not json at all', '{}', 'I cannot help with that.']) {
      const qs = parseElicitationQuestions(junk);
      expect(qs.length).toBeGreaterThanOrEqual(ELICITATION_MIN_QUESTIONS);
      expect(qs.every((q) => q.question.length > 0)).toBe(true);
    }
  });
});

describe('buildUserSuppliedFactsBlock (anti-fabrication contract)', () => {
  it('returns "" when there are no facts (everything skipped → prompt unchanged)', () => {
    expect(buildUserSuppliedFactsBlock()).toBe('');
    expect(buildUserSuppliedFactsBlock([])).toBe('');
  });

  it('returns "" when every fact has an empty answer', () => {
    expect(buildUserSuppliedFactsBlock([{ question: 'How many?', answer: '   ' }])).toBe('');
    expect(buildUserSuppliedFactsBlock([{ question: 'q', answer: '' }])).toBe('');
  });

  it("carries the candidate's own words verbatim", () => {
    const block = buildUserSuppliedFactsBlock([{ question: 'How many users?', answer: 'maybe 20 people' }]);
    expect(block).toContain('maybe 20 people');
    expect(block).toContain('How many users?');
  });

  it('states the no-inflation rules so the writer can only USE facts, never scale them', () => {
    const block = buildUserSuppliedFactsBlock([{ question: 'How many?', answer: '20 people' }]);
    expect(block).toMatch(/NEVER/);
    expect(block).toMatch(/round|scale up/i);
    expect(block).toMatch(/do NOT supply one/i);
  });

  it('handles an answer with no question', () => {
    const block = buildUserSuppliedFactsBlock([{ question: '', answer: 'Cut support tickets by half' }]);
    expect(block).toContain('Candidate supplied');
    expect(block).toContain('Cut support tickets by half');
  });
});

describe('buildElicitationQuestionPrompt', () => {
  it('embeds the resume and job text', () => {
    const prompt = buildElicitationQuestionPrompt('RESUME_BODY_MARKER', 'JOB_BODY_MARKER');
    expect(prompt).toContain('RESUME_BODY_MARKER');
    expect(prompt).toContain('JOB_BODY_MARKER');
  });

  it('includes the target role when a job title is supplied', () => {
    const prompt = buildElicitationQuestionPrompt('r', 'j', 'Senior Product Manager');
    expect(prompt).toContain('Target role: Senior Product Manager');
  });

  it('instructs the model to never write numbers or answers', () => {
    const prompt = buildElicitationQuestionPrompt('r', 'j');
    expect(prompt).toMatch(/questions only/i);
    expect(prompt).toMatch(/never write example numbers/i);
  });
});

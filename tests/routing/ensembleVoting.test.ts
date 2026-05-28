import { describe, it, expect, vi } from 'vitest';
import {
  executeEnsemble,
  mergeComplementary,
  recordFeedback,
} from '../../tmlpd-pi-extension/src/routing/ensembleVoting';

describe('executeEnsemble', () => {
  const defaultExecutors: Record<string, (q: string, s: string, c: string) => Promise<string | null>> = {
    groq: vi.fn().mockResolvedValue(
      'Simple answer with no details.'
    ),
    nvidia: vi.fn().mockResolvedValue(
      'Detailed answer including 42 numerical references. The API endpoint app.ts handles requests. ' +
      '* Point one\n* Point two\n* Point three\n* Point four\n* Point five\n' +
      'The system uses Docker, Redis, and GCS for infrastructure. npm install is required.'
    ),
  };

  it('scores detailed responses higher than short ones', async () => {
    const result = await executeEnsemble(
      'test query',
      'system prompt',
      '',
      defaultExecutors,
      { providers: ['groq', 'nvidia'] }
    );

    expect(result.scores['nvidia']).toBeGreaterThan(result.scores['groq']);
    expect(result.winner).toBe('nvidia');
  });

  it('selects the provider with the highest score as winner', async () => {
    const executors = {
      low: vi.fn().mockResolvedValue('Hi'),
      mid: vi.fn().mockResolvedValue('A moderate answer with some text.'),
      high: vi.fn().mockResolvedValue(
        'Excellent comprehensive response. Contains 3 key points. The API integration uses app.ts. ' +
        '* Point A\n* Point B\n* Point C\n* Point D\n* Point E'
      ),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['low', 'mid', 'high'] }
    );

    expect(result.winner).toBe('high');
  });

  it('handles providers returning null (errors)', async () => {
    const executors = {
      good: vi.fn().mockResolvedValue('Valid answer here.'),
      bad: vi.fn().mockRejectedValue(new Error('API failure')),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['good', 'bad'] }
    );

    expect(result.allResults['good']).toBe('Valid answer here.');
    expect(result.allResults['bad']).toBeNull();
    expect(result.scores['bad']).toBe(0);
    expect(result.winner).toBe('good');
  });

  it('handles all providers failing', async () => {
    const executors = {
      a: vi.fn().mockRejectedValue(new Error('fail')),
      b: vi.fn().mockRejectedValue(new Error('fail')),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['a', 'b'] }
    );

    expect(result.best).toBe('');
    expect(Object.values(result.scores).every(s => s === 0)).toBe(true);
  });

  it('applies length penalty for very short responses', async () => {
    const executors = {
      short: vi.fn().mockResolvedValue('Hi'),
      normal: vi.fn().mockResolvedValue('A normal length answer with several words in it.'),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['short', 'normal'] }
    );

    expect(result.scores['short']).toBeLessThan(result.scores['normal']);
  });

  it('applies specificity bonus for responses with numbers', async () => {
    const executors = {
      vague: vi.fn().mockResolvedValue('The system works well and is quite good.'),
      specific: vi.fn().mockResolvedValue('The system processes 42 requests per second with 99.9% uptime.'),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['vague', 'specific'] }
    );

    expect(result.scores['specific']).toBeGreaterThan(result.scores['vague']);
  });

  it('applies structure bonus for multi-line responses', async () => {
    const executors = {
      oneLine: vi.fn().mockResolvedValue('Just a single line answer here.'),
      multiLine: vi.fn().mockResolvedValue('Line one\nLine two\nLine three\nLine four\nLine five'),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['oneLine', 'multiLine'] }
    );

    expect(result.scores['multiLine']).toBeGreaterThan(result.scores['oneLine']);
  });

  it('includes timing information in result', async () => {
    const executors = {
      fast: vi.fn().mockImplementation(
        () => new Promise(r => setTimeout(() => r('Quick answer.'), 5))
      ),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['fast'] }
    );

    expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.perProvider['fast']).toBeGreaterThanOrEqual(0);
  });

  it('produces reasoning string explaining winner selection', async () => {
    const executors = {
      a: vi.fn().mockResolvedValue('Answer A with some detail.'),
      b: vi.fn().mockResolvedValue('Answer B with more specific 42 details and technical API references.'),
    };

    const result = await executeEnsemble(
      'query',
      'sys',
      '',
      executors,
      { providers: ['a', 'b'] }
    );

    expect(result.reasoning).toBeTruthy();
    expect(result.reasoning).toContain(result.winner);
  });
});

describe('mergeComplementary', () => {
  it('merges multiple results into sections', () => {
    const merged = mergeComplementary(['Answer one', 'Answer two']);
    expect(merged).toContain('### Provider 1');
    expect(merged).toContain('### Provider 2');
    expect(merged).toContain('Answer one');
    expect(merged).toContain('Answer two');
    expect(merged).toContain('---');
  });

  it('filters out empty results', () => {
    const merged = mergeComplementary(['Valid', '', 'Also valid']);
    expect(merged).toContain('### Provider 1');
    expect(merged).toContain('### Provider 2');
    expect(merged).not.toContain('### Provider 3');
  });

  it('truncates at maxLength', () => {
    const long = 'A'.repeat(3000);
    const merged = mergeComplementary([long, long], 500);
    expect(merged.length).toBeLessThanOrEqual(500);
  });

  it('returns empty string for all-empty input', () => {
    expect(mergeComplementary([])).toBe('');
    expect(mergeComplementary(['', '', null as unknown as string])).toBe('');
  });
});

describe('recordFeedback', () => {
  it('increments good count for helpful feedback', () => {
    const history: Record<string, { good: number; bad: number }> = {};
    const updated = recordFeedback('groq', true, history);
    expect(updated['groq'].good).toBe(1);
    expect(updated['groq'].bad).toBe(0);
  });

  it('increments bad count for unhelpful feedback', () => {
    const history: Record<string, { good: number; bad: number }> = { groq: { good: 1, bad: 0 } };
    const updated = recordFeedback('groq', false, history);
    expect(updated['groq'].good).toBe(1);
    expect(updated['groq'].bad).toBe(1);
  });

  it('initializes history entry if missing', () => {
    const history: Record<string, { good: number; bad: number }> = {};
    const updated = recordFeedback('new-provider', true, history);
    expect(updated['new-provider']).toEqual({ good: 1, bad: 0 });
  });

  it('returns the same history object (mutates in place)', () => {
    const history: Record<string, { good: number; bad: number }> = {};
    const updated = recordFeedback('groq', true, history);
    expect(updated).toBe(history);
  });
});

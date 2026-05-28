import { describe, it, expect } from 'vitest';
import {
  createPresetRouter,
  getPresetForQuery,
  DEFAULT_PRESETS,
} from '../../tmlpd-pi-extension/src/routing/queryTypePresets';

describe('createPresetRouter', () => {
  it('creates a router with default presets', () => {
    const router = createPresetRouter();
    expect(router.presets).toBeDefined();
    expect(router.defaultPreset).toBe('fast');
    expect(Object.keys(router.presets).length).toBeGreaterThanOrEqual(5);
  });

  it('merges custom presets with defaults', () => {
    const router = createPresetRouter({
      customType: {
        name: 'Custom',
        description: 'Custom test preset',
        provider: 'test',
        temperature: 0.5,
        maxTokens: 1000,
        ensemble: false,
        timeoutMs: 10000,
      },
    });

    expect(router.presets['customType']).toBeDefined();
    expect(router.presets['customType'].provider).toBe('test');
    expect(router.presets['fast']).toBeDefined(); // defaults still there
  });

  it('overrides default presets when custom has same key', () => {
    const router = createPresetRouter({
      fast: {
        name: 'Custom Fast',
        description: 'Overridden',
        provider: 'custom',
        temperature: 0.1,
        maxTokens: 100,
        ensemble: false,
        timeoutMs: 5000,
      },
    });

    expect(router.presets['fast'].provider).toBe('custom');
  });
});

describe('classify', () => {
  const router = createPresetRouter();

  it('classifies code queries', () => {
    const queries = [
      'write a React component with TypeScript',
      'debug this error in the API endpoint',
      'implement a sorting algorithm in Python',
      'fix this bug in the npm package',
      'how to import the class correctly',
    ];
    for (const q of queries) {
      expect(router.classify(q)).toBe('code');
    }
  });

  it('classifies creative queries', () => {
    const queries = [
      'write a poem about AI',
      'create a short story about a robot',
      'compose a tweet announcing the launch',
      'generate content for the blog post',
      'draft an article about machine learning',
    ];
    for (const q of queries) {
      expect(router.classify(q)).toBe('creative');
    }
  });

  it('classifies fast/simple queries', () => {
    const queries = [
      'what is 2+2',
      'hello',
      'yes',
      'what time is it',
    ];
    for (const q of queries) {
      expect(router.classify(q)).toBe('fast');
    }
  });

  it('classifies deep/research queries', () => {
    const queries = [
      'explain quantum computing and compare it with classical computing',
      'analyze the tradeoffs between Redis and Memcached for caching',
      'research the impact of transformer architecture on NLP',
      'evaluate pros and cons of microservices architecture',
      'compare the difference between SQL and NoSQL databases',
    ];
    for (const q of queries) {
      expect(router.classify(q)).toBe('research');
    }
  });

  it('classifies factual queries', () => {
    const queries = [
      'what is the meaning of life',
      'define machine learning',
      'explain how does photosynthesis work',
      'describe the water cycle',
    ];
    for (const q of queries) {
      expect(router.classify(q)).toBe('factual');
    }
  });

  it('handles empty query', () => {
    expect(router.classify('')).toBe('fast');
    expect(router.classify('   ')).toBe('fast');
  });

  it('prefers code pattern over length-based classification for technical queries', () => {
    // Even though this is long, the "function" keyword should trigger code
    const query = 'I need to write a function that handles async requests with proper error handling and retries';
    expect(router.classify(query)).toBe('code');
  });

  it('falls back to length-based classification for queries with no keyword match', () => {
    const shortQuery = 'hello world';
    expect(router.classify(shortQuery)).toBe('fast');

    const mediumQuery = 'I was wondering about the weather in San Francisco during the summer months';
    expect(router.classify(mediumQuery)).toBe('factual');

    const longQuery = Array(40).fill('word').join(' ');
    expect(router.classify(longQuery)).toBe('research');
  });
});

describe('getPresetForQuery', () => {
  it('returns preset config matching classified type', () => {
    const router = createPresetRouter();
    const preset = getPresetForQuery('write a poem', router);
    expect(preset.name).toBe('Creative / Writing');
    expect(preset.temperature).toBe(0.7);
  });

  it('returns default preset when no match found', () => {
    const router = createPresetRouter();
    const preset = getPresetForQuery('xyzzz', router);
    expect(preset.name).toBe('Fast Query');
  });

  it('uses custom presets when provided', () => {
    const router = createPresetRouter({
      code: {
        name: 'Super Coder',
        description: 'My custom code preset',
        provider: 'deepseek',
        temperature: 0.1,
        maxTokens: 5000,
        ensemble: true,
        timeoutMs: 60000,
      },
    });
    const preset = getPresetForQuery('write a function', router);
    expect(preset.name).toBe('Super Coder');
    expect(preset.provider).toBe('deepseek');
  });
});

describe('DEFAULT_PRESETS structure', () => {
  it('all presets have required fields', () => {
    for (const [key, preset] of Object.entries(DEFAULT_PRESETS)) {
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.provider).toBeTruthy();
      expect(typeof preset.temperature).toBe('number');
      expect(preset.temperature).toBeGreaterThanOrEqual(0);
      expect(preset.temperature).toBeLessThanOrEqual(2);
      expect(preset.maxTokens).toBeGreaterThan(0);
      expect(typeof preset.ensemble).toBe('boolean');
      expect(preset.timeoutMs).toBeGreaterThan(0);
    }
  });

  it('code preset has ensemble enabled with nvidia and groq', () => {
    const code = DEFAULT_PRESETS['code'];
    expect(code.ensemble).toBe(true);
    expect(code.ensembleProviders).toContain('nvidia');
    expect(code.ensembleProviders).toContain('groq');
  });

  it('research preset has ensemble enabled with nvidia and groq', () => {
    const research = DEFAULT_PRESETS['research'];
    expect(research.ensemble).toBe(true);
    expect(research.ensembleProviders).toContain('nvidia');
    expect(research.ensembleProviders).toContain('groq');
  });

  it('fast and creative presets have ensemble disabled', () => {
    expect(DEFAULT_PRESETS['fast'].ensemble).toBe(false);
    expect(DEFAULT_PRESETS['creative'].ensemble).toBe(false);
    expect(DEFAULT_PRESETS['factual'].ensemble).toBe(false);
  });
});

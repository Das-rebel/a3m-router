import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock tokenUtils BEFORE importing providerRetry
vi.mock('../../src/utils/tokenUtils', () => ({
  countTokens: (text: string) => {
    if (!text || text.length === 0) return 0;
    return Math.ceil(text.trim().split(/\s+/).length * 1.3);
  },
  estimateTokens: (text: string) => {
    if (!text || text.length === 0) return 0;
    return Math.ceil(text.trim().split(/\s+/).length * 1.3);
  },
}));

import {
  ProviderRetryHandler,
  createRetryHandler,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_PROVIDER_CONFIG,
  PROVIDER_CONTEXT_LIMITS,
  RetryConfig,
  ProviderRetryConfig,
} from '../../src/routing/providerRetry';

// ============================================================
// HELPERS
// ============================================================

function expectInRange(actual: number, min: number, max: number, label: string): void {
  expect(actual >= min && actual <= max).toBe(true);
}

// ============================================================
// SUITE
// ============================================================

describe('ProviderRetryHandler', () => {
  let handler: ProviderRetryHandler;

  beforeEach(() => {
    handler = new ProviderRetryHandler();
  });

  describe('constructor', () => {
    it('initializes with default configs', () => {
      expect(handler).toBeInstanceOf(ProviderRetryHandler);
    });

    it('initializes with custom provider configs', () => {
      const custom: ProviderRetryConfig = {
        customProvider: {
          timeout: 5000,
          retry: { maxRetries: 2, initialDelayMs: 500, maxDelayMs: 10000, backoffMultiplier: 2 },
          rateLimitRetries: 3,
        },
      };
      const customHandler = new ProviderRetryHandler(custom);
      const cfg = customHandler.getConfig('customProvider');
      expect(cfg.timeout).toBe(5000);
    });
  });

  describe('getConfig', () => {
    it('returns deepseek config with correct values', () => {
      const cfg = handler.getConfig('deepseek');
      expect(cfg.timeout).toBe(30000);
      expect(cfg.retry.maxRetries).toBe(5);
      expect(cfg.rateLimitRetries).toBe(3);
    });

    it('returns groq config with short timeout', () => {
      const cfg = handler.getConfig('groq');
      expect(cfg.timeout).toBe(10000);
      expect(cfg.retry.maxRetries).toBe(2);
      expect(cfg.rateLimitRetries).toBe(1);
    });

    it('falls back to default for unknown providers', () => {
      const cfg = handler.getConfig('nonexistent');
      expect(cfg.timeout).toBe(15000);
      expect(cfg.retry.maxRetries).toBe(3);
    });
  });

  describe('configureProvider', () => {
    it('adds a new custom provider', () => {
      handler.configureProvider('my-provider', {
        timeout: 9999,
        retry: { maxRetries: 10, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 1.5 },
        rateLimitRetries: 5,
      });
      const cfg = handler.getConfig('my-provider');
      expect(cfg.timeout).toBe(9999);
      expect(cfg.retry.maxRetries).toBe(10);
      expect(cfg.retry.initialDelayMs).toBe(100);
      expect(cfg.rateLimitRetries).toBe(5);
    });

    it('overrides existing provider partially', () => {
      handler.configureProvider('groq', { timeout: 50000 });
      const cfg = handler.getConfig('groq');
      expect(cfg.timeout).toBe(50000);
      // Other values unchanged
      expect(cfg.retry.maxRetries).toBe(2);
      expect(cfg.rateLimitRetries).toBe(1);
    });
  });

  describe('isRetryableError', () => {
    it('returns true for common transient errors', () => {
      expect(handler.isRetryableError({ code: 'ECONNRESET' })).toBe(true);
      expect(handler.isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(handler.isRetryableError({ code: 'ECONNREFUSED' })).toBe(true);
      expect(handler.isRetryableError({ code: 'EAI_AGAIN' })).toBe(true);
    });

    it('returns true for 5xx status codes', () => {
      expect(handler.isRetryableError({ status: 500 })).toBe(true);
      expect(handler.isRetryableError({ status: 502 })).toBe(true);
      expect(handler.isRetryableError({ status: 503 })).toBe(true);
      expect(handler.isRetryableError({ status: 504 })).toBe(true);
    });

    it('returns true for 429 rate limit', () => {
      expect(handler.isRetryableError({ status: 429 })).toBe(true);
      expect(handler.isRetryableError({ statusCode: 429 })).toBe(true);
    });

    it('returns false for 4xx client errors', () => {
      expect(handler.isRetryableError({ status: 400 })).toBe(false);
      expect(handler.isRetryableError({ status: 404 })).toBe(false);
    });

    it('returns false for permanent provider state errors', () => {
      expect(handler.isRetryableError({ status: 401 })).toBe(false);
      expect(handler.isRetryableError({ status: 403 })).toBe(false);
      expect(handler.isRetryableError({ message: 'insufficient balance' })).toBe(false);
      expect(handler.isRetryableError({ message: 'invalid API key' })).toBe(false);
      expect(handler.isRetryableError({ message: 'quota exhausted' })).toBe(false);
    });

    it('returns false for null/undefined error', () => {
      expect(handler.isRetryableError(null)).toBe(false);
      expect(handler.isRetryableError(undefined)).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('detects 429 in status field', () => {
      expect(handler.isRateLimitError({ status: 429 })).toBe(true);
    });

    it('detects 429 in statusCode field', () => {
      expect(handler.isRateLimitError({ statusCode: 429 })).toBe(true);
    });

    it('returns false for non-429 errors', () => {
      expect(handler.isRateLimitError({ status: 200 })).toBe(false);
      expect(handler.isRateLimitError({ status: 500 })).toBe(false);
      expect(handler.isRateLimitError({})).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    const defaultConfig: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNRESET'],
    };

    it('returns delay in range [0.5*base, base] for attempt 0', () => {
      const delay = handler.calculateBackoffDelay(0, defaultConfig);
      // base = 1000, jitter = [500, 1000]
      expectInRange(delay, 500, 1000, 'Attempt 0 delay');
    });

    it('returns delay in range [0.5*base, base] for attempt 1', () => {
      const delay = handler.calculateBackoffDelay(1, defaultConfig);
      // base = 1000 * 2^1 = 2000, jitter = [1000, 2000]
      expectInRange(delay, 1000, 2000, 'Attempt 1 delay');
    });

    it('returns delay in range [0.5*base, base] for attempt 2', () => {
      const delay = handler.calculateBackoffDelay(2, defaultConfig);
      // base = 1000 * 2^2 = 4000, jitter = [2000, 4000]
      expectInRange(delay, 2000, 4000, 'Attempt 2 delay');
    });

    it('caps delay at maxDelayMs', () => {
      const cappedConfig: RetryConfig = { ...defaultConfig, maxDelayMs: 5000 };
      const delay = handler.calculateBackoffDelay(10, cappedConfig);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('respects Retry-After header for 429 errors', () => {
      const rateLimitError = {
        status: 429,
        headers: { 'retry-after': '5' },
      };
      const delay = handler.calculateBackoffDelay(0, defaultConfig, rateLimitError);
      // Retry-After: 5 seconds = 5000ms, with some tolerance
      expectInRange(delay, 4500, 5500, 'Retry-After delay');
    });
  });

  describe('validateContextWindow', () => {
    it('returns valid for short prompts', () => {
      const result = handler.validateContextWindow('openai', 'Short prompt');
      expect(result.valid).toBe(true);
    });

    it('returns invalid for long prompts on small-context providers', () => {
      const longText = Array(10000).join('word '); // ~9 chars * 10000 = ~90K chars
      const result = handler.validateContextWindow('cerebras', longText);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeTruthy();
      expect(result.suggestedProvider).toBeTruthy();
    });

    it('suggests a provider with larger context when validation fails', () => {
      const longText = Array(10000).join('word ');
      const result = handler.validateContextWindow('cerebras', longText);
      expect(result.suggestedProvider).toBeTruthy();
      const suggestedLimit = PROVIDER_CONTEXT_LIMITS[result.suggestedProvider!] || 0;
      const cerebrasLimit = PROVIDER_CONTEXT_LIMITS['cerebras'] || 0;
      expect(suggestedLimit).toBeGreaterThan(cerebrasLimit);
    });

    it('returns valid for large prompts on large-context providers', () => {
      const longText = Array(10000).join('word ');
      const result = handler.validateContextWindow('minimax', longText);
      expect(result.valid).toBe(true);
    });

    it('accepts explicit token count parameter', () => {
      const result = handler.validateContextWindow('groq', 'test', 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('stats tracking', () => {
    it('starts with zeroed stats', () => {
      const stats = handler.getStats('openai');
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.totalRetries).toBe(0);
    });

    it('getAllStats returns all providers', () => {
      const allStats = handler.getAllStats();
      expect(allStats['openai']).toBeDefined();
      expect(allStats['deepseek']).toBeDefined();
      expect(allStats['groq']).toBeDefined();
      expect(Object.keys(allStats).length).toBeGreaterThan(5);
    });

    it('resetStats clears single provider', () => {
      handler.resetStats('openai');
      const stats = handler.getStats('openai');
      expect(stats.totalRequests).toBe(0);
    });

    it('resetStats with no arg clears all', () => {
      handler.resetStats();
      const allStats = handler.getAllStats();
      for (const stats of Object.values(allStats)) {
        expect(stats.totalRequests).toBe(0);
      }
    });
  });

  describe('executeWithRetry', () => {
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await handler.executeWithRetry('groq', fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on transient errors then succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
        .mockRejectedValueOnce({ code: 'ECONNRESET', message: 'Connection reset' })
        .mockResolvedValue('success after retry');

      const result = await handler.executeWithRetry('groq', fn, {
        onRetry: vi.fn(),
      });
      expect(result).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('fails after exhausting retries', async () => {
      const fn = vi.fn().mockRejectedValue({ code: 'ECONNRESET', message: 'Persistent failure' });

      await expect(
        handler.executeWithRetry('groq', fn)
      ).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries (groq maxRetries=2)
    });

    it('does not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(
        handler.executeWithRetry('groq', fn)
      ).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback on each retry', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('ok');
      const onRetry = vi.fn();

      await handler.executeWithRetry('groq', fn, { onRetry });
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, { code: 'ECONNRESET' }, expect.any(Number));
    });

    it('respects custom timeout', async () => {
      const slowFn = vi.fn().mockImplementation(
        () => new Promise(r => setTimeout(r, 100))
      );

      // Short timeout should reject
      await expect(
        handler.executeWithRetry('groq', slowFn, { timeout: 5 })
      ).rejects.toThrow(/timed out/i);
    });
  });

  describe('PROVIDER_CONTEXT_LIMITS', () => {
    it('contains expected providers', () => {
      expect(PROVIDER_CONTEXT_LIMITS['openai']).toBe(128000);
      expect(PROVIDER_CONTEXT_LIMITS['anthropic']).toBe(200000);
      expect(PROVIDER_CONTEXT_LIMITS['minimax']).toBe(1000000);
      expect(PROVIDER_CONTEXT_LIMITS['groq']).toBe(32000);
      expect(PROVIDER_CONTEXT_LIMITS['default']).toBe(8192);
    });
  });

  describe('createRetryHandler', () => {
    it('creates handler with custom configs', () => {
      const custom = createRetryHandler({
        testProv: {
          timeout: 1000,
          retry: { maxRetries: 1, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
          rateLimitRetries: 1,
        },
      });
      const cfg = custom.getConfig('testProv');
      expect(cfg.timeout).toBe(1000);
    });
  });
});

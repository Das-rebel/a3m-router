/**
 * Edge Case Tests - Failure Modes, Boundaries, and Error Paths
 * 
 * Comprehensive tests for edge cases, error conditions, and boundary values.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import modules
const {
  routeQuery,
  routeBatch,
  extractQueryFeatures,
  countTokens,
  MemoryTree,
  ProviderRetryHandler,
  CostTracker,
  createA3MRouter,
} = require('../dist/index.js');

// ============================================================
// EDGE CASE TESTS - EMPTY AND NULL INPUTS
// ============================================================

describe('1. Edge Cases - Empty and Null Inputs', () => {
  
  describe('routeQuery with empty/null inputs', () => {
    it('handles empty string', () => {
      const result = routeQuery('');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('handles whitespace-only string', () => {
      const result = routeQuery('   \n\t  ');
      expect(result.primary_model).toBeTruthy();
    });
  });
  
  describe('routeBatch with empty inputs', () => {
    it('handles empty array', () => {
      const results = routeBatch([]);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
    
    it('handles array with empty strings', () => {
      const results = routeBatch(['', '', '']);
      expect(results.length).toBe(3);
    });
  });
  
  describe('countTokens with empty inputs', () => {
    it('handles empty string', () => {
      const tokens = countTokens('');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================
// EDGE CASE TESTS - BOUNDARY VALUES
// ============================================================

describe('2. Edge Cases - Boundary Values', () => {
  
  describe('routeQuery with extreme lengths', () => {
    it('handles single character', () => {
      const result = routeQuery('x');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('handles very long query', () => {
      const longQuery = 'a'.repeat(10000);
      const result = routeQuery(longQuery);
      expect(result.primary_model).toBeTruthy();
    });
  });
  
  describe('MemoryTree with boundary sizes', () => {
    it('handles maxSize of 0', () => {
      const memory = new MemoryTree({ maxSize: 0 });
      memory.add('test', { tags: [] });
      expect(memory.getStats()).toBeTruthy();
    });
    
    it('handles maxSize of 1', () => {
      const memory = new MemoryTree({ maxSize: 1 });
      memory.add('test1', { tags: [] });
      memory.add('test2', { tags: [] });
      expect(memory.getStats()).toBeTruthy();
    });
  });
});

// ============================================================
// EDGE CASE TESTS - ERROR HANDLING
// ============================================================

describe('3. Edge Cases - Error Handling', () => {
  
  describe('ProviderRetryHandler errors', () => {
    let handler: ProviderRetryHandler;
    
    beforeEach(() => {
      handler = new ProviderRetryHandler();
    });
    
    it('isRetryableError returns false for null', () => {
      expect(handler.isRetryableError(null)).toBe(false);
    });
    
    it('isRetryableError returns false for undefined', () => {
      expect(handler.isRetryableError(undefined)).toBe(false);
    });
    
    it('isRetryableError returns false for 400 error', () => {
      expect(handler.isRetryableError({ status: 400 })).toBe(false);
    });
    
    it('isRetryableError returns true for 429 rate limit', () => {
      expect(handler.isRetryableError({ status: 429 })).toBe(true);
    });
    
    it('isRetryableError returns true for 500 server error', () => {
      expect(handler.isRetryableError({ status: 500 })).toBe(true);
    });
    
    it('isRetryableError returns true for ECONNRESET', () => {
      expect(handler.isRetryableError({ code: 'ECONNRESET' })).toBe(true);
    });
    
    it('isRetryableError returns true for ETIMEDOUT', () => {
      expect(handler.isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
    });
    
    it('isRateLimitError detects 429 in status', () => {
      expect(handler.isRateLimitError({ status: 429 })).toBe(true);
    });
    
    it('isRateLimitError returns false for 200', () => {
      expect(handler.isRateLimitError({ status: 200 })).toBe(false);
    });
  });
  
  describe('Retry backoff calculations', () => {
    let handler: ProviderRetryHandler;
    
    beforeEach(() => {
      handler = new ProviderRetryHandler();
    });
    
    it('calculateBackoffDelay returns positive number', () => {
      const config = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNRESET'],
      };
      const delay = handler.calculateBackoffDelay(0, config);
      expect(delay).toBeGreaterThan(0);
    });
    
    it('calculateBackoffDelay caps at maxDelayMs', () => {
      const config = {
        maxRetries: 10,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        retryableErrors: ['ECONNRESET'],
      };
      const delay = handler.calculateBackoffDelay(100, config);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });
});

// ============================================================
// EDGE CASE TESTS - TIMEOUT AND CONCURRENCY
// ============================================================

describe('4. Edge Cases - Timeout and Concurrency', () => {
  
  describe('executeWithRetry timeout behavior', () => {
    let handler: ProviderRetryHandler;
    
    beforeEach(() => {
      handler = new ProviderRetryHandler();
    });
    
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await handler.executeWithRetry('groq', fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('retries on transient errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');
      
      const result = await handler.executeWithRetry('groq', fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
    
    it('fails after exhausting retries', async () => {
      const fn = vi.fn().mockRejectedValue({ code: 'ECONNRESET' });
      
      await expect(
        handler.executeWithRetry('groq', fn)
      ).rejects.toThrow();
    });
    
    it('does not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({ status: 401 });
      
      await expect(
        handler.executeWithRetry('groq', fn)
      ).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('MemoryTree concurrent access', () => {
    it('handles concurrent add operations', async () => {
      const memory = new MemoryTree({ maxSize: 1000 });
      
      await Promise.all(
        Array(50).fill(null).map((_, i) => 
          memory.add(`entry ${i}`)
        )
      );
      
      const results = memory.search('entry');
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

// ============================================================
// EDGE CASE TESTS - SPECIAL INPUTS
// ============================================================

describe('5. Edge Cases - Special Input Types', () => {
  
  describe('Unicode handling', () => {
    it('handles Japanese text', () => {
      const result = routeQuery('こんにちは世界');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('handles Chinese text', () => {
      const result = routeQuery('你好世界');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('handles emoji', () => {
      const result = routeQuery('Hello 👋🌍🎉');
      expect(result.primary_model).toBeTruthy();
    });
  });
  
  describe('Code snippet handling', () => {
    it('handles JavaScript code', () => {
      const result = routeQuery('function test() { return 42; }');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('handles SQL code', () => {
      const result = routeQuery('SELECT * FROM users WHERE id = 1');
      expect(result.primary_model).toBeTruthy();
    });
  });
  
  describe('Translation detection', () => {
    it('detects translation queries', () => {
      const features = extractQueryFeatures('Translate hello to French');
      expect(features.is_translation).toBe(true);
    });
  });
});

// ============================================================
// EDGE CASE TESTS - STATE MANAGEMENT
// ============================================================

describe('6. Edge Cases - State Management', () => {
  
  describe('MemoryTree state', () => {
    it('persists state across operations', async () => {
      const memory = new MemoryTree({ maxSize: 100 });
      
      await memory.add('stateful entry');
      const results1 = memory.search('stateful');
      expect(Array.isArray(results1)).toBe(true);
      
      const results2 = memory.search('stateful');
      expect(results2.length).toBe(results1.length);
    });
    
    it('getStats returns accurate stats', async () => {
      const memory = new MemoryTree({ maxSize: 100 });
      
      await memory.add('entry 1');
      await memory.add('entry 2');
      
      const stats = memory.getStats();
      expect(stats.totalChunks).toBeGreaterThan(0);
    });
  });
  
  describe('Retry handler state', () => {
    let handler: ProviderRetryHandler;
    
    beforeEach(() => {
      handler = new ProviderRetryHandler();
    });
    
    it('getStats starts at zero', () => {
      const stats = handler.getStats('groq');
      expect(stats.totalRequests).toBe(0);
    });
    
    it('resetStats clears stats', () => {
      handler.resetStats();
      const allStats = handler.getAllStats();
      for (const stats of Object.values(allStats)) {
        expect(stats.totalRequests).toBe(0);
      }
    });
  });
});

// ============================================================
// EDGE CASE TESTS - LARGE BATCH PROCESSING
// ============================================================

describe('7. Edge Cases - Memory and Resource Limits', () => {
  
  describe('Large batch processing', () => {
    it('handles 1000-item batch', () => {
      const queries = Array(1000).fill('test query');
      const results = routeBatch(queries);
      expect(results.length).toBe(1000);
    });
  });
  
  describe('Rapid successive calls', () => {
    it('handles 100 rapid calls', async () => {
      const promises = Array(100).fill(null).map(() => 
        Promise.resolve(routeQuery('test'))
      );
      
      const results = await Promise.all(promises);
      expect(results.length).toBe(100);
    });
  });
});

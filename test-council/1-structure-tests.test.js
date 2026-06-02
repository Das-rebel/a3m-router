/**
 * Structure Tests - Code Structure & Export Coverage
 * 
 * Tests that verify all exported functions, classes, and types work correctly.
 * This file provides comprehensive coverage of the public API surface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import all exports from the main module
const {
  // Routing engine
  routeQuery,
  routeBatch,
  recommendForTask,
  extractQueryFeatures,
  MODEL_PROFILES,
  updateModelProfile,
  getProviderHealth,
  
  // Retry handling
  ProviderRetryHandler,
  createRetryHandler,
  getDefaultRetryHandler,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_PROVIDER_CONFIG,
  PROVIDER_CONTEXT_LIMITS,
  
  // Providers
  DEFAULT_PROVIDERS,
  getAvailableProviders,
  registerProvider,
  deregisterProvider,
  updateProvider,
  healthCheck,
  checkAllProviders,
  findCheapestAvailableProvider,
  findFastestAvailableProvider,
  loadConfig,
  saveConfig,
  
  // Cost tracking
  CostTracker,
  BudgetEnforcer,
  BudgetExceededError,
  createBudgetEnforcer,
  
  // Memory
  MemoryTree,
  
  // Utilities
  countTokens,
  estimateTokens,
  
  // Cache
  SemanticCache,
  
  // Security
  GuardrailEngine,
  
  // Analytics
  CostAnalytics,
  
  // Observability
  Tracer,
  getTracer,
  createTracer,
  MetricsCollector,
  getMetrics,
  createMetricsCollector,
  observabilityMiddleware,
  observabilityPlugin,
  budgetAlertMiddleware,
  
  // Ensemble
  EnsembleOrchestrator,
  
  // Factory
  createA3MRouter,
} = require('../dist/index.js');

// ============================================================
// STRUCTURE TESTS
// ============================================================

describe('1. Structure - Routing Engine Exports', () => {
  
  describe('routeQuery', () => {
    it('is a function', () => {
      expect(typeof routeQuery).toBe('function');
    });
    
    it('returns object with primary_model', () => {
      const result = routeQuery('test query');
      expect(result).toHaveProperty('primary_model');
    });
    
    it('returns object with fallback_models array', () => {
      const result = routeQuery('test query');
      expect(result).toHaveProperty('fallback_models');
      expect(Array.isArray(result.fallback_models)).toBe(true);
    });
    
    it('returns object with estimated_cost number', () => {
      const result = routeQuery('test query');
      expect(result).toHaveProperty('estimated_cost');
      expect(typeof result.estimated_cost).toBe('number');
    });
    
    it('returns object with confidence number', () => {
      const result = routeQuery('test query');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.confidence).toBe('number');
    });
  });
  
  describe('routeBatch', () => {
    it('is a function', () => {
      expect(typeof routeBatch).toBe('function');
    });
    
    it('returns array of same length as input', () => {
      const queries = ['a', 'b', 'c'];
      const results = routeBatch(queries);
      expect(results.length).toBe(queries.length);
    });
  });
  
  describe('recommendForTask', () => {
    it('is a function', () => {
      expect(typeof recommendForTask).toBe('function');
    });
    
    it('returns object with primary field', () => {
      const result = recommendForTask('coding');
      expect(result).toHaveProperty('primary');
    });
  });
  
  describe('extractQueryFeatures', () => {
    it('is a function', () => {
      expect(typeof extractQueryFeatures).toBe('function');
    });
    
    it('returns object', () => {
      const features = extractQueryFeatures('test');
      expect(typeof features).toBe('object');
    });
  });
  
  describe('MODEL_PROFILES', () => {
    it('is an object', () => {
      expect(typeof MODEL_PROFILES).toBe('object');
    });
    
    it('has at least one model', () => {
      expect(Object.keys(MODEL_PROFILES).length).toBeGreaterThan(0);
    });
  });
});

describe('2. Structure - Provider Configuration Exports', () => {
  
  describe('DEFAULT_PROVIDERS', () => {
    it('is an object', () => {
      expect(typeof DEFAULT_PROVIDERS).toBe('object');
    });
  });
  
  describe('getAvailableProviders', () => {
    it('is a function', () => {
      expect(typeof getAvailableProviders).toBe('function');
    });
    
    it('returns an object', () => {
      const providers = getAvailableProviders();
      expect(typeof providers).toBe('object');
    });
  });
  
  describe('registerProvider', () => {
    it('is a function', () => {
      expect(typeof registerProvider).toBe('function');
    });
  });
  
  describe('deregisterProvider', () => {
    it('is a function', () => {
      expect(typeof deregisterProvider).toBe('function');
    });
  });
  
  describe('updateProvider', () => {
    it('is a function', () => {
      expect(typeof updateProvider).toBe('function');
    });
  });
  
  describe('healthCheck', () => {
    it('is a function', () => {
      expect(typeof healthCheck).toBe('function');
    });
  });
});

describe('3. Structure - Retry Handler Exports', () => {
  
  describe('ProviderRetryHandler', () => {
    it('is a class', () => {
      expect(typeof ProviderRetryHandler).toBe('function');
    });
    
    it('can be instantiated', () => {
      const handler = new ProviderRetryHandler();
      expect(handler).toBeInstanceOf(ProviderRetryHandler);
    });
    
    it('has getConfig method', () => {
      const handler = new ProviderRetryHandler();
      expect(typeof handler.getConfig).toBe('function');
    });
    
    it('has isRetryableError method', () => {
      const handler = new ProviderRetryHandler();
      expect(typeof handler.isRetryableError).toBe('function');
    });
  });
  
  describe('createRetryHandler', () => {
    it('is a function', () => {
      expect(typeof createRetryHandler).toBe('function');
    });
  });
  
  describe('DEFAULT_RETRY_CONFIG', () => {
    it('is an object', () => {
      expect(typeof DEFAULT_RETRY_CONFIG).toBe('object');
    });
  });
  
  describe('PROVIDER_CONTEXT_LIMITS', () => {
    it('is an object', () => {
      expect(typeof PROVIDER_CONTEXT_LIMITS).toBe('object');
    });
  });
});

describe('4. Structure - Cost Tracking Exports', () => {
  
  describe('CostTracker', () => {
    it('is a class', () => {
      expect(typeof CostTracker).toBe('function');
    });
    
    it('can be instantiated', () => {
      const tracker = new CostTracker();
      expect(tracker).toBeTruthy();
    });
  });
  
  describe('BudgetEnforcer', () => {
    it('is a class', () => {
      expect(typeof BudgetEnforcer).toBe('function');
    });
  });
  
  describe('BudgetExceededError', () => {
    it('is an Error class', () => {
      expect(typeof BudgetExceededError).toBe('function');
      const error = new BudgetExceededError('test');
      expect(error).toBeInstanceOf(Error);
    });
  });
});

describe('5. Structure - Memory Exports', () => {
  
  describe('MemoryTree', () => {
    it('is a class', () => {
      expect(typeof MemoryTree).toBe('function');
    });
    
    it('can be instantiated', () => {
      const memory = new MemoryTree({ maxSize: 100 });
      expect(memory).toBeTruthy();
    });
    
    it('has add method', () => {
      const memory = new MemoryTree({ maxSize: 100 });
      expect(typeof memory.add).toBe('function');
    });
    
    it('has search method', () => {
      const memory = new MemoryTree({ maxSize: 100 });
      expect(typeof memory.search).toBe('function');
    });
    
    it('has getStats method', () => {
      const memory = new MemoryTree({ maxSize: 100 });
      expect(typeof memory.getStats).toBe('function');
    });
  });
});

describe('6. Structure - Utility Exports', () => {
  
  describe('countTokens', () => {
    it('is a function', () => {
      expect(typeof countTokens).toBe('function');
    });
    
    it('returns positive number for non-empty string', () => {
      const tokens = countTokens('hello world');
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });
  });
  
  describe('estimateTokens', () => {
    it('is a function', () => {
      expect(typeof estimateTokens).toBe('function');
    });
  });
});

describe('7. Structure - Factory Exports', () => {
  
  describe('createA3MRouter', () => {
    it('is a function', () => {
      expect(typeof createA3MRouter).toBe('function');
    });
    
    it('returns an object', () => {
      const router = createA3MRouter({});
      expect(typeof router).toBe('object');
    });
    
    it('returns object with route function', () => {
      const router = createA3MRouter({});
      expect(typeof router.route).toBe('function');
    });
    
    it('returns object with costTracker', () => {
      const router = createA3MRouter({});
      expect(router.costTracker).toBeTruthy();
    });
    
    it('returns object with memoryTree', () => {
      const router = createA3MRouter({});
      expect(router.memoryTree).toBeTruthy();
    });
  });
});

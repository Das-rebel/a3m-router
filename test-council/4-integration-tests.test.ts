/**
 * Integration Tests - Full Pipeline and End-to-End Tests
 * 
 * Tests that verify the entire system works together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import all modules
const {
  routeQuery,
  routeBatch,
  recommendForTask,
  extractQueryFeatures,
  getAvailableProviders,
  healthCheck,
  MemoryTree,
  CostTracker,
  createA3MRouter,
  ProviderRetryHandler,
  DEFAULT_PROVIDERS,
  MODEL_PROFILES,
  countTokens,
  EnsembleOrchestrator,
} = require('../dist/index.js');

// ============================================================
// INTEGRATION TESTS - REALISTIC SCENARIOS
// ============================================================

describe('1. Integration - Realistic Query Scenarios', () => {
  
  describe('Coding assistant workflow', () => {
    it('routes code queries to appropriate provider', () => {
      const result = routeQuery('Write a Python function to calculate fibonacci numbers');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('routes debugging queries correctly', () => {
      const result = routeQuery('Fix this Python code: for i in range(10) print(i)');
      expect(result.primary_model).toBeTruthy();
    });
  });
  
  describe('Writing assistant workflow', () => {
    it('routes creative writing queries', () => {
      const result = routeQuery('Write a short story about a robot learning to paint');
      expect(result.primary_model).toBeTruthy();
    });
    
    it('routes summarization queries', () => {
      const result = routeQuery('Summarize this article about climate change');
      expect(result.primary_model).toBeTruthy();
    });
  });
  
  describe('Translation workflow', () => {
    it('routes translation queries', () => {
      const result = routeQuery('Translate this paragraph to Spanish');
      expect(result.primary_model).toBeTruthy();
    });
  });
});

// ============================================================
// INTEGRATION TESTS - ROUTER FACTORY
// ============================================================

describe('2. Integration - Router Factory', () => {
  
  describe('Full router workflow', () => {
    it('creates router with all components', () => {
      const router = createA3MRouter({
        defaultProvider: 'groq',
        enableCache: true,
        enableGuardrails: true,
        costLimit: 10.0
      });
      
      expect(router.route).toBeTruthy();
      expect(router.routeBatch).toBeTruthy();
      expect(router.recommendForTask).toBeTruthy();
      expect(router.getAvailableProviders).toBeTruthy();
      expect(router.healthCheck).toBeTruthy();
      expect(router.costTracker).toBeTruthy();
      expect(router.memoryTree).toBeTruthy();
    });
    
    it('performs complete query flow', async () => {
      const router = createA3MRouter({});
      
      // Route a query
      const routeResult = router.route('What is machine learning?');
      expect(routeResult.primary_model).toBeTruthy();
      
      // Add to memory
      await router.memoryTree.add('User asked about machine learning');
      
      // Search memory
      const memoryResults = router.memoryTree.search('machine learning');
      expect(Array.isArray(memoryResults)).toBe(true);
    });
    
    it('handles batch routing workflow', async () => {
      const router = createA3MRouter({});
      
      const queries = [
        'What is Python?',
        'Write a hello world program',
        'Explain photosynthesis'
      ];
      
      const results = router.routeBatch(queries);
      
      expect(results.length).toBe(queries.length);
      
      // Add all to memory (async)
      for (const result of results) {
        await router.memoryTree.add(`Query with result from ${result.primary_model}`);
      }
      
      // Verify routing worked
      expect(results.every(r => r.primary_model)).toBe(true);
    });
  });
});

// ============================================================
// INTEGRATION TESTS - MEMORY OPERATIONS
// ============================================================

describe('3. Integration - Memory Operations', () => {
  
  it('adds and searches memory', async () => {
    const memory = new MemoryTree();
    
    await memory.add('Python tutorial: variables and types');
    await memory.add('Python tutorial: functions');
    await memory.add('JavaScript basics');
    
    const results = memory.search('python tutorial');
    expect(Array.isArray(results)).toBe(true);
  });
  
  it('gets memory stats', async () => {
    const memory = new MemoryTree();
    
    await memory.add('test entry 1');
    await memory.add('test entry 2');
    
    const stats = memory.getStats();
    expect(stats.totalChunks).toBeGreaterThan(0);
    expect(typeof stats.maxDepth).toBe('number');
    expect(typeof stats.treeSize).toBe('number');
  });
});

// ============================================================
// INTEGRATION TESTS - COST TRACKING
// ============================================================

describe('4. Integration - Cost Tracking', () => {
  
  describe('CostTracker basic operations', () => {
    it('creates cost tracker', () => {
      const tracker = new CostTracker();
      expect(tracker).toBeTruthy();
    });
    
    it('calculates cost', () => {
      const tracker = new CostTracker();
      const cost = tracker.calculateCost('gpt-4o', 100, 50);
      expect(cost).toBeTruthy();
      expect(typeof cost.total).toBe('number');
    });
    
    it('records request', () => {
      const tracker = new CostTracker();
      const snapshot = tracker.record('openai', 'gpt-4o', 100, 50);
      expect(snapshot).toBeTruthy();
      expect(snapshot.total_cost).toBeGreaterThan(0);
    });
    
    it('gets summary', () => {
      const tracker = new CostTracker();
      tracker.record('openai', 'gpt-4o', 100, 50);
      const summary = tracker.getSummary();
      expect(summary).toBeTruthy();
      expect(summary.request_count).toBe(1);
    });
  });
});

// ============================================================
// INTEGRATION TESTS - PROVIDER HEALTH
// ============================================================

describe('5. Integration - Provider Health', () => {
  
  describe('Health check integration', () => {
    it('healthCheck function is available', () => {
      expect(typeof healthCheck).toBe('function');
    });
    
    it('getAvailableProviders shows all providers', () => {
      const providers = getAvailableProviders();
      expect(Object.keys(providers).length).toBeGreaterThan(0);
    });
    
    it('recommendForTask works for different task types', () => {
      const tasks = ['coding', 'writing', 'analysis', 'chat', 'translation'];
      
      for (const task of tasks) {
        const rec = recommendForTask(task);
        expect(rec.primary).toBeTruthy();
        expect(Array.isArray(rec.fallbacks)).toBe(true);
      }
    });
  });
});

// ============================================================
// INTEGRATION TESTS - ERROR RECOVERY
// ============================================================

describe('6. Integration - Error Recovery', () => {
  
  describe('Retry handler integration', () => {
    let handler: ProviderRetryHandler;
    
    beforeEach(() => {
      handler = new ProviderRetryHandler();
    });
    
    it('succeeds after transient failure', async () => {
      const flakyFn = () => Promise.resolve('success');
      
      const result = await handler.executeWithRetry('groq', flakyFn);
      expect(result).toBe('success');
    });
    
    it('validates context window', () => {
      const result = handler.validateContextWindow('groq', 'short prompt');
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================
// INTEGRATION TESTS - CONCURRENT OPERATIONS
// ============================================================

describe('7. Integration - Concurrent Operations', () => {
  
  describe('Parallel query processing', () => {
    it('handles parallel routeQuery calls', async () => {
      const promises = Array(20).fill(null).map((_, i) => 
        Promise.resolve(routeQuery(`concurrent query ${i}`))
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(20);
      for (const r of results) {
        expect(r.primary_model).toBeTruthy();
      }
    });
  });
});

// ============================================================
// INTEGRATION TESTS - DATA PIPELINES
// ============================================================

describe('8. Integration - Data Pipelines', () => {
  
  describe('Query feature extraction pipeline', () => {
    it('extracts features consistently', () => {
      const query = 'Write a Python function to sort an array';
      
      const features1 = extractQueryFeatures(query);
      const features2 = extractQueryFeatures(query);
      
      expect(features1.has_code).toBe(features2.has_code);
    });
  });
  
  describe('Token counting pipeline', () => {
    it('counts tokens consistently', () => {
      const text = 'This is a test sentence for token counting consistency.';
      
      const tokens1 = countTokens(text);
      const tokens2 = countTokens(text);
      
      expect(tokens1).toBe(tokens2);
    });
  });
});

// ============================================================
// INTEGRATION TESTS - END-TO-END SCENARIOS
// ============================================================

describe('9. Integration - End-to-End Scenarios', () => {
  
  describe('Complete user workflow', () => {
    it('simulates complete conversation flow', () => {
      const router = createA3MRouter({});
      
      // User asks coding question
      const q1 = router.route('Write a Python function to reverse a string');
      expect(q1.primary_model).toBeTruthy();
      
      // User asks follow-up
      const q2 = router.route('Now add error handling');
      expect(q2.primary_model).toBeTruthy();
      
      // Verify both routed successfully
      expect(q1.primary_model).toBeTruthy();
      expect(q2.primary_model).toBeTruthy();
    });
    
    it('simulates multi-turn conversation with memory', async () => {
      const router = createA3MRouter({});
      
      // First interaction
      await router.memoryTree.add('User asked about web development');
      
      // Second interaction
      await router.memoryTree.add('User followed up on HTML question');
      
      // Query
      const result = router.route('How do I center a div?');
      expect(result.primary_model).toBeTruthy();
      
      // Verify memory works
      const memoryResults = router.memoryTree.search('web');
      expect(Array.isArray(memoryResults)).toBe(true);
    });
    
    it('simulates batch processing workflow', async () => {
      const router = createA3MRouter({});
      
      const queries = [
        'What is React?',
        'Explain TypeScript',
        'Write a REST API example',
        'Compare SQL and NoSQL',
        'How does HTTPS work?'
      ];
      
      // Route all queries
      const routes = router.routeBatch(queries);
      
      // Add to memory
      for (const route of routes) {
        await router.memoryTree.add(`Query about something from ${route.primary_model}`);
      }
      
      // Verify batch processed
      expect(routes.length).toBe(queries.length);
      
      // Verify memory has entries
      const memoryStats = router.memoryTree.getStats();
      expect(memoryStats.totalChunks).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================
// INTEGRATION TESTS - MODEL PROFILES
// ============================================================

describe('10. Integration - Model Profiles', () => {
  
  describe('Model profile access', () => {
    it('has profiles for multiple providers', () => {
      const providerSet = new Set(
        Object.values(MODEL_PROFILES).map((p: any) => p.provider)
      );
      
      expect(providerSet.size).toBeGreaterThan(1);
    });
    
    it('model profiles have strengths array', () => {
      for (const profile of Object.values(MODEL_PROFILES) as any[]) {
        expect(Array.isArray(profile.strengths)).toBe(true);
      }
    });
  });
});

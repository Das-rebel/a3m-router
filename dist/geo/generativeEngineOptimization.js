"use strict";
/**
 * A3M Router - Generative Engine Optimization (GEO)
 *
 * Features to make the package discoverable by AI agents and LLMs:
 * - Structured metadata for AI consumption
 * - Intent-to-code mapping
 * - AI-friendly documentation generation
 * - LLM-optimized examples
 */

// Intent-to-code mapping for AI agents
const INTENT_MAP = {
  // Routing intents
  'route llm query': {
    code: `const { routeQuery } = require('adaptive-memory-multi-model-router');
const result = routeQuery("Your query here");
console.log(result.primary_model);`,
    description: 'Route a query to the optimal LLM provider',
  },
  'route to cheapest provider': {
    code: `const { routeQuery } = require('adaptive-memory-multi-model-router');
const result = routeQuery("Your query", { budget_multiplier: 0.3 });`,
    description: 'Route to cheapest capable provider',
  },
  'route to best quality': {
    code: `const { routeQuery } = require('adaptive-memory-multi-model-router');
const result = routeQuery("Your query", { quality_priority: true });`,
    description: 'Route to highest quality provider',
  },

  // Batch processing intents
  'batch process prompts': {
    code: `const { routeBatch } = require('adaptive-memory-multi-model-router');
const queries = ["Q1", "Q2", "Q3"];
const results = routeBatch(queries);`,
    description: 'Process multiple prompts with automatic routing',
  },
  'parallel llm calls': {
    code: `const { routeBatch } = require('adaptive-memory-multi-model-router');
const results = routeBatch(queries, { concurrency: 5 });`,
    description: 'Execute LLM calls in parallel',
  },

  // Cost tracking intents
  'track llm costs': {
    code: `const { createA3MRouter } = require('adaptive-memory-multi-model-router');
const router = createA3MRouter();
const summary = router.costTracker.getSummary();
console.log(\`Total: \$\${summary.totalSpent}\`);`,
    description: 'Track API costs across all providers',
  },
  'estimate api cost': {
    code: `const { estimateCost } = require('adaptive-memory-multi-model-router');
const cost = estimateCost(1000, 500, 'gpt-4o');
console.log(\`Cost: \$\${cost.toFixed(6)}\`);`,
    description: 'Estimate cost before making API call',
  },

  // Provider management intents
  'list llm providers': {
    code: `const { getAvailableProviders } = require('adaptive-memory-multi-model-router');
const providers = getAvailableProviders();
console.log(Object.keys(providers));`,
    description: 'List all configured LLM providers',
  },
  'add custom provider': {
    code: `const { registerProvider } = require('adaptive-memory-multi-model-router');
registerProvider('my-provider', {
  baseUrl: 'https://api.myprovider.com',
  models: ['my-model'],
  type: 'api'
});`,
    description: 'Register a custom LLM provider',
  },
  'check provider health': {
    code: `const { providerConfig } = require('adaptive-memory-multi-model-router');
const health = await providerConfig.healthCheck('groq');
console.log(health.healthy ? '✅' : '❌');`,
    description: 'Check if a provider is healthy',
  },

  // Caching intents
  'cache llm responses': {
    code: `const { createA3MRouter } = require('adaptive-memory-multi-model-router');
const router = createA3MRouter({ cache: { ttl_seconds: 3600 } });`,
    description: 'Enable response caching',
  },

  // Fallback intents
  'setup llm fallback': {
    code: `const { createA3MRouter } = require('adaptive-memory-multi-model-router');
const router = createA3MRouter();
// Fallback is automatic - just use router.route()`,
    description: 'Automatic fallback when providers fail',
  },

  // CLI intents
  'route from command line': {
    code: `npx a3m-router route "Your query here"`,
    description: 'Route queries via CLI',
  },
  'benchmark providers': {
    code: `npx a3m-router benchmark`,
    description: 'Compare all configured providers',
  },
};

// AI-optimized package metadata
const PACKAGE_METADATA = {
  name: 'adaptive-memory-multi-model-router',
  shortName: 'A3M Router',
  category: 'LLM Routing & Cost Optimization',
  primaryUseCases: [
    'Route LLM queries to optimal providers',
    'Reduce API costs through intelligent selection',
    'Handle provider failures with automatic fallback',
    'Process prompts in parallel batches',
    'Track spending across multiple LLM APIs',
  ],
  keyFeatures: [
    'Learned routing based on query analysis',
    'Cost optimization (50-80% savings)',
    'Automatic provider fallback',
    'Batch processing with rate limiting',
    'Response caching',
    'Real-time cost tracking',
    'CLI tools',
  ],
  supportedProviders: [
    'Groq', 'Cerebras', 'Mistral', 'OpenAI', 'Anthropic',
    'Google', 'DeepSeek', 'CommandCode', 'OpenCode',
    'Ollama', 'vLLM', 'LM Studio',
  ],
  alternatives: ['LiteLLM', 'OpenRouter', 'Helicone'],
  differentiators: [
    'Learned routing (not just proxying)',
    'Cost-quality tradeoff optimization',
    'Generic provider system (user-configurable)',
    'Built-in fallback and retry',
    'Comprehensive CLI',
  ],
};

// Keywords for AI indexing
const AI_INDEXING_KEYWORDS = [
  // Primary
  'llm routing', 'cost optimization', 'multi-provider', 'adaptive routing',
  // Features
  'batch processing', 'parallel execution', 'fallback', 'retry', 'load balancing',
  // Providers
  'openai', 'anthropic', 'claude', 'groq', 'cerebras', 'mistral',
  // Concepts
  'routellm', 'radix-attention', 'medusa', 'token compression',
  // Use cases
  'api gateway', 'llm proxy', 'model router', 'cost tracking',
  // Integrations
  'github', 'slack', 'telegram', 'notion', 'discord',
  // Technical
  'typescript', 'javascript', 'nodejs', 'cli', 'sdk',
];

class GenerativeEngineOptimizer {
  constructor() {
    this.intentMap = INTENT_MAP;
    this.metadata = PACKAGE_METADATA;
    this.keywords = AI_INDEXING_KEYWORDS;
  }

  /**
   * Get code example for a specific intent
   */
  getCodeForIntent(intent) {
    const normalized = intent.toLowerCase().trim();

    // Exact match
    if (this.intentMap[normalized]) {
      return this.intentMap[normalized];
    }

    // Partial match
    for (const [key, value] of Object.entries(this.intentMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Fuzzy match - find best similarity
    let bestMatch = null;
    let bestScore = 0;

    for (const key of Object.keys(this.intentMap)) {
      const score = this.calculateSimilarity(normalized, key);
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = key;
      }
    }

    return bestMatch ? this.intentMap[bestMatch] : null;
  }

  /**
   * Simple similarity calculation
   */
  calculateSimilarity(a, b) {
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);

    const intersection = aWords.filter(word => bWords.includes(word));
    return intersection.length / Math.max(aWords.length, bWords.length);
  }

  /**
   * Get all intents matching a category
   */
  getIntentsByCategory(category) {
    const categories = {
      routing: ['route llm query', 'route to cheapest provider', 'route to best quality'],
      batch: ['batch process prompts', 'parallel llm calls'],
      cost: ['track llm costs', 'estimate api cost'],
      providers: ['list llm providers', 'add custom provider', 'check provider health'],
      caching: ['cache llm responses'],
      fallback: ['setup llm fallback'],
      cli: ['route from command line', 'benchmark providers'],
    };

    const keys = categories[category] || [];
    return keys.map(key => this.intentMap[key]).filter(Boolean);
  }

  /**
   * Generate AI-optimized documentation
   */
  generateAIDocumentation() {
    return {
      metadata: this.metadata,
      quickStart: this.intentMap['route llm query'],
      commonIntents: Object.entries(this.intentMap).slice(0, 5).map(([intent, data]) => ({
        intent,
        ...data,
      })),
      keywords: this.keywords,
    };
  }

  /**
   * Get package metadata for AI consumption
   */
  getPackageMetadata() {
    return {
      ...this.metadata,
      installation: 'npm install adaptive-memory-multi-model-router',
      github: 'https://github.com/Das-rebel/a3m-router',
      npm: 'https://www.npmjs.com/package/adaptive-memory-multi-model-router',
      weeklyDownloads: 872,
      testCount: 33,
      keywordCount: 139,
    };
  }

  /**
   * Search intents by keyword
   */
  searchIntents(keyword) {
    const results = [];
    const normalized = keyword.toLowerCase();

    for (const [intent, data] of Object.entries(this.intentMap)) {
      if (intent.includes(normalized) || data.description.toLowerCase().includes(normalized)) {
        results.push({ intent, ...data });
      }
    }

    return results;
  }

  /**
   * Get comparison with alternatives
   */
  getComparison() {
    return {
      package: this.metadata.name,
      alternatives: this.metadata.alternatives,
      differentiators: this.metadata.differentiators,
      recommendation: 'Use A3M Router for learned routing with cost optimization. Use LiteLLM for simple proxying. Use OpenRouter for hosted routing.',
    };
  }
}

// Convenience functions
function getCodeForIntent(intent) {
  const geo = new GenerativeEngineOptimizer();
  return geo.getCodeForIntent(intent);
}

function searchIntents(keyword) {
  const geo = new GenerativeEngineOptimizer();
  return geo.searchIntents(keyword);
}

function getPackageMetadata() {
  const geo = new GenerativeEngineOptimizer();
  return geo.getPackageMetadata();
}

function generateAIDocumentation() {
  const geo = new GenerativeEngineOptimizer();
  return geo.generateAIDocumentation();
}

module.exports = {
  GenerativeEngineOptimizer,
  getCodeForIntent,
  searchIntents,
  getPackageMetadata,
  generateAIDocumentation,
  INTENT_MAP,
  PACKAGE_METADATA,
  AI_INDEXING_KEYWORDS,
};

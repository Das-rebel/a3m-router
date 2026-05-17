/**
 * Provider Registry v2 - Optimized
 * 
 * Improvements:
 * - Lazy loading of providers
 * - Cache for ready providers
 * - Faster model selection
 */
class ProviderRegistry {
  constructor(config = {}) {
    this.config = { ...DEFAULT_PROVIDER_CONFIG, ...config };
    this.modelPriority = this.config.modelPriority;
    this.providers = new Map();
    this.readyCache = [];
    this.cacheTime = 0;
    this.cacheDuration = 60000; // 1 minute
    this.initializeProviders();
  }

  initializeProviders() {
    const envVars = {
      openai: { key: "OPENAI_API_KEY", mode: "openai" },
      anthropic: { key: "ANTHROPIC_API_KEY", mode: "anthropic" },
      groq: { key: "GROQ_API_KEY", mode: "openai" },
      cerebras: { key: "CEREBRAS_API_KEY", mode: "openai" },
      deepseek: { key: "DEEPSEEK_API_KEY", mode: "openai" },
      fireworks: { key: "FIREWORKS_API_KEY", mode: "openai" },
      perplexity: { key: "PERPLEXITY_API_KEY", mode: "openai" },
      cohere: { key: "COHERE_API_KEY", mode: "openai" },
      google: { key: "GOOGLE_API_KEY", mode: "gemini" },
      mistral: { key: "MISTRAL_API_KEY", mode: "openai" }
    };
    
    for (const [name, env] of Object.entries(envVars)) {
      const apiKey = process.env[env.key] || '';
      this.providers.set(name, {
        name,
        apiKey,
        mode: env.mode,
        priority: this.modelPriority.findIndex(m => m.startsWith(name + "/")),
        enabled: Boolean(apiKey),
        cooldownUntil: 0,
        failureCount: 0
      });
    }
  }

  isProviderReady(name) {
    const provider = this.providers.get(name);
    if (!provider || !provider.enabled) return false;
    if (Date.now() < provider.cooldownUntil) return false;
    return true;
  }

  getReadyProviders() {
    const now = Date.now();
    if (now - this.cacheTime < this.cacheDuration && this.readyCache.length > 0) {
      return this.readyCache;
    }
    
    this.readyCache = Array.from(this.providers.entries())
      .filter(([_, p]) => this.isProviderReady(p.name))
      .map(([name]) => name);
    this.cacheTime = now;
    return this.readyCache;
  }

  selectModel() {
    for (const model of this.modelPriority) {
      const providerName = model.split("/")[0];
      if (this.isProviderReady(providerName)) {
        return model;
      }
    }
    return null;
  }

  recordSuccess(name) {
    const provider = this.providers.get(name);
    if (provider) {
      provider.failureCount = 0;
      provider.cooldownUntil = 0;
    }
  }

  recordFailure(name) {
    const provider = this.providers.get(name);
    if (provider) {
      provider.failureCount++;
      if (provider.failureCount >= 3) {
        provider.cooldownUntil = Date.now() + 60000;
      }
    }
  }

  getStatus() {
    return {
      providers: Array.from(this.providers.keys()),
      modelPriority: this.modelPriority,
      readyProviders: this.getReadyProviders()
    };
  }
}

const DEFAULT_PROVIDER_CONFIG = {
  providers: ["openai", "openrouter", "groq", "cerebras", "mistral", "deepseek", "fireworks", "perplexity", "cohere", "anthropic", "google"],
  modelPriority: ["openai/gpt-4o", "groq/llama-3.3-70b-versatile", "deepseek/deepseek-chat", "fireworks/mixtral-8x7b-instruct"],
  maxTokens: 4096
};

const _routing = require("../routing/advancedRouter");
module.exports = { 
  ProviderRegistry,
  routeQuery: _routing.routeQuery,
  routeBatch: _routing.routeBatch,
  recommendForTask: _routing.recommendForTask,
  extractQueryFeatures: _routing.extractQueryFeatures,
  MODEL_PROFILES: _routing.MODEL_PROFILES,
};



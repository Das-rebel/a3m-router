"use strict";
/**
 * A3M Router - Generic Provider Registry
 * 
 * Dynamically discovers and manages available LLM providers.
 * Users configure providers via:
 * - Environment variables (*_API_KEY patterns)
 * - ~/.config/a3m-router/providers.json
 * - Runtime registration via registerProvider()
 * 
 * No hardcoded provider references - all loaded from providerConfig.
 */

const { getAvailableProviders, loadConfig, healthCheck, registerProvider, deregisterProvider } = require("./providerConfig");
const { routeQuery, routeBatch, recommendForTask, extractQueryFeatures, MODEL_PROFILES } = require("../routing/advancedRouter");

class ProviderRegistry {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.readyCache = [];
    this.cacheTime = 0;
    this.cacheDuration = 60000; // 1 minute
    
    // Load configuration from env vars and config files
    loadConfig();
    this.initializeProviders();
  }

  initializeProviders() {
    const available = getAvailableProviders();
    
    for (const [name, provider] of Object.entries(available)) {
      this.providers.set(name, {
        name,
        apiKey: provider.apiKey || null,
        baseUrl: provider.baseUrl || null,
        models: provider.models,
        type: provider.type,
        priority: provider.priority,
        enabled: true,
        cooldownUntil: 0,
        failureCount: 0,
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
    const available = getAvailableProviders();
    const sorted = Object.entries(available).sort(([, a], [, b]) => a.priority - b.priority);
    
    for (const [name, provider] of sorted) {
      for (const model of provider.models) {
        const modelKey = model.includes('/') ? model : name + '/' + model;
        if (this.isProviderReady(name)) {
          return modelKey;
        }
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
    const available = getAvailableProviders();
    return {
      providers: Array.from(this.providers.keys()),
      available: Object.keys(available),
      ready: this.getReadyProviders(),
      modelPriority: this.selectModel(),
    };
  }

  // Dynamic provider management
  addProvider(id, config) {
    registerProvider(id, config);
    this.initializeProviders();
  }

  removeProvider(id) {
    deregisterProvider(id);
    this.initializeProviders();
  }

  async checkHealth() {
    const results = {};
    for (const [name] of this.providers) {
      results[name] = await healthCheck(name);
    }
    return results;
  }
}

const _routing = require("../routing/advancedRouter");

module.exports = {
  ProviderRegistry,
  routeQuery: _routing.routeQuery,
  routeBatch: _routing.routeBatch,
  recommendForTask: _routing.recommendForTask,
  extractQueryFeatures: _routing.extractQueryFeatures,
  MODEL_PROFILES: _routing.MODEL_PROFILES,
};

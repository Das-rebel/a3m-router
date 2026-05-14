/**
 * TMLPD Response Cache
 * 
 * Caches LLM responses to avoid redundant API calls.
 * Uses content hash for cache key and supports TTL.
 */

import * as crypto from "crypto";

export interface CacheEntry {
  content: string;
  model: string;
  provider: string;
  tokens: number;
  cost: number;
  cached_at: number;
  expires_at: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl_seconds: number;
  max_entries: number;
  cache_dir?: string;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ttl_seconds: config.ttl_seconds ?? 3600, // 1 hour default
      max_entries: config.max_entries ?? 1000,
      cache_dir: config.cache_dir,
    };
  }

  /**
   * Generate cache key from prompt + model
   */
  generateKey(prompt: string, model: string): string {
    const hash = crypto.createHash("sha256");
    hash.update(prompt + "|" + model);
    return hash.digest("hex").substring(0, 32);
  }

  /**
   * Get cached response if available and not expired
   */
  get(prompt: string, model: string): CacheEntry | null {
    if (!this.config.enabled) return null;

    const key = this.generateKey(prompt, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expires_at) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry;
  }

  /**
   * Store response in cache
   */
  set(prompt: string, model: string, response: Partial<CacheEntry>): void {
    if (!this.config.enabled) return;

    const key = this.generateKey(prompt, model);
    const now = Date.now();

    // Evict oldest if at capacity
    if (this.cache.size >= this.config.max_entries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      content: response.content ?? "",
      model: response.model ?? model,
      provider: response.provider ?? "unknown",
      tokens: response.tokens ?? 0,
      cost: response.cost ?? 0,
      cached_at: now,
      expires_at: now + this.config.ttl_seconds * 1000,
    });
  }

  /**
   * Invalidate cache for specific model or all
   */
  invalidate(model?: string): void {
    if (model) {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.model.includes(model)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; size: number; hit_rate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hit_rate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Evict oldest entry by cached_at timestamp
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.cached_at < oldestTime) {
        oldestTime = entry.cached_at;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
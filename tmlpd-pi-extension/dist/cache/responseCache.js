"use strict";
/**
 * TMLPD Response Cache
 *
 * Caches LLM responses to avoid redundant API calls.
 * Uses content hash for cache key and supports TTL.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseCache = void 0;
const crypto = __importStar(require("crypto"));
class ResponseCache {
    cache = new Map();
    config;
    hits = 0;
    misses = 0;
    constructor(config = {}) {
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
    generateKey(prompt, model) {
        const hash = crypto.createHash("sha256");
        hash.update(prompt + "|" + model);
        return hash.digest("hex").substring(0, 32);
    }
    /**
     * Get cached response if available and not expired
     */
    get(prompt, model) {
        if (!this.config.enabled)
            return null;
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
    set(prompt, model, response) {
        if (!this.config.enabled)
            return;
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
    invalidate(model) {
        if (model) {
            for (const [key, entry] of this.cache.entries()) {
                if (entry.model.includes(model)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            this.cache.clear();
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
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
    evictOldest() {
        let oldestKey = null;
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
exports.ResponseCache = ResponseCache;
//# sourceMappingURL=responseCache.js.map
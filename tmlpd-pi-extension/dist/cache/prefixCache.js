"use strict";
/**
 * TMLPD Prefix Cache - RadixAttention Style
 *
 * Inspired by SGLang's RadixAttention (arXiv:2312.07104)
 * Caches KV states for common prefixes (system prompts, etc.)
 * 5-10x speedup for repeated prompt patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefixCache = void 0;
exports.createWarmedCache = createWarmedCache;
class PrefixCache {
    entries = new Map();
    access_order = []; // LRU tracking
    max_entries;
    max_memory_mb;
    constructor(options) {
        this.max_entries = options?.max_entries || 10000;
        this.max_memory_mb = options?.max_memory_mb || 512;
    }
    /**
     * Generate cache key from text prefix
     */
    generateKey(text, model) {
        // Simple hash for now - in production use SHA-256
        const normalized = text.toLowerCase().trim().substring(0, 500);
        const str = `${model || "default"}:${normalized}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `pc_${Math.abs(hash).toString(16)}`;
    }
    /**
     * Check if prefix is cached
     */
    has(prefix, model) {
        const key = this.generateKey(prefix, model);
        return this.entries.has(key);
    }
    /**
     * Get cached entry
     */
    get(prefix, model) {
        const key = this.generateKey(prefix, model);
        const entry = this.entries.get(key);
        if (entry) {
            // Update LRU
            this.updateLRU(key);
            entry.hit_count++;
            entry.last_used = Date.now();
        }
        return entry;
    }
    /**
     * Store a new prefix with its KV state
     */
    store(prefix, options) {
        const key = this.generateKey(prefix, options?.model);
        // Check if already exists
        if (this.entries.has(key)) {
            const existing = this.entries.get(key);
            existing.hit_count++;
            existing.last_used = Date.now();
            return key;
        }
        // Estimate memory
        const token_count = Math.ceil(prefix.split(/\s+/).length * 1.3);
        const memory_bytes = token_count * 16 * 128 * 2; // Rough KV estimate
        const memory_mb = memory_bytes / (1024 * 1024);
        const entry = {
            key,
            prefix: prefix.substring(0, 1000), // Store truncated
            kv_state: options?.kv_state,
            response_hash: options?.response_hash,
            hit_count: 1,
            last_used: Date.now(),
            token_count,
            children: options?.children || new Map()
        };
        // Evict if necessary
        while (this.entries.size >= this.max_entries || this.getMemoryUsage() + memory_mb > this.max_memory_mb) {
            this.evictLRU();
        }
        this.entries.set(key, entry);
        this.access_order.push(key);
        return key;
    }
    /**
     * Extend cached prefix with completion
     */
    extend(prefix, completion, options) {
        const prefix_key = this.generateKey(prefix, options?.model);
        const parent = this.entries.get(prefix_key);
        if (!parent) {
            // No parent - just store completion as new entry
            return this.store(completion, { model: options?.model });
        }
        // Create child entry for the extended sequence
        const extended = prefix + completion;
        const child_key = this.store(extended, { model: options?.model });
        // Link child to parent
        const completion_key = this.generateKey(completion);
        parent.children.set(completion_key, child_key);
        return child_key;
    }
    /**
     * Find common prefix between two texts
     */
    findCommonPrefix(text1, text2) {
        const words1 = text1.split(/\s+/);
        const words2 = text2.split(/\s+/);
        let common_length = 0;
        for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
            if (words1[i].toLowerCase() === words2[i].toLowerCase()) {
                common_length = i + 1;
            }
            else {
                break;
            }
        }
        return words1.slice(0, common_length).join(" ");
    }
    /**
     * Lookup with prefix matching
     * Returns cached entry if any prefix is found
     */
    lookup(text, model) {
        // Try exact match first
        const exact_key = this.generateKey(text, model);
        if (this.entries.has(exact_key)) {
            return { cached: true };
        }
        // Try progressively shorter prefixes
        const words = text.split(/\s+/);
        for (let len = words.length - 1; len >= 5; len--) { // Min 5 words
            const prefix = words.slice(0, len).join(" ");
            const key = this.generateKey(prefix, model);
            if (this.entries.has(key)) {
                const remaining = words.slice(len).join(" ");
                return { cached: true, prefix, remaining };
            }
        }
        return { cached: false };
    }
    /**
     * Batch lookup for multiple texts
     */
    lookupBatch(texts, model) {
        return texts.map(t => this.lookup(t, model));
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let oldest_age = 0;
        let total_hits = 0;
        for (const entry of this.entries.values()) {
            total_hits += entry.hit_count;
            const age = now - entry.last_used;
            if (age > oldest_age)
                oldest_age = age;
        }
        const total_requests = total_hits + this.entries.size; // Approximate
        const hit_rate = total_requests > 0 ? total_hits / total_requests : 0;
        return {
            total_entries: this.entries.size,
            total_hits: total_hits,
            total_misses: this.entries.size, // Approximate
            hit_rate,
            memory_estimate_mb: this.getMemoryUsage(),
            oldest_entry_age_ms: oldest_age
        };
    }
    /**
     * Get estimated memory usage
     */
    getMemoryUsage() {
        let total_bytes = 0;
        for (const entry of this.entries.values()) {
            // Base entry overhead
            total_bytes += 200;
            // Prefix text
            total_bytes += entry.prefix.length * 2;
            // KV state (if stored)
            if (entry.kv_state) {
                total_bytes += entry.kv_state.length;
            }
            // Children map
            total_bytes += entry.children.size * 50;
        }
        return total_bytes / (1024 * 1024);
    }
    /**
     * Update LRU order
     */
    updateLRU(key) {
        const index = this.access_order.indexOf(key);
        if (index > -1) {
            this.access_order.splice(index, 1);
        }
        this.access_order.push(key);
    }
    /**
     * Evict least recently used entry
     */
    evictLRU() {
        if (this.access_order.length === 0)
            return false;
        const lru_key = this.access_order.shift();
        const entry = this.entries.get(lru_key);
        if (entry) {
            // If has children, re-parent them
            for (const [child_key, child_cache_key] of entry.children) {
                const child = this.entries.get(child_cache_key);
                if (child) {
                    // Promote child to standalone
                    this.access_order.push(child_cache_key);
                }
            }
            this.entries.delete(lru_key);
            return true;
        }
        return false;
    }
    /**
     * Clear all cache
     */
    clear() {
        this.entries.clear();
        this.access_order = [];
    }
    /**
     * Invalidate entries matching pattern
     */
    invalidate(pattern) {
        let count = 0;
        if (!pattern) {
            // Clear all
            count = this.entries.size;
            this.clear();
            return count;
        }
        // Pattern-based invalidation
        for (const [key, entry] of this.entries) {
            if (entry.prefix.includes(pattern)) {
                this.entries.delete(key);
                count++;
            }
        }
        return count;
    }
    /**
     * Warm up cache with common system prompts
     */
    warmup(common_prefixes, model) {
        for (const prefix of common_prefixes) {
            this.store(prefix, { model });
        }
        console.log(`[PrefixCache] Warmed up with ${common_prefixes.length} common prefixes`);
    }
}
exports.PrefixCache = PrefixCache;
// Common system prompts that benefit from prefix caching
const COMMON_SYSTEM_PROMPTS = [
    "You are a helpful assistant.",
    "You are a coding assistant. Help with programming tasks.",
    "You are an expert data scientist.",
    "You are a senior software engineer.",
    "Analyze the following code and provide feedback.",
    "Explain this concept in simple terms.",
    "Write clean, well-documented code.",
    "Think step by step and explain your reasoning."
];
exports.default = PrefixCache;
// Utility function for creating pre-warmed cache
function createWarmedCache() {
    const cache = new PrefixCache({ max_entries: 5000 });
    cache.warmup(COMMON_SYSTEM_PROMPTS);
    return cache;
}
//# sourceMappingURL=prefixCache.js.map
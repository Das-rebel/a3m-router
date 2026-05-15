"use strict";
/**
 * TMLPD Episodic Memory Store
 *
 * Stores specific task executions with full context.
 * Reference implementation - for full features see TMLPD v2.x
 *
 * Full TMLPD includes:
 * - JSON-based episodic storage with keyword indexing
 * - Importance scoring and time-based decay
 * - Episodic retrieval by task similarity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicMemoryStore = void 0;
const nanoid_1 = require("nanoid");
class EpisodicMemoryStore {
    entries = [];
    maxEntries;
    keywordIndex;
    constructor(maxEntries = 1000) {
        this.maxEntries = maxEntries;
        this.keywordIndex = new Map();
    }
    /**
     * Store an episodic memory
     */
    store(entry) {
        const id = (0, nanoid_1.nanoid)(12);
        const fullEntry = {
            ...entry,
            id,
            timestamp: Date.now()
        };
        this.entries.push(fullEntry);
        // Index keywords
        if (entry.task.description) {
            const words = entry.task.description.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3) {
                    const existing = this.keywordIndex.get(word) || [];
                    existing.push(id);
                    this.keywordIndex.set(word, existing);
                }
            });
        }
        // Evict oldest if at capacity
        if (this.entries.length > this.maxEntries) {
            const evicted = this.entries.shift();
            if (evicted) {
                // Clean up keyword index for evicted entry
                for (const [word, ids] of this.keywordIndex.entries()) {
                    const filtered = ids.filter(existingId => existingId !== evicted.id);
                    if (filtered.length === 0) {
                        this.keywordIndex.delete(word);
                    }
                    else {
                        this.keywordIndex.set(word, filtered);
                    }
                }
            }
        }
        return id;
    }
    /**
     * Query episodic memories
     */
    query(query) {
        let results = [...this.entries];
        if (query.task_type) {
            results = results.filter(e => e.task.type === query.task_type);
        }
        if (query.keywords && query.keywords.length > 0) {
            const matchingIds = new Set();
            query.keywords.forEach(kw => {
                const lower = kw.toLowerCase();
                for (const [word, ids] of this.keywordIndex.entries()) {
                    if (word.includes(lower)) {
                        ids.forEach(id => matchingIds.add(id));
                    }
                }
            });
            if (matchingIds.size > 0) {
                results = results.filter(e => matchingIds.has(e.id));
            }
        }
        return results.slice(-(query.limit || 10));
    }
    /**
     * Get similar tasks (for learning)
     */
    getSimilarTasks(taskDescription, limit = 5) {
        const words = taskDescription.toLowerCase().split(/\s+/);
        const scores = new Map();
        this.entries.forEach(entry => {
            let score = 0;
            const entryWords = entry.task.description.toLowerCase().split(/\s+/);
            words.forEach(w => {
                if (entryWords.includes(w))
                    score++;
            });
            if (score > 0) {
                scores.set(entry.id, score);
            }
        });
        const sorted = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => this.entries.find(e => e.id === id))
            .filter(Boolean);
        return sorted;
    }
    /**
     * Get statistics
     */
    getStats() {
        return {
            total_entries: this.entries.length,
            indexed_keywords: this.keywordIndex.size,
            success_rate: this.entries.filter(e => e.result.success).length / Math.max(1, this.entries.length),
            avg_duration_ms: this.entries.reduce((sum, e) => sum + e.result.duration_ms, 0) / Math.max(1, this.entries.length)
        };
    }
    /**
     * Clear all memories
     */
    clear() {
        this.entries = [];
        this.keywordIndex.clear();
    }
}
exports.EpisodicMemoryStore = EpisodicMemoryStore;
/**
 * Reference to Full TMLPD Memory System
 *
 * For production use with full features:
 * - Install: npm install tmlpd-skill (Python)
 * - Or integrate with tmlpd-clean/src/memory/
 *
 * Full features include:
 * - Semantic memory with ChromaDB vector embeddings
 * - Time-based importance decay (A-Mem pattern)
 * - Cross-session learning
 * - Episodic + Semantic + Working 3-tier architecture
 */ 
//# sourceMappingURL=episodicMemory.js.map
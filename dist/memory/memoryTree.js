"use strict";
/**
 * Memory Tree Hierarchy
 *
 * Canonicalizes data into ≤3k-token chunks, scores them,
 * and builds hierarchical summary trees.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryTree = void 0;
class MemoryTree {
    maxChunkSize;
    root;
    chunks;
    idCounter;
    constructor(maxChunkSize = 3000) {
        this.maxChunkSize = maxChunkSize;
        this.root = this.createNode('root');
        this.chunks = new Map();
        this.idCounter = 0;
    }
    createNode(id, depth = 0) {
        return { id, chunks: [], summary: '', children: [], depth };
    }
    generateId() {
        return `chunk_${Date.now()}_${this.idCounter++}`;
    }
    /**
     * Add data to the memory tree
     */
    async add(data) {
        const textChunks = this.chunk(data);
        const addedChunks = [];
        for (const text of textChunks) {
            const score = await this.scoreChunk(text);
            const chunk = {
                id: this.generateId(),
                content: text,
                score,
                depth: 0,
                createdAt: Date.now(),
                accessCount: 0
            };
            this.chunks.set(chunk.id, chunk);
            this.root.chunks.push(chunk);
            this.insertIntoTree(chunk);
            addedChunks.push(chunk);
        }
        await this.updateSummaries();
        return addedChunks;
    }
    /**
     * Split text into chunks of maxChunkSize
     */
    chunk(text) {
        const chunks = [];
        const words = text.split(/\s+/);
        let current = [];
        let currentSize = 0;
        for (const word of words) {
            currentSize += word.length + 1;
            if (currentSize > this.maxChunkSize) {
                chunks.push(current.join(' '));
                current = [word];
                currentSize = word.length + 1;
            }
            else {
                current.push(word);
            }
        }
        if (current.length > 0) {
            chunks.push(current.join(' '));
        }
        return chunks;
    }
    /**
     * Score a chunk by relevance
     */
    async scoreChunk(content) {
        // Simple scoring: length + unique words ratio
        const words = content.split(/\s+/);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const uniqueRatio = uniqueWords.size / words.length;
        // Base score + bonus for high unique ratio
        return Math.min(1, (content.length / this.maxChunkSize) * uniqueRatio * 1.5);
    }
    /**
     * Insert chunk into tree hierarchy
     */
    insertIntoTree(chunk) {
        let parent = this.root;
        while (parent.children.length > 0 && chunk.score < 0.5) {
            // Find best matching child
            let bestChild = parent.children[0];
            let bestScore = 0;
            for (const child of parent.children) {
                const avgScore = this.getAverageScore(child);
                if (avgScore > bestScore && avgScore >= chunk.score) {
                    bestScore = avgScore;
                    bestChild = child;
                }
            }
            if (bestScore >= chunk.score) {
                parent = bestChild;
                chunk.depth = parent.depth + 1;
                chunk.parentId = parent.id;
            }
            else {
                break;
            }
        }
        parent.chunks.push(chunk);
    }
    getAverageScore(node) {
        if (node.chunks.length === 0)
            return 0;
        return node.chunks.reduce((sum, c) => sum + c.score, 0) / node.chunks.length;
    }
    /**
     * Update summaries for tree nodes
     */
    async updateSummaries() {
        this.summarizeNode(this.root);
    }
    summarizeNode(node) {
        const allContent = node.chunks.map(c => c.content).join(' ');
        node.summary = allContent.slice(0, 200) + (allContent.length > 200 ? '...' : '');
        for (const child of node.children) {
            this.summarizeNode(child);
        }
    }
    /**
     * Search chunks by content
     */
    search(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        for (const chunk of this.chunks.values()) {
            if (chunk.content.toLowerCase().includes(queryLower)) {
                chunk.accessCount++;
                results.push(chunk);
            }
        }
        return results.sort((a, b) => b.score - a.score);
    }
    /**
     * Get context for routing
     */
    getContext(maxTokens = 3000) {
        const allChunks = Array.from(this.chunks.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        let context = allChunks.map(c => c.content).join('\n\n');
        if (context.length > maxTokens) {
            context = context.slice(0, maxTokens) + '...';
        }
        return context;
    }
    /**
     * Export as markdown for Obsidian
     */
    toMarkdown() {
        const lines = ['# Memory Tree\n'];
        const traverse = (node, prefix = '') => {
            for (const chunk of node.chunks) {
                lines.push(`${prefix}## ${chunk.id} (score: ${chunk.score.toFixed(2)})`);
                lines.push(chunk.content);
                lines.push('');
            }
            for (const child of node.children) {
                lines.push(`${prefix}### ${child.id}`);
                traverse(child, prefix + '#');
            }
        };
        traverse(this.root);
        return lines.join('\n');
    }
    /**
     * Get tree stats
     */
    getStats() {
        return {
            totalChunks: this.chunks.size,
            maxDepth: this.getMaxDepth(this.root),
            rootChunks: this.root.chunks.length,
            treeSize: JSON.stringify(this.root).length
        };
    }
    getMaxDepth(node) {
        if (node.children.length === 0)
            return node.depth;
        return Math.max(...node.children.map(c => this.getMaxDepth(c)));
    }
}
exports.MemoryTree = MemoryTree;
exports.default = MemoryTree;
//# sourceMappingURL=memoryTree.js.map
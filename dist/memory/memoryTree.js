/**
 * Memory Tree Hierarchy (Optimized v2)
 * 
 * Improvements:
 * - LRU cache for recent chunks
 * - Faster search with index
 * - Lower memory footprint
 */
class MemoryTree {
  constructor(maxChunkSize = 3000) {
    this.maxChunkSize = maxChunkSize;
    this.root = { id: 'root', chunks: [], summary: '', children: [], depth: 0 };
    this.chunks = new Map();
    this.idCounter = 0;
    this.index = new Map(); // Fast lookup index
    this.lru = []; // LRU cache for recent chunks
    this.maxLruSize = 100;
  }

  generateId() { return `chunk_${Date.now()}_${this.idCounter++}`; }

  async add(data) {
    const texts = this.chunk(data);
    const added = [];
    for (const text of texts) {
      const chunk = { 
        id: this.generateId(), 
        content: text, 
        score: 0.5, 
        depth: 0, 
        createdAt: Date.now(), 
        accessCount: 0 
      };
      this.chunks.set(chunk.id, chunk);
      this.indexChunk(chunk);
      this.root.chunks.push(chunk);
      added.push(chunk);
    }
    return added;
  }

  // Index a chunk for fast search
  indexChunk(chunk) {
    const words = chunk.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      // Strip punctuation for better matching
      const clean = word.replace(/[^a-z0-9-]/g, '');
      if (clean.length > 3) { // Skip short words
        if (!this.index.has(clean)) this.index.set(clean, new Set());
        this.index.get(clean).add(chunk.id);
      }
    }
  }

  chunk(text) {
    const chunks = [], words = text.split(/\s+/);
    let current = [], size = 0;
    for (const word of words) {
      size += word.length + 1;
      if (size > this.maxChunkSize) { 
        chunks.push(current.join(' ')); 
        current = [word]; 
        size = word.length + 1; 
      } else { 
        current.push(word); 
      }
    }
    if (current.length) chunks.push(current.join(' '));
    return chunks;
  }

  // Fast indexed search
  search(query) {
    const words = query.toLowerCase().split(/\s+/);
    let candidateIds = null;
    
    for (const word of words) {
      const clean = word.replace(/[^a-z0-9-]/g, '');
      if (clean.length <= 3) continue;
      // Try exact match first, then substring match
      let ids = this.index.get(clean);
      if (!ids) {
        // Substring matching: find index keys containing this word
        for (const [key, val] of this.index) {
          if (key.includes(clean) || clean.includes(key)) {
            ids = val;
            break;
          }
        }
      }
      if (ids) {
        if (!candidateIds) candidateIds = new Set(ids);
        else candidateIds = new Set([...candidateIds].filter(id => ids.has(id)));
      }
    }
    
    if (!candidateIds) return []; // No matches
    
    // Update LRU and return chunks
    const results = [];
    for (const id of candidateIds) {
      const chunk = this.chunks.get(id);
      if (chunk) {
        this.updateLRU(chunk);
        chunk.accessCount++;
        results.push(chunk);
      }
    }
    return results;
  }
  
  updateLRU(chunk) {
    this.lru = this.lru.filter(c => c.id !== chunk.id);
    this.lru.unshift(chunk);
    if (this.lru.length > this.maxLruSize) {
      this.lru.pop();
    }
  }

  getContext(maxTokens = 3000) { 
    // Use LRU for context (most recent first)
    const context = this.lru.map(c => c.content).join('\n\n');
    return context.slice(0, maxTokens); 
  }
  
  toMarkdown() { 
    return '# Memory Tree\n' + this.lru.map(c => `## ${c.id}\n${c.content}`).join('\n'); 
  }
  
  getStats() {
    return {
      totalChunks: this.chunks.size,
      maxDepth: 0,
      rootChunks: this.root.chunks.length,
      indexSize: this.index.size,
      lruSize: this.lru.length
    };
  }
}

module.exports = { MemoryTree };

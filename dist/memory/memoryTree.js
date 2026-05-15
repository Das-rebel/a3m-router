/**
 * Memory Tree Hierarchy (Compiled)
 */
class MemoryTree {
  constructor(maxChunkSize = 3000) {
    this.maxChunkSize = maxChunkSize;
    this.root = { id: 'root', chunks: [], summary: '', children: [], depth: 0 };
    this.chunks = new Map();
    this.idCounter = 0;
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
      this.root.chunks.push(chunk);
      added.push(chunk);
    }
    return added;
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

  search(query) { 
    return Array.from(this.chunks.values()).filter(c => c.content.includes(query)); 
  }
  
  getContext(maxTokens = 3000) { 
    return Array.from(this.chunks.values())
      .map(c => c.content)
      .join('\n\n')
      .slice(0, maxTokens); 
  }
  
  toMarkdown() { 
    return '# Memory Tree\n' + Array.from(this.chunks.values())
      .map(c => `## ${c.id}\n${c.content}`)
      .join('\n'); 
  }
  
  getStats() {
    return {
      totalChunks: this.chunks.size,
      maxDepth: this.getMaxDepth(this.root),
      rootChunks: this.root.chunks.length
    };
  }
  
  getMaxDepth(node) {
    if (node.children.length === 0) return node.depth;
    return Math.max(...node.children.map(c => this.getMaxDepth(c)));
  }
}

module.exports = { MemoryTree };

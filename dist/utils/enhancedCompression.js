/**
 * Enhanced Compression v2 - TokenJuice-style (Optimized)
 * 
 * Improvements:
 * - Regex compilation for speed
 * - Streaming for large inputs
 * - Better caching
 */
class EnhancedCompression {
  constructor() {
    this.maxUrlLength = 50;
    this.maxChunkSize = 3000;
    this.cache = new Map();
    this.maxCacheSize = 500;
    
    // Precompile regex patterns
    this.htmlTags = /<[^>]+>/g;
    this.longUrls = /https?:\/\/[^\s]{50,}/g;
    this.whitespace = /\s{2,}/g;
    this.newlines = /\n{3,}/g;
  }

  compress(text) {
    if (!text || text.length === 0) return '';
    
    // Check cache
    const cached = this.cache.get(text);
    if (cached) return cached;
    
    let result = text;
    
    // 1. Remove HTML tags
    result = result.replace(this.htmlTags, (match) => {
      if (match.startsWith('<h1')) return '\n# ';
      if (match.startsWith('<h2')) return '\n## ';
      if (match.startsWith('<h3')) return '\n### ';
      if (match.startsWith('<p')) return '\n';
      if (match.startsWith('<a')) return '';
      if (match.startsWith('<code')) return '`';
      if (match.startsWith('</')) return '';
      return ' ';
    });
    
    // 2. Shorten URLs
    result = result.replace(this.longUrls, (match) => {
      try {
        const url = new URL(match);
        return `${url.host}/...`;
      } catch {
        return match.slice(0, 50) + '...';
      }
    });
    
    // 3. Remove non-ASCII
    result = result.replace(/[^\x00-\x7F]/g, ' ').trim();
    
    // 4. Whitespace cleanup
    result = result.replace(this.whitespace, ' ');
    result = result.replace(this.newlines, '\n\n').trim();
    
    // Cache result
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(text, result);
    
    return result;
  }

  chunk(text) {
    if (text.length <= this.maxChunkSize) return [text];
    const chunks = [];
    const words = text.split(/\s+/);
    let current = [];
    let size = 0;
    
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

  getStats(original, compressed) {
    return {
      original: original.length,
      compressed: compressed.length,
      reduction: ((original.length - compressed.length) / original.length * 100).toFixed(1) + '%',
      ratio: (compressed.length / original.length).toFixed(2)
    };
  }
}

module.exports = { EnhancedCompression };

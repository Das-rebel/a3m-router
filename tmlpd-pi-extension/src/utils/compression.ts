/**
 * TMLPD Context Compression Utilities
 * 
 * Strategies for reducing context window usage:
 * - Smart truncation
 * - Message summarization
 * - ISON-style encoding (inspired by Reddit ISON format)
 * - Context window management
 */

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export type CompressionStrategy = "smart" | "first" | "last" | "isentropy";

/**
 * ISON (Intelligence-Sparse Object Notation)
 * 
 * A compression format that reduces token count by:
 * - Removing redundant whitespace
 * - Shortening common phrases
 * - Using abbreviations strategically
 * 
 * Example: "The quick brown fox jumps over the lazy dog"
 *      → "quick brown fox jumps lazy dog" (removes articles, repeated words)
 */

const ISON_REPLACEMENTS: Array<[RegExp, string]> = [
  // Common phrase abbreviations
  [/\bthe\b/g, ""],
  [/\ba\b/g, ""],
  [/\ban\b/g, ""],
  [/\bthat\b/g, "that"],
  [/\bthis\b/g, "this"],
  [/\bwith\b/g, "w/"],
  [/\bwithout\b/g, "w/o"],
  [/\band\b/g, "&"],
  [/\bor\b/g, "|"],
  [/\bfor\b/g, "4"],
  [/\bto\b/g, "2"],
  [/\binto\b/g, "2"],
  [/\bfrom\b/g, "fr"],
  [/\bplease\b/gi, ""],
  [/\bthank you\b/gi, "thx"],
  [/\byou are\b/gi, "u r"],
  [/\byou can\b/gi, "u c"],
  [/\bcan you\b/gi, "c?"],
  [/\bhow do\b/gi, "how 2"],
  [/\bwhat is\b/gi, "wat"],
  [/\bwhat are\b/gi, "wat"],
  
  // Whitespace normalization
  [/\s+/g, " "],
  [/^\s+|\s+$/g, ""],
  
  // Remove repeated characters
  [/(\w)\1{2,}/g, "$1$1"],
  
  // Shorten common technical terms
  [/\binformation\b/gi, "info"],
  [/\bprocessing\b/gi, "proc"],
  [/\bdevelopment\b/gi, "dev"],
  [/\bapplication\b/gi, "app"],
  [/\bconfiguration\b/gi, "config"],
  [/\brepresentation\b/gi, "repr"],
  [/\bunderstanding\b/gi, "unders"],
  [/\brecommendation\b/gi, "rec"],
];

const ISON_UNREPLACEMENTS: Array<[RegExp, string]> = [
  [/w\//g, "with "],
  [/w\/o/g, "without "],
  [/&/g, " and "],
  [/\b4\b/g, " for "],
  [/\b2\b/g, " to "],
  [/\bfr\b/g, "from "],
  [/\bthx\b/gi, "thank you"],
  [/\bu r\b/gi, "you are"],
  [/\bu c\b/gi, "you can"],
  [/\bc\?\b/g, "can you"],
  [/how 2\b/gi, "how do"],
  [/\bwat\b/g, "what is"],
];

export interface CompressionResult {
  original_tokens: number;
  compressed_tokens: number;
  ratio: number;
  compressed_text: string;
}

/**
 * ISON encode text for token reduction.
 */
export function isonEncode(text: string): string {
  let result = text;
  
  // Apply replacements
  for (const [pattern, replacement] of ISON_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  
  // Remove extra spaces and trim
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

/**
 * Decode ISON encoded text.
 */
export function isonDecode(text: string): string {
  let result = text;
  
  // Apply un-replacements
  for (const [pattern, replacement] of ISON_UNREPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Compress text using ISON encoding.
 */
export function compressText(text: string): CompressionResult {
  const original_tokens = estimateTokens(text);
  const compressed = isonEncode(text);
  const compressed_tokens = estimateTokens(compressed);
  
  return {
    original_tokens,
    compressed_tokens,
    ratio: compressed_tokens / original_tokens,
    compressed_text: compressed
  };
}

/**
 * Estimate tokens (fallback if no model specified).
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length * 1.3);
}

/**
 * Truncate messages to fit within token budget.
 * 
 * @param messages - Conversation messages
 * @param max_tokens - Maximum tokens allowed
 * @param strategy - "smart" (preserve system + recent), "first" (keep start), "last" (keep end)
 */
export function truncateMessages(
  messages: Message[],
  max_tokens: number,
  strategy: CompressionStrategy = "smart"
): Message[] {
  if (!messages || messages.length === 0) return [];
  
  // Calculate total tokens
  const totalTokens = (msg: Message) => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    return estimateTokens(content) + 4; // +4 for role/format overhead
  };
  
  let currentTokens = messages.reduce((sum, m) => sum + totalTokens(m), 0);
  
  if (currentTokens <= max_tokens) {
    return messages; // Already fits
  }
  
  const result: Message[] = [];
  
  if (strategy === "first") {
    // Keep system (first) messages, truncate from middle
    let keepTokens = 0;
    for (const msg of messages) {
      const msgTokens = totalTokens(msg);
      if (keepTokens + msgTokens <= max_tokens) {
        result.push(msg);
        keepTokens += msgTokens;
      } else if (msg.role === "system" && result.length === 0) {
        // Always keep system message, possibly truncated
        const systemContent = typeof msg.content === 'string' ? msg.content : "";
        const truncated = truncateToTokenBudget(systemContent, max_tokens - 4);
        result.push({ ...msg, content: truncated });
        break;
      } else {
        break;
      }
    }
  } else if (strategy === "last") {
    // Keep only most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = totalTokens(msg);
      
      if (currentTokens - msgTokens <= max_tokens) {
        result.unshift(msg);
        currentTokens -= msgTokens;
      } else if (msg.role === "user") {
        // Try to keep a truncated user message
        const truncated = truncateToTokenBudget(msg.content as string, max_tokens - currentTokens);
        if (truncated.length > 20) {
          result.unshift({ ...msg, content: truncated });
        }
        break;
      }
    }
  } else if (strategy === "smart") {
    // Keep system, compress middle, keep recent
    const systemMessages: Message[] = [];
    const middleMessages: Message[] = [];
    const recentMessages: Message[] = [];
    
    for (const msg of messages) {
      if (msg.role === "system") {
        systemMessages.push(msg);
      } else if (messages.indexOf(msg) >= messages.length - 3) {
        recentMessages.push(msg);
      } else {
        middleMessages.push(msg);
      }
    }
    
    // Start with system
    for (const msg of systemMessages) {
      const msgTokens = totalTokens(msg);
      if (currentTokens <= max_tokens) {
        result.push(msg);
        currentTokens -= msgTokens;
      } else {
        // Truncate system message
        const truncated = truncateToTokenBudget(msg.content as string, max_tokens - currentTokens - 10);
        result.push({ ...msg, content: truncated });
        currentTokens = max_tokens;
        break;
      }
    }
    
    // Add compressed middle
    if (currentTokens > max_tokens / 2 && middleMessages.length > 0) {
      // Compress middle messages into a summary
      const middleContent = middleMessages
        .map(m => m.content)
        .join("\n");
      const summaryTokenBudget = Math.min(
        max_tokens / 4,
        max_tokens - currentTokens
      );
      const summary = truncateToTokenBudget(
        `[Previous ${middleMessages.length} messages]: ${middleContent}`,
        summaryTokenBudget
      );
      result.push({ role: "assistant", content: summary });
      currentTokens -= estimateTokens(summary);
    }
    
    // Add recent messages if room
    for (const msg of recentMessages) {
      const msgTokens = totalTokens(msg);
      if (currentTokens + msgTokens <= max_tokens) {
        result.push(msg);
        currentTokens += msgTokens;
      }
    }
  }
  
  return result;
}

/**
 * Truncate a single string to fit within token budget.
 */
export function truncateToTokenBudget(text: string, max_tokens: number): string {
  const words = text.split(/\s+/);
  let current = 0;
  const targetWords: string[] = [];
  
  for (const word of words) {
    const wordTokens = estimateTokens(word);
    if (current + wordTokens <= max_tokens) {
      targetWords.push(word);
      current += wordTokens;
    } else {
      break;
    }
  }
  
  let result = targetWords.join(" ");
  
  // If we truncated, add ellipsis
  if (result.length < text.length) {
    result += "...";
  }
  
  return result;
}

/**
 * Calculate compression ratio for context.
 */
export function calculateCompressionRatio(messages: Message[], max_tokens: number): number {
  const totalTokens = messages.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return sum + estimateTokens(content) + 4;
  }, 0);
  
  return Math.min(1, max_tokens / totalTokens);
}

export default {
  isonEncode,
  isonDecode,
  compressText,
  truncateMessages,
  truncateToTokenBudget,
  calculateCompressionRatio
};
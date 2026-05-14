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
export interface CompressionResult {
    original_tokens: number;
    compressed_tokens: number;
    ratio: number;
    compressed_text: string;
}
/**
 * ISON encode text for token reduction.
 */
export declare function isonEncode(text: string): string;
/**
 * Decode ISON encoded text.
 */
export declare function isonDecode(text: string): string;
/**
 * Compress text using ISON encoding.
 */
export declare function compressText(text: string): CompressionResult;
/**
 * Truncate messages to fit within token budget.
 *
 * @param messages - Conversation messages
 * @param max_tokens - Maximum tokens allowed
 * @param strategy - "smart" (preserve system + recent), "first" (keep start), "last" (keep end)
 */
export declare function truncateMessages(messages: Message[], max_tokens: number, strategy?: CompressionStrategy): Message[];
/**
 * Truncate a single string to fit within token budget.
 */
export declare function truncateToTokenBudget(text: string, max_tokens: number): string;
/**
 * Calculate compression ratio for context.
 */
export declare function calculateCompressionRatio(messages: Message[], max_tokens: number): number;
declare const _default: {
    isonEncode: typeof isonEncode;
    isonDecode: typeof isonDecode;
    compressText: typeof compressText;
    truncateMessages: typeof truncateMessages;
    truncateToTokenBudget: typeof truncateToTokenBudget;
    calculateCompressionRatio: typeof calculateCompressionRatio;
};
export default _default;
//# sourceMappingURL=compression.d.ts.map
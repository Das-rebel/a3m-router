/**
 * TMLPD Speculative Decoding
 *
 * Based on Medusa (arXiv:2401.10774) and EAGLE approaches
 * Small draft model proposes tokens, large model verifies in parallel
 * 2-3x faster generation with same quality
 */
export interface SpeculativeConfig {
    draft_model: string;
    target_model: string;
    num_draft_tokens: number;
    temperature?: number;
    max_verify_tokens?: number;
}
export interface SpeculativeResult {
    accepted: number;
    rejected: number;
    draft_tokens: number;
    speedup: number;
    final_text: string;
}
export interface DraftCandidate {
    token: string;
    probability: number;
    position: number;
}
/**
 * Medusa-style multi-token prediction heads
 * Instead of separate draft model, uses speculative sampling
 */
export declare class MedusaPredictor {
    private num_heads;
    private temperature;
    constructor(options?: {
        num_heads?: number;
        temperature?: number;
    });
    /**
     * Generate k draft tokens from one forward pass
     * In production, this uses actual Medusa prediction heads
     */
    generateDraftTokens(context: string, last_token: string, getLogits: (text: string) => Promise<Record<string, number>>): Promise<DraftCandidate[]>;
    /**
     * Verify draft tokens against target model
     * Returns which tokens were accepted
     */
    verifyDraft(context: string, drafts: DraftCandidate[], targetLogits: (text: string) => Promise<Record<string, number>>): Promise<{
        accepted: number[];
        rejected: number[];
    }>;
}
/**
 * EAGLE-style speculative decoding
 * Uses regression-based draft token prediction
 */
export declare class EagleSpeculative {
    private num_draft_tokens;
    constructor(num_draft_tokens?: number);
    /**
     * Generate draft sequence
     * In production, this uses EAGLE's auto-regressive draft model
     */
    generateDraft(context: string, generateFn: (prompt: string) => Promise<string>): Promise<string[]>;
    /**
     * Verify draft with tree-based attention
     * Multiple drafts are verified simultaneously
     */
    verifyDraftTree(context: string, drafts: string[], targetGenerate: (prompt: string) => Promise<string>): Promise<{
        accepted: number;
        text: string;
    }>;
}
/**
 * Simple speculative decoding wrapper
 * Works with any model pair that supports continued generation
 */
export declare class SpeculativeDecoder {
    private draft_threshold;
    constructor(draft_threshold?: number);
    /**
     * Execute speculative decoding
     *
     * @param prompt - Input prompt
     * @param draftFn - Function to generate draft completion (fast model)
     * @param targetFn - Function to generate target completion (slow model)
     * @param max_draft_tokens - Maximum tokens to draft
     */
    decode(prompt: string, draftFn: (prompt: string, max_tokens: number) => Promise<string>, targetFn: (prompt: string, max_tokens: number) => Promise<string>, max_draft_tokens?: number): Promise<SpeculativeResult>;
    /**
     * Execute with streaming (faster perceived latency)
     */
    decodeStreaming(prompt: string, draftFn: (prompt: string) => Promise<string>, targetFn: (prompt: string) => Promise<string>, onToken: (token: string, is_draft: boolean) => void, max_draft_tokens?: number): Promise<{
        accepted: number;
        final_text: string;
    }>;
}
/**
 * Batch speculative decoding
 * Processes multiple prompts with speculative execution
 */
export declare function speculativeBatch(prompts: string[], draftFn: (prompt: string) => Promise<string>, targetFn: (prompt: string) => Promise<string>, options?: {
    concurrency?: number;
    max_draft_tokens?: number;
}): Promise<SpeculativeResult[]>;
/**
 * Estimate speedup potential for a given prompt
 */
export declare function estimateSpeedupPotential(prompt_length: number, expected_completion_length: number, draft_speed_ms: number, target_speed_ms: number): number;
declare const _default: {
    MedusaPredictor: typeof MedusaPredictor;
    EagleSpeculative: typeof EagleSpeculative;
    SpeculativeDecoder: typeof SpeculativeDecoder;
    speculativeBatch: typeof speculativeBatch;
    estimateSpeedupPotential: typeof estimateSpeedupPotential;
};
export default _default;
//# sourceMappingURL=speculativeDecoding.d.ts.map
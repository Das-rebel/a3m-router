/**
 * OptionAttention — a pure-TypeScript System One decision engine.
 *
 * Port of the architecture popularized by vinnylarouge/jevlike (835★):
 *
 *   Each option becomes a query vector. The query assigns attention weights
 *   to the context tokens; those weights produce one attended context vector
 *   per option. A shared dot product turns each (option, context) pair into
 *   one score. A softmax across options yields calibrated probabilities —
 *   all in a single forward pass, no autoregressive generation.
 *
 * Why this architecture for A3M:
 *   - Dynamic option sets: providers come and go; unseen options are scored
 *     through their text (name + strengths + tier), so the engine generalizes
 *     to providers it was never trained on.
 *   - Zero dependencies: byte-level embeddings, ~25k parameters, weights ship
 *     as JSON inside the npm package.
 *   - CPU-fast: single matmul chain, sub-millisecond for 100+ options.
 */
export interface OptionAttentionWeights {
    /** Hashed trigram embedding table: VOCAB × D. */
    emb: number[][];
    /** Option projection: D × D. */
    wq: number[][];
    bq: number[];
    /** Shared scoring vector: D. */
    w: number[];
    b: number[];
    /** Score head (context pooled → sigmoid): D + 2. */
    ws: number[];
    bs: number[];
    /** Temperature for calibrated softmax. */
    temperature: number;
    dim: number;
}
/** Number of trigram hash buckets (must match tools/train_jev.py). */
export declare const VOCAB = 2048;
/**
 * Hashed trigram tokenization — character trigrams give much sharper text
 * discrimination than raw bytes ("chat" vs "code" produce disjoint buckets).
 */
export declare function tokenize(text: string): number[];
export declare function resetQueryCache(): void;
export interface ChoiceResult {
    probs: number[];
    top: Array<{
        index: number;
        prob: number;
    }>;
}
/**
 * Score N options against a context in one pass.
 * Attention: a_ij = softmax_j( q_i · E_j / √D ), c_i = Σ_j a_ij E_j
 * Score:     s_i   = w · (q_i ⊙ c_i) + b,  probs = softmax(s / T)
 */
export declare function scoreOptions(context: string, options: string[], weights: OptionAttentionWeights): ChoiceResult;
/** Context → scalar in [0,1] via sigmoid(w_s · meanPool + b_s). */
export declare function scoreScalar(context: string, weights: OptionAttentionWeights): number;
/** Boolean decision with calibrated probability (2-way choice). */
export declare function scoreNoul(context: string, questionText: string, weights: OptionAttentionWeights): {
    value: boolean;
    prob: number;
};

"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VOCAB = void 0;
exports.tokenize = tokenize;
exports.resetQueryCache = resetQueryCache;
exports.scoreOptions = scoreOptions;
exports.scoreScalar = scoreScalar;
exports.scoreNoul = scoreNoul;
/** Number of trigram hash buckets (must match tools/train_jev.py). */
exports.VOCAB = 2048;
/**
 * FNV-1a 32-bit hash of a character trigram → bucket id.
 * Must match the Python trainer exactly.
 */
function trigramHash(b0, b1, b2) {
    let h = 0x811c9dc5;
    h = Math.imul(h ^ (b0 & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ (b1 & 0xff), 0x01000193) >>> 0;
    h = Math.imul(h ^ (b2 & 0xff), 0x01000193) >>> 0;
    return h % exports.VOCAB;
}
/**
 * Hashed trigram tokenization — character trigrams give much sharper text
 * discrimination than raw bytes ("chat" vs "code" produce disjoint buckets).
 */
function tokenize(text) {
    const s = " " + text + " ";
    const out = [];
    const cap = 384;
    for (let i = 0; i + 2 < s.length && out.length < cap; i++) {
        out.push(trigramHash(s.charCodeAt(i), s.charCodeAt(i + 1), s.charCodeAt(i + 2)));
    }
    if (out.length === 0)
        out.push(trigramHash(32, 32, 32));
    return out;
}
function meanPool(rows, weights) {
    const D = weights.dim;
    const out = new Array(D).fill(0);
    if (rows.length === 0)
        return out;
    for (const r of rows)
        for (let d = 0; d < D; d++)
            out[d] += r[d];
    for (let d = 0; d < D; d++)
        out[d] /= rows.length;
    return out;
}
function embed(tokens, weights) {
    return tokens.map((t) => weights.emb[t % exports.VOCAB]);
}
/** Cache: option text → query vector. Option texts are static per provider
 * profile, so q_i never changes between calls — skip the W_q matmul. */
const queryCache = new Map();
function resetQueryCache() {
    queryCache.clear();
}
/** Option text → query vector q_i = W_q · meanPool(bytes) + b_q */
function optionQuery(optionText, weights) {
    const hit = queryCache.get(optionText);
    if (hit)
        return hit;
    const D = weights.dim;
    const h = meanPool(embed(tokenize(optionText), weights), weights);
    const q = new Array(D).fill(0);
    for (let i = 0; i < D; i++) {
        let s = weights.bq[i];
        for (let j = 0; j < D; j++)
            s += weights.wq[i][j] * h[j];
        q[i] = Math.tanh(s);
    }
    if (queryCache.size > 512)
        queryCache.clear();
    queryCache.set(optionText, q);
    return q;
}
/**
 * Score N options against a context in one pass.
 * Attention: a_ij = softmax_j( q_i · E_j / √D ), c_i = Σ_j a_ij E_j
 * Score:     s_i   = w · (q_i ⊙ c_i) + b,  probs = softmax(s / T)
 */
function scoreOptions(context, options, weights) {
    const D = weights.dim;
    const E = embed(tokenize(context), weights);
    const scale = 1 / Math.sqrt(D);
    const probs = [];
    for (const opt of options) {
        const q = optionQuery(opt, weights);
        // attention over context tokens
        const attn = E.map((e) => {
            let dot = 0;
            for (let d = 0; d < D; d++)
                dot += q[d] * e[d];
            return dot * scale;
        });
        const maxA = Math.max(...attn, 0);
        const exps = attn.map((a) => Math.exp(a - maxA));
        const sumA = exps.reduce((a, b) => a + b, 0) || 1;
        // attended context vector c_i
        const c = new Array(D).fill(0);
        for (let j = 0; j < E.length; j++) {
            const a = exps[j] / sumA;
            if (a < 1e-6)
                continue;
            for (let d = 0; d < D; d++)
                c[d] += a * E[j][d];
        }
        // score_i = w · (q ⊙ c) + b
        let s = weights.b[0];
        for (let d = 0; d < D; d++)
            s += weights.w[d] * q[d] * c[d];
        probs.push(s / weights.temperature);
    }
    const maxS = Math.max(...probs);
    const expP = probs.map((p) => Math.exp(p - maxS));
    const sumP = expP.reduce((a, b) => a + b, 0) || 1;
    const final = expP.map((e) => e / sumP);
    const top = final
        .map((prob, index) => ({ index, prob }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 5);
    return { probs: final, top };
}
/** Context → scalar in [0,1] via sigmoid(w_s · meanPool + b_s). */
function scoreScalar(context, weights) {
    const D = weights.dim;
    const p = meanPool(embed(tokenize(context), weights), weights);
    let s = weights.bs[0];
    for (let d = 0; d < D; d++)
        s += weights.ws[d] * p[d];
    return 1 / (1 + Math.exp(-s));
}
/** Boolean decision with calibrated probability (2-way choice). */
function scoreNoul(context, questionText, weights) {
    const r = scoreOptions(context, [questionText + " — yes", questionText + " — no"], weights);
    const yesProb = r.probs[0];
    return { value: yesProb >= 0.5, prob: Math.max(yesProb, 1 - yesProb) };
}
//# sourceMappingURL=optionAttention.js.map
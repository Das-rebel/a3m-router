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
export const VOCAB = 2048;

/**
 * FNV-1a 32-bit hash of a character trigram → bucket id.
 * Must match the Python trainer exactly.
 */
function trigramHash(b0: number, b1: number, b2: number): number {
  let h = 0x811c9dc5;
  h = Math.imul(h ^ (b0 & 0xff), 0x01000193) >>> 0;
  h = Math.imul(h ^ (b1 & 0xff), 0x01000193) >>> 0;
  h = Math.imul(h ^ (b2 & 0xff), 0x01000193) >>> 0;
  return h % VOCAB;
}

/**
 * Hashed trigram tokenization — character trigrams give much sharper text
 * discrimination than raw bytes ("chat" vs "code" produce disjoint buckets).
 */
export function tokenize(text: string): number[] {
  const s = " " + text + " ";
  const out: number[] = [];
  const cap = 384;
  for (let i = 0; i + 2 < s.length && out.length < cap; i++) {
    out.push(
      trigramHash(
        s.charCodeAt(i),
        s.charCodeAt(i + 1),
        s.charCodeAt(i + 2)
      )
    );
  }
  if (out.length === 0) out.push(trigramHash(32, 32, 32));
  return out;
}

function meanPool(rows: number[][], weights: OptionAttentionWeights): number[] {
  const D = weights.dim;
  const out = new Array<number>(D).fill(0);
  if (rows.length === 0) return out;
  for (const r of rows) for (let d = 0; d < D; d++) out[d] += r[d];
  for (let d = 0; d < D; d++) out[d] /= rows.length;
  return out;
}

function embed(tokens: number[], weights: OptionAttentionWeights): number[][] {
  return tokens.map((t) => weights.emb[t % VOCAB]);
}

/** Cache: option text → query vector. Option texts are static per provider
 * profile, so q_i never changes between calls — skip the W_q matmul. */
const queryCache = new Map<string, number[]>();

export function resetQueryCache(): void {
  queryCache.clear();
}

/** Option text → query vector q_i = W_q · meanPool(bytes) + b_q */
function optionQuery(optionText: string, weights: OptionAttentionWeights): number[] {
  const hit = queryCache.get(optionText);
  if (hit) return hit;
  const D = weights.dim;
  const h = meanPool(embed(tokenize(optionText), weights), weights);
  const q = new Array<number>(D).fill(0);
  for (let i = 0; i < D; i++) {
    let s = weights.bq[i];
    for (let j = 0; j < D; j++) s += weights.wq[i][j] * h[j];
    q[i] = Math.tanh(s);
  }
  if (queryCache.size > 512) queryCache.clear();
  queryCache.set(optionText, q);
  return q;
}

export interface ChoiceResult {
  probs: number[];
  top: Array<{ index: number; prob: number }>;
}

/**
 * Score N options against a context in one pass.
 * Attention: a_ij = softmax_j( q_i · E_j / √D ), c_i = Σ_j a_ij E_j
 * Score:     s_i   = w · (q_i ⊙ c_i) + b,  probs = softmax(s / T)
 */
export function scoreOptions(
  context: string,
  options: string[],
  weights: OptionAttentionWeights
): ChoiceResult {
  const D = weights.dim;
  const E = embed(tokenize(context), weights);
  const scale = 1 / Math.sqrt(D);

  const probs: number[] = [];
  for (const opt of options) {
    const q = optionQuery(opt, weights);
    // attention over context tokens
    const attn = E.map((e) => {
      let dot = 0;
      for (let d = 0; d < D; d++) dot += q[d] * e[d];
      return dot * scale;
    });
    const maxA = Math.max(...attn, 0);
    const exps = attn.map((a) => Math.exp(a - maxA));
    const sumA = exps.reduce((a, b) => a + b, 0) || 1;
    // attended context vector c_i
    const c = new Array<number>(D).fill(0);
    for (let j = 0; j < E.length; j++) {
      const a = exps[j] / sumA;
      if (a < 1e-6) continue;
      for (let d = 0; d < D; d++) c[d] += a * E[j][d];
    }
    // score_i = w · (q ⊙ c) + b
    let s = weights.b[0];
    for (let d = 0; d < D; d++) s += weights.w[d] * q[d] * c[d];
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
export function scoreScalar(context: string, weights: OptionAttentionWeights): number {
  const D = weights.dim;
  const p = meanPool(embed(tokenize(context), weights), weights);
  let s = weights.bs[0];
  for (let d = 0; d < D; d++) s += weights.ws[d] * p[d];
  return 1 / (1 + Math.exp(-s));
}

/** Boolean decision with calibrated probability (2-way choice). */
export function scoreNoul(
  context: string,
  questionText: string,
  weights: OptionAttentionWeights
): { value: boolean; prob: number } {
  const r = scoreOptions(context, [questionText + " — yes", questionText + " — no"], weights);
  const yesProb = r.probs[0];
  return { value: yesProb >= 0.5, prob: Math.max(yesProb, 1 - yesProb) };
}

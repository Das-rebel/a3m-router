/**
 * Jev contract — open interface pattern for System One decision models.
 *
 * Follows the interface reproduced by the open community:
 *   - TheoLeeCJ/SemIf (formerly OpenJev, 1.4k★) — typed option probabilities
 *   - ekzhang/openjev-sglang — faithful TypeSafe/Jev HTTP API server
 *   - vinnylarouge/jevlike — trainable context+options→probabilities engine
 *
 * Three question types (per TypeSafe's Jev):
 *   - choice: categorical pick over N options      → calibrated probs
 *   - score:  numeric value in [0,1]               → sigmoid output
 *   - noul:   boolean with calibrated probability  → 2-way choice
 *
 * A3M usage: one request answers provider routing (choice),
 * query complexity (score), and capability flags (noul) in a single pass.
 */

export type JevQuestionType = "choice" | "score" | "noul";

export interface JevChoiceQuestion {
  type: "choice";
  key: string;
  description?: string;
  /** Dynamic option texts — engine scores unseen options via their text. */
  options: string[];
}

export interface JevScoreQuestion {
  type: "score";
  key: string;
  description?: string;
  min?: number;
  max?: number;
}

export interface JevNoulQuestion {
  type: "noul";
  key: string;
  description?: string;
}

export type JevQuestion = JevChoiceQuestion | JevScoreQuestion | JevNoulQuestion;

export interface JevRequest {
  /** Unstructured state — the user prompt / conversation context. */
  state: string;
  questions: JevQuestion[];
}

export interface JevChoiceAnswer {
  type: "choice";
  key: string;
  value: string;
  prob: number;
  top: Array<{ option: string; prob: number }>;
}

export interface JevScoreAnswer {
  type: "score";
  key: string;
  value: number;
}

export interface JevNoulAnswer {
  type: "noul";
  key: string;
  value: boolean;
  prob: number;
}

export type JevAnswer = JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer;

export interface JevResponse {
  answers: JevAnswer[];
  /** Milliseconds spent in the decision engine (excluding fallbacks). */
  elapsed_ms: number;
  /** Which backend produced the answers. */
  backend: "local-weights" | "remote" | "fallback-heuristic";
}

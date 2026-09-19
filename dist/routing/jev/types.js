"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map
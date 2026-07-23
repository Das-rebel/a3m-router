/**
 * A3M Router - Shared Server State
 *
 * Singleton state shared across the proxy server and all handlers.
 * Extracted from proxyServer.ts to enable modular handler architecture.
 */

import { CostTracker } from '../cost/costTracker';

// ============================================================
// SHARED STATE
// ============================================================

/** Singleton cost tracker instance */
export const costTracker = new CostTracker();

/** In-memory request log (last 1000 entries) */
export interface RequestLog {
  id: string;
  model: string;
  resolvedProvider: string;
  resolvedModel: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  status: 'success' | 'error';
  error?: string;
  timestamp: number;
}

export const requestLogs: RequestLog[] = [];

export default { costTracker, requestLogs };

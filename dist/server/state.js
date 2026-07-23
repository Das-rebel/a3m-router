"use strict";
/**
 * A3M Router - Shared Server State
 *
 * Singleton state shared across the proxy server and all handlers.
 * Extracted from proxyServer.ts to enable modular handler architecture.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogs = exports.costTracker = void 0;
const costTracker_1 = require("../cost/costTracker");
// ============================================================
// SHARED STATE
// ============================================================
/** Singleton cost tracker instance */
exports.costTracker = new costTracker_1.CostTracker();
exports.requestLogs = [];
exports.default = { costTracker: exports.costTracker, requestLogs: exports.requestLogs };
//# sourceMappingURL=state.js.map
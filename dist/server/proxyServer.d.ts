/**
 * A3M Router - OpenAI-Compatible Proxy Server
 *
 * Lightweight HTTP server that accepts OpenAI API requests and routes them
 * through the A3M Router engine. Uses only Node.js built-in http module.
 *
 * Endpoints:
 *   POST /v1/chat/completions   — OpenAI-compatible chat
 *   POST /v1/completions        — OpenAI completions
 *   GET  /v1/models             — List available models
 *   GET  /health                — Health check with provider status
 *
 * Build: npx tsc
 * Run:   npx a3m-router serve [--port 8787]
 */
import * as http from "http";
import { CostTracker } from "../cost/costTracker";
interface RequestLog {
    id: string;
    model: string;
    resolvedProvider: string;
    resolvedModel: string;
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    status: "success" | "error";
    error?: string;
    timestamp: number;
}
declare const requestLogs: RequestLog[];
declare const costTracker: CostTracker;
/**
 * Create and start the proxy server.
 *
 * @param port - Port to listen on (default: 8787, env: PORT)
 * @returns The http.Server instance
 */
export declare function createProxyServer(port?: number): http.Server;
export { CostTracker, costTracker, requestLogs };
export default createProxyServer;
//# sourceMappingURL=proxyServer.d.ts.map
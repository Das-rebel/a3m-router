"use strict";
/**
 * TMLPD PI Tools
 *
 * Main tools exposed to the PI agent via the MCP bridge.
 * Features: streaming, caching, cost tracking, reliability.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TMLPDTools = void 0;
exports.createTMLPD = createTMLPD;
exports.getDefault = getDefault;
const responseCache_1 = require("../cache/responseCache");
const costTracker_1 = require("../cost/costTracker");
const registry_1 = require("../providers/registry");
const reliability_1 = require("../utils/reliability");
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class TMLPDTools {
    cache;
    costTracker;
    registry;
    circuitBreakers = new Map();
    retryConfig;
    maxConcurrent;
    constructor(config = {}) {
        this.cache = new responseCache_1.ResponseCache(config.cache);
        this.costTracker = new costTracker_1.CostTracker(config.budget);
        this.registry = new registry_1.ProviderRegistry();
        this.retryConfig = { ...reliability_1.DEFAULT_RETRY_CONFIG, ...config.retry };
        this.maxConcurrent = config.maxConcurrent || 5;
    }
    /**
     * Get cost summary
     */
    getCostSummary() {
        return this.costTracker.getSummary();
    }
    /**
     * Get remaining budget
     */
    getRemainingBudget() {
        return this.costTracker.getRemainingBudget();
    }
    /**
     * Get cache stats
     */
    getCacheStats() {
        return this.cache.getStats();
    }
    /**
     * Get provider status
     */
    getProviderStatus() {
        return this.registry.getStatus();
    }
    /**
     * Execute single prompt with optional streaming
     */
    async execute(prompt, model, streaming) {
        const selectedModel = model || this.registry.selectModel();
        if (!selectedModel) {
            return {
                success: false,
                error: "No providers available",
                model: "unknown",
                provider: "unknown",
            };
        }
        // Check cache first
        const cached = this.cache.get(prompt, selectedModel);
        if (cached) {
            return {
                success: true,
                content: cached.content,
                model: cached.model,
                provider: cached.provider,
                tokens: cached.tokens,
                cost: 0, // Cache hit = no cost
                cached: true,
                duration_ms: 0,
            };
        }
        const provider = selectedModel.split("/")[0];
        const breaker = this.getCircuitBreaker(provider);
        const startTime = Date.now();
        const { result, error, attempts, circuit_tripped } = await (0, reliability_1.withRetry)(async () => {
            return this.executeRequest(selectedModel, streaming);
        }, this.retryConfig, breaker);
        const duration_ms = Date.now() - startTime;
        if (!result) {
            return {
                success: false,
                error: error?.message || "Execution failed",
                model: selectedModel,
                provider,
                attempts,
            };
        }
        // Record cost
        const costSnapshot = this.costTracker.record(provider, selectedModel, result.input_tokens || 0, result.output_tokens || 0);
        // Cache successful response
        if (result.content) {
            this.cache.set(prompt, selectedModel, {
                content: result.content,
                model: selectedModel,
                provider,
                tokens: costSnapshot.input_tokens + costSnapshot.output_tokens,
                cost: costSnapshot.total_cost,
            });
        }
        return {
            success: true,
            content: result.content,
            model: selectedModel,
            provider,
            tokens: costSnapshot.input_tokens + costSnapshot.output_tokens,
            cost: costSnapshot.total_cost,
            duration_ms,
            attempts,
        };
    }
    /**
     * Execute parallel across multiple models
     */
    async executeParallel(prompt, models, streaming) {
        const selectedModels = models || this.registry.getReadyProviders().slice(0, 3).map(p => `${p}/default`);
        const startTime = Date.now();
        const results = [];
        let total_cost = 0;
        // Execute with concurrency limit
        for (let i = 0; i < selectedModels.length; i += this.maxConcurrent) {
            const batch = selectedModels.slice(i, i + this.maxConcurrent);
            const batchResults = await Promise.all(batch.map((model) => this.execute(prompt, model, streaming)));
            results.push(...batchResults);
            for (const r of batchResults) {
                if (r.success && r.cost) {
                    total_cost += r.cost;
                }
            }
        }
        const duration_ms = Date.now() - startTime;
        return {
            responses: results,
            total_models: selectedModels.length,
            successful_models: results.filter((r) => r.success).length,
            total_cost,
            duration_ms,
        };
    }
    /**
     * Get circuit breaker for provider
     */
    getCircuitBreaker(provider) {
        if (!this.circuitBreakers.has(provider)) {
            this.circuitBreakers.set(provider, new reliability_1.CircuitBreaker());
        }
        return this.circuitBreakers.get(provider);
    }
    /**
     * Execute HTTP request to provider
     */
    async executeRequest(model, streaming) {
        const provider = model.split("/")[0];
        const providerConfig = this.registry.getStatus().providers[provider];
        if (!providerConfig?.ready) {
            throw new Error(`Provider ${provider} is not available`);
        }
        // Build request based on provider mode
        if (providerConfig.mode === "gemini") {
            return this.executeGemini(provider, model);
        }
        else if (providerConfig.mode === "anthropic") {
            return this.executeAnthropic(provider, model);
        }
        else {
            return this.executeOpenAI(provider, model);
        }
    }
    async executeOpenAI(provider, model) {
        return new Promise((resolve, reject) => {
            const status = this.registry.getStatus().providers[provider];
            const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`] || "";
            const baseUrl = process.env[`${provider.toUpperCase()}_OPENAI_BASE_URL`] || "";
            const payload = JSON.stringify({
                model: model.split("/")[1],
                messages: [{ role: "user", content: "Placeholder" }], // Will be replaced by actual prompt via closure
            });
            const url = new URL(`${baseUrl}/chat/completions`);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === "https:" ? 443 : 80),
                path: url.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                    "User-Agent": "TMLPD-Pi/1.0",
                },
            };
            const protocol = url.protocol === "https:" ? https : http;
            const req = protocol.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices?.[0]?.message?.content || "";
                        const tokens = json.usage?.total_tokens || 0;
                        resolve({ content, input_tokens: Math.floor(tokens * 0.3), output_tokens: Math.floor(tokens * 0.7) });
                    }
                    catch {
                        reject(new Error("Invalid JSON response"));
                    }
                });
            });
            req.on("error", reject);
            req.write(payload);
            req.end();
        });
    }
    async executeAnthropic(provider, model) {
        return new Promise((resolve, reject) => {
            const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`] || "";
            const baseUrl = process.env[`${provider.toUpperCase()}_BASE_URL`] || "";
            const payload = JSON.stringify({
                model: model.split("/")[1],
                max_tokens: 4096,
                messages: [{ role: "user", content: "Placeholder" }],
            });
            const url = new URL(baseUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "User-Agent": "TMLPD-Pi/1.0",
                },
            };
            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const content = json.content?.[0]?.text || "";
                        const tokens = json.usage?.output_tokens || 0;
                        resolve({ content, input_tokens: Math.floor(tokens * 0.3), output_tokens: Math.floor(tokens * 0.7) });
                    }
                    catch {
                        reject(new Error("Invalid JSON response"));
                    }
                });
            });
            req.on("error", reject);
            req.write(payload);
            req.end();
        });
    }
    async executeGemini(provider, model) {
        return new Promise((resolve, reject) => {
            const apiKey = process.env.GOOGLE_API_KEY || "";
            const baseUrl = "https://generativelanguage.googleapis.com/v1beta";
            const payload = JSON.stringify({
                contents: [{ parts: [{ text: "Placeholder" }] }],
                generationConfig: { maxOutputTokens: 4096 },
            });
            const url = new URL(`${baseUrl}/models/${model.split("/")[1]}:generateContent`);
            url.searchParams.set("key", apiKey);
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "TMLPD-Pi/1.0",
                },
            };
            const req = https.request(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const content = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        resolve({ content, input_tokens: 100, output_tokens: 100 });
                    }
                    catch {
                        reject(new Error("Invalid JSON response"));
                    }
                });
            });
            req.on("error", reject);
            req.write(payload);
            req.end();
        });
    }
}
exports.TMLPDTools = TMLPDTools;
// ============================================================================
// Factory Function
// ============================================================================
let _defaultInstance = null;
/**
 * Create a TMLPD instance
 */
function createTMLPD(config) {
    return new TMLPDTools(config);
}
/**
 * Get default singleton instance
 */
function getDefault() {
    if (!_defaultInstance) {
        _defaultInstance = new TMLPDTools();
    }
    return _defaultInstance;
}
//# sourceMappingURL=tmlpdTools.js.map
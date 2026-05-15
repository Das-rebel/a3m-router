"use strict";
/**
 * TMLPD Local Provider Support
 *
 * Integration with local LLM runtimes:
 * - Ollama (localhost:11434)
 * - vLLM (localhost:8000)
 * - LM Studio (localhost:1234)
 *
 * Enables privacy-preserving, cost-free parallel LLM execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalProviderManager = exports.LocalProvider = void 0;
exports.createOllamaProvider = createOllamaProvider;
exports.createVLLMProvider = createVLLMProvider;
exports.createLMStudioProvider = createLMStudioProvider;
// Default endpoints for each runtime
const DEFAULT_ENDPOINTS = {
    ollama: "http://localhost:11434",
    vllm: "http://localhost:8000",
    lmstudio: "http://localhost:1234"
};
class LocalProvider {
    runtime;
    endpoint;
    default_model;
    timeout_ms;
    constructor(config) {
        this.runtime = config.runtime;
        this.endpoint = config.endpoint || DEFAULT_ENDPOINTS[config.runtime];
        this.default_model = config.default_model || "llama-3.3-70b";
        this.timeout_ms = config.timeout_ms || 120000;
    }
    /**
     * List available models on this runtime.
     */
    async listModels() {
        try {
            if (this.runtime === "ollama") {
                return await this.listOllamaModels();
            }
            else if (this.runtime === "vllm") {
                return await this.listVLLMModels();
            }
            else if (this.runtime === "lmstudio") {
                return await this.listLMStudioModels();
            }
            return [];
        }
        catch (error) {
            console.error(`Failed to list models from ${this.runtime}:`, error);
            return [];
        }
    }
    async listOllamaModels() {
        const response = await fetch(`${this.endpoint}/api/tags`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!response.ok)
            throw new Error(`Ollama API error: ${response.status}`);
        const data = await response.json();
        return (data.models || []).map((m) => ({
            name: m.name,
            size: m.size ? this.formatSize(m.size) : undefined,
            quantization: m.details?.quantization,
            capabilities: []
        }));
    }
    async listVLLMModels() {
        // vLLM doesn't have a model list API, use OpenAI compatible endpoint
        const response = await fetch(`${this.endpoint}/v1/models`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!response.ok)
            throw new Error(`vLLM API error: ${response.status}`);
        const data = await response.json();
        return (data.data || []).map((m) => ({
            name: m.id,
            capabilities: m.extensions || []
        }));
    }
    async listLMStudioModels() {
        // LM Studio has a different API
        const response = await fetch(`${this.endpoint}/api/v0/models`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        if (!response.ok)
            throw new Error(`LM Studio API error: ${response.status}`);
        const data = await response.json();
        return (data.models || []).map((m) => ({
            name: m.id || m.name || "unknown",
            size: m.size,
            capabilities: []
        }));
    }
    /**
     * Generate completion (generic, works with all runtimes).
     */
    async generate(prompt, model, options) {
        const targetModel = model || this.default_model;
        try {
            if (this.runtime === "ollama") {
                return await this.ollamaGenerate(targetModel, prompt, options);
            }
            else if (this.runtime === "vllm") {
                return await this.vllmGenerate(targetModel, prompt, options);
            }
            else {
                return await this.lmstudioGenerate(targetModel, prompt, options);
            }
        }
        catch (error) {
            return {
                success: false,
                error: `Local generation failed: ${error}`,
                model: targetModel,
                provider: this.runtime,
                content: "",
                duration_ms: 0,
                tokens: 0,
                cost: 0
            };
        }
    }
    async ollamaGenerate(model, prompt, options) {
        const response = await fetch(`${this.endpoint}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: options || {}
            })
        });
        if (!response.ok)
            throw new Error(`Ollama error: ${response.status}`);
        const data = await response.json();
        return {
            success: true,
            error: null,
            model: data.model || model,
            provider: "ollama",
            content: data.response || "",
            duration_ms: data.total_duration ? data.total_duration / 1_000_000 : 0,
            tokens: data.eval_count || 0,
            cost: 0 // Local = free
        };
    }
    async vllmGenerate(model, prompt, options) {
        // vLLM uses OpenAI-compatible API
        const response = await fetch(`${this.endpoint}/v1/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                max_tokens: options?.max_tokens || 1024,
                temperature: options?.temperature || 0.7
            })
        });
        if (!response.ok)
            throw new Error(`vLLM error: ${response.status}`);
        const data = await response.json();
        const completion = data.choices?.[0]?.text || "";
        return {
            success: true,
            error: null,
            model: data.model || model,
            provider: "vllm",
            content: completion,
            duration_ms: data.elapsed_time ? data.elapsed_time * 1000 : 0,
            tokens: data.usage?.total_tokens || 0,
            cost: 0
        };
    }
    async lmstudioGenerate(model, prompt, options) {
        // LM Studio uses OpenAI-compatible API
        const response = await fetch(`${this.endpoint}/v1/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                prompt,
                max_tokens: options?.max_tokens || 1024,
                temperature: options?.temperature || 0.7
            })
        });
        if (!response.ok)
            throw new Error(`LM Studio error: ${response.status}`);
        const data = await response.json();
        const completion = data.choices?.[0]?.text || "";
        return {
            success: true,
            error: null,
            model: data.model || model,
            provider: "lmstudio",
            content: completion,
            duration_ms: 0,
            tokens: data.usage?.total_tokens || 0,
            cost: 0
        };
    }
    /**
     * Check if this runtime is available/healthy.
     */
    async healthCheck() {
        try {
            if (this.runtime === "ollama") {
                const response = await fetch(`${this.endpoint}/api/tags`, { method: "GET" });
                return response.ok;
            }
            else if (this.runtime === "vllm" || this.runtime === "lmstudio") {
                const response = await fetch(`${this.endpoint}/v1/models`, { method: "GET" });
                return response.ok;
            }
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Get runtime info.
     */
    getInfo() {
        return {
            runtime: this.runtime,
            endpoint: this.endpoint,
            default_model: this.default_model,
            timeout_ms: this.timeout_ms
        };
    }
    formatSize(bytes) {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let unitIndex = 0;
        let size = bytes;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
}
exports.LocalProvider = LocalProvider;
/**
 * Manager for multiple local providers.
 */
class LocalProviderManager {
    providers = new Map();
    addProvider(name, config) {
        this.providers.set(name, new LocalProvider(config));
    }
    async executeParallel(prompt, options) {
        const models = options?.models || ["local/llama-3.3-70b"];
        const results = [];
        // Execute in parallel across providers
        const promises = models.map(async (model) => {
            // Parse model string like "ollama/llama-3.3-70b" or just "llama-3.3-70b"
            const parts = model.split("/");
            const providerType = parts.length > 1 ? parts[0] : "ollama";
            const modelName = parts.length > 1 ? parts[1] : model;
            const provider = this.providers.get(providerType) ||
                new LocalProvider({ runtime: providerType });
            return provider.generate(prompt, modelName);
        });
        const settled = await Promise.allSettled(promises);
        for (let i = 0; i < settled.length; i++) {
            const result = settled[i];
            if (result.status === "fulfilled") {
                results.push(result.value);
            }
            else {
                results.push({
                    success: false,
                    error: result.reason?.message || "Unknown error",
                    model: models[i],
                    provider: "unknown",
                    content: "",
                    duration_ms: 0,
                    tokens: 0,
                    cost: 0
                });
            }
        }
        const successful = results.filter(r => r.success);
        return {
            success: successful.length > 0,
            responses: results,
            total_models: models.length,
            successful_models: successful.length,
            total_cost: results.reduce((sum, r) => sum + r.cost, 0),
            duration_ms: Math.max(...results.map(r => r.duration_ms), 0)
        };
    }
    async healthCheckAll() {
        const results = {};
        for (const [name, provider] of this.providers) {
            results[name] = await provider.healthCheck();
        }
        return results;
    }
    listProviders() {
        return Array.from(this.providers.keys());
    }
}
exports.LocalProviderManager = LocalProviderManager;
// Utility function for creating common local configurations
function createOllamaProvider(model) {
    return new LocalProvider({
        runtime: "ollama",
        default_model: model || "llama-3.3-70b"
    });
}
function createVLLMProvider(endpoint, model) {
    return new LocalProvider({
        runtime: "vllm",
        endpoint: endpoint || "http://localhost:8000",
        default_model: model || "meta-llama/Llama-3.3-70b-Instruct"
    });
}
function createLMStudioProvider(model) {
    return new LocalProvider({
        runtime: "lmstudio",
        default_model: model || "llama-3.3-70b"
    });
}
exports.default = {
    LocalProvider,
    LocalProviderManager,
    createOllamaProvider,
    createVLLMProvider,
    createLMStudioProvider
};
//# sourceMappingURL=localProvider.js.map
"use strict";
/**
 * A3M Router - Generic Provider Configuration System
 *
 * Users can configure their available LLM providers via:
 * 1. Environment variables (*_API_KEY patterns)
 * 2. Config file at ~/.config/a3m-router/providers.json
 * 3. Runtime registration via registerProvider()
 *
 * 40+ providers across free, cheap, mid-tier, premium, and enterprise tiers.
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
exports.DEFAULT_PROVIDERS = void 0;
exports.loadConfig = loadConfig;
exports.getAvailableProviders = getAvailableProviders;
exports.registerProvider = registerProvider;
exports.deregisterProvider = deregisterProvider;
exports.updateProvider = updateProvider;
exports.healthCheck = healthCheck;
exports.checkAllProviders = checkAllProviders;
exports.findCheapestAvailableProvider = findCheapestAvailableProvider;
exports.findFastestAvailableProvider = findFastestAvailableProvider;
exports.saveConfig = saveConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ============================================================
// DEFAULT PROVIDER DEFINITIONS
// ============================================================
exports.DEFAULT_PROVIDERS = {
    // ========================================================================
    // TIER: FREE / LOCAL
    // ========================================================================
    ollama: {
        id: 'ollama',
        name: 'Ollama',
        baseUrl: 'http://127.0.0.1:11434/v1/chat/completions',
        apiKeyEnv: '',
        models: ['llama3', 'mistral', 'qwen2', 'codellama', 'phi3', 'gemma2'],
        costPerK: { input: 0, output: 0 },
        tier: 'free',
        format: 'openai',
        type: 'local',
        priority: 1,
        maxTokens: 8192,
    },
    lmstudio: {
        id: 'lmstudio',
        name: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234/v1/chat/completions',
        apiKeyEnv: '',
        models: [],
        costPerK: { input: 0, output: 0 },
        tier: 'free',
        format: 'openai',
        type: 'local',
        priority: 2,
        maxTokens: 8192,
    },
    vllm: {
        id: 'vllm',
        name: 'vLLM',
        baseUrl: 'http://127.0.0.1:8000/v1/chat/completions',
        apiKeyEnv: '',
        models: [],
        costPerK: { input: 0, output: 0 },
        tier: 'free',
        format: 'openai',
        type: 'local',
        priority: 3,
        maxTokens: 8192,
    },
    google: {
        id: 'google',
        name: 'Google AI',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
        apiKeyEnv: 'GOOGLE_API_KEY',
        models: [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemma-3-27b-it',
        ],
        costPerK: { input: 0, output: 0 }, // Free tier available
        tier: 'free',
        format: 'google',
        type: 'api',
        priority: 4,
        maxTokens: 8192,
    },
    // ========================================================================
    // TIER: CHEAP / FAST (inference-optimized)
    // ========================================================================
    groq: {
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        apiKeyEnv: 'GROQ_API_KEY',
        models: [
            'llama-3.3-70b-versatile',
            'llama-3.1-8b-instant',
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'qwen/qwen3-32b',
            'meta-llama/llama-4-scout-17b-16e-instruct',
        ],
        costPerK: { input: 0.59, output: 0.79 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 5,
        maxTokens: 8192,
    },
    cerebras: {
        id: 'cerebras',
        name: 'Cerebras',
        baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
        apiKeyEnv: 'CEREBRAS_API_KEY',
        models: [
            'llama3.1-8b',
            'llama-3.3-70b',
            'qwen-3-235b-a22b-instruct-2507',
            'gpt-oss-120b',
            'zai-glm-4.7',
        ],
        costPerK: { input: 0.6, output: 0.6 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 6,
        maxTokens: 8192,
    },
    deepinfra: {
        id: 'deepinfra',
        name: 'DeepInfra',
        baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
        apiKeyEnv: 'DEEPINFRA_API_KEY',
        models: [
            'meta-llama/Meta-Llama-3.1-8B-Instruct',
            'meta-llama/Meta-Llama-3.1-70B-Instruct',
            'mistralai/Mixtral-8x7B-Instruct-v0.1',
            'Qwen/Qwen2.5-72B-Instruct',
            'google/gemma-2-27b-it',
        ],
        costPerK: { input: 0.05, output: 0.05 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 7,
        maxTokens: 8192,
    },
    together: {
        id: 'together',
        name: 'Together AI',
        baseUrl: 'https://api.together.xyz/v1/chat/completions',
        apiKeyEnv: 'TOGETHER_API_KEY',
        models: [
            'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            'mistralai/Mixtral-8x7B-Instruct-v0.1',
            'Qwen/Qwen2.5-72B-Instruct-Turbo',
            'google/gemma-2-27b-it',
        ],
        costPerK: { input: 0.18, output: 0.18 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 8,
        maxTokens: 8192,
    },
    fireworks: {
        id: 'fireworks',
        name: 'Fireworks AI',
        baseUrl: 'https://api.fireworks.ai/inference/v1/chat/completions',
        apiKeyEnv: 'FIREWORKS_API_KEY',
        models: [
            'accounts/fireworks/models/llama-v3p1-8b-instruct',
            'accounts/fireworks/models/llama-v3p1-70b-instruct',
            'accounts/fireworks/models/mixtral-8x7b-instruct',
            'accounts/fireworks/models/qwen2p5-72b-instruct',
        ],
        costPerK: { input: 0.2, output: 0.2 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 9,
        maxTokens: 8192,
    },
    novita: {
        id: 'novita',
        name: 'Novita AI',
        baseUrl: 'https://api.novita.ai/v3/openai/chat/completions',
        apiKeyEnv: 'NOVITA_API_KEY',
        models: [
            'meta-llama/llama-3.1-8b-instruct',
            'meta-llama/llama-3.1-70b-instruct',
            'Qwen/Qwen2.5-72B-Instruct',
        ],
        costPerK: { input: 0.06, output: 0.06 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 10,
        maxTokens: 8192,
    },
    sambanova: {
        id: 'sambanova',
        name: 'SambaNova',
        baseUrl: 'https://api.sambanova.ai/v1/chat/completions',
        apiKeyEnv: 'SAMBANOVA_API_KEY',
        models: [
            'Meta-Llama-3.1-8B-Instruct',
            'Meta-Llama-3.1-70B-Instruct',
        ],
        costPerK: { input: 0.1, output: 0.1 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 11,
        maxTokens: 8192,
    },
    anyscale: {
        id: 'anyscale',
        name: 'Anyscale',
        baseUrl: 'https://api.endpoints.anyscale.com/v1/chat/completions',
        apiKeyEnv: 'ANYSCALE_API_KEY',
        models: [
            'meta-llama/Meta-Llama-3.1-8B-Instruct',
            'meta-llama/Meta-Llama-3.1-70B-Instruct',
            'mistralai/Mixtral-8x7B-Instruct-v0.1',
        ],
        costPerK: { input: 0.15, output: 0.15 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 12,
        maxTokens: 8192,
    },
    replicate: {
        id: 'replicate',
        name: 'Replicate',
        baseUrl: 'https://api.replicate.com/v1/chat/completions',
        apiKeyEnv: 'REPLICATE_API_KEY',
        models: [
            'meta/llama-2-70b-chat',
            'mistralai/mixtral-8x7b-instruct-v0.1',
        ],
        costPerK: { input: 0.2, output: 0.2 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 13,
        maxTokens: 8192,
    },
    // ========================================================================
    // TIER: MID (good quality/price ratio)
    // ========================================================================
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        apiKeyEnv: 'DEEPSEEK_API_KEY',
        models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
        costPerK: { input: 0.14, output: 0.28 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 14,
        maxTokens: 8192,
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral',
        baseUrl: 'https://api.mistral.ai/v1/chat/completions',
        apiKeyEnv: 'MISTRAL_API_KEY',
        models: [
            'mistral-small-latest',
            'mistral-medium-latest',
            'mistral-large-latest',
            'mistral-small-2506',
            'devstral-small-2507',
            'ministral-3b-latest',
            'ministral-8b-latest',
            'codestral-latest',
            'open-mistral-nemo',
        ],
        costPerK: { input: 0.2, output: 0.6 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 15,
        maxTokens: 8192,
    },
    perplexity: {
        id: 'perplexity',
        name: 'Perplexity',
        baseUrl: 'https://api.perplexity.ai/chat/completions',
        apiKeyEnv: 'PERPLEXITY_API_KEY',
        models: [
            'llama-3.1-sonar-small-128k-online',
            'llama-3.1-sonar-large-128k-online',
            'sonar-pro',
        ],
        costPerK: { input: 1.0, output: 1.0 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 16,
        maxTokens: 8192,
    },
    cohere: {
        id: 'cohere',
        name: 'Cohere',
        baseUrl: 'https://api.cohere.ai/v1/chat/completions',
        apiKeyEnv: 'COHERE_API_KEY',
        models: ['command-r-plus', 'command-r', 'command-a-03-2025'],
        costPerK: { input: 2.5, output: 10 },
        tier: 'mid',
        format: 'cohere',
        type: 'api',
        priority: 17,
        maxTokens: 8192,
    },
    ai21: {
        id: 'ai21',
        name: 'AI21 Labs',
        baseUrl: 'https://api.ai21.com/studio/v1/chat/completions',
        apiKeyEnv: 'AI21_API_KEY',
        models: ['jamba-1.5-mini', 'jamba-1.5-large'],
        costPerK: { input: 0.2, output: 0.4 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 18,
        maxTokens: 8192,
    },
    // ========================================================================
    // TIER: PREMIUM (high-quality frontier models)
    // ========================================================================
    openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        apiKeyEnv: 'OPENAI_API_KEY',
        models: [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo',
            'o1-preview',
            'o1-mini',
        ],
        costPerK: { input: 2.5, output: 10 },
        tier: 'premium',
        format: 'openai',
        type: 'api',
        priority: 19,
        maxTokens: 8192,
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1/messages',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        models: [
            'claude-sonnet-4-20250514',
            'claude-3.5-sonnet',
            'claude-3-opus',
            'claude-3-haiku',
        ],
        costPerK: { input: 3, output: 15 },
        tier: 'premium',
        format: 'anthropic',
        type: 'api',
        priority: 20,
        maxTokens: 8192,
    },
    xai: {
        id: 'xai',
        name: 'xAI',
        baseUrl: 'https://api.x.ai/v1/chat/completions',
        apiKeyEnv: 'XAI_API_KEY',
        models: ['grok-3', 'grok-3-mini', 'grok-2', 'grok-2-mini'],
        costPerK: { input: 3.0, output: 15.0 },
        tier: 'premium',
        format: 'openai',
        type: 'api',
        priority: 21,
        maxTokens: 8192,
    },
    // ========================================================================
    // TIER: ENTERPRISE (cloud-managed models)
    // ========================================================================
    azure_openai: {
        id: 'azure_openai',
        name: 'Azure OpenAI',
        baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions',
        apiKeyEnv: 'AZURE_OPENAI_API_KEY',
        models: ['gpt-4', 'gpt-35-turbo', 'gpt-4o'],
        costPerK: { input: 3.0, output: 12.0 },
        tier: 'enterprise',
        format: 'openai',
        type: 'api',
        priority: 22,
        maxTokens: 8192,
    },
    bedrock: {
        id: 'bedrock',
        name: 'AWS Bedrock',
        baseUrl: '',
        apiKeyEnv: 'AWS_ACCESS_KEY_ID',
        models: [
            'anthropic.claude-3-sonnet',
            'anthropic.claude-3-haiku',
            'meta.llama3-1-8b',
            'meta.llama3-1-70b',
            'mistral.mixtral-8x7b',
        ],
        costPerK: { input: 3.0, output: 15.0 },
        tier: 'enterprise',
        format: 'aws-bedrock',
        type: 'api',
        priority: 23,
        maxTokens: 8192,
    },
    vertex: {
        id: 'vertex',
        name: 'Google Vertex AI',
        baseUrl: '',
        apiKeyEnv: 'GOOGLE_APPLICATION_CREDENTIALS',
        models: [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'claude-3-sonnet',
            'claude-3-haiku',
        ],
        costPerK: { input: 1.25, output: 5.0 },
        tier: 'enterprise',
        format: 'google-vertex',
        type: 'api',
        priority: 24,
        maxTokens: 8192,
    },
    // ========================================================================
    // ASIAN PROVIDERS
    // ========================================================================
    zhipu: {
        id: 'zhipu',
        name: 'Zhipu AI (GLM)',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKeyEnv: 'ZHIPU_API_KEY',
        models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4-long'],
        costPerK: { input: 0.1, output: 0.1 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 25,
        maxTokens: 8192,
    },
    moonshot: {
        id: 'moonshot',
        name: 'Moonshot (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        apiKeyEnv: 'MOONSHOT_API_KEY',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
        costPerK: { input: 0.14, output: 0.14 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 26,
        maxTokens: 8192,
    },
    qwen: {
        id: 'qwen',
        name: 'Alibaba Qwen (DashScope)',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        apiKeyEnv: 'DASHSCOPE_API_KEY',
        models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
        costPerK: { input: 0.4, output: 1.2 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 27,
        maxTokens: 8192,
    },
    yi: {
        id: 'yi',
        name: 'Yi (01.AI)',
        baseUrl: 'https://api.lingyiwanwu.com/v1/chat/completions',
        apiKeyEnv: 'YI_API_KEY',
        models: ['yi-lightning', 'yi-large', 'yi-medium', 'yi-spark'],
        costPerK: { input: 0.2, output: 0.2 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 28,
        maxTokens: 8192,
    },
    baichuan: {
        id: 'baichuan',
        name: 'Baichuan',
        baseUrl: 'https://api.baichuan-ai.com/v1/chat/completions',
        apiKeyEnv: 'BAICHUAN_API_KEY',
        models: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan3-Turbo-128k'],
        costPerK: { input: 0.2, output: 0.2 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 29,
        maxTokens: 8192,
    },
    minimax: {
        id: 'minimax',
        name: 'MiniMax',
        baseUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
        apiKeyEnv: 'MINIMAX_API_KEY',
        models: ['MiniMax-Text-01', 'abab6.5s-chat'],
        costPerK: { input: 0.1, output: 0.1 },
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 30,
        maxTokens: 8192,
    },
    stepfun: {
        id: 'stepfun',
        name: 'StepFun',
        baseUrl: 'https://api.stepfun.com/v1/chat/completions',
        apiKeyEnv: 'STEPFUN_API_KEY',
        models: ['step-1-8k', 'step-1-32k', 'step-2-16k'],
        costPerK: { input: 0.2, output: 0.2 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 31,
        maxTokens: 8192,
    },
    // ========================================================================
    // EUROPEAN PROVIDERS
    // ========================================================================
    alephalpha: {
        id: 'alephalpha',
        name: 'Aleph Alpha',
        baseUrl: 'https://api.aleph-alpha.com/v1/chat/completions',
        apiKeyEnv: 'ALEPH_ALPHA_API_KEY',
        models: ['luminous-base', 'luminous-extended', 'luminous-supreme'],
        costPerK: { input: 2.0, output: 2.0 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 32,
        maxTokens: 8192,
    },
    deepset: {
        id: 'deepset',
        name: 'Deepset',
        baseUrl: 'https://api.deepset.ai/v1/chat/completions',
        apiKeyEnv: 'DEEPSET_API_KEY',
        models: ['gpt-4', 'claude-3-sonnet'],
        costPerK: { input: 3.0, output: 12.0 },
        tier: 'mid',
        format: 'openai',
        type: 'api',
        priority: 33,
        maxTokens: 8192,
    },
    // ========================================================================
    // OPEN ROUTER / AGGREGATORS
    // ========================================================================
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        apiKeyEnv: 'OPENROUTER_API_KEY',
        models: [
            'openai/gpt-4o',
            'anthropic/claude-3.5-sonnet',
            'google/gemini-pro-1.5',
            'meta-llama/llama-3.1-70b-instruct',
            'mistralai/mistral-large',
        ],
        costPerK: { input: 0, output: 0 }, // Passthrough pricing
        tier: 'cheap',
        format: 'openai',
        type: 'api',
        priority: 34,
        maxTokens: 8192,
    },
    // ========================================================================
    // CLI PROVIDERS (local tools)
    // ========================================================================
    opencode: {
        id: 'opencode',
        name: 'OpenCode',
        baseUrl: '',
        apiKeyEnv: '',
        cliCommand: 'opencode',
        models: [],
        costPerK: { input: 0, output: 0 },
        tier: 'free',
        format: 'openai',
        type: 'cli',
        priority: 35,
        maxTokens: 8192,
    },
    commandcode: {
        id: 'commandcode',
        name: 'CommandCode',
        baseUrl: 'https://api.commandcode.ai/v1/chat/completions',
        apiKeyEnv: 'COMMANDCODE_API_KEY',
        models: ['taste-1'],
        costPerK: { input: 0, output: 0 },
        tier: 'free',
        format: 'openai',
        type: 'cli',
        cliCommand: 'commandcode',
        priority: 36,
        maxTokens: 8192,
    },
    // ========================================================================
    // NVIDIA NIM (free tier via NVIDIA API key)
    // ========================================================================
    nvidia: {
        id: 'nvidia',
        name: 'NVIDIA NIM',
        baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
        apiKeyEnv: 'NVIDIA_API_KEY',
        models: [
            'meta/llama-3.1-8b-instruct',
            'meta/llama-3.3-70b-instruct',
            'meta/llama-4-maverick-17b-128e-instruct',
            'nvidia/nemotron-mini-4b-instruct',
            'nvidia/nemotron-3-super-120b-a12b',
            'google/gemma-4-31b-it',
            'qwen/qwen3.5-397b-a17b',
            'minimaxai/minimax-m2.7',
            'mistralai/mistral-large-3-675b-instruct-2512',
            'z-ai/glm-5.1',
        ],
        costPerK: { input: 0, output: 0 },
        tier: 'free',
        format: 'openai',
        type: 'api',
        priority: 4,
        maxTokens: 8192,
    },
};
// ============================================================
// RUNTIME STATE
// ============================================================
let _registeredProviders = { ...exports.DEFAULT_PROVIDERS };
let _configLoaded = false;
// ============================================================
// CONFIGURATION LOADING
// ============================================================
function loadConfig(configPath) {
    const paths = [];
    if (configPath && fs.existsSync(configPath)) {
        paths.push(configPath);
    }
    const userConfig = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.config', 'a3m-router', 'providers.json');
    if (fs.existsSync(userConfig)) {
        paths.push(userConfig);
    }
    const projectConfig = path.join(process.cwd(), 'a3m-providers.json');
    if (fs.existsSync(projectConfig)) {
        paths.push(projectConfig);
    }
    for (const p of paths) {
        try {
            const raw = fs.readFileSync(p, 'utf-8');
            const config = JSON.parse(raw);
            if (config.providers) {
                for (const [id, provider] of Object.entries(config.providers)) {
                    const prov = provider;
                    if (_registeredProviders[id]) {
                        _registeredProviders[id] = { ..._registeredProviders[id], ...prov };
                    }
                    else {
                        _registeredProviders[id] = {
                            id,
                            type: 'api',
                            priority: 50,
                            maxTokens: 8192,
                            costPerK: { input: 0, output: 0 },
                            tier: 'mid',
                            format: 'openai',
                            models: [],
                            name: id,
                            baseUrl: '',
                            apiKeyEnv: '',
                            ...prov,
                        };
                    }
                }
            }
            _configLoaded = true;
            break;
        }
        catch {
            // Skip invalid config files
        }
    }
    // Load API keys from environment
    for (const provider of Object.values(_registeredProviders)) {
        if (provider.apiKeyEnv) {
            provider.apiKey = process.env[provider.apiKeyEnv] || null;
        }
    }
    return _registeredProviders;
}
function getAvailableProviders() {
    if (!_configLoaded) {
        loadConfig();
    }
    const available = {};
    for (const [id, provider] of Object.entries(_registeredProviders)) {
        if (provider.type === 'api') {
            if (provider.apiKey) {
                available[id] = provider;
            }
        }
        else {
            available[id] = provider;
        }
    }
    return Object.entries(available)
        .sort(([, a], [, b]) => a.priority - b.priority)
        .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
}
// ============================================================
// RUNTIME REGISTRATION
// ============================================================
function registerProvider(id, config) {
    _registeredProviders[id] = {
        id,
        name: config.name || id,
        baseUrl: config.baseUrl || '',
        apiKeyEnv: config.apiKeyEnv || '',
        type: 'api',
        priority: 50,
        maxTokens: 8192,
        costPerK: { input: 0, output: 0 },
        tier: 'mid',
        format: 'openai',
        models: [],
        ...config,
    };
    return _registeredProviders[id];
}
function deregisterProvider(id) {
    delete _registeredProviders[id];
}
function updateProvider(id, updates) {
    if (_registeredProviders[id]) {
        _registeredProviders[id] = { ..._registeredProviders[id], ...updates };
        return _registeredProviders[id];
    }
    return null;
}
// ============================================================
// HEALTH CHECK
// ============================================================
async function healthCheck(providerId) {
    const provider = _registeredProviders[providerId];
    if (!provider) {
        return { healthy: false, error: 'Provider not found: ' + providerId };
    }
    if (provider.type === 'cli') {
        const { execSync } = require('child_process');
        try {
            execSync(`which ${provider.cliCommand || provider.id}`, { stdio: 'pipe' });
            return { healthy: true, latency: 0, type: 'cli' };
        }
        catch {
            return { healthy: false, error: 'Command not found: ' + (provider.cliCommand || provider.id) };
        }
    }
    if (provider.type === 'api') {
        if (!provider.apiKey) {
            return { healthy: false, error: 'No API key for ' + provider.name };
        }
        const startTime = Date.now();
        try {
            const model = provider.models[0];
            const resp = await fetch(provider.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + provider.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5,
                }),
            });
            const latency = Date.now() - startTime;
            const data = await resp.json();
            if (data.error) {
                return { healthy: false, error: data.error.message, latency };
            }
            return { healthy: true, latency, model: data.model || model };
        }
        catch (e) {
            return { healthy: false, error: e.message, latency: Date.now() - startTime };
        }
    }
    return { healthy: false, error: 'Unknown provider type: ' + provider.type };
}
async function checkAllProviders() {
    const results = {};
    const available = getAvailableProviders();
    for (const id of Object.keys(available)) {
        results[id] = await healthCheck(id);
    }
    return results;
}
function findCheapestAvailableProvider(model) {
    const available = getAvailableProviders();
    const sorted = Object.values(available).sort((a, b) => (a.costPerK.input + a.costPerK.output) - (b.costPerK.input + b.costPerK.output));
    if (model) {
        return sorted.find(p => p.models.includes(model)) || null;
    }
    return sorted[0] || null;
}
function findFastestAvailableProvider() {
    const available = getAvailableProviders();
    const cheapTier = Object.values(available).filter(p => p.tier === 'cheap');
    return cheapTier[0] || Object.values(available)[0] || null;
}
// ============================================================
// SAVE CONFIG
// ============================================================
function saveConfig(configPath) {
    const target = configPath || path.join(process.env.HOME || '.', '.config', 'a3m-router', 'providers.json');
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const safeConfig = {};
    for (const [id, provider] of Object.entries(_registeredProviders)) {
        safeConfig[id] = { ...provider };
        delete safeConfig[id].apiKey;
    }
    fs.writeFileSync(target, JSON.stringify({ providers: safeConfig }, null, 2));
    return target;
}
//# sourceMappingURL=providerConfig.js.map
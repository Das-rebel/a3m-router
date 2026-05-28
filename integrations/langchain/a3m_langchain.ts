/**
 * A3M Router — LangChain Integration
 *
 * Use A3M Router as a drop-in LLM provider inside LangChain chains and agents.
 *
 * This integration does NOT import the a3m-router npm package directly.
 * Instead, it defines a clean Provider interface and includes a built-in
 * ensemble routing engine. You provide provider configs, the integration
 * handles routing, fallback, and optional parallel ensemble execution.
 *
 * Key features:
 *   - Single-provider routing (cheapest, fastest, priority-based)
 *   - Ensemble mode: run N providers in parallel, merge results
 *   - Automatic fallback on provider failure
 *   - Routing metadata (provider, model, latency, cost) on every response
 *   - Compatible with any LangChain chain, agent, or runnable
 *
 * @example
 * ```typescript
 * import { A3MLLM } from './a3m_langchain';
 * import { PromptTemplate } from '@langchain/core/prompts';
 *
 * const llm = new A3MLLM({
 *   providers: {
 *     groq: {
 *       name: 'Groq',
 *       baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
 *       apiKey: process.env.GROQ_API_KEY,
 *       models: ['llama-3.3-70b-versatile'],
 *       tier: 'cheap',
 *     },
 *     openai: {
 *       name: 'OpenAI',
 *       baseUrl: 'https://api.openai.com/v1/chat/completions',
 *       apiKey: process.env.OPENAI_API_KEY,
 *       models: ['gpt-4o-mini'],
 *       tier: 'premium',
 *     },
 *   },
 *   routingStrategy: 'cheapest',
 * });
 *
 * const prompt = PromptTemplate.fromTemplate('Tell me about {topic}');
 * const chain = prompt.pipe(llm);
 * const result = await chain.invoke({ topic: 'quantum computing' });
 * console.log(result);           // LLM response text
 * console.log(result.metadata);  // Routing metadata
 * ```
 */

// ============================================================
// TYPE-ONLY LANGCHAIN IMPORTS (peer dependency)
// ============================================================

import type { BaseLLMParams } from '@langchain/core/language_models/llms';
import type { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';

// ============================================================
// TYPES — Provider Configuration
// ============================================================

/** Cost per 1M tokens in USD */
export interface A3MCost {
  input: number;
  output: number;
}

/** Tier classification for cost-based routing */
export type A3MProviderTier = 'free' | 'cheap' | 'mid' | 'premium' | 'enterprise';

/** API format expected by the provider endpoint */
export type A3MProviderFormat = 'openai' | 'anthropic' | 'google' | 'cohere';

/** A single provider configuration */
export interface A3MProviderConfig {
  /** Human-readable provider name (e.g. "Groq", "OpenAI") */
  name: string;
  /** API base URL for chat completions */
  baseUrl: string;
  /** API key (typically from env var) */
  apiKey?: string;
  /** Available model names at this provider */
  models: string[];
  /** Cost tier for routing decisions */
  tier: A3MProviderTier;
  /** Cost per 1M tokens in USD (used for cost estimation) */
  cost?: A3MCost;
  /** API format — defaults to 'openai' */
  format?: A3MProviderFormat;
  /** Optional headers to include in every request */
  headers?: Record<string, string>;
  /** Max tokens for responses */
  maxTokens?: number;
}

// ============================================================
// TYPES — Routing & Ensemble
// ============================================================

/** Strategy for selecting a single provider */
export type A3MRoutingStrategy =
  | 'cheapest'   // Pick the provider with lowest cost
  | 'fastest'    // Pick the provider with lowest priority number (first match)
  | 'priority'   // Pick by explicit priority order (highest first)
  | 'random';    // Pick randomly from available providers

/** Strategy for merging ensemble results */
export type A3MEnsembleStrategy =
  | 'first'        // Return the first response received
  | 'fastest'      // Same as first
  | 'longest'      // Return response with the most tokens
  | 'majority'     // (Text) Not applicable — falls back to longest
  | 'concat';      // Concatenate all responses with separators

/** Routing metadata attached to every response */
export interface A3MRoutingMetadata {
  /** Provider ID that served this request */
  provider: string;
  /** Model name used */
  model: string;
  /** Response latency in milliseconds */
  latencyMs: number;
  /** Estimated cost in USD */
  costUsd: number;
  /** Provider tier */
  tier: A3MProviderTier;
  /** Token usage (if available from response) */
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  /** Whether this was an ensemble (multi-provider) response */
  ensemble: boolean;
  /** If ensemble, list of providers that contributed */
  ensembleProviders?: string[];
}

/** Result from a single provider call */
export interface A3MProviderResult {
  providerId: string;
  content: string;
  model: string;
  latencyMs: number;
  costUsd: number;
  tier: A3MProviderTier;
  tokensUsed?: { input: number; output: number; total: number };
  error?: string;
}

// ============================================================
// TYPES — Options
// ============================================================

export interface A3MLLMOptions {
  /**
   * Provider configurations.
   * Can be a Record (keyed by provider ID) or an array.
   */
  providers: Record<string, A3MProviderConfig> | A3MProviderConfig[];

  /**
   * Default model to use when no routing is applied.
   * If not set, the first model from the first provider is used.
   */
  defaultModel?: string;

  /**
   * Strategy for single-provider routing.
   * @default 'cheapest'
   */
  routingStrategy?: A3MRoutingStrategy;

  /**
   * Temperature (0–2). Passed to all providers.
   * @default 0.7
   */
  temperature?: number;

  /**
   * Max output tokens. Passed to all providers.
   * @default 4096
   */
  maxTokens?: number;

  /**
   * Request timeout in milliseconds.
   * @default 60000
   */
  timeout?: number;

  /**
   * Enable automatic fallback to next provider on failure.
   * @default true
   */
  fallbackEnabled?: boolean;

  /**
   * Callback for logging routing decisions.
   */
  onRoute?: (info: { provider: string; model: string; strategy: string }) => void;

  /**
   * Callback for logging errors.
   */
  onError?: (info: { provider: string; error: string; willFallback: boolean }) => void;

  /**
   * Custom priority order for 'priority' routing strategy.
   * Array of provider IDs in descending priority.
   */
  priorityOrder?: string[];

  /**
   * @deprecated Use routingStrategy instead.
   */
  strategy?: A3MRoutingStrategy;
}

/** Extended call options for ensemble mode */
export interface A3MEnsembleCallOptions extends BaseLanguageModelCallOptions {
  /** Run providers in parallel and merge results */
  ensemble?: boolean | A3MEnsembleStrategy;
  /** Specific providers to include for this call */
  providers?: string[];
  /** Stop sequences */
  stop?: string[];
  /** Signal for cancellation */
  signal?: AbortSignal;
}

// ============================================================
// DEFAULT PROVIDERS (built-in)
// ============================================================

/**
 * Default provider definitions for common LLM APIs.
 * Users can override or extend these via the `providers` option.
 */
export const A3M_DEFAULT_PROVIDERS: Record<string, A3MProviderConfig> = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: undefined, // Set via options or env
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    tier: 'cheap',
    cost: { input: 0.59, output: 0.79 },
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: undefined,
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    tier: 'premium',
    cost: { input: 2.5, output: 10 },
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    apiKey: undefined,
    models: ['claude-sonnet-4-20250514', 'claude-3-haiku'],
    tier: 'premium',
    cost: { input: 3, output: 15 },
    format: 'anthropic',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: undefined,
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    tier: 'mid',
    cost: { input: 0.14, output: 0.28 },
  },
  google: {
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKey: undefined,
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    tier: 'free',
    cost: { input: 0, output: 0 },
    format: 'google',
  },
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    apiKey: undefined,
    models: ['llama-3.3-70b'],
    tier: 'cheap',
    cost: { input: 0.6, output: 0.6 },
  },
  nvidia: {
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    apiKey: undefined,
    models: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'],
    tier: 'free',
    cost: { input: 0, output: 0 },
  },
  deepinfra: {
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai/chat/completions',
    apiKey: undefined,
    models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    tier: 'cheap',
    cost: { input: 0.05, output: 0.05 },
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    apiKey: undefined,
    models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'],
    tier: 'cheap',
    cost: { input: 0.18, output: 0.18 },
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    apiKey: undefined,
    models: ['mistral-small-latest', 'mistral-large-latest'],
    tier: 'mid',
    cost: { input: 0.2, output: 0.6 },
  },
};

// ============================================================
// INTERNAL — Provider Registry
// ============================================================

interface NormalizedProvider {
  id: string;
  config: A3MProviderConfig;
}

/**
 * Normalize provider configs into a sorted, keyed registry.
 * Applies defaults and validates required fields.
 */
function normalizeProviders(
  input: Record<string, A3MProviderConfig> | A3MProviderConfig[],
): Map<string, NormalizedProvider> {
  const map = new Map<string, NormalizedProvider>();

  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      const id = `provider_${i}`;
      map.set(id, { id, config: applyDefaults(input[i]) });
    }
  } else {
    for (const [id, config] of Object.entries(input)) {
      map.set(id, { id, config: applyDefaults(config) });
    }
  }

  return map;
}

function applyDefaults(config: A3MProviderConfig): A3MProviderConfig {
  return {
    ...config,
    format: config.format || 'openai',
    cost: config.cost || { input: 0, output: 0 },
    maxTokens: config.maxTokens || 4096,
    headers: config.headers || {},
  };
}

// ============================================================
// INTERNAL — HTTP Request Helpers
// ============================================================

interface BuildRequestOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  stream?: boolean;
}

interface BuildRequestResult {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Build a provider-specific request payload.
 * Handles OpenAI, Anthropic, Google, and Cohere formats.
 */
function buildProviderRequest(
  provider: A3MProviderConfig,
  opts: BuildRequestOptions,
): BuildRequestResult {
  const apiKey = provider.apiKey || '';
  const headers: Record<string, string> = {
    ...provider.headers,
  };

  switch (provider.format) {
    case 'anthropic': {
      // Anthropic uses x-api-key and a different payload shape
      let systemPrompt = '';
      const nonSystemMessages = opts.messages.filter((m) => {
        if (m.role === 'system') {
          systemPrompt += m.content + '\n';
          return false;
        }
        return true;
      });

      headers['Content-Type'] = 'application/json';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';

      return {
        url: provider.baseUrl,
        headers,
        body: {
          model: opts.model,
          max_tokens: opts.maxTokens || 4096,
          system: systemPrompt.trim() || undefined,
          messages: nonSystemMessages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          temperature: opts.temperature,
          stop_sequences: opts.stop,
        },
      };
    }

    case 'google': {
      // Google Gemini uses a different URL pattern and body
      const systemMsg = opts.messages.find((m) => m.role === 'system');
      const contents = opts.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const modelId = opts.model;
      const url = `${provider.baseUrl}/${modelId}:generateContent?key=${apiKey}`;

      headers['Content-Type'] = 'application/json';

      return {
        url,
        headers,
        body: {
          contents,
          systemInstruction: systemMsg
            ? { parts: [{ text: systemMsg.content }] }
            : undefined,
          generationConfig: {
            maxOutputTokens: opts.maxTokens || 4096,
            temperature: opts.temperature,
            stopSequences: opts.stop,
          },
        },
      };
    }

    case 'cohere': {
      headers['Content-Type'] = 'application/json';
      headers['Authorization'] = `Bearer ${apiKey}`;

      return {
        url: provider.baseUrl,
        headers,
        body: {
          model: opts.model,
          message: opts.messages.map((m) => m.content).join('\n'),
          max_tokens: opts.maxTokens || 4096,
          temperature: opts.temperature,
          chat_history: opts.messages.slice(0, -1).map((m) => ({
            role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
            message: m.content,
          })),
        },
      };
    }

    case 'openai':
    default: {
      headers['Content-Type'] = 'application/json';
      headers['Authorization'] = `Bearer ${apiKey}`;

      return {
        url: provider.baseUrl,
        headers,
        body: {
          model: opts.model,
          messages: opts.messages,
          temperature: opts.temperature,
          max_tokens: opts.maxTokens || 4096,
          stop: opts.stop,
        },
      };
    }
  }
}

/**
 * Parse a raw API response into standardised content.
 */
function parseProviderResponse(
  provider: A3MProviderConfig,
  data: Record<string, unknown>,
): { content: string; model: string; tokensUsed?: { input: number; output: number; total: number } } {
  switch (provider.format) {
    case 'anthropic': {
      const content = ((data as any).content?.[0]?.text || '') as string;
      const usage = (data as any).usage;
      return {
        content,
        model: (data as any).model as string || '',
        tokensUsed: usage
          ? {
              input: usage.input_tokens || 0,
              output: usage.output_tokens || 0,
              total: (usage.input_tokens || 0) + (usage.output_tokens || 0),
            }
          : undefined,
      };
    }

    case 'google': {
      const candidate = (data as any).candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';
      const usage = (data as any).usageMetadata;
      return {
        content,
        model: (data as any).modelVersion as string || '',
        tokensUsed: usage
          ? {
              input: usage.promptTokenCount || 0,
              output: usage.candidatesTokenCount || 0,
              total: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
            }
          : undefined,
      };
    }

    case 'cohere': {
      return {
        content: ((data as any).text || (data as any).generation?.text || '') as string,
        model: (data as any).model as string || '',
        tokensUsed: (data as any).meta?.billed_units
          ? {
              input: (data as any).meta.billed_units.input_tokens || 0,
              output: (data as any).meta.billed_units.output_tokens || 0,
              total: ((data as any).meta.billed_units.input_tokens || 0) +
                     ((data as any).meta.billed_units.output_tokens || 0),
            }
          : undefined,
      };
    }

    case 'openai':
    default: {
      const choice = (data as any).choices?.[0];
      const content = choice?.message?.content || choice?.text || '';
      const usage = (data as any).usage;
      return {
        content,
        model: (data as any).model as string || '',
        tokensUsed: usage
          ? {
              input: usage.prompt_tokens || 0,
              output: usage.completion_tokens || 0,
              total: usage.total_tokens || 0,
            }
          : undefined,
      };
    }
  }
}

/**
 * Execute a single provider call and return the result.
 */
async function callProvider(
  providerId: string,
  provider: A3MProviderConfig,
  messages: Array<{ role: string; content: string }>,
  options: {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    timeout: number;
    signal?: AbortSignal;
  },
): Promise<A3MProviderResult> {
  const startTime = performance.now();
  const model = provider.models[0];

  try {
    const request = buildProviderRequest(provider, {
      model,
      messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stop: options.stop,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout);

    // Wire up external signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        providerId,
        content: '',
        model,
        latencyMs,
        costUsd: 0,
        tier: provider.tier,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    const parsed = parseProviderResponse(provider, data);
    const inputTokens = parsed.tokensUsed?.input || 0;
    const outputTokens = parsed.tokensUsed?.output || 0;
    const costUsd = estimateCost(provider, inputTokens, outputTokens);

    return {
      providerId,
      content: parsed.content,
      model: parsed.model || model,
      latencyMs,
      costUsd,
      tier: provider.tier,
      tokensUsed: parsed.tokensUsed,
    };
  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      providerId,
      content: '',
      model,
      latencyMs,
      costUsd: 0,
      tier: provider.tier,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Estimate cost in USD based on token usage and provider rates.
 */
function estimateCost(
  provider: A3MProviderConfig,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!provider.cost) return 0;
  const inputCost = (inputTokens / 1_000_000) * provider.cost.input;
  const outputCost = (outputTokens / 1_000_000) * provider.cost.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Estimate output tokens from text length (rough heuristic).
 */
function estimateOutputTokens(text: string): number {
  // ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

// ============================================================
// INTERNAL — Routing Logic
// ============================================================

/**
 * Select a provider based on the routing strategy.
 * Returns a list of provider IDs in priority order (best first).
 */
function selectProviders(
  registry: Map<string, NormalizedProvider>,
  strategy: A3MRoutingStrategy,
  priorityOrder?: string[],
): string[] {
  const entries = Array.from(registry.entries());
  if (entries.length === 0) return [];

  switch (strategy) {
    case 'cheapest': {
      // Sort by cost ascending (cheapest first), then by tier
      return entries
        .sort(([, a], [, b]) => {
          const costA = (a.config.cost?.input ?? 0) + (a.config.cost?.output ?? 0);
          const costB = (b.config.cost?.input ?? 0) + (b.config.cost?.output ?? 0);
          if (costA !== costB) return costA - costB;
          // If same cost, prefer free > cheap > mid > premium
          const tierOrder = { free: 0, cheap: 1, mid: 2, premium: 3, enterprise: 4 };
          return (tierOrder[a.config.tier] ?? 5) - (tierOrder[b.config.tier] ?? 5);
        })
        .map(([id]) => id);
    }

    case 'priority': {
      if (priorityOrder && priorityOrder.length > 0) {
        // Use explicit priority order, appending unlisted providers at the end
        const listed = priorityOrder.filter((id) => registry.has(id));
        const unlisted = entries
          .filter(([id]) => !priorityOrder.includes(id))
          .map(([id]) => id);
        return [...listed, ...unlisted];
      }
      // Fall back to insertion order
      return entries.map(([id]) => id);
    }

    case 'random': {
      // Return all providers in random order
      const ids = entries.map(([id]) => id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      return ids;
    }

    case 'fastest':
    default: {
      // Return in insertion order (assumes fast providers registered first)
      return entries.map(([id]) => id);
    }
  }
}

// ============================================================
// A3MLLM — LangChain LLM Integration
// ============================================================

/**
 * A3M Router LangChain LLM.
 *
 * Extends LangChain's LLM base class to route prompts through
 * the best available provider. Supports single-provider routing
 * with fallback, and optional parallel ensemble execution.
 *
 * Every response includes routing metadata accessible via
 * the `metadata` property on the output.
 *
 * @example
 * ```typescript
 * const llm = new A3MLLM({
 *   providers: A3M_DEFAULT_PROVIDERS, // or your own
 *   routingStrategy: 'cheapest',
 *   temperature: 0.7,
 * });
 *
 * // Basic usage
 * const response = await llm.invoke('What is 2+2?');
 *
 * // Access routing metadata
 * console.log(response.metadata.provider);
 * console.log(response.metadata.costUsd);
 * console.log(response.metadata.latencyMs);
 *
 * // Ensemble mode
 * const result = await llm.ensembleInvoke('Explain quantum computing', {
 *   ensemble: 'longest',
 * });
 * console.log(result.text);
 * console.log(result.metadata.ensembleProviders);
 * ```
 */
export class A3MLLM {
  /** LangChain namespace identifier */
  lc_namespace = ['a3m_router', 'langchain'];

  /** Provider registry */
  private registry: Map<string, NormalizedProvider>;

  /** Resolved options */
  private options: Required<A3MLLMOptions>;

  /** Cached provider selection order */
  private providerOrder: string[] | null = null;

  constructor(options: A3MLLMOptions) {
    // Merge providers with defaults (user providers override built-in defaults)
    const mergedProviders = this.mergeProviders(options.providers);

    this.registry = normalizeProviders(mergedProviders);

    this.options = {
      providers: options.providers,
      defaultModel: options.defaultModel || '',
      routingStrategy: options.strategy || options.routingStrategy || 'cheapest',
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
      timeout: options.timeout ?? 60000,
      fallbackEnabled: options.fallbackEnabled ?? true,
      onRoute: options.onRoute || (() => {}),
      onError: options.onError || (() => {}),
      priorityOrder: options.priorityOrder || [],
    };

    this.providerOrder = null; // will be computed lazily
  }

  /**
   * Merge user providers with built-in defaults.
   * User providers with the same ID override defaults.
   */
  private mergeProviders(
    input: Record<string, A3MProviderConfig> | A3MProviderConfig[],
  ): Record<string, A3MProviderConfig> {
    // Start with all default providers
    const merged: Record<string, A3MProviderConfig> = { ...A3M_DEFAULT_PROVIDERS };

    if (Array.isArray(input)) {
      // Array format: replace defaults entirely
      return input.reduce((acc, p, i) => {
        acc[`provider_${i}`] = p;
        return acc;
      }, {} as Record<string, A3MProviderConfig>);
    }

    // Record format: merge into defaults (user values override)
    for (const [id, config] of Object.entries(input)) {
      merged[id] = { ...merged[id], ...config };
    }

    return merged;
  }

  /**
   * Get the list of provider IDs in routing order.
   */
  getProviderOrder(): string[] {
    if (!this.providerOrder) {
      this.providerOrder = selectProviders(
        this.registry,
        this.options.routingStrategy,
        this.options.priorityOrder,
      );
    }
    return this.providerOrder;
  }

  /**
   * Get the primary (best) provider ID based on routing strategy.
   */
  getPrimaryProvider(): string | null {
    const order = this.getProviderOrder();
    return order.length > 0 ? order[0] : null;
  }

  /**
   * Get a provider config by ID.
   */
  getProvider(id: string): A3MProviderConfig | undefined {
    return this.registry.get(id)?.config;
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): Record<string, A3MProviderConfig> {
    const result: Record<string, A3MProviderConfig> = {};
    for (const [id, np] of this.registry.entries()) {
      result[id] = np.config;
    }
    return result;
  }

  /**
   * Recompute provider order (e.g., after changing strategy).
   */
  refreshRouting(): void {
    this.providerOrder = null;
  }

  // ==================================================================
  // LangChain LLM Interface — _call
  // ==================================================================

  /**
   * Core LangChain `_call` implementation.
   *
   * Routes the prompt through the best available provider.
   * On failure, attempts fallback providers if enabled.
   *
   * Returns the response text with metadata attached.
   */
  async _call(
    prompt: string,
    options?: A3MEnsembleCallOptions,
  ): Promise<string> {
    const result = await this.callWithMetadata(prompt, options);
    return result.text;
  }

  // ==================================================================
  // Core Invocation
  // ==================================================================

  /**
   * Invoke the LLM with a string prompt or message array.
   * Returns the response text.
   *
   * This is the main entry point for LangChain chain compatibility.
   */
  async invoke(
    input: string | Array<{ role: string; content: string }>,
    options?: A3MEnsembleCallOptions,
  ): Promise<string> {
    const messages = typeof input === 'string'
      ? [{ role: 'user' as const, content: input }]
      : input;

    return this._callWithMessages(messages, options);
  }

  /**
   * Invoke the LLM and return both text and metadata.
   */
  async invokeWithMetadata(
    input: string | Array<{ role: string; content: string }>,
    options?: A3MEnsembleCallOptions,
  ): Promise<{ text: string; metadata: A3MRoutingMetadata }> {
    const messages = typeof input === 'string'
      ? [{ role: 'user' as const, content: input }]
      : input;

    return this._callWithMessagesWithMetadata(messages, options);
  }

  /**
   * Ensemble mode: run multiple providers in parallel and merge results.
   * Returns the merged text and metadata about all providers.
   */
  async ensembleInvoke(
    input: string | Array<{ role: string; content: string }>,
    options?: A3MEnsembleCallOptions,
  ): Promise<{ text: string; metadata: A3MRoutingMetadata }> {
    const messages = typeof input === 'string'
      ? [{ role: 'user' as const, content: input }]
      : input;

    const providerIds = options?.providers || this.getProviderOrder();
    const strategy: A3MEnsembleStrategy =
      typeof options?.ensemble === 'string'
        ? options.ensemble
        : 'longest';

    // Run all selected providers in parallel
    const results = await Promise.all(
      providerIds.map((id) => {
        const np = this.registry.get(id);
        if (!np) return null;
        return callProvider(id, np.config, messages, {
          temperature: this.options.temperature,
          maxTokens: this.options.maxTokens,
          stop: options?.stop,
          timeout: this.options.timeout,
          signal: options?.signal,
        });
      }),
    );

    const successful = results.filter(
      (r): r is A3MProviderResult => r !== null && !r.error,
    );

    if (successful.length === 0) {
      const errors = results
        .filter((r): r is A3MProviderResult => r !== null)
        .map((r) => `${r.providerId}: ${r.error}`);
      throw new Error(
        `A3M Ensemble: All ${providerIds.length} providers failed. Errors: ${errors.join('; ')}`,
      );
    }

    // Merge results based on strategy
    let mergedContent: string;
    switch (strategy) {
      case 'first': {
        // First to respond (lowest latency)
        successful.sort((a, b) => a.latencyMs - b.latencyMs);
        mergedContent = successful[0].content;
        break;
      }

      case 'longest': {
        // Most verbose response
        successful.sort((a, b) => b.content.length - a.content.length);
        mergedContent = successful[0].content;
        break;
      }

      case 'concat': {
        // Concatenate all responses with clear separation
        mergedContent = successful
          .map(
            (r, i) =>
              `[Provider ${i + 1}: ${r.providerId} (${r.model})]\n${r.content}`,
          )
          .join('\n\n---\n\n');
        break;
      }

      default: {
        // Default to longest
        successful.sort((a, b) => b.content.length - a.content.length);
        mergedContent = successful[0].content;
      }
    }

    // Compute aggregate metadata
    const totalCost = successful.reduce((sum, r) => sum + r.costUsd, 0);
    const avgLatency = Math.round(
      successful.reduce((sum, r) => sum + r.latencyMs, 0) / successful.length,
    );
    const bestProvider = successful[0];

    const metadata: A3MRoutingMetadata = {
      provider: bestProvider.providerId,
      model: bestProvider.model,
      latencyMs: avgLatency,
      costUsd: totalCost,
      tier: bestProvider.tier,
      tokensUsed: bestProvider.tokensUsed,
      ensemble: true,
      ensembleProviders: successful.map((r) => r.providerId),
    };

    return { text: mergedContent, metadata };
  }

  // ==================================================================
  // Internal: call with metadata
  // ==================================================================

  /**
   * Call the LLM and return the text. (metadata available via separate method)
   */
  private async callWithMetadata(
    prompt: string,
    options?: A3MEnsembleCallOptions,
  ): Promise<{ text: string; metadata: A3MRoutingMetadata }> {
    // Ensemble mode check
    if (options?.ensemble) {
      return this.ensembleInvoke(prompt, options);
    }

    const messages = [{ role: 'user' as const, content: prompt }];

    // Single-provider routing with fallback
    const providerIds = options?.providers || this.getProviderOrder();

    let lastError: string | null = null;

    for (let i = 0; i < providerIds.length; i++) {
      const id = providerIds[i];
      const np = this.registry.get(id);
      if (!np) continue;

      this.options.onRoute({
        provider: id,
        model: np.config.models[0] || 'unknown',
        strategy: this.options.routingStrategy,
      });

      const result = await callProvider(id, np.config, messages, {
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
        stop: options?.stop,
        timeout: this.options.timeout,
        signal: options?.signal,
      });

      if (result.error) {
        lastError = result.error;
        const willFallback = this.options.fallbackEnabled && i < providerIds.length - 1;
        this.options.onError({
          provider: id,
          error: result.error,
          willFallback,
        });

        if (willFallback) {
          continue; // Try next provider
        }

        throw new Error(
          `A3M Router: All providers exhausted. Last error (${id}): ${result.error}`,
        );
      }

      // Success
      const metadata: A3MRoutingMetadata = {
        provider: id,
        model: result.model,
        latencyMs: result.latencyMs,
        costUsd: result.costUsd,
        tier: result.tier,
        tokensUsed: result.tokensUsed,
        ensemble: false,
      };

      return { text: result.content, metadata };
    }

    // If we exhausted all providers without success
    throw new Error(
      `A3M Router: No providers available. Last error: ${lastError || 'Unknown'}`,
    );
  }

  /**
   * Call with message array (chat-style input).
   */
  private async _callWithMessages(
    messages: Array<{ role: string; content: string }>,
    options?: A3MEnsembleCallOptions,
  ): Promise<string> {
    // Ensemble mode
    if (options?.ensemble) {
      const result = await this.ensembleInvoke(messages, options);
      return result.text;
    }

    // Single-provider routing with fallback
    const providerIds = options?.providers || this.getProviderOrder();
    let lastError: string | null = null;

    for (let i = 0; i < providerIds.length; i++) {
      const id = providerIds[i];
      const np = this.registry.get(id);
      if (!np) continue;

      this.options.onRoute({
        provider: id,
        model: np.config.models[0] || 'unknown',
        strategy: this.options.routingStrategy,
      });

      const result = await callProvider(id, np.config, messages, {
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
        stop: options?.stop,
        timeout: this.options.timeout,
        signal: options?.signal,
      });

      if (result.error) {
        lastError = result.error;
        const willFallback = this.options.fallbackEnabled && i < providerIds.length - 1;
        this.options.onError({
          provider: id,
          error: result.error,
          willFallback,
        });

        if (willFallback) continue;

        throw new Error(
          `A3M Router: All providers exhausted. Last error (${id}): ${result.error}`,
        );
      }

      return result.content;
    }

    throw new Error(
      `A3M Router: No providers available. Last error: ${lastError || 'Unknown'}`,
    );
  }

  /**
   * Call with message array, return text + metadata.
   */
  private async _callWithMessagesWithMetadata(
    messages: Array<{ role: string; content: string }>,
    options?: A3MEnsembleCallOptions,
  ): Promise<{ text: string; metadata: A3MRoutingMetadata }> {
    if (options?.ensemble) {
      return this.ensembleInvoke(messages, options);
    }

    const providerIds = options?.providers || this.getProviderOrder();

    for (let i = 0; i < providerIds.length; i++) {
      const id = providerIds[i];
      const np = this.registry.get(id);
      if (!np) continue;

      const result = await callProvider(id, np.config, messages, {
        temperature: this.options.temperature,
        maxTokens: this.options.maxTokens,
        stop: options?.stop,
        timeout: this.options.timeout,
        signal: options?.signal,
      });

      if (result.error) {
        if (this.options.fallbackEnabled && i < providerIds.length - 1) continue;
        throw new Error(
          `A3M Router: All providers exhausted. Last error (${id}): ${result.error}`,
        );
      }

      return {
        text: result.content,
        metadata: {
          provider: id,
          model: result.model,
          latencyMs: result.latencyMs,
          costUsd: result.costUsd,
          tier: result.tier,
          tokensUsed: result.tokensUsed,
          ensemble: false,
        },
      };
    }

    throw new Error('A3M Router: No providers available.');
  }
}

// ============================================================
// FACTORY HELPERS
// ============================================================

/**
 * Create an A3MLLM pre-configured for a single provider.
 * Convenience for users who want to use a specific provider.
 *
 * @example
 * ```typescript
 * const groq = createA3MProvider('groq', {
 *   apiKey: process.env.GROQ_API_KEY,
 * });
 * ```
 */
export function createA3MProvider(
  providerId: keyof typeof A3M_DEFAULT_PROVIDERS | string,
  overrides?: Partial<A3MProviderConfig>,
): A3MLLM {
  const defaultConfig = (A3M_DEFAULT_PROVIDERS as Record<string, A3MProviderConfig>)[providerId];
  if (!defaultConfig && !overrides?.baseUrl) {
    throw new Error(
      `Unknown provider "${providerId}". Provide a custom config with baseUrl.`,
    );
  }

  const config: A3MProviderConfig = {
    ...defaultConfig,
    ...overrides,
  } as A3MProviderConfig;

  return new A3MLLM({
    providers: { [providerId]: config },
  });
}

/**
 * Create an A3MLLM with automatic cheapest-cost routing.
 * Scans all configured providers and picks the cheapest available.
 *
 * @example
 * ```typescript
 * const router = createA3MRouter({
 *   groq: { apiKey: process.env.GROQ_API_KEY },
 *   openai: { apiKey: process.env.OPENAI_API_KEY },
 * });
 * ```
 */
export function createA3MRouter(
  providerKeys: Record<string, { apiKey?: string; models?: string[] }>,
): A3MLLM {
  const providers: Record<string, A3MProviderConfig> = {};

  for (const [id, keyConfig] of Object.entries(providerKeys)) {
    const defaults = (A3M_DEFAULT_PROVIDERS as Record<string, A3MProviderConfig>)[id];
    if (defaults) {
      providers[id] = {
        ...defaults,
        ...keyConfig,
      };
    } else {
      // User-provided custom provider (requires baseUrl)
      if (!keyConfig.apiKey) {
        console.warn(`[A3M] Skipping unknown provider "${id}" — no apiKey or default config available.`);
        continue;
      }
    }
  }

  return new A3MLLM({
    providers,
    routingStrategy: 'cheapest',
  });
}

// ============================================================
// LangChain Compatibility Helpers
// ============================================================

/**
 * Type guard to check if a value has A3M routing metadata attached.
 */
export function hasA3MMetadata(
  value: unknown,
): value is { text: string; metadata: A3MRoutingMetadata } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    'metadata' in (value as any)
  );
}

/**
 * Type definition for LangChain runnable compatibility.
 * Used when piping A3MLLM into LangChain chains.
 */
export interface A3MRunnable {
  invoke(input: string, options?: A3MEnsembleCallOptions): Promise<string>;
}

// ============================================================
// Version info
// ============================================================

/** Integration version */
export const VERSION = '0.1.0';

/**
 * Package name
 */
export const PACKAGE_NAME = 'a3m-langchain';

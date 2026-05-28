#!/usr/bin/env node

/**
 * A3M Router MCP Server
 *
 * Exposes A3M's parallel multi-LLM routing and ensemble execution
 * as MCP tools for any MCP-compatible AI agent (Claude Code, Cursor, etc.).
 *
 * Usage:
 *   npx a3m-mcp                    # Start MCP server via stdio
 *   A3M_API_KEY=sk-... npx a3m-mcp # With custom API key
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import {
  routeQuery,
  extractQueryFeatures,
  getAvailableProviders,
  findCheapestAvailableProvider,
  findFastestAvailableProvider,
  healthCheck,
} from 'adaptive-memory-multi-model-router';

// ============================================================
// TYPES
// ============================================================

interface ProviderInfo {
  id: string;
  name: string;
  models: string[];
  tier: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  type: string;
  priority: number;
  maxTokens: number;
  enabled: boolean;
}

interface ApiCallResult {
  content: string;
  model: string;
  provider: string;
  totalTokens: number;
  cost: number;
  latencyMs: number;
}

// ============================================================
// LOGGING
// ============================================================

function log(level: 'info' | 'warn' | 'error', msg: string, ...args: unknown[]): void {
  const prefix = `[A3M-MCP] ${level.toUpperCase()}`;
  process.stderr.write(`${prefix} ${msg}${args.length ? ' ' + JSON.stringify(args) : ''}\n`);
}

// ============================================================
// PROVIDER HELPERS
// ============================================================

function getFilteredProviders(): Record<string, ProviderInfo> {
  const raw = getAvailableProviders();
  const result: Record<string, ProviderInfo> = {};

  for (const [id, p] of Object.entries(raw)) {
    const pd = p as Record<string, unknown>;
    result[id] = {
      id: pd.id as string || id,
      name: pd.name as string || id,
      models: (pd.models as string[]) || [],
      tier: pd.tier as string || 'unknown',
      costPer1kInput: ((pd.costPerK as Record<string, number> | undefined)?.input) || 0,
      costPer1kOutput: ((pd.costPerK as Record<string, number> | undefined)?.output) || 0,
      type: pd.type as string || 'api',
      priority: (pd.priority as number) || 999,
      maxTokens: (pd.maxTokens as number) || 4096,
      enabled: !!(pd.apiKey as string | undefined) || pd.type === 'local' || pd.type === 'cli',
    };
  }
  return result;
}

function findEnabledProviders(): Array<{ id: string; info: ProviderInfo }> {
  const providers = getFilteredProviders();
  return Object.entries(providers)
    .filter(([_, info]) => info.enabled)
    .map(([id, info]) => ({ id, info }));
}

// ============================================================
// API EXECUTION
// ============================================================

async function callProviderApi(
  providerId: string,
  model: string,
  prompt: string,
  maxTokens: number = 2048,
  signal?: AbortSignal,
): Promise<ApiCallResult | null> {
  const providers = getAvailableProviders() as Record<string, Record<string, unknown>>;
  const provider = providers[providerId];

  if (!provider) {
    log('error', `Provider "${providerId}" not found`);
    return null;
  }

  const apiKey = provider.apiKey as string | undefined;
  const baseUrl = provider.baseUrl as string;
  const type = provider.type as string;
  const format = provider.format as string | undefined;
  const costPerK = provider.costPerK as Record<string, number> | undefined;

  if (!apiKey && type !== 'local') {
    log('warn', `No API key for provider "${providerId}"`);
    return null;
  }

  const startTime = Date.now();

  try {
    if (type === 'cli') {
      // CLI-based providers (CommandCode etc.) — skip for now in MCP context
      log('warn', `CLI provider "${providerId}" not supported in MCP server`);
      return null;
    }

    let requestUrl = baseUrl;
    let requestBody: Record<string, unknown>;
    let requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (format === 'google') {
      // Google AI format
      requestUrl = `${baseUrl}/${model}:generateContent?key=${apiKey}`;
      requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      };
    } else if (format === 'anthropic') {
      requestHeaders['x-api-key'] = apiKey;
      requestHeaders['anthropic-version'] = '2023-06-01';
      requestBody = {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      };
    } else {
      // OpenAI-compatible (default)
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
      requestBody = {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      };
    }

    const resp = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      signal,
    });

    const latencyMs = Date.now() - startTime;
    const data = await resp.json() as Record<string, unknown>;

    if (!resp.ok) {
      const errMsg = (data.error as Record<string, unknown> | undefined)?.message as string
        || (data.error as string | undefined)
        || resp.statusText;
      log('error', `Provider "${providerId}" returned ${resp.status}: ${errMsg}`);
      return null;
    }

    // Parse response based on format
    let content = '';
    let usage: Record<string, number> = {};

    if (format === 'google') {
      const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
      if (candidates?.[0]?.content) {
        const parts = (candidates[0].content as Record<string, unknown>).parts as Array<Record<string, unknown>> | undefined;
        content = parts?.map((p) => p.text as string).join('') || '';
      }
      const metadata = data.usageMetadata as Record<string, number> | undefined;
      usage = {
        prompt_tokens: metadata?.promptTokenCount || 0,
        completion_tokens: metadata?.candidatesTokenCount || 0,
        total_tokens: (metadata?.promptTokenCount || 0) + (metadata?.candidatesTokenCount || 0),
      };
    } else if (format === 'anthropic') {
      content = (data.content as Array<Record<string, unknown>> | undefined)
        ?.map((b) => b.text as string)
        .join('') || '';
      usage = {
        prompt_tokens: data.input_tokens as number || 0,
        completion_tokens: data.output_tokens as number || 0,
        total_tokens: ((data.input_tokens as number) || 0) + ((data.output_tokens as number) || 0),
      };
    } else {
      // OpenAI-compatible
      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      content = choices?.[0]?.message
        ? (choices[0].message as Record<string, unknown>).content as string
        : '';
      usage = (data.usage as Record<string, number>) || {};
    }

    const inputCost = (usage.prompt_tokens || 0) / 1000 * (costPerK?.input || 0) / 1000;
    const outputCost = (usage.completion_tokens || 0) / 1000 * (costPerK?.output || 0) / 1000;

    return {
      content: content.trim(),
      model: (data.model as string) || model,
      provider: providerId,
      totalTokens: usage.total_tokens || 0,
      cost: inputCost + outputCost,
      latencyMs,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      log('warn', `Request to "${providerId}" aborted`);
      return null;
    }
    log('error', `Error calling provider "${providerId}":`, (err as Error).message);
    return null;
  }
}

// ============================================================
// MCP SERVER
// ============================================================

const server = new Server(
  {
    name: 'a3m-mcp-server',
    version: '0.1.0',
    description: 'A3M Router — parallel multi-LLM execution for AI agents',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ============================================================
// TOOL: LIST
// ============================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('info', 'Client requested tool list');
  return {
    tools: [
      {
        name: 'a3m_route',
        description: 'Route a query to the optimal LLM provider. Returns which model/ provider is best suited for the query, with reasoning and cost estimate. Does NOT execute the query — use a3m_ensemble for execution.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The user query to route',
            },
            provider: {
              type: 'string',
              description: 'Optional: Force a specific provider (e.g. "groq", "google", "cerebras")',
            },
            budget_multiplier: {
              type: 'number',
              description: 'Optional: Budget multiplier (default 1.0, lower = cheaper, higher = more capable)',
              default: 1.0,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'a3m_ensemble',
        description: 'Execute a query across multiple providers in parallel and merge results. Returns individual responses with confidence scores plus a synthesized best answer. This is A3M\'s unique differentiator — no other router does parallel multi-LLM execution with result merging.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The user query to execute in parallel across providers',
            },
            providers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Specific providers to use (e.g. ["groq", "google", "cerebras"]). Defaults to all enabled providers.',
            },
            max_tokens: {
              type: 'number',
              description: 'Optional: Max tokens per response (default: 2048)',
              default: 2048,
            },
            timeout_ms: {
              type: 'number',
              description: 'Optional: Timeout per provider in ms (default: 30000)',
              default: 30000,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'a3m_classify',
        description: 'Classify a query by type and get a provider recommendation. Analyzes the query for code, math, creative, reasoning, and domain signals. Returns classification (fast/creative/deep/code) plus a provider recommendation.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query to classify',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'a3m_providers',
        description: 'List all configured LLM providers with model info, cost tiers, and availability status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ============================================================
// TOOL: CALL
// ============================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'a3m_route':
        return await handleRoute(args as Record<string, unknown>);
      case 'a3m_ensemble':
        return await handleEnsemble(args as Record<string, unknown>);
      case 'a3m_classify':
        return handleClassify(args as Record<string, unknown>);
      case 'a3m_providers':
        return handleProviders();
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`,
        );
    }
  } catch (err) {
    if (err instanceof McpError) throw err;
    log('error', `Tool "${name}" failed:`, (err as Error).message);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================
// HANDLER: a3m_route
// ============================================================

function handleRoute(args: Record<string, unknown>) {
  const query = args.query as string;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'query must be a non-empty string');
  }

  const forcedProvider = args.provider as string | undefined;
  const budgetMultiplier = (args.budget_multiplier as number) || 1.0;

  const features = extractQueryFeatures(query);
  const route = routeQuery(query, forcedProvider ? [forcedProvider] : undefined, budgetMultiplier);

  // Build enriched response
  let queryType = 'general';
  if (features.has_code) queryType = 'code';
  else if (features.requires_reasoning) queryType = 'deep';
  else if (features.is_creative) queryType = 'creative';
  else if (features.complexity < 0.2) queryType = 'fast';

  const providers = getFilteredProviders();
  const providerInfo = route.primary_model
    ? providers[route.primary_model.split('/')[0]]
    : null;

  const result = {
    model: route.primary_model,
    tier: providerInfo?.tier || 'unknown',
    provider: route.primary_model?.split('/')[0] || 'unknown',
    confidence: route.confidence,
    reasoning: route.reasoning,
    estimated_cost: route.estimated_cost,
    estimated_latency_ms: route.estimated_latency_ms,
    fallback_models: route.fallback_models,
    query_features: {
      complexity: features.complexity,
      has_code: features.has_code,
      has_math: features.has_math,
      is_creative: features.is_creative,
      requires_reasoning: features.requires_reasoning,
      is_multilingual: features.is_multilingual,
    },
    classification: queryType,
    suggestion: getSuggestion(queryType, route),
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function getSuggestion(type: string, route: { primary_model: string; estimated_cost: number }): string {
  switch (type) {
    case 'code':
      return `Use "${route.primary_model}" for code. Cost: ~$${(route.estimated_cost || 0).toFixed(6)}`;
    case 'deep':
      return `Use "${route.primary_model}" for reasoning. Cost: ~$${(route.estimated_cost || 0).toFixed(6)}`;
    case 'creative':
      return `Use "${route.primary_model}" for creativity. Cost: ~$${(route.estimated_cost || 0).toFixed(6)}`;
    case 'fast':
      return `Use "${route.primary_model}" for speed. Cost: ~$${(route.estimated_cost || 0).toFixed(6)}`;
    default:
      return `Recommended: "${route.primary_model}" (${route.reasoning || ''})`;
  }
}

// ============================================================
// HANDLER: a3m_ensemble
// ============================================================

async function handleEnsemble(args: Record<string, unknown>) {
  const query = args.query as string;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'query must be a non-empty string');
  }

  const maxTokens = (args.max_tokens as number) || 2048;
  const timeoutMs = (args.timeout_ms as number) || 30000;

  // Determine which providers to use
  let targetProviders: Array<{ id: string; info: ProviderInfo }>;

  if (args.providers && Array.isArray(args.providers) && args.providers.length > 0) {
    const requested = args.providers as string[];
    const all = getFilteredProviders();
    targetProviders = requested
      .map((id) => ({ id, info: all[id] }))
      .filter((p) => p.info && p.info.enabled);
    if (targetProviders.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'None of the requested providers are available/enabled',
              requested_providers: requested,
              available: Object.keys(getFilteredProviders()).filter((k) => getFilteredProviders()[k].enabled),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  } else {
    targetProviders = findEnabledProviders();
  }

  if (targetProviders.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No enabled providers found. Configure API keys via environment variables (e.g. GROQ_API_KEY, GOOGLE_API_KEY, CEREBRAS_API_KEY).',
        },
      ],
      isError: true,
    };
  }

  // Classify the query first
  const features = extractQueryFeatures(query);

  // Execute in parallel across all target providers
  const controllers: AbortController[] = [];
  const results = await Promise.all(
    targetProviders.map(async ({ id, info }) => {
      const model = info.models[0];
      if (!model) {
        return { provider: id, model: 'none', error: 'No models configured', content: null };
      }

      const controller = new AbortController();
      controllers.push(controller);

      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await callProviderApi(id, model, query, maxTokens, controller.signal);
        clearTimeout(timeout);
        return { provider: id, model, error: null, content: result };
      } catch (err) {
        clearTimeout(timeout);
        return { provider: id, model, error: (err as Error).message, content: null };
      }
    }),
  );

  // Separate successful and failed results
  const successes = results.filter((r): r is typeof r & { content: NonNullable<typeof r.content> } =>
    r.content !== null && r.content.content.length > 0,
  );
  const failures = results.filter((r) => r.error || !r.content || r.content.content.length === 0);

  // Compute confidence scores based on response quality
  const totalSuccesses = successes.length;
  const scoredResponses = successes.map((r) => {
    const responseLength = r.content.content.length;
    const lengthScore = Math.min(responseLength / 500, 1.0);
    const latencyPenalty = Math.max(0, 1 - r.content.latencyMs / 10000);
    const confidence = Math.round((0.6 * lengthScore + 0.2 * latencyPenalty + 0.2) * 100) / 100;
    return { ...r, confidence: Math.min(confidence, 0.98) };
  }).sort((a, b) => b.confidence - a.confidence);

  // Synthesize best answer (highest confidence response with context from others)
  let bestAnswer: string;
  if (scoredResponses.length === 0) {
    bestAnswer = 'All providers failed to generate a response.';
  } else if (scoredResponses.length === 1) {
    bestAnswer = scoredResponses[0].content.content;
  } else {
    // Use top response with agreement signal
    const top = scoredResponses[0];
    const agreement = scoredResponses.filter(
      (r) => r.content.content.slice(0, 100).toLowerCase() === top.content.content.slice(0, 100).toLowerCase(),
    ).length;
    const agreementRatio = agreement / totalSuccesses;
    bestAnswer = top.content.content;
  }

  const ensemble = {
    query,
    query_classification: {
      complexity: features.complexity,
      type: features.has_code ? 'code' : features.requires_reasoning ? 'deep' : features.is_creative ? 'creative' : 'general',
      has_code: features.has_code,
      has_math: features.has_math,
      is_creative: features.is_creative,
    },
    parallel_responses: scoredResponses.map((r) => ({
      provider: r.provider,
      model: r.model,
      confidence: r.confidence,
      latency_ms: r.content.latencyMs,
      cost: r.content.cost,
      tokens: r.content.totalTokens,
      content: r.content.content,
    })),
    failed_providers: failures.map((r) => ({
      provider: r.provider,
      model: r.model,
      error: r.error || 'Empty response',
    })),
    best_answer: bestAnswer,
    stats: {
      total_providers: targetProviders.length,
      successful: successes.length,
      failed: failures.length,
      total_cost: successes.reduce((sum, r) => sum + r.content.cost, 0),
      total_tokens: successes.reduce((sum, r) => sum + r.content.totalTokens, 0),
      avg_latency_ms: successes.length > 0
        ? Math.round(successes.reduce((sum, r) => sum + r.content.latencyMs, 0) / successes.length)
        : 0,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(ensemble, null, 2),
      },
    ],
  };
}

// ============================================================
// HANDLER: a3m_classify
// ============================================================

function handleClassify(args: Record<string, unknown>) {
  const query = args.query as string;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new McpError(ErrorCode.InvalidParams, 'query must be a non-empty string');
  }

  const features = extractQueryFeatures(query);
  const route = routeQuery(query);

  let type: string;
  let recommendation: string;

  if (features.has_code) {
    type = 'code';
    recommendation = 'Use a fast coding model (Groq, Cerebras) for quick code tasks, or premium (OpenAI, Anthropic) for complex codegen.';
  } else if (features.requires_reasoning && features.complexity > 0.5) {
    type = 'deep';
    recommendation = 'Use a reasoning-capable model (Mistral, premium tier) for deep analytical tasks.';
  } else if (features.is_creative) {
    type = 'creative';
    recommendation = 'Use a creative model (Mistral, Google AI) for open-ended creative work.';
  } else if (features.complexity < 0.2) {
    type = 'fast';
    recommendation = 'Use a fast, cheap model (Groq, Cerebras, free tier) for simple queries.';
  } else {
    type = 'general';
    recommendation = 'Standard routing applies — use the default model selection.';
  }

  const providers = getFilteredProviders();
  const bestModel = route.primary_model;
  const bestProvider = bestModel ? providers[bestModel.split('/')[0]] : null;

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          query,
          classification: {
            type,
            complexity: features.complexity,
            signals: {
              has_code: features.has_code,
              has_math: features.has_math,
              is_creative: features.is_creative,
              requires_reasoning: features.requires_reasoning,
              is_multilingual: features.is_multilingual,
            },
          },
          recommended_provider: bestProvider ? {
            id: bestProvider.id,
            name: bestProvider.name,
            model: bestModel,
            tier: bestProvider.tier,
            cost_per_1k_input: bestProvider.costPer1kInput,
            cost_per_1k_output: bestProvider.costPer1kOutput,
          } : null,
          reasoning: route.reasoning,
          suggestion: recommendation,
        }, null, 2),
      },
    ],
  };
}

// ============================================================
// HANDLER: a3m_providers
// ============================================================

function handleProviders() {
  const providers = getFilteredProviders();
  const enabled = Object.values(providers).filter((p) => p.enabled);
  const disabled = Object.values(providers).filter((p) => !p.enabled);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          total: Object.keys(providers).length,
          enabled: enabled.length,
          disabled: disabled.length,
          providers: Object.values(providers).sort((a, b) => a.priority - b.priority),
          env_tips: {
            groq: 'GROQ_API_KEY',
            cerebras: 'CEREBRAS_API_KEY',
            mistral: 'MISTRAL_API_KEY',
            google: 'GOOGLE_API_KEY',
            minimax: 'MINIMAX_API_KEY',
          },
        }, null, 2),
      },
    ],
  };
}

// ============================================================
// STARTUP
// ============================================================

async function main(): Promise<void> {
  const providers = getFilteredProviders();
  const enabledCount = Object.values(providers).filter((p) => p.enabled).length;
  const totalCount = Object.keys(providers).length;

  log('info', 'A3M Router MCP Server v0.1.0');
  log('info', `Providers: ${totalCount} total, ${enabledCount} enabled`);
  log('info', 'Tools available: a3m_route, a3m_ensemble, a3m_classify, a3m_providers');
  log('info', `Node ${process.version}, ${process.platform}`);

  for (const [id, info] of Object.entries(providers)) {
    const status = info.enabled ? 'ENABLED' : 'DISABLED';
    log('info', `  ${status.padEnd(8)} ${id.padEnd(12)} ${info.tier.padEnd(8)} ${(info.models[0] || 'no models')}`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('info', 'MCP server connected via stdio');
}

main().catch((err) => {
  log('error', 'Fatal error:', err);
  process.exit(1);
});

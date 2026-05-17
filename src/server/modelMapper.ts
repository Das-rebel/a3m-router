/**
 * A3M Router - Model Mapper
 *
 * Maps OpenAI-compatible model names to our provider/model pairs.
 * Supports:
 *   - "auto" → intelligent routing via advancedRouter
 *   - "gpt-4" → best available premium provider
 *   - "gpt-3.5-turbo" → best available fast provider
 *   - "groq/llama-3.3-70b" → specific provider/model
 *   - "claude-3.5-sonnet" → Anthropic provider
 *   - "gemini-2.0-flash" → Google provider
 */

import { routeQuery } from "../routing/advancedRouter";
import { getAvailableProviders } from "../providers/providerConfig";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface ModelMapping {
  providerId: string;
  model: string;
  baseUrl: string;
  apiKey: string | null;
  costPerK: { input: number; output: number };
  type: string;
}

// ============================================================
// OPENAI MODEL ALIASES → provider preference order
// ============================================================

const OPENAI_ALIASES: Record<string, string[]> = {
  "gpt-4": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-2.5-pro", "mistral/mistral-large-latest"],
  "gpt-4-turbo": ["openai/gpt-4-turbo", "openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
  "gpt-4o": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-2.5-pro"],
  "gpt-4o-mini": ["openai/gpt-4o-mini", "groq/llama-3.3-70b-versatile", "google/gemini-2.0-flash", "mistral/mistral-small-latest"],
  "gpt-3.5-turbo": ["groq/llama-3.3-70b-versatile", "cerebras/llama3.1-8b", "google/gemini-2.0-flash", "mistral/mistral-small-latest", "deepseek/deepseek-chat"],
  "claude-3.5-sonnet": ["anthropic/claude-3.5-sonnet"],
  "claude-3-opus": ["anthropic/claude-3-opus"],
  "claude-3-haiku": ["anthropic/claude-3-haiku"],
  "gemini-2.0-flash": ["google/gemini-2.0-flash"],
  "gemini-2.5-pro": ["google/gemini-2.5-pro"],
  "o1": ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
  "o1-mini": ["openai/gpt-4o-mini", "groq/llama-3.3-70b-versatile"],
  "o3-mini": ["openai/gpt-4o-mini", "google/gemini-2.5-flash"],
};

// ============================================================
// MODEL MAPPING
// ============================================================

/**
 * Resolve an OpenAI-compatible model name to a concrete provider/model pair.
 *
 * Resolution order:
 *  1. "auto" → route through advancedRouter
 *  2. "provider/model" format → direct lookup
 *  3. OpenAI alias → preference list lookup
 *  4. Bare model name → search across all providers
 *  5. Fallback → first available provider's first model
 */
export function resolveModel(modelName: string, prompt?: string): ModelMapping | null {
  const available = getAvailableProviders();

  // 1. "auto" → intelligent routing
  if (modelName === "auto") {
    const query = prompt || "";
    const route = routeQuery(query);
    if (!route.primary_model) return null;
    return lookupProviderModel(route.primary_model, available);
  }

  // 2. "provider/model" format → direct lookup
  if (modelName.includes("/")) {
    const mapping = lookupProviderModel(modelName, available);
    if (mapping) return mapping;
  }

  // 3. OpenAI alias → preference list
  const aliasList = OPENAI_ALIASES[modelName];
  if (aliasList) {
    for (const candidate of aliasList) {
      const mapping = lookupProviderModel(candidate, available);
      if (mapping) return mapping;
    }
  }

  // 4. Bare model name → search across all providers
  for (const [providerId, provider] of Object.entries(available)) {
    if (provider.models && provider.models.includes(modelName)) {
      return {
        providerId,
        model: modelName,
        baseUrl: provider.baseUrl || "",
        apiKey: provider.apiKey || null,
        costPerK: provider.costPerK || { input: 0, output: 0 },
        type: provider.type || "api",
      };
    }
  }

  // 5. Fallback → first available provider's first model
  const firstProvider = Object.values(available)[0] as any;
  if (firstProvider && firstProvider.models && firstProvider.models.length > 0) {
    return {
      providerId: firstProvider.id,
      model: firstProvider.models[0],
      baseUrl: firstProvider.baseUrl || "",
      apiKey: firstProvider.apiKey || null,
      costPerK: firstProvider.costPerK || { input: 0, output: 0 },
      type: firstProvider.type || "api",
    };
  }

  return null;
}

/**
 * Look up a "provider/model" key against the available providers map.
 */
function lookupProviderModel(key: string, available: Record<string, any>): ModelMapping | null {
  const slashIdx = key.indexOf("/");
  const providerId = slashIdx >= 0 ? key.substring(0, slashIdx) : key;
  const model = slashIdx >= 0 ? key.substring(slashIdx + 1) : key;

  const provider = available[providerId];
  if (!provider) return null;

  // Verify the model is in the provider's list (or accept if list is empty)
  if (provider.models && provider.models.length > 0 && !provider.models.includes(model)) {
    return null;
  }

  return {
    providerId,
    model,
    baseUrl: provider.baseUrl || "",
    apiKey: provider.apiKey || null,
    costPerK: provider.costPerK || { input: 0, output: 0 },
    type: provider.type || "api",
  };
}

/**
 * List all available models in OpenAI-compatible format.
 */
export function listAvailableModels(): Array<{
  id: string;
  object: string;
  created: number;
  owned_by: string;
}> {
  const available = getAvailableProviders();
  const models: Array<{ id: string; object: string; created: number; owned_by: string }> = [];

  for (const [providerId, provider] of Object.entries(available)) {
    if (provider.models) {
      for (const model of provider.models) {
        models.push({
          id: providerId + "/" + model,
          object: "model",
          created: Math.floor(Date.now() / 1000),
          owned_by: provider.name || providerId,
        });
      }
    }
  }

  // Add aliases
  for (const alias of Object.keys(OPENAI_ALIASES)) {
    models.push({
      id: alias,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "a3m-router",
    });
  }

  return models;
}

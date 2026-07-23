/**
 * A3M Router - Embeddings Handler
 *
 * Handles POST /v1/embeddings
 * OpenAI-compatible embeddings endpoint.
 *
 * Routes embedding requests to the best available provider:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002)
 * - Cohere (embed-english-v3.0, embed-multilingual-v3.0)
 * - Google (text-embedding-004)
 * - Local Ollama (nomic-embed-text, etc.)
 */

import * as http from 'http';
import { RouteContext } from '../router';
import { getAvailableProviders } from '../../providers/providerConfig';
import { recordRequest, recordProviderError, recordActiveRequest } from '../metrics';

interface EmbeddingsRequest {
  model?: string;
  input: string | string[];
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

interface ProviderAdapter {
  call: (url: string, apiKey: string, model: string, input: string[], dimensions?: number) => Promise<number[][]>;
  urlFor: (apiKey: string, model: string) => string;
  modelMap: (model: string) => string | null;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function jsonResponse(res: http.ServerResponse, statusCode: number, body: object): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

function errorResponse(res: http.ServerResponse, statusCode: number, message: string, errorType = 'server_error'): void {
  jsonResponse(res, statusCode, { error: { message, type: errorType, code: statusCode } });
}

/**
 * Get the best available embeddings provider.
 */
function getEmbeddingsProvider(): { providerId: string; model: string; adapter: ProviderAdapter } | null {
  const providers = getAvailableProviders();

  // Priority: OpenAI > Cohere > Google > Ollama
  const priority = ['openai', 'cohere', 'google', 'ollama'];

  for (const id of priority) {
    const provider = providers[id];
    if (!provider || !provider.apiKey) continue;

    if (id === 'openai') {
      return {
        providerId: 'openai',
        model: 'text-embedding-3-small',
        adapter: openAIAdapter,
      };
    }

    if (id === 'cohere') {
      return {
        providerId: 'cohere',
        model: 'embed-english-v3.0',
        adapter: cohereAdapter,
      };
    }

    if (id === 'google') {
      return {
        providerId: 'google',
        model: 'text-embedding-004',
        adapter: googleAdapter,
      };
    }

    if (id === 'ollama' && provider.baseUrl) {
      return {
        providerId: 'ollama',
        model: 'nomic-embed-text:latest',
        adapter: ollamaAdapter,
      };
    }
  }

  return null;
}

// ============================================================
// PROVIDER ADAPTERS
// ============================================================

const openAIAdapter: ProviderAdapter = {
  modelMap(model: string): string | null {
    const valid = ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'];
    return valid.includes(model) ? model : 'text-embedding-3-small';
  },
  urlFor(_apiKey: string, _model: string): string {
    return 'https://api.openai.com/v1/embeddings';
  },
  async call(url, apiKey, model, input, dimensions): Promise<number[][]> {
    const body: Record<string, unknown> = { model, input };
    if (dimensions) body.dimensions = dimensions;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    const data = await resp.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.data.map((item: any) => item.embedding as number[]);
  },
};

const cohereAdapter: ProviderAdapter = {
  modelMap(model: string): string | null {
    const valid = ['embed-english-v3.0', 'embed-multilingual-v3.0', 'embed-english-v2.0'];
    return valid.includes(model) ? model : 'embed-english-v3.0';
  },
  urlFor(_apiKey: string, _model: string): string {
    return 'https://api.cohere.ai/v2/embed';
  },
  async call(url, apiKey, model, input, _dimensions): Promise<number[][]> {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, texts: input }),
    });
    const data = await resp.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.embeddings as number[][];
  },
};

const googleAdapter: ProviderAdapter = {
  modelMap(model: string): string | null {
    return 'text-embedding-004';
  },
  urlFor(apiKey: string, _model: string): string {
    return `https://generativelanguage.googleapis.com/v1beta2/models/text-embedding-004:predict?key=${apiKey}`;
  },
  async call(url, _apiKey, model, input, _dimensions): Promise<number[][]> {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: input.map((text) => ({ content: text })),
        parameters: { outputDimensionality: 768 },
      }),
    });
    const data = await resp.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.predictions.map((p: any) => p.embeddings.values as number[]);
  },
};

const ollamaAdapter: ProviderAdapter = {
  modelMap(model: string): string | null {
    return model || 'nomic-embed-text:latest';
  },
  urlFor(baseUrl: string): string {
    return `${baseUrl}/api/embeddings`;
  },
  async call(url, _apiKey, model, input): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of input) {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });
      const data = await resp.json() as any;
      if (data.error) throw new Error(data.error);
      results.push(data.embedding as number[]);
    }
    return results;
  },
};

// ============================================================
// HANDLER
// ============================================================

export async function handleEmbeddings(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RouteContext
): Promise<void> {
  recordActiveRequest(1);
  const body = await readBody(req);
  let request: EmbeddingsRequest;

  try {
    request = JSON.parse(body);
  } catch {
    recordActiveRequest(-1);
    errorResponse(res, 400, 'Invalid JSON in request body', 'invalid_request_error');
    return;
  }

  const inputs = Array.isArray(request.input) ? request.input : [request.input];
  if (inputs.length === 0) {
    recordActiveRequest(-1);
    errorResponse(res, 400, 'input is required', 'invalid_request_error');
    return;
  }

  const provider = getEmbeddingsProvider();
  if (!provider) {
    recordActiveRequest(-1);
    errorResponse(res, 503, 'No embeddings provider available. Configure API keys for OpenAI, Cohere, or Google.', 'server_error');
    return;
  }

  const model = request.model || provider.model;
  const adapter = provider.adapter;
  const providers = getAvailableProviders();
  const providerConfig = providers[provider.providerId];
  const resolvedModel = adapter.modelMap(model) || provider.model;
  const url = adapter.urlFor(providerConfig.apiKey || '', resolvedModel);

  const startTime = Date.now();

  try {
    const embeddings = await adapter.call(url, providerConfig.apiKey || '', resolvedModel, inputs, request.dimensions);
    const latencyMs = Date.now() - startTime;

    const response = {
      object: 'list',
      data: embeddings.map((embedding, i) => ({
        object: 'embedding',
        embedding,
        index: i,
      })),
      model: resolvedModel,
      usage: {
        prompt_tokens: 0, // Embedding APIs don't always return token counts
        total_tokens: 0,
      },
    };

    jsonResponse(res, 200, response);
    recordRequest({
      endpoint: '/v1/embeddings',
      provider: provider.providerId,
      status: 'success',
      durationMs: latencyMs,
      model: resolvedModel,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) errorResponse(res, 502, message, 'upstream_error');
    recordProviderError(provider.providerId, 'embeddings_error');
    console.error(`[a3m-router] ${ctx.requestId} embeddings ERROR ${provider.providerId}: ${message}`);
  }

  recordActiveRequest(-1);
}

export default handleEmbeddings;

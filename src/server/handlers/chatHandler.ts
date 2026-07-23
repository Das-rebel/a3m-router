/**
 * A3M Router - Chat Completions Handler
 *
 * Handles POST /v1/chat/completions
 * Plug-and-play: register with router.registerRoute('POST', /^\/v1\/chat\/completions$/, handleChatCompletions);
 */

import * as http from 'http';
import { RouteContext } from '../router';
import { resolveModel } from '../modelMapper';
import { costTracker } from '../state';
import { recordRequest, recordProviderError, recordActiveRequest } from '../metrics';

// ============================================================
// TYPES (local, matching OpenAI API)
// ============================================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  n?: number;
}

// ============================================================
// HELPERS
// ============================================================

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function jsonResponse(res: http.ServerResponse, statusCode: number, body: object): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

function errorResponse(res: http.ServerResponse, statusCode: number, message: string, errorType = 'server_error'): void {
  jsonResponse(res, statusCode, { error: { message, type: errorType, code: statusCode } });
}

// ============================================================
// HANDLER
// ============================================================

export async function handleChatCompletions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RouteContext
): Promise<void> {
  recordActiveRequest(1);

  const body = await readBody(req);
  let request: ChatRequest;

  try {
    request = JSON.parse(body);
  } catch {
    recordActiveRequest(-1);
    errorResponse(res, 400, 'Invalid JSON in request body', 'invalid_request_error');
    return;
  }

  if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
    recordActiveRequest(-1);
    errorResponse(res, 400, 'messages is required and must be a non-empty array', 'invalid_request_error');
    return;
  }

  const model = request.model || 'auto';
  const stream = request.stream || false;
  const requestId = ctx.requestId;
  const promptForRouting = request.messages.map((m) => m.content).join(' ');

  const mapping = resolveModel(model, promptForRouting);
  if (!mapping) {
    recordActiveRequest(-1);
    errorResponse(res, 503, `No provider available for model "${model}". Configure API keys.`, 'server_error');
    return;
  }

  const startTime = Date.now();

  if (stream) {
    try {
      const { streamProviderResponse } = await import('../proxyServer');
      await streamProviderResponse(res, mapping, request.messages,
        { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop },
        requestId);
      const latencyMs = Date.now() - startTime;
      recordRequest({ endpoint: '/v1/chat/completions', provider: mapping.providerId, status: 'success', durationMs: latencyMs, model });
      recordActiveRequest(-1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) errorResponse(res, 500, message);
      recordProviderError(mapping.providerId, 'stream_error');
      recordActiveRequest(-1);
    }
    return;
  }

  // Non-streaming path
  try {
    const { callWithFallback } = await import('../proxyServer');
    const { result, mapping: usedMapping } = await callWithFallback(
      model, request.messages,
      { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop },
      promptForRouting
    );

    const latencyMs = Date.now() - startTime;
    const inputCost = (result.usage.prompt_tokens / 1000) * usedMapping.costPerK.input;
    const outputCost = (result.usage.completion_tokens / 1000) * usedMapping.costPerK.output;
    const totalCost = inputCost + outputCost;

    costTracker.record(usedMapping.providerId, usedMapping.model, result.usage.prompt_tokens, result.usage.completion_tokens);

    const response = {
      id: requestId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [{ index: 0, message: { role: 'assistant' as const, content: result.content }, finish_reason: result.finish_reason }],
      usage: result.usage,
    };

    jsonResponse(res, 200, response);
    recordRequest({
      endpoint: '/v1/chat/completions',
      provider: usedMapping.providerId,
      status: 'success',
      durationMs: latencyMs,
      tokensIn: result.usage.prompt_tokens,
      tokensOut: result.usage.completion_tokens,
      cost: totalCost,
      model,
    });

    console.log(`[a3m-router] ${requestId} chat model=${model}→${usedMapping.providerId}/${usedMapping.model} latency=${latencyMs}ms tokens=${result.usage.total_tokens} cost=$${totalCost.toFixed(6)}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const latencyMs = Date.now() - startTime;
    recordRequest({ endpoint: '/v1/chat/completions', provider: mapping.providerId, status: 'error', durationMs: latencyMs, model });
    recordProviderError(mapping.providerId, message.slice(0, 50));
    console.error(`[a3m-router] ${requestId} ERROR model=${model}→${mapping.providerId}/${mapping.model} latency=${latencyMs}ms error=${message}`);
    if (!res.headersSent) errorResponse(res, 502, message, 'upstream_error');
  }

  recordActiveRequest(-1);
}

export default handleChatCompletions;

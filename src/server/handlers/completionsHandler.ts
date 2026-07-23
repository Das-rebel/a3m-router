/**
 * A3M Router - Completions Handler
 *
 * Handles POST /v1/completions
 */

import * as http from 'http';
import { RouteContext } from '../router';
import { resolveModel } from '../modelMapper';
import { recordRequest, recordActiveRequest } from '../metrics';

interface CompletionRequest {
  model: string;
  prompt: string | string[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  echo?: boolean;
  stop?: string | string[];
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

export async function handleCompletions(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: RouteContext
): Promise<void> {
  recordActiveRequest(1);
  const body = await readBody(req);
  let request: CompletionRequest;

  try {
    request = JSON.parse(body);
  } catch {
    recordActiveRequest(-1);
    errorResponse(res, 400, 'Invalid JSON in request body', 'invalid_request_error');
    return;
  }

  const prompts = Array.isArray(request.prompt) ? request.prompt : [request.prompt || ''];
  const messages = prompts.map((p) => ({ role: 'user' as const, content: p }));
  const model = request.model || 'auto';
  const stream = request.stream || false;
  const requestId = ctx.requestId;
  const promptForRouting = prompts.join(' ');

  const mapping = resolveModel(model, promptForRouting);
  if (!mapping) {
    recordActiveRequest(-1);
    errorResponse(res, 503, `No provider available for model "${model}".`, 'server_error');
    return;
  }

  const startTime = Date.now();

  if (stream) {
    try {
      const { streamProviderResponse } = await import('../proxyServer');
      await streamProviderResponse(res, mapping, messages,
        { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop },
        requestId);
      const latencyMs = Date.now() - startTime;
      recordRequest({ endpoint: '/v1/completions', provider: mapping.providerId, status: 'success', durationMs: latencyMs, model });
      recordActiveRequest(-1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) errorResponse(res, 500, message);
      recordActiveRequest(-1);
    }
    return;
  }

  try {
    const { callWithFallback } = await import('../proxyServer');
    const { result, mapping: usedMapping } = await callWithFallback(
      model, messages,
      { temperature: request.temperature, max_tokens: request.max_tokens, stop: request.stop },
      promptForRouting
    );

    const latencyMs = Date.now() - startTime;
    const response = {
      id: requestId,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model,
      choices: [{ text: result.content, index: 0, finish_reason: result.finish_reason }],
      usage: result.usage,
    };

    jsonResponse(res, 200, response);
    recordRequest({ endpoint: '/v1/completions', provider: usedMapping.providerId, status: 'success', durationMs: latencyMs, tokensIn: result.usage.prompt_tokens, tokensOut: result.usage.completion_tokens, model });
    console.log(`[a3m-router] ${requestId} completion model=${model}→${usedMapping.providerId}/${usedMapping.model} latency=${latencyMs}ms`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) errorResponse(res, 502, message, 'upstream_error');
  }

  recordActiveRequest(-1);
}

export default handleCompletions;

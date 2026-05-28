/**
 * A3M Router — Vercel AI SDK Custom Provider
 *
 * A lightweight custom provider that routes through A3M's smart router
 * using Vercel AI SDK's `generateText` and `streamText`.
 *
 * Usage:
 * ```ts
 * import { createA3M } from './a3m_provider';
 * import { generateText } from 'ai';
 *
 * const a3m = createA3M({ strategy: 'cheapest' });
 * const result = await generateText({
 *   model: a3m('auto'),
 *   prompt: 'Hello'
 * });
 * ```
 */

interface A3MConfig {
  strategy?: 'cheapest' | 'fastest' | 'auto';
  apiKey?: string;
  baseUrl?: string;
}

interface A3MProvider {
  (modelId: string): {
    specVersion: 'v1';
    provider: string;
    modelId: string;
    defaultObjectGenerationMode: 'object';
    supportsStructuredOutputs: boolean;
    doGenerate: (options: any) => Promise<any>;
  };
}

export function createA3M(config: A3MConfig = {}): A3MProvider {
  const strategy = config.strategy || 'auto';
  const baseUrl = config.baseUrl || 'http://localhost:8787/v1';

  return (modelId: string) => ({
    specVersion: 'v1' as const,
    provider: 'a3m-router',
    modelId,
    defaultObjectGenerationMode: 'object' as const,
    supportsStructuredOutputs: true,

    async doGenerate(options: any) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey || process.env.A3M_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: options.prompt,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`A3M: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || '',
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
        },
      };
    },
  });
}

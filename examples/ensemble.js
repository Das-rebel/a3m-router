#!/usr/bin/env node
/**
 * ensemble.js — Query multiple providers in parallel and merge results.
 *
 * A3M's signature capability: parallel multi-LLM execution with voting.
 * Unlike every other router (which does sequential fallback A -> B -> C),
 * A3M queries all selected providers simultaneously and compares responses.
 *
 * Usage:
 *   node examples/ensemble.js
 *   QUERY="What is the capital of France?" PROVIDERS="openai,groq,anthropic" node examples/ensemble.js
 */

const { routeQuery, getAvailableProviders } = require('../dist/index.js');

const query = process.env.QUERY || 'Explain the concept of recursion with a real-world analogy';
const providerList = (process.env.PROVIDERS || 'openai,groq,gemini')
  .split(',')
  .map(s => s.trim());

/**
 * Simulate calling each provider. In production, replace with real API calls.
 * A3M Router selects the model — you call its API endpoint.
 */
async function callProvider(provider, model, prompt) {
  const apiKey = process.env[provider.toUpperCase() + '_API_KEY'];

  if (!apiKey) {
    return {
      provider,
      model,
      text: `[SKIP — set ${provider.toUpperCase()}_API_KEY]`,
      cost: 0,
      latency: 0,
      skipped: true,
    };
  }

  const start = Date.now();

  // Each provider has a different base URL and format
  const endpoints = {
    openai:     { url: 'https://api.openai.com/v1/chat/completions',           model: model || 'gpt-4o-mini' },
    groq:       { url: 'https://api.groq.com/openai/v1/chat/completions',       model: model || 'llama-3.3-70b-versatile' },
    gemini:     { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: model || 'gemini-2.0-flash' },
    anthropic:  { url: 'https://api.anthropic.com/v1/messages',                 model: model || 'claude-3-5-haiku-latest' },
  };

  const ep = endpoints[provider];
  if (!ep) {
    return { provider, model, text: `[UNSUPPORTED PROVIDER: ${provider}]`, cost: 0, latency: 0, skipped: true };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body = provider === 'anthropic'
    ? { model: ep.model, max_tokens: 512, messages: [{ role: 'user', content: prompt }] }
    : { model: ep.model, messages: [{ role: 'user', content: prompt }], max_tokens: 512 };

  try {
    const res = await fetch(ep.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { provider, model: ep.model, text: `[ERROR ${res.status}: ${errText}]`, cost: 0, latency: Date.now() - start, skipped: true };
    }

    const data = await res.json();
    const text = provider === 'anthropic'
      ? data.content?.[0]?.text || JSON.stringify(data)
      : data.choices?.[0]?.message?.content || JSON.stringify(data);

    return {
      provider,
      model: ep.model,
      text: text.trim(),
      latency: Date.now() - start,
      skipped: false,
      usage: data.usage,
    };
  } catch (err) {
    return { provider, model: ep.model, text: `[FETCH ERROR: ${err.message}]`, cost: 0, latency: Date.now() - start, skipped: true };
  }
}

/**
 * Simple text voting: find common key phrases across responses.
 */
function voteOnResults(results) {
  const answered = results.filter(r => !r.skipped);
  if (answered.length === 0) return { winner: null, consensus: false, details: 'No providers returned results' };

  const texts = answered.map(r => r.text.toLowerCase());
  const wordSets = texts.map(t => new Set(t.split(/\s+/).filter(w => w.length > 3)));
  const intersection = wordSets.reduce((a, b) => new Set([...a].filter(x => b.has(x))));

  const consensusScore = intersection.size > 5 ? 0.85 : 0.3;
  return {
    winner: answered[0],
    consensus: consensusScore > 0.5,
    consensusScore,
    sharedTerms: [...intersection].slice(0, 10),
    totalAnswered: answered.length,
    totalSkipped: results.length - answered.length,
  };
}

async function main() {
  console.log('A3M Router — Parallel Ensemble');
  console.log('=' .repeat(50));
  console.log('Query:', query);
  console.log('Providers:', providerList.join(', '));
  console.log('');

  // Get route decisions from A3M for insight
  console.log('-- A3M Route Recommendations --');
  for (const provider of providerList) {
    const decision = routeQuery(query);
    console.log(`  ${provider}: ${decision.primary_model} (conf: ${(decision.confidence * 100).toFixed(0)}%, $${decision.estimated_cost.toFixed(6)})`);
  }
  console.log('');

  // Execute all providers in parallel
  console.log('-- Parallel Execution --');
  const promises = providerList.map(provider => callProvider(provider, null, query));
  const results = await Promise.all(promises);

  for (const r of results) {
    const icon = r.skipped ? '  [SKIP]' : '  [OK]  ';
    console.log(`${icon} ${r.provider.padEnd(12)} ${r.model}`);
    console.log(`       latency: ${r.latency}ms`);
    if (!r.skipped) {
      const preview = r.text.slice(0, 120).replace(/\n/g, ' ');
      console.log(`       response: ${preview}...`);
    }
    console.log('');
  }

  // Vote on results
  const vote = voteOnResults(results);
  console.log('-- Consensus Vote --');
  console.log('  Consensus:', vote.consensus ? 'YES' : 'NO');
  console.log('  Score:', vote.consensusScore.toFixed(2));
  console.log('  Answered:', vote.totalAnswered, '/', vote.totalSkipped + vote.totalAnswered);
  if (vote.sharedTerms?.length) {
    console.log('  Shared key terms:', vote.sharedTerms.join(', '));
  }
}

main().catch(console.error);

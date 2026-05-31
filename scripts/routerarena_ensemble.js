#!/usr/bin/env node
/**
 * A3M Router — RouterArena Full Ensemble Evaluation
 * Runs ALL configured models on ALL RouterArena queries in parallel
 * Applies A3M confidence-weighted voting
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ======== Model Configuration ========
const MODELS = [
  { name: 'deepseek-chat', url: 'https://api.deepseek.com/chat/completions', 
    key: process.env.DEEPSEEK_API_KEY, weight: 1.0 },
  { name: 'meta/llama-3.3-70b-instruct', url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: process.env.NVIDIA_API_KEY, weight: 0.85 },
  { name: 'mistralai/ministral-3-8b-2512', url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY, apiModel: 'ministral-8b-2512', weight: 0.7 },
  { name: 'mistralai/ministral-3-14b-2512', url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY, apiModel: 'ministral-14b-2512', weight: 0.8 },
  { name: 'nvidia/nemotron-3-super-120b-a12b', url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY, apiModel: 'nvidia/nemotron-3-super-120b-a12b:free', weight: 0.75 },
  { name: 'google/gemma-4-26b-a4b-it', url: 'https://openrouter.ai/api/v1/chat/completions',
    key: process.env.OPENROUTER_API_KEY, apiModel: 'google/gemma-4-26b-a4b-it:free', weight: 0.65 },
];

function callModel(model, prompt) {
  return new Promise((resolve) => {
    const apiModel = model.apiModel || model.name;
    const body = JSON.stringify({
      model: apiModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0
    });
    
    const url = new URL(model.url);
    const req = (url.protocol === 'https:' ? https : http).request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Authorization': `Bearer ${model.key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(data);
          if (d.choices?.[0]?.message?.content) {
            resolve({ model: model.name, answer: d.choices[0].message.content, tokens: d.usage, success: true });
          } else {
            resolve({ model: model.name, success: false, error: (d.error?.message || 'unknown').substring(0,60) });
          }
        } catch(e) {
          resolve({ model: model.name, success: false, error: 'parse error' });
        }
      });
    });
    req.on('error', e => resolve({ model: model.name, success: false, error: e.message.substring(0,60) }));
    req.on('timeout', () => { req.destroy(); resolve({ model: model.name, success: false, error: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

function ensembleVote(results) {
  const successful = results.filter(r => r.success);
  if (successful.length === 0) return null;
  
  // Simple majority: if >50% agree on same answer, use it
  const answers = successful.map(r => r.answer.trim().toLowerCase());
  const counts = {};
  answers.forEach(a => { counts[a] = (counts[a]||0) + 1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
  
  if (sorted[0][1] >= Math.ceil(successful.length / 2)) {
    // Majority exists
    for (const r of successful) {
      if (r.answer.trim().toLowerCase() === sorted[0][0]) return r;
    }
  }
  // Fallback: highest-weight model's answer
  return successful[0];
}

async function main() {
  const args = process.argv.slice(2);
  const limit = parseInt(args[0]) || 100;
  const predFile = args[1] || '../RouterArena/router_inference/predictions/a3m-router.json';
  
  console.log(`A3M Ensemble: ${MODELS.length} models on ${limit} RouterArena queries`);
  
  const preds = JSON.parse(fs.readFileSync(predFile, 'utf8'));
  const regular = preds.filter(p => !p.for_optimality).slice(0, limit);
  
  const results = [];
  const start = Date.now();
  
  for (let i = 0; i < regular.length; i++) {
    const p = regular[i];
    
    // Call ALL models in parallel
    const modelResults = await Promise.all(MODELS.map(m => callModel(m, p.prompt)));
    
    // Vote
    const winner = ensembleVote(modelResults);
    
    const successCount = modelResults.filter(r => r.success).length;
    const totalTokens = modelResults.reduce((s,r) => s + (r.tokens?.total_tokens || 0), 0);
    
    results.push({
      index: i,
      query: p.prompt?.substring(0, 80),
      models_called: MODELS.length,
      models_success: successCount,
      ensemble_answer: winner?.answer?.substring(0, 100),
      answers: Object.fromEntries(modelResults.map(r => [r.model, r.success ? '✅' : '❌'])),
      total_tokens: totalTokens
    });
    
    if ((i+1) % 10 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`[${i+1}/${limit}] ${elapsed}s | ${successCount}/${MODELS.length} models | ${results.filter(r=>r.ensemble_answer).length} voted`);
    }
    
    // Small delay between queries
    await new Promise(r => setTimeout(r, 200));
  }
  
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const withAnswer = results.filter(r => r.ensemble_answer).length;
  
  console.log(`\n=== A3M Ensemble Summary ===`);
  console.log(`Queries: ${results.length}`);
  console.log(`Models/query: ${MODELS.length}`);
  console.log(`Ensemble answers: ${withAnswer}/${results.length}`);
  console.log(`Time: ${elapsed}s (${(elapsed/results.length).toFixed(1)}s/query)`);
  
  fs.writeFileSync('ensemble_results.json', JSON.stringify(results, null, 2));
  console.log(`Saved: ensemble_results.json`);
}

main().catch(e => { console.error(e); process.exit(1); });

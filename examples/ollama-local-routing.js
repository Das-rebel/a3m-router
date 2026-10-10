/**
 * A3M Router + Ollama Local Model Routing
 *
 * Demonstrates intelligent routing between local Ollama models
 * for maximum speed on edge devices (M1/M2 Mac, Raspberry Pi, Jetson).
 *
 * Models:
 * - qwen3:0.6b: 40.2 tok/s — FAST LANE (simple queries)
 * - qwen2.5:3b: 15-20 tok/s — CAPABILITY LANE (reasoning, tools)
 *
 * Usage:
 *  1. ollama serve &
 *  2. ollama run qwen3:0.6b &
 *  3. ollama run qwen2.5:3b &
 *  4. node examples/ollama-local-routing.js
 */

const { createA3MRouter } = require('adaptive-memory-multi-model-router');

async function main() {
  // Create router with Ollama as the ONLY provider (local, no cloud)
  const router = createA3MRouter({
    providers: ['ollama'],
    ollamaUrl: 'http://localhost:11434/v1',
    models: ['qwen3:0.6b', 'qwen2.5:3b'],
    
    // Tier mapping: A3M routes simple queries to cheapest/fastest model
    tierMapping: {
      'qwen3:0.6b': 'free',   // Fastest, lowest tier
      'qwen2.5:3b': 'cheap',  // Reasoning, slightly higher tier
    },
    
    // Speed-optimized settings for local models
    speed: {
      flashAttention: true,  // Ollama env: OLLAMA_FLASH_ATTENTION=1
      kvCacheType: 'q8_0',   // Ollama env: OLLAMA_KV_CACHE_TYPE=q8_0
    },
  });

  console.log('A3M Router started — Ollama local routing\n');
  console.log('Models:', Object.keys(router.models).join(', '));

  // Test 1: Simple query → should route to qwen3:0.6b (fastest)
  console.log('\n--- Test 1: Simple Q&A ---');
  const simpleResult = await router.route('What is the capital of France?');
  console.log('Routed to:', simpleResult.primary_model);
  console.log('Answer:', simpleResult.response);

  // Test 2: Reasoning task → should route to qwen2.5:3b
  console.log('\n--- Test 2: Reasoning Task ---');
  const reasoningResult = await router.route(
    'If a train travels at 60 mph for 2 hours and then at 40 mph for 3 hours, what is the total distance?'
  );
  console.log('Routed to:', reasoningResult.primary_model);
  console.log('Answer:', reasoningResult.response);

  // Test 3: Code generation → should route to qwen2.5:3b
  console.log('\n--- Test 3: Code Generation ---');
  const codeResult = await router.route(
    'Write a Python function to calculate fibonacci with memoization'
  );
  console.log('Routed to:', codeResult.primary_model);
  console.log('Answer:', codeResult.response);

  // Test 4: Tool-requiring query → should route to qwen2.5:3b
  console.log('\n--- Test 4: Tool-Requiring Query ---');
  const toolResult = await router.route(
    'You have a calculator. Compute 15 * 27 using the calculator tool.'
  );
  console.log('Routed to:', toolResult.primary_model);
  console.log('Answer:', toolResult.response);

  // Test 5: Parallel execution on multiple queries
  console.log('\n--- Test 5: Parallel Queries ---');
  const parallelResults = await router.routeBatch([
    'What is 2+2?',
    'Write a haiku about AI.',
    'Explain quantum entanglement simply.',
  ]);
  console.log('Results:');
  parallelResults.forEach((r, i) => {
    console.log(`  ${i+1}. [${r.primary_model}] ${r.response.substring(0, 60)}...`);
  });

  // Test 6: Semantic caching (repeat the simple query)
  console.log('\n--- Test 6: Semantic Cache Hit ---');
  const cachedResult = await router.route('What is the capital of France?');
  console.log('Routed to:', cachedResult.primary_model);
  console.log('Cached:', cachedResult.cached || false);

  // Show cost analytics
  console.log('\n--- Cost Analytics (Local: $0) ---');
  console.log('RouterArena baseline cost:', router.costTracker.formatPerK());
  console.log('Models used:', router.costTracker.getModelsUsed());
}

main().catch(console.error);

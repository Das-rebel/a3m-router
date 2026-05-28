/**
 * A3M Router — LangChain Integration Example
 *
 * Run with: npx ts-node integrations/langchain/example.ts
 * Or: npx tsx integrations/langchain/example.ts
 *
 * Prerequisites:
 *   npm install @langchain/core
 *   export GROQ_API_KEY=gsk_your_key_here
 *   export OPENAI_API_KEY=sk-your-key-here
 */

// ============================================================
// Example 1: Basic Usage (Single Provider Routing)
// ============================================================

import { A3MLLM, A3M_DEFAULT_PROVIDERS } from './a3m_langchain';

async function exampleBasic() {
  console.log('\n=== Example 1: Basic Routing ===\n');

  const llm = new A3MLLM({
    providers: {
      groq: {
        ...A3M_DEFAULT_PROVIDERS.groq,
        apiKey: process.env.GROQ_API_KEY,
      },
    },
    temperature: 0.7,
  });

  const response = await llm.invoke('What is the capital of France?');
  console.log('Response:', response);
}

// ============================================================
// Example 2: Multi-Provider with Cost-Based Routing
// ============================================================

async function exampleMultiProvider() {
  console.log('\n=== Example 2: Multi-Provider Cost-Based Routing ===\n');

  const llm = new A3MLLM({
    providers: {
      groq: {
        ...A3M_DEFAULT_PROVIDERS.groq,
        apiKey: process.env.GROQ_API_KEY,
      },
      openai: {
        ...A3M_DEFAULT_PROVIDERS.openai,
        apiKey: process.env.OPENAI_API_KEY,
      },
      nvidia: {
        ...A3M_DEFAULT_PROVIDERS.nvidia,
        apiKey: process.env.NVIDIA_API_KEY,
      },
    },
    routingStrategy: 'cheapest', // Auto-pick the cheapest available provider
    fallbackEnabled: true,       // Fall back to next provider on failure
    onRoute: (info) => {
      console.log(`[Route] ${info.strategy} → ${info.provider}/${info.model}`);
    },
    onError: (info) => {
      console.log(`[Error] ${info.provider}: ${info.error} (fallback: ${info.willFallback})`);
    },
  });

  const { text, metadata } = await llm.invokeWithMetadata(
    'Explain quantum entanglement in simple terms.',
  );

  console.log('Response:', text.slice(0, 200), '...');
  console.log('Routing Metadata:', JSON.stringify(metadata, null, 2));
}

// ============================================================
// Example 3: Ensemble Mode (Parallel Execution)
// ============================================================

async function exampleEnsemble() {
  console.log('\n=== Example 3: Ensemble Mode (Parallel Execution) ===\n');

  const llm = new A3MLLM({
    providers: {
      groq: {
        ...A3M_DEFAULT_PROVIDERS.groq,
        apiKey: process.env.GROQ_API_KEY,
      },
      openai: {
        ...A3M_DEFAULT_PROVIDERS.openai,
        apiKey: process.env.OPENAI_API_KEY,
      },
    },
    routingStrategy: 'priority',
    priorityOrder: ['groq', 'openai'],
  });

  // Run both providers in parallel, return the longest response
  const result = await llm.ensembleInvoke(
    'Write a haiku about artificial intelligence.',
    {
      ensemble: 'longest',
    },
  );

  console.log('Merged Response:', result.text);
  console.log('Ensemble Metadata:', JSON.stringify(result.metadata, null, 2));
}

// ============================================================
// Example 4: LangChain Chain Integration
// ============================================================

import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

async function exampleChain() {
  console.log('\n=== Example 4: LangChain Chain Integration ===\n');

  const llm = new A3MLLM({
    providers: {
      groq: {
        ...A3M_DEFAULT_PROVIDERS.groq,
        apiKey: process.env.GROQ_API_KEY,
      },
    },
    temperature: 0.7,
  });

  // Create a chain with prompt template
  const prompt = PromptTemplate.fromTemplate(
    'You are a {role}. Answer the following question:\n{question}',
  );

  // Chain: prompt → LLM → string output parser
  const chain = prompt.pipe(llm as any).pipe(new StringOutputParser());

  const response = await chain.invoke({
    role: 'physics professor',
    question: 'Why is the sky blue?',
  });

  console.log('Chain Response:', response);
}

// ============================================================
// Example 5: Custom Provider Configuration
// ============================================================

async function exampleCustomProvider() {
  console.log('\n=== Example 5: Custom Provider Configuration ===\n');

  const llm = new A3MLLM({
    providers: {
      ollama: {
        name: 'Ollama Local',
        baseUrl: 'http://127.0.0.1:11434/v1/chat/completions',
        models: ['llama3', 'mistral'],
        tier: 'free',
        cost: { input: 0, output: 0 },
      },
      lmstudio: {
        name: 'LM Studio',
        baseUrl: 'http://127.0.0.1:1234/v1/chat/completions',
        models: ['local-model'],
        tier: 'free',
        cost: { input: 0, output: 0 },
      },
    },
    routingStrategy: 'priority',
    priorityOrder: ['ollama', 'lmstudio'],
  });

  console.log('Trying local provider...');
  try {
    const response = await llm.invoke('Hello, who are you?');
    console.log('Response:', response);
  } catch (error) {
    console.log('Local provider unavailable (expected if Ollama is not running).');
  }
}

// ============================================================
// Example 6: Access Routing Metadata
// ============================================================

async function exampleMetadata() {
  console.log('\n=== Example 6: Accessing Routing Metadata ===\n');

  const llm = new A3MLLM({
    providers: {
      groq: {
        ...A3M_DEFAULT_PROVIDERS.groq,
        apiKey: process.env.GROQ_API_KEY,
      },
    },
    onRoute: (info) => {
      console.log(`Routing to: ${info.provider} → ${info.model}`);
    },
  });

  // Use invokeWithMetadata to get full routing info
  const { text, metadata } = await llm.invokeWithMetadata(
    'What is 2 + 2?',
  );

  console.log('Response:', text);
  console.log('--- Routing Metadata ---');
  console.log(`Provider:     ${metadata.provider}`);
  console.log(`Model:        ${metadata.model}`);
  console.log(`Latency:      ${metadata.latencyMs}ms`);
  console.log(`Cost:         $${metadata.costUsd}`);
  console.log(`Tier:         ${metadata.tier}`);
  console.log(`Ensemble:     ${metadata.ensemble}`);
  if (metadata.tokensUsed) {
    console.log(`Tokens Used:  ${metadata.tokensUsed.total} (${metadata.tokensUsed.input} in / ${metadata.tokensUsed.output} out)`);
  }
}

// ============================================================
// Example 7: Factory Function (Quick Start)
// ============================================================

import { createA3MProvider, createA3MRouter } from './a3m_langchain';

async function exampleFactory() {
  console.log('\n=== Example 7: Factory Functions ===\n');

  // Quick single-provider LLM
  const groq = createA3MProvider('groq', {
    apiKey: process.env.GROQ_API_KEY,
  });
  const response1 = await groq.invoke('Say hello!');
  console.log('Single provider:', response1);

  // Auto-routing across multiple providers
  const router = createA3MRouter({
    groq: { apiKey: process.env.GROQ_API_KEY },
    nvidia: { apiKey: process.env.NVIDIA_API_KEY },
  });

  const { text, metadata } = await router.invokeWithMetadata(
    'What is the speed of light?',
  );
  console.log('Auto-routed response:', text.slice(0, 100));
  console.log('Selected provider:', metadata.provider);
  console.log('Cost: $' + metadata.costUsd);
}

// ============================================================
// Run All Examples
// ============================================================

async function main() {
  console.log('A3M Router — LangChain Integration Examples');
  console.log('==========================================');
  console.log('Requires at least one API key (GROQ_API_KEY, OPENAI_API_KEY, etc.)');

  try {
    // Run examples that don't require API keys first
    // (they'll error gracefully if no provider is available)

    // Example 5 (custom) runs even without external API keys
    if (process.env.GROQ_API_KEY) {
      await exampleBasic();
      await exampleMultiProvider();
      await exampleChain();
      await exampleMetadata();
      await exampleFactory();
    }

    if (process.env.GROQ_API_KEY && process.env.OPENAI_API_KEY) {
      await exampleEnsemble();
    }

    await exampleCustomProvider();
  } catch (error) {
    console.error('Example failed:', error);
  }

  console.log('\nDone!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

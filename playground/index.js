// A3M Router Playground - Try it live!
const { createA3MRouter, routeQuery, getAvailableProviders } = require('adaptive-memory-multi-model-router');

console.log('🚀 A3M Router Playground\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Show available providers
console.log('📡 Available Providers:');
const providers = getAvailableProviders();
for (const [id, p] of Object.entries(providers)) {
  console.log(`  ✅ ${id}: ${p.models.length} models (${p.type})`);
}

console.log('\n🔀 Routing Examples:\n');

// Example 1: Simple query
const simple = routeQuery("What is 2+2?");
console.log('1. "What is 2+2?"');
console.log(`   → ${simple.primary_model}`);
console.log(`   → Est. Cost: $${simple.estimated_cost.toFixed(6)}`);
console.log(`   → Reason: ${simple.reasoning}\n`);

// Example 2: Code query
const code = routeQuery("Write Python to reverse a string");
console.log('2. "Write Python to reverse a string"');
console.log(`   → ${code.primary_model}`);
console.log(`   → Est. Cost: $${code.estimated_cost.toFixed(6)}`);
console.log(`   → Reason: ${code.reasoning}\n`);

// Example 3: Complex query
const complex = routeQuery("Explain quantum entanglement");
console.log('3. "Explain quantum entanglement"');
console.log(`   → ${complex.primary_model}`);
console.log(`   → Est. Cost: $${complex.estimated_cost.toFixed(6)}`);
console.log(`   → Reason: ${complex.reasoning}\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('Try editing the queries above and see how routing changes!');
console.log('═══════════════════════════════════════════════════════════════');

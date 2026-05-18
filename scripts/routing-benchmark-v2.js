#!/usr/bin/env node
/**
 * A3M Router — Routing Accuracy Benchmark v2.0
 * 
 * Tests the complexity classifier's ability to sort queries into tiers.
 * RouteLLM-inspired methodology (arXiv:2404.06035).
 * 
 * This version tests COMPLEXITY SCORING (the core routing logic),
 * not provider selection (which depends on API key availability).
 */

const { extractQueryFeatures } = require('../dist/routing/advancedRouter.js');

// Tier boundaries (from providerConfig.ts routing logic)
function classifyComplexity(complexity) {
  if (complexity < 0.25) return 'free';
  if (complexity < 0.45) return 'cheap';
  if (complexity < 0.65) return 'mid';
  return 'premium';
}

// ============================================================
// TEST SET — Curated from MMLU/GSM8K/HumanEval task categories
// Each query has ground-truth difficulty (0-100) and expected tier
// ============================================================

const TEST_SET = [
  // SIMPLE (50) — trivial lookup, basic math, yes/no
  ...[
    "What is 2+2?", "What is the capital of France?", "How do you say hello in Spanish?",
    "What day is Christmas?", "Convert 100 Celsius to Fahrenheit", "What is the largest planet?",
    "How many days in a year?", "What color is the sky?", "What is 10 * 5?",
    "Who wrote Romeo and Juliet?", "What is the boiling point of water?", "What is 1 mile in km?",
    "How many continents are there?", "What is HTML?", "Define photosynthesis briefly",
    "What is the speed of light?", "How many ounces in a pound?", "When did WWII end?",
    "What is a noun?", "Is Python a programming language?", "Square root of 144?",
    "Who is the US president?", "What is an API?", "How many US states?",
    "Chemical formula for water?", "What language is spoken in Brazil?", "What is 15% of 200?",
    "Name three primary colors", "What is gravity?", "What does CPU stand for?",
    "How many legs does a spider have?", "Opposite of hot?", "First 5 prime numbers",
    "What is a database?", "Who painted the Mona Lisa?", "What is 7 * 8?",
    "Currency of Japan?", "What is an adjective?", "Temperature water freezes?",
    "How many planets in the solar system?", "What is a URL?", "Convert 5km to miles",
    "Tallest mountain?", "What is SSH?", "How many vowels in English?",
    "What is a rectangle?", "Synonym for happy", "What does CEO stand for?",
    "What is the alphabet?", "Name a mammal",
  ].map(q => ({ q, expected: 'free', difficulty: 5 })),

  // MEDIUM (60) — code, summarization, translation, moderate explanation
  ...[
    "Write a Python function to reverse a string", "Summarize this article about climate change",
    "Translate this paragraph from English to French", "Write a JavaScript sort function",
    "Explain the difference between let, const, and var", "Write a SQL query for top 10 customers",
    "Summarize key findings of this research paper", "Write a regex for email addresses",
    "Explain REST API best practices", "Write a Python script to read CSV files",
    "Translate good morning to Japanese", "Write a CSS flexbox navbar",
    "Summarize Romeo and Juliet in 100 words", "Write a function to merge sorted lists",
    "Explain Docker containers vs VMs", "Write an Express route for user registration",
    "Convert this Python code to JavaScript", "Summarize quarterly earnings highlights",
    "Write a Python decorator for caching", "Difference between TCP and UDP",
    "Write a TypeScript interface for User model", "Generate a README template",
    "Write unit tests for email validation", "Summarize AWS re:Invent announcements",
    "Write a Git commit message for a bug fix", "Explain the MVC pattern",
    "Write a Python class for linked list", "Create a JSON schema for product catalog",
    "Translate technical docs from German to English", "Write a bash backup script",
    "Explain garbage collection", "Write a React search component with debounce",
    "Summarize SQL vs NoSQL differences", "Write a Python credit card validator",
    "Explain OAuth 2.0 flow", "Write a MongoDB aggregation for sales analytics",
    "Create a GitHub Actions CI/CD workflow", "Summarize JavaScript ES2024 features",
    "Write a Python longest common subsequence", "Explain Node.js event loop",
    "Write a GraphQL resolver for blog posts", "Translate error message from Spanish",
    "Write async Python to fetch multiple URLs", "Summarize Atomic Habits in 5 takeaways",
    "Write a Terraform config for S3 bucket", "Explain CAP theorem in distributed systems",
    "Write a FastAPI endpoint with validation", "Create a Dockerfile for Flask app",
    "Summarize GDPR requirements for developers", "Write a K8s deployment YAML",
    "Explain authentication vs authorization", "Write a Python web scraper",
    "Write a Redis Lua rate limiter", "Summarize HTTP/3 RFC simply",
    "Write a TypeScript deep partial utility", "Explain WebSockets vs SSE",
    "Write a Python dataclass for API response", "Create an OpenAPI spec for todo API",
    "Summarize SOLID principles with examples", "Write a Rust CSV parser",
  ].map(q => ({ q, expected: 'cheap', difficulty: 40 })),

  // COMPLEX (50) — reasoning, analysis, system design
  ...[
    "Analyze the economic implications of AI automation on developing countries",
    "Write a detailed technical design document for a microservices architecture",
    "Compare foreign policy approaches of the US and China toward Southeast Asia",
    "Design a database schema for an e-commerce platform with inventory management",
    "Write a comprehensive literature review on transformer architectures",
    "Analyze pros and cons of microservices vs monolith for a startup",
    "Create a strategic plan for migrating a legacy system to cloud-native",
    "Explain the mathematical foundations of backpropagation in neural networks",
    "Write a detailed analysis of cryptocurrency regulation across jurisdictions",
    "Design a real-time analytics pipeline for 1M events per second",
    "Analyze the impact of social media algorithms on democratic discourse",
    "Write a patent application draft for a novel ML algorithm",
    "Compare security models of AWS, Azure, and GCP for enterprise workloads",
    "Design a fault-tolerant distributed system for financial transactions",
    "Analyze ethical implications of AI in hiring decisions",
    "Write a research proposal on quantum computing in drug discovery",
    "Explain the proof of the Central Limit Theorem and its practical implications",
    "Design an auth system for a multi-tenant SaaS platform",
    "Analyze the competitive landscape of the electric vehicle market in 2026",
    "Write a technical whitepaper on zero-knowledge proofs for blockchain privacy",
    "Explain the theoretical basis of reinforcement learning from human feedback",
    "Design a CI/CD pipeline for a mission-critical healthcare application",
    "Compare GDP growth models for emerging economies post-pandemic",
    "Write a formal proof that quicksort has expected O(n log n) complexity",
    "Analyze the impact of climate change policies on global energy markets",
    "Design a ML pipeline for real-time fraud detection",
    "Explain the philosophical implications of artificial general intelligence",
    "Write a competitive analysis for entering the Indian SaaS market",
    "Design a scalable WebSocket architecture for a multiplayer game server",
    "Analyze income inequality and social mobility using OECD data",
    "Write a comprehensive disaster recovery plan for a financial institution",
    "Explain the mathematics behind attention mechanisms in transformers",
    "Design a data warehouse schema for a retail chain with 1000+ stores",
    "Analyze geopolitical implications of rare earth mineral supply chains",
    "Write a technical specification for an autonomous vehicle sensor fusion system",
    "Compare serverless vs container-based architectures for event-driven systems",
    "Design a privacy-preserving analytics system using differential privacy",
    "Analyze effectiveness of carbon pricing mechanisms across the EU",
    "Write a grant proposal for research on LLM safety",
    "Design a real-time recommendation engine for Netflix-scale",
    "Explain computational complexity of different consensus algorithms",
    "Analyze supply chain disruptions and propose mitigation strategies",
    "Write a test strategy for an autonomous drone navigation system",
    "Compare monorepo vs polyrepo strategies for a 200-engineer org",
    "Design an event-sourced architecture for a banking core system",
    "Analyze the impact of demographic transitions on pension systems",
    "Write a formal verification proof for a concurrent data structure",
    "Design a multi-region deployment strategy with less than 100ms latency",
    "Compare different approaches to interpretable machine learning",
    "Analyze the regulatory landscape for AI-generated content and copyright",
  ].map(q => ({ q, expected: 'mid', difficulty: 75 })),

  // EXPERT (40) — specialized professional domains
  ...[
    "Review this legal contract for potential liability issues in a merger agreement",
    "Analyze this medical literature on COVID-19 treatment protocols for contradictions",
    "Perform a comprehensive security audit of this authentication flow",
    "Write a detailed financial model for Series B startup valuation with sensitivity analysis",
    "Analyze constitutional implications of AI surveillance on Fourth Amendment rights",
    "Design a clinical trial protocol for a novel oncology drug",
    "Perform a formal code review of this cryptographic implementation for timing attacks",
    "Write an expert witness report on semiconductor patent infringement",
    "Analyze genome-wide association study data to identify candidate loci for diabetes",
    "Design a zero-trust network architecture for critical infrastructure",
    "Write a tax optimization strategy for a multinational in 15 jurisdictions",
    "Analyze legal precedent for AI-generated works in copyright across 5 jurisdictions",
    "Design a phase III clinical trial with adaptive endpoints for rare disease",
    "Perform a quantitative risk assessment for a nuclear power plant safety system",
    "Write an SEC 10-K filing analysis with forward-looking earnings projection",
    "Analyze regulatory requirements for medical device software under FDA 21 CFR Part 820",
    "Design a quantum-safe cryptographic migration plan for a government agency",
    "Write a pharmacoeconomic analysis comparing biologic therapies for rheumatoid arthritis",
    "Perform due diligence analysis on a potential acquisition in the semiconductor industry",
    "Analyze the legal framework for cross-border data transfers under GDPR and CCPA",
    "Design a real-time embedded system safety case for an autonomous surgical robot",
    "Write a penetration testing report with remediation priorities for a banking application",
    "Analyze derivative pricing models for exotic options in volatile markets",
    "Design a compliance monitoring system for anti-money laundering regulations",
    "Write an amicus brief on application of the Computer Fraud and Abuse Act to web scraping",
    "Analyze longitudinal cohort study data for cardiovascular risk factors with Cox regression",
    "Design a secure supply chain verification system using blockchain and IoT sensors",
    "Write an investment thesis for a climate tech venture capital fund",
    "Analyze legal liability implications of autonomous vehicle accidents",
    "Design a clinical decision support system integrated with EHR for sepsis prediction",
    "Perform a threat model analysis for a connected medical device ecosystem",
    "Write an M&A integration plan addressing cultural, technical, and financial considerations",
    "Analyze Supreme Court rulings on digital privacy and implications for tech companies",
    "Design an ML model monitoring system for detecting drift in production models",
    "Write a regulatory impact assessment for proposed AI governance legislation",
    "Analyze epidemiological data on vaccine efficacy across demographic groups",
    "Design a secure multi-party computation protocol for collaborative financial risk analysis",
    "Write a forensic accounting report identifying potential embezzlement patterns",
    "Analyze constitutional challenges of mandatory DNA databases for law enforcement",
    "Design a failsafe control system for an autonomous nuclear reactor shutdown mechanism",
  ].map(q => ({ q, expected: 'premium', difficulty: 93 })),
];

// ============================================================
// RUN BENCHMARK
// ============================================================

function run() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  A3M Router — Complexity Classification Benchmark v2.0         ║");
  console.log("║  200 queries · 4 tiers · RouteLLM methodology                  ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log("");

  const stats = {
    total: TEST_SET.length,
    correct: 0,
    adjacent: 0, // off by one tier
    by_tier: { free: { correct: 0, total: 0 }, cheap: { correct: 0, total: 0 }, mid: { correct: 0, total: 0 }, premium: { correct: 0, total: 0 } },
    confusion: { free: {}, cheap: {}, mid: {}, premium: {} },
    complexity_scores: [],
    over_routed: 0, // routed higher than needed
    under_routed: 0, // routed lower than needed
  };
  for (const t of ['free','cheap','mid','premium']) {
    for (const r of ['free','cheap','mid','premium']) {
      stats.confusion[t][r] = 0;
    }
  }

  const tier_order = ['free', 'cheap', 'mid', 'premium'];
  const misclassifications = [];

  for (const test of TEST_SET) {
    const features = extractQueryFeatures(test.q);
    const predicted = classifyComplexity(features.complexity);
    const expected = test.expected;

    stats.complexity_scores.push({ expected, predicted, complexity: features.complexity });

    stats.by_tier[expected].total++;
    stats.confusion[expected][predicted]++;

    if (predicted === expected) {
      stats.correct++;
      stats.by_tier[expected].correct++;
    } else {
      const pred_idx = tier_order.indexOf(predicted);
      const exp_idx = tier_order.indexOf(expected);
      if (Math.abs(pred_idx - exp_idx) === 1) stats.adjacent++;
      if (pred_idx > exp_idx) stats.over_routed++;
      else stats.under_routed++;

      misclassifications.push({
        q: test.q.substring(0, 65),
        expected,
        predicted,
        complexity: features.complexity.toFixed(3),
        features: [
          features.has_code ? 'code' : '',
          features.has_math ? 'math' : '',
          features.requires_reasoning ? 'reason' : '',
          features.is_creative ? 'creative' : '',
          features.is_security ? 'security' : '',
          features.is_data ? 'data' : '',
        ].filter(Boolean).join(','),
      });
    }
  }

  const accuracy = (stats.correct / stats.total * 100).toFixed(1);
  const adj_accuracy = ((stats.correct + stats.adjacent) / stats.total * 100).toFixed(1);

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  OVERALL RESULTS");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  Queries:                 ${stats.total}`);
  console.log(`  Exact Match Accuracy:    ${stats.correct}/${stats.total} (${accuracy}%)`);
  console.log(`  ±1 Tier Accuracy:        ${stats.correct + stats.adjacent}/${stats.total} (${adj_accuracy}%)`);
  console.log(`  Over-routed (wasteful):  ${stats.over_routed} (${(stats.over_routed/stats.total*100).toFixed(1)}%)`);
  console.log(`  Under-routed (risky):    ${stats.under_routed} (${(stats.under_routed/stats.total*100).toFixed(1)}%)`);
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  ACCURACY BY TIER");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  ${'Tier'.padEnd(12)} ${'Correct'.padEnd(10)} ${'Total'.padEnd(8)} ${'Accuracy'.padEnd(10)} Recall`);
  console.log(`  ${'─'.repeat(55)}`);
  for (const tier of tier_order) {
    const d = stats.by_tier[tier];
    const pct = d.total > 0 ? (d.correct / d.total * 100).toFixed(1) : '0.0';
    console.log(`  ${tier.padEnd(12)} ${String(d.correct).padEnd(10)} ${String(d.total).padEnd(8)} ${pct.padEnd(10)}%`);
  }
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  CONFUSION MATRIX");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  ${'Expected →'.padEnd(14)} ${'free'.padEnd(8)} ${'cheap'.padEnd(8)} ${'mid'.padEnd(8)} ${'premium'}`);
  console.log(`  ${'─'.repeat(50)}`);
  for (const exp of tier_order) {
    const total = Object.values(stats.confusion[exp]).reduce((a,b)=>a+b,0);
    const parts = tier_order.map(pred => {
      const n = stats.confusion[exp][pred];
      return n > 0 ? `${n}`.padStart(3) + (pred === exp ? '✓' : ' ') : '  0 ';
    });
    console.log(`  ${exp.padEnd(14)} ${parts.join('   ')}`);
  }
  console.log("");

  // Average complexity per expected tier
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  COMPLEXITY SCORE DISTRIBUTION");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  for (const tier of tier_order) {
    const scores = stats.complexity_scores.filter(s => s.expected === tier).map(s => s.complexity);
    const avg = (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(3);
    const min = Math.min(...scores).toFixed(3);
    const max = Math.max(...scores).toFixed(3);
    const bar = '█'.repeat(Math.round(parseFloat(avg) * 30));
    console.log(`  ${tier.padEnd(12)} avg=${avg}  range=[${min}, ${max}]  ${bar}`);
  }
  console.log("");

  // Cost projection
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  COST PROJECTION (based on routing decisions)");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  const TIER_COSTS = { free: 0, cheap: 0.59, mid: 2.00, premium: 2.50 };
  let a3m_cost = 0, premium_cost = 0;
  for (const s of stats.complexity_scores) {
    const tokens = 500; // avg tokens per query
    a3m_cost += tokens * TIER_COSTS[s.predicted] / 1_000_000;
    premium_cost += tokens * TIER_COSTS.premium / 1_000_000;
  }
  const savings = ((1 - a3m_cost / premium_cost) * 100).toFixed(1);
  console.log(`  A3M Router (200 queries):   $${a3m_cost.toFixed(6)}`);
  console.log(`  All-Premium (200 queries):  $${premium_cost.toFixed(6)}`);
  console.log(`  Estimated Savings:          ${savings}%`);
  console.log(`  At 100K queries/mo:         Save $${(premium_cost * 500 - a3m_cost * 500).toFixed(2)}/mo`);
  console.log("");

  // Sample misclassifications
  if (misclassifications.length > 0) {
    console.log("══════════════════════════════════════════════════════════════════");
    console.log("  SAMPLE MISCLASSIFICATIONS");
    console.log("══════════════════════════════════════════════════════════════════");
    console.log("");
    for (const m of misclassifications.slice(0, 8)) {
      const arrow = m.expected !== m.predicted ? `${m.expected} → ${m.predicted}` : m.expected;
      console.log(`  [${arrow.padEnd(20)}] complexity=${m.complexity}  features=${m.features || 'none'}`);
      console.log(`  "${m.q}..."`);
      console.log("");
    }
  }

  // Summary for README
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  README SUMMARY");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  | Metric | Score |`);
  console.log(`  |--------|-------|`);
  console.log(`  | Queries tested | ${stats.total} |`);
  console.log(`  | Exact tier match | ${accuracy}% |`);
  console.log(`  | ±1 tier accuracy | ${adj_accuracy}% |`);
  console.log(`  | Over-routing (wasteful) | ${(stats.over_routed/stats.total*100).toFixed(1)}% |`);
  console.log(`  | Under-routing (risky) | ${(stats.under_routed/stats.total*100).toFixed(1)}% |`);
  console.log(`  | Cost savings vs all-premium | ${savings}% |`);
  console.log("");

  // Save JSON
  const fs = require('fs');
  const summary = {
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    queries: stats.total,
    exact_accuracy: parseFloat(accuracy),
    adjacent_accuracy: parseFloat(adj_accuracy),
    over_routed: stats.over_routed,
    under_routed: stats.under_routed,
    cost_savings_vs_premium: parseFloat(savings),
    by_tier: stats.by_tier,
    confusion: stats.confusion,
  };
  fs.writeFileSync('benchmark-results.json', JSON.stringify(summary, null, 2));
  console.log("  📊 Saved to benchmark-results.json");
}

run();

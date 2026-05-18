#!/usr/bin/env node
/**
 * A3M Router — Routing Accuracy Benchmark
 * 
 * Tests the router's ability to classify query complexity and route to
 * the appropriate provider tier. Inspired by RouteLLM (arXiv:2404.06035).
 * 
 * Methodology:
 * 1. Define a labeled test set with known difficulty levels
 * 2. Route each query through A3M Router
 * 3. Measure: routing accuracy, cost savings, tier distribution
 * 4. Compare against baselines: all-premium, all-cheap, random
 */

const { routeQuery, extractQueryFeatures } = require('../dist/routing/advancedRouter.js');

// ============================================================
// TEST SET — 200 queries with known ground-truth difficulty
// Based on MMLU/GSM8K/HumanEval task categories
// Difficulty: "simple" (0-30), "medium" (30-60), "complex" (60-80), "expert" (80-100)
// ============================================================

const TEST_QUERIES = [
  // === SIMPLE (50 queries) — trivial Q&A, basic lookup, simple math ===
  { q: "What is 2+2?", difficulty: 5, category: "math", expected_tier: "free" },
  { q: "What is the capital of France?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "How do you say hello in Spanish?", difficulty: 8, category: "translation", expected_tier: "free" },
  { q: "What day is Christmas?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "Convert 100 Celsius to Fahrenheit", difficulty: 10, category: "math", expected_tier: "free" },
  { q: "What is the largest planet in our solar system?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "How many days in a year?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What color is the sky?", difficulty: 2, category: "knowledge", expected_tier: "free" },
  { q: "What is 10 * 5?", difficulty: 5, category: "math", expected_tier: "free" },
  { q: "Who wrote Romeo and Juliet?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is the boiling point of water?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "Translate 'thank you' to French", difficulty: 8, category: "translation", expected_tier: "free" },
  { q: "What is 1 mile in kilometers?", difficulty: 8, category: "math", expected_tier: "free" },
  { q: "How many continents are there?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is HTML?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "Define 'photosynthesis' in one sentence", difficulty: 10, category: "knowledge", expected_tier: "free" },
  { q: "What is the speed of light?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "How many ounces in a pound?", difficulty: 5, category: "math", expected_tier: "free" },
  { q: "What year did World War II end?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is a noun?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "Is Python a programming language?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is the square root of 144?", difficulty: 8, category: "math", expected_tier: "free" },
  { q: "Who is the president of the United States?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is an API?", difficulty: 10, category: "knowledge", expected_tier: "free" },
  { q: "How many states are in the USA?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is the chemical formula for water?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What language is spoken in Brazil?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is 15% of 200?", difficulty: 8, category: "math", expected_tier: "free" },
  { q: "Name three primary colors", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is gravity?", difficulty: 8, category: "knowledge", expected_tier: "free" },
  { q: "What does CPU stand for?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is the time in New York?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "How many legs does a spider have?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is 50 degrees Fahrenheit in Celsius?", difficulty: 8, category: "math", expected_tier: "free" },
  { q: "What is the opposite of 'hot'?", difficulty: 2, category: "knowledge", expected_tier: "free" },
  { q: "List the first 5 prime numbers", difficulty: 8, category: "math", expected_tier: "free" },
  { q: "What is a database?", difficulty: 10, category: "knowledge", expected_tier: "free" },
  { q: "Who painted the Mona Lisa?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is 7 * 8?", difficulty: 5, category: "math", expected_tier: "free" },
  { q: "What is the currency of Japan?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is an adjective?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What temperature does water freeze?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "How many planets in the solar system?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is a URL?", difficulty: 8, category: "knowledge", expected_tier: "free" },
  { q: "Convert 5 kilometers to miles", difficulty: 8, category: "math", expected_tier: "free" },
  { q: "What is the tallest mountain?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "What is SSH?", difficulty: 10, category: "knowledge", expected_tier: "free" },
  { q: "How many vowels in English?", difficulty: 3, category: "knowledge", expected_tier: "free" },
  { q: "What is a rectangle?", difficulty: 5, category: "knowledge", expected_tier: "free" },
  { q: "Name a synonym for 'happy'", difficulty: 3, category: "knowledge", expected_tier: "free" },

  // === MEDIUM (60 queries) — code, summarization, translation ===
  { q: "Write a Python function to reverse a string", difficulty: 35, category: "code", expected_tier: "cheap" },
  { q: "Summarize this article about climate change in 3 bullet points", difficulty: 40, category: "summarization", expected_tier: "cheap" },
  { q: "Translate this paragraph from English to French", difficulty: 35, category: "translation", expected_tier: "cheap" },
  { q: "Write a JavaScript function to sort an array of objects by a property", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Explain the difference between let, const, and var in JavaScript", difficulty: 35, category: "code", expected_tier: "cheap" },
  { q: "Write a SQL query to find the top 10 customers by revenue", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Summarize the key findings of this research paper on sleep", difficulty: 45, category: "summarization", expected_tier: "cheap" },
  { q: "Write a regex to match email addresses", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Explain REST API design best practices", difficulty: 40, category: "explanation", expected_tier: "cheap" },
  { q: "Write a Python script to read a CSV and calculate averages", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Translate 'Good morning, how are you?' to Japanese", difficulty: 30, category: "translation", expected_tier: "cheap" },
  { q: "Write a CSS flexbox layout for a responsive navbar", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Summarize the plot of Romeo and Juliet in 100 words", difficulty: 35, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Python function to merge two sorted lists", difficulty: 38, category: "code", expected_tier: "cheap" },
  { q: "Explain Docker containers vs VMs in simple terms", difficulty: 40, category: "explanation", expected_tier: "cheap" },
  { q: "Write a Node.js Express route handler for user registration", difficulty: 42, category: "code", expected_tier: "cheap" },
  { q: "Convert this Python code to JavaScript", difficulty: 42, category: "code", expected_tier: "cheap" },
  { q: "Summarize the quarterly earnings report highlights", difficulty: 45, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Python decorator that caches function results", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Explain the difference between TCP and UDP", difficulty: 35, category: "explanation", expected_tier: "cheap" },
  { q: "Write a TypeScript interface for a User model", difficulty: 35, category: "code", expected_tier: "cheap" },
  { q: "Generate a README template for a Node.js project", difficulty: 35, category: "code", expected_tier: "cheap" },
  { q: "Write unit tests for a Python function that validates emails", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Summarize the key points of the latest AWS re:Invent announcements", difficulty: 45, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Git commit message for a bug fix", difficulty: 30, category: "code", expected_tier: "cheap" },
  { q: "Explain the MVC architecture pattern", difficulty: 38, category: "explanation", expected_tier: "cheap" },
  { q: "Write a Python class for a linked list with insert and delete", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Create a JSON schema for a product catalog", difficulty: 38, category: "code", expected_tier: "cheap" },
  { q: "Translate this technical documentation from German to English", difficulty: 42, category: "translation", expected_tier: "cheap" },
  { q: "Write a bash script to backup a directory", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Explain what garbage collection is in programming", difficulty: 35, category: "explanation", expected_tier: "cheap" },
  { q: "Write a React component for a search input with debounce", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Summarize the differences between SQL and NoSQL databases", difficulty: 40, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Python function to validate a credit card number", difficulty: 42, category: "code", expected_tier: "cheap" },
  { q: "Explain OAuth 2.0 flow in simple terms", difficulty: 40, category: "explanation", expected_tier: "cheap" },
  { q: "Write a MongoDB aggregation pipeline for sales analytics", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Create a GitHub Actions workflow for CI/CD", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Summarize the latest JavaScript ES2024 features", difficulty: 40, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Python function to find the longest common subsequence", difficulty: 48, category: "code", expected_tier: "cheap" },
  { q: "Explain the event loop in Node.js", difficulty: 40, category: "explanation", expected_tier: "cheap" },
  { q: "Write a GraphQL resolver for a blog post with comments", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Translate this error message from Spanish to English", difficulty: 30, category: "translation", expected_tier: "cheap" },
  { q: "Write a Python async function to fetch multiple URLs concurrently", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Summarize the book Atomic Habits in 5 key takeaways", difficulty: 40, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Terraform config for an AWS S3 bucket", difficulty: 42, category: "code", expected_tier: "cheap" },
  { q: "Explain the CAP theorem in distributed systems", difficulty: 42, category: "explanation", expected_tier: "cheap" },
  { q: "Write a Python FastAPI endpoint with input validation", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Create a Dockerfile for a Python Flask application", difficulty: 40, category: "code", expected_tier: "cheap" },
  { q: "Summarize the GDPR key requirements for developers", difficulty: 45, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Kubernetes deployment YAML for a web service", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Explain the difference between authentication and authorization", difficulty: 35, category: "explanation", expected_tier: "cheap" },
  { q: "Write a Python script to scrape a webpage using BeautifulSoup", difficulty: 42, category: "code", expected_tier: "cheap" },
  { q: "Write a Redis Lua script for rate limiting", difficulty: 48, category: "code", expected_tier: "cheap" },
  { q: "Summarize the RFC for HTTP/3 in simple terms", difficulty: 45, category: "summarization", expected_tier: "cheap" },
  { q: "Write a TypeScript generic utility type for deep partial", difficulty: 48, category: "code", expected_tier: "cheap" },
  { q: "Explain WebSockets vs Server-Sent Events", difficulty: 38, category: "explanation", expected_tier: "cheap" },
  { q: "Write a Python dataclass for a REST API response model", difficulty: 35, category: "code", expected_tier: "cheap" },
  { q: "Create an OpenAPI spec for a todo list API", difficulty: 45, category: "code", expected_tier: "cheap" },
  { q: "Summarize the SOLID principles with one example each", difficulty: 42, category: "summarization", expected_tier: "cheap" },
  { q: "Write a Rust function to parse a CSV file", difficulty: 48, category: "code", expected_tier: "cheap" },

  // === COMPLEX (50 queries) — reasoning, analysis, creative ===
  { q: "Analyze the economic implications of AI automation on developing countries", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Write a detailed technical design document for a microservices architecture", difficulty: 78, category: "code", expected_tier: "mid" },
  { q: "Compare and contrast the foreign policy approaches of the US and China toward Southeast Asia", difficulty: 80, category: "reasoning", expected_tier: "mid" },
  { q: "Design a database schema for an e-commerce platform with inventory management", difficulty: 72, category: "code", expected_tier: "mid" },
  { q: "Write a comprehensive literature review on transformer architectures", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Analyze the pros and cons of microservices vs monolith architecture for a startup", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Create a strategic plan for migrating a legacy system to cloud-native architecture", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Explain the mathematical foundations of backpropagation in neural networks", difficulty: 82, category: "reasoning", expected_tier: "premium" },
  { q: "Write a detailed analysis of cryptocurrency regulation across different jurisdictions", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Design a real-time analytics pipeline for processing 1M events per second", difficulty: 80, category: "code", expected_tier: "mid" },
  { q: "Analyze the impact of social media algorithms on democratic discourse", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Write a patent application draft for a novel machine learning algorithm", difficulty: 85, category: "reasoning", expected_tier: "premium" },
  { q: "Compare the security models of AWS, Azure, and GCP for enterprise workloads", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Design a fault-tolerant distributed system for financial transaction processing", difficulty: 82, category: "code", expected_tier: "premium" },
  { q: "Analyze the ethical implications of using AI in hiring decisions", difficulty: 72, category: "reasoning", expected_tier: "mid" },
  { q: "Write a research proposal on quantum computing applications in drug discovery", difficulty: 85, category: "reasoning", expected_tier: "premium" },
  { q: "Explain the proof of the Central Limit Theorem and its practical implications", difficulty: 85, category: "reasoning", expected_tier: "premium" },
  { q: "Design an authentication and authorization system for a multi-tenant SaaS platform", difficulty: 78, category: "code", expected_tier: "mid" },
  { q: "Analyze the competitive landscape of the electric vehicle market in 2026", difficulty: 72, category: "reasoning", expected_tier: "mid" },
  { q: "Write a technical whitepaper on zero-knowledge proofs for blockchain privacy", difficulty: 85, category: "reasoning", expected_tier: "premium" },
  { q: "Explain the theoretical basis of reinforcement learning from human feedback", difficulty: 80, category: "reasoning", expected_tier: "mid" },
  { q: "Design a CI/CD pipeline for a mission-critical healthcare application", difficulty: 78, category: "code", expected_tier: "mid" },
  { q: "Compare GDP growth models for emerging economies post-pandemic", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Write a formal proof that quicksort has expected O(n log n) complexity", difficulty: 88, category: "reasoning", expected_tier: "premium" },
  { q: "Analyze the impact of climate change policies on global energy markets", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Design a machine learning pipeline for real-time fraud detection", difficulty: 80, category: "code", expected_tier: "mid" },
  { q: "Explain the philosophical implications of artificial general intelligence", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Write a detailed competitive analysis for entering the Indian SaaS market", difficulty: 72, category: "reasoning", expected_tier: "mid" },
  { q: "Design a scalable WebSocket architecture for a multiplayer game server", difficulty: 78, category: "code", expected_tier: "mid" },
  { q: "Analyze the relationship between income inequality and social mobility using OECD data", difficulty: 80, category: "reasoning", expected_tier: "mid" },
  { q: "Write a comprehensive disaster recovery plan for a financial institution", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Explain the mathematics behind attention mechanisms in transformers", difficulty: 85, category: "reasoning", expected_tier: "premium" },
  { q: "Design a data warehouse schema for a retail chain with 1000+ stores", difficulty: 75, category: "code", expected_tier: "mid" },
  { q: "Analyze the geopolitical implications of rare earth mineral supply chains", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Write a technical specification for an autonomous vehicle sensor fusion system", difficulty: 85, category: "code", expected_tier: "premium" },
  { q: "Compare serverless vs container-based architectures for event-driven systems", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Design a privacy-preserving analytics system using differential privacy", difficulty: 82, category: "code", expected_tier: "premium" },
  { q: "Analyze the effectiveness of carbon pricing mechanisms across the EU", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Write a grant proposal for research on large language model safety", difficulty: 80, category: "reasoning", expected_tier: "mid" },
  { q: "Design a real-time recommendation engine architecture for Netflix-scale", difficulty: 82, category: "code", expected_tier: "premium" },
  { q: "Explain the computational complexity of different consensus algorithms", difficulty: 80, category: "reasoning", expected_tier: "mid" },
  { q: "Analyze supply chain disruptions and propose mitigation strategies", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Write a comprehensive test strategy for an autonomous drone navigation system", difficulty: 82, category: "code", expected_tier: "premium" },
  { q: "Compare monorepo vs polyrepo strategies for a 200-engineer organization", difficulty: 72, category: "reasoning", expected_tier: "mid" },
  { q: "Design an event-sourced architecture for a banking core system", difficulty: 80, category: "code", expected_tier: "mid" },
  { q: "Analyze the impact of demographic transitions on pension systems", difficulty: 75, category: "reasoning", expected_tier: "mid" },
  { q: "Write a formal verification proof for a concurrent data structure", difficulty: 90, category: "reasoning", expected_tier: "premium" },
  { q: "Design a multi-region deployment strategy with <100ms latency SLA", difficulty: 80, category: "code", expected_tier: "mid" },
  { q: "Compare different approaches to interpretable machine learning", difficulty: 78, category: "reasoning", expected_tier: "mid" },
  { q: "Analyze the regulatory landscape for AI-generated content and copyright", difficulty: 75, category: "reasoning", expected_tier: "mid" },

  // === EXPERT (40 queries) — specialized, professional ===
  { q: "Review this legal contract for potential liability issues in a merger agreement", difficulty: 92, category: "legal", expected_tier: "premium" },
  { q: "Analyze this medical literature on COVID-19 treatment protocols and identify contradictions", difficulty: 95, category: "medical", expected_tier: "premium" },
  { q: "Perform a comprehensive security audit of this authentication flow and identify vulnerabilities", difficulty: 90, category: "security", expected_tier: "premium" },
  { q: "Write a detailed financial model for a Series B startup valuation with sensitivity analysis", difficulty: 92, category: "finance", expected_tier: "premium" },
  { q: "Analyze the constitutional implications of AI surveillance on Fourth Amendment rights", difficulty: 95, category: "legal", expected_tier: "premium" },
  { q: "Design a clinical trial protocol for a novel oncology drug", difficulty: 95, category: "medical", expected_tier: "premium" },
  { q: "Perform a formal code review of this cryptographic implementation for timing attacks", difficulty: 92, category: "security", expected_tier: "premium" },
  { q: "Write an expert witness report on semiconductor patent infringement", difficulty: 95, category: "legal", expected_tier: "premium" },
  { q: "Analyze genome-wide association study data to identify candidate loci for Type 2 diabetes", difficulty: 95, category: "medical", expected_tier: "premium" },
  { q: "Design a zero-trust network architecture for a critical infrastructure operator", difficulty: 90, category: "security", expected_tier: "premium" },
  { q: "Write a tax optimization strategy for a multinational corporation operating in 15 jurisdictions", difficulty: 92, category: "finance", expected_tier: "premium" },
  { q: "Analyze the legal precedent for AI-generated works in copyright law across 5 jurisdictions", difficulty: 95, category: "legal", expected_tier: "premium" },
  { q: "Design a phase III clinical trial with adaptive endpoints for a rare disease treatment", difficulty: 98, category: "medical", expected_tier: "premium" },
  { q: "Perform a quantitative risk assessment for a nuclear power plant safety system", difficulty: 98, category: "security", expected_tier: "premium" },
  { q: "Write an SEC 10-K filing analysis with forward-looking earnings projection", difficulty: 92, category: "finance", expected_tier: "premium" },
  { q: "Analyze the regulatory requirements for medical device software under FDA 21 CFR Part 820", difficulty: 95, category: "legal", expected_tier: "premium" },
  { q: "Design a quantum-safe cryptographic migration plan for a government agency", difficulty: 95, category: "security", expected_tier: "premium" },
  { q: "Write a pharmacoeconomic analysis comparing two biologic therapies for rheumatoid arthritis", difficulty: 95, category: "medical", expected_tier: "premium" },
  { q: "Perform a due diligence analysis on a potential acquisition target in the semiconductor industry", difficulty: 92, category: "finance", expected_tier: "premium" },
  { q: "Analyze the legal framework for cross-border data transfers under GDPR and CCPA", difficulty: 92, category: "legal", expected_tier: "premium" },
  { q: "Design a real-time embedded system safety case for an autonomous surgical robot", difficulty: 98, category: "medical", expected_tier: "premium" },
  { q: "Write a penetration testing report with remediation priorities for a banking application", difficulty: 90, category: "security", expected_tier: "premium" },
  { q: "Analyze derivative pricing models for exotic options in volatile markets", difficulty: 95, category: "finance", expected_tier: "premium" },
  { q: "Design a compliance monitoring system for anti-money laundering regulations", difficulty: 90, category: "security", expected_tier: "premium" },
  { q: "Write an amicus brief on the application of the Computer Fraud and Abuse Act to web scraping", difficulty: 95, category: "legal", expected_tier: "premium" },
  { q: "Analyze longitudinal cohort study data for cardiovascular risk factors with Cox regression", difficulty: 95, category: "medical", expected_tier: "premium" },
  { q: "Design a secure supply chain verification system using blockchain and IoT sensors", difficulty: 90, category: "security", expected_tier: "premium" },
  { q: "Write an investment thesis for a climate tech venture capital fund", difficulty: 88, category: "finance", expected_tier: "premium" },
  { q: "Analyze the legal liability implications of autonomous vehicle accidents", difficulty: 92, category: "legal", expected_tier: "premium" },
  { q: "Design a clinical decision support system that integrates with EHR for sepsis prediction", difficulty: 92, category: "medical", expected_tier: "premium" },
  { q: "Perform a threat model analysis for a connected medical device ecosystem", difficulty: 90, category: "security", expected_tier: "premium" },
  { q: "Write a detailed M&A integration plan addressing cultural, technical, and financial considerations", difficulty: 88, category: "finance", expected_tier: "premium" },
  { q: "Analyze Supreme Court rulings on digital privacy and their implications for tech companies", difficulty: 92, category: "legal", expected_tier: "premium" },
  { q: "Design a machine learning model monitoring system for detecting drift in production models", difficulty: 88, category: "code", expected_tier: "premium" },
  { q: "Write a regulatory impact assessment for proposed AI governance legislation", difficulty: 90, category: "legal", expected_tier: "premium" },
  { q: "Analyze the epidemiological data on vaccine efficacy across different demographic groups", difficulty: 92, category: "medical", expected_tier: "premium" },
  { q: "Design a secure multi-party computation protocol for collaborative financial risk analysis", difficulty: 95, category: "security", expected_tier: "premium" },
  { q: "Write a forensic accounting report identifying potential embezzlement patterns", difficulty: 92, category: "finance", expected_tier: "premium" },
  { q: "Analyze the constitutional challenges of mandatory DNA databases for law enforcement", difficulty: 95, category: "legal", expected_tier: "premium" },
  { q: "Design a failsafe control system for an autonomous nuclear reactor shutdown mechanism", difficulty: 98, category: "security", expected_tier: "premium" },
];

// ============================================================
// TIER PRICING (per 1M tokens, input)
// ============================================================
const TIER_COSTS = {
  free: { input: 0, output: 0 },
  cheap: { input: 0.59, output: 0.79 },     // Groq pricing
  mid: { input: 0.20, output: 0.60 },        // Mistral pricing
  premium: { input: 2.50, output: 10.00 },    // GPT-4o pricing
};

const TIER_LABELS = {
  free: "FREE (CommandCode/Ollama)",
  cheap: "CHEAP (Groq/Cerebras ~$0.60/1M)",
  mid: "MID (Mistral/DeepSeek ~$0.20/1M)",
  premium: "PREMIUM (GPT-4o/Claude $2.50+/1M)",
};

// ============================================================
// BENCHMARK RUNNER
// ============================================================

function classifyTier(complexity) {
  if (complexity < 0.3) return 'free';
  if (complexity < 0.5) return 'cheap';
  if (complexity < 0.7) return 'mid';
  return 'premium';
}

function getRoutedTier(result) {
  const model = (result.primary_model || '').toLowerCase();
  if (model.includes('commandcode') || model.includes('ollama') || model.includes('lmstudio') || model.includes('vllm') || model.includes('opencode')) return 'free';
  if (model.includes('groq') || model.includes('cerebras') || model.includes('deepinfra') || model.includes('together') || model.includes('fireworks')) return 'cheap';
  if (model.includes('mistral') || model.includes('deepseek') || model.includes('qwen') || model.includes('mini')) return 'mid';
  return 'premium';
}

function runBenchmark() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  A3M Router — Routing Accuracy Benchmark v1.0                  ║");
  console.log("║  200 queries · 4 difficulty tiers · RouteLLM methodology        ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log("");

  const results = {
    total: TEST_QUERIES.length,
    correct_tier: 0,
    tier_distribution: { free: 0, cheap: 0, mid: 0, premium: 0 },
    expected_distribution: { free: 0, cheap: 0, mid: 0, premium: 0 },
    by_category: {},
    by_difficulty: { simple: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, complex: { total: 0, correct: 0 }, expert: { total: 0, correct: 0 } },
    confusion: { free: { free: 0, cheap: 0, mid: 0, premium: 0 }, cheap: { free: 0, cheap: 0, mid: 0, premium: 0 }, mid: { free: 0, cheap: 0, mid: 0, premium: 0 }, premium: { free: 0, cheap: 0, mid: 0, premium: 0 } },
    all_costs_a3m: 0,
    all_costs_premium: 0,
    all_costs_cheap: 0,
    misclassified: [],
  };

  for (const test of TEST_QUERIES) {
    const features = extractQueryFeatures(test.q);
    const result = routeQuery(test.q);
    const routed_tier = getRoutedTier(result);
    const expected = test.expected_tier;

    // Track distributions
    results.tier_distribution[routed_tier] = (results.tier_distribution[routed_tier] || 0) + 1;
    results.expected_distribution[expected] = (results.expected_distribution[expected] || 0) + 1;

    // Track confusion matrix
    results.confusion[expected][routed_tier]++;

    // Track accuracy (exact match or adjacent)
    if (routed_tier === expected) {
      results.correct_tier++;
    }

    // Cost calculation (per query, ~500 input + 200 output tokens)
    const tokens_in = test.q.split(' ').length * 1.3; // rough token estimate
    const tokens_out = 100;
    const a3m_cost = (tokens_in * TIER_COSTS[routed_tier].input + tokens_out * TIER_COSTS[routed_tier].output) / 1_000_000;
    const premium_cost = (tokens_in * TIER_COSTS.premium.input + tokens_out * TIER_COSTS.premium.output) / 1_000_000;
    const cheap_cost = (tokens_in * TIER_COSTS.cheap.input + tokens_out * TIER_COSTS.cheap.output) / 1_000_000;
    
    results.all_costs_a3m += a3m_cost;
    results.all_costs_premium += premium_cost;
    results.all_costs_cheap += cheap_cost;

    // Track by difficulty
    const diff_bucket = test.difficulty < 30 ? 'simple' : test.difficulty < 60 ? 'medium' : test.difficulty < 85 ? 'complex' : 'expert';
    results.by_difficulty[diff_bucket].total++;
    if (routed_tier === expected) results.by_difficulty[diff_bucket].correct++;

    // Track by category
    if (!results.by_category[test.category]) results.by_category[test.category] = { total: 0, correct: 0 };
    results.by_category[test.category].total++;
    if (routed_tier === expected) results.by_category[test.category].correct++;

    // Track misclassifications for analysis
    if (routed_tier !== expected) {
      results.misclassified.push({
        query: test.q.substring(0, 60),
        expected,
        routed: routed_tier,
        complexity: features.complexity.toFixed(2),
        difficulty: test.difficulty,
      });
    }
  }

  // ============================================================
  // RESULTS
  // ============================================================

  const accuracy = (results.correct_tier / results.total * 100).toFixed(1);
  const cost_savings_vs_premium = ((1 - results.all_costs_a3m / results.all_costs_premium) * 100).toFixed(1);
  const cost_savings_vs_cheap = ((1 - results.all_costs_a3m / results.all_costs_cheap) * 100).toFixed(1);

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  OVERALL RESULTS");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  Queries:              ${results.total}`);
  console.log(`  Routing Accuracy:     ${results.correct_tier}/${results.total} (${accuracy}%)`);
  console.log(`  Cost vs All-Premium:  $${results.all_costs_a3m.toFixed(6)} vs $${results.all_costs_premium.toFixed(6)} = ${cost_savings_vs_premium}% savings`);
  console.log(`  Cost vs All-Cheap:    $${results.all_costs_a3m.toFixed(6)} vs $${results.all_costs_cheap.toFixed(6)}`);
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  TIER DISTRIBUTION");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  ${'Tier'.padEnd(10)} ${'Expected'.padEnd(12)} ${'Routed'.padEnd(12)} Match`);
  console.log(`  ${'─'.repeat(46)}`);
  for (const tier of ['free', 'cheap', 'mid', 'premium']) {
    const exp = results.expected_distribution[tier];
    const rout = results.tier_distribution[tier];
    const match = exp === rout ? '✅' : '⚠️';
    console.log(`  ${tier.padEnd(10)} ${String(exp).padEnd(12)} ${String(rout).padEnd(12)} ${match}`);
  }
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  ACCURACY BY DIFFICULTY");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  ${'Difficulty'.padEnd(15)} ${'Correct'.padEnd(15)} ${'Total'.padEnd(10)} Accuracy`);
  console.log(`  ${'─'.repeat(50)}`);
  for (const [bucket, data] of Object.entries(results.by_difficulty)) {
    const pct = data.total > 0 ? (data.correct / data.total * 100).toFixed(1) : 'N/A';
    console.log(`  ${bucket.padEnd(15)} ${String(data.correct).padEnd(15)} ${String(data.total).padEnd(10)} ${pct}%`);
  }
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  ACCURACY BY CATEGORY");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  ${'Category'.padEnd(20)} ${'Correct'.padEnd(10)} ${'Total'.padEnd(10)} Accuracy`);
  console.log(`  ${'─'.repeat(50)}`);
  const sorted_cats = Object.entries(results.by_category).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total));
  for (const [cat, data] of sorted_cats) {
    const pct = (data.correct / data.total * 100).toFixed(1);
    console.log(`  ${cat.padEnd(20)} ${String(data.correct).padEnd(10)} ${String(data.total).padEnd(10)} ${pct}%`);
  }
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  CONFUSION MATRIX (Expected → Routed)");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  ${''.padEnd(12)} ${'→ free'.padEnd(10)} ${'→ cheap'.padEnd(10)} ${'→ mid'.padEnd(10)} ${'→ premium'.padEnd(10)}`);
  console.log(`  ${'─'.repeat(52)}`);
  for (const expected of ['free', 'cheap', 'mid', 'premium']) {
    const row = results.confusion[expected];
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    const pct = (n) => n > 0 ? `${n}(${(n/total*100).toFixed(0)}%)` : `${n}`;
    console.log(`  ${expected.padEnd(12)} ${pct(row.free).padEnd(10)} ${pct(row.cheap).padEnd(10)} ${pct(row.mid).padEnd(10)} ${pct(row.premium).padEnd(10)}`);
  }
  console.log("");

  console.log("══════════════════════════════════════════════════════════════════");
  console.log("  COST ANALYSIS (200 queries)");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`  Strategy             Cost per 200     Cost per 10K     Monthly (100K)`);
  console.log(`  ${'─'.repeat(72)}`);
  const scale = (cost) => [cost, cost * 50, cost * 500];
  const a3m = scale(results.all_costs_a3m);
  const prem = scale(results.all_costs_premium);
  const cheap = scale(results.all_costs_cheap);
  console.log(`  All → Premium        $${prem[0].toFixed(4).padStart(10)}   $${prem[1].toFixed(2).padStart(10)}   $${prem[2].toFixed(2).padStart(12)}`);
  console.log(`  All → Cheap          $${cheap[0].toFixed(4).padStart(10)}   $${cheap[1].toFixed(2).padStart(10)}   $${cheap[2].toFixed(2).padStart(12)}`);
  console.log(`  A3M Smart Routing    $${a3m[0].toFixed(4).padStart(10)}   $${a3m[1].toFixed(2).padStart(10)}   $${a3m[2].toFixed(2).padStart(12)}`);
  console.log(`  ${'─'.repeat(72)}`);
  console.log(`  Savings vs Premium:  ${cost_savings_vs_premium}%`);
  console.log("");

  if (results.misclassified.length > 0 && results.misclassified.length <= 20) {
    console.log("══════════════════════════════════════════════════════════════════");
    console.log("  MISCLASSIFIED QUERIES (sample)");
    console.log("══════════════════════════════════════════════════════════════════");
    console.log("");
    for (const m of results.misclassified.slice(0, 10)) {
      console.log(`  Expected: ${m.expected.padEnd(8)} → Routed: ${m.routed.padEnd(8)} (complexity: ${m.complexity}, difficulty: ${m.difficulty})`);
      console.log(`  "${m.query}..."`);
      console.log("");
    }
  }

  // JSON output for CI/CD integration
  const summary = {
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    queries: results.total,
    routing_accuracy: parseFloat(accuracy),
    cost_savings_vs_premium: parseFloat(cost_savings_vs_premium),
    tier_distribution: results.tier_distribution,
    by_difficulty: Object.fromEntries(
      Object.entries(results.by_difficulty).map(([k, v]) => [k, { ...v, accuracy: v.total > 0 ? parseFloat((v.correct / v.total * 100).toFixed(1)) : 0 }])
    ),
  };

  const fs = require('fs');
  fs.writeFileSync('benchmark-results.json', JSON.stringify(summary, null, 2));
  console.log("  📊 Results saved to benchmark-results.json");
  console.log("");

  return summary;
}

runBenchmark();

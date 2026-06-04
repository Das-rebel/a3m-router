/**
 * Create labeled benchmark dataset for local testing
 * 
 * Each query has an "actualTier" based on the model's required capability.
 */

const BENCHMARK_QUERIES = [
  // === FREE TIER (simple factual, definitions, basic math) ===
  { query: "What is 2+2?", actualTier: "free" },
  { query: "What is the capital of France?", actualTier: "free" },
  { query: "How do you say hello in Spanish?", actualTier: "free" },
  { query: "What day is it today?", actualTier: "free" },
  { query: "Convert 100 Celsius to Fahrenheit", actualTier: "free" },
  { query: "What is the largest planet in the solar system?", actualTier: "free" },
  { query: "How many ounces in a pound?", actualTier: "free" },
  { query: "What is the speed of light?", actualTier: "free" },
  { query: "Who wrote Romeo and Juliet?", actualTier: "free" },
  { query: "What is photosynthesis?", actualTier: "free" },
  { query: "What is the square root of 144?", actualTier: "free" },
  { query: "Name three primary colors", actualTier: "free" },
  { query: "What is the chemical symbol for gold?", actualTier: "free" },
  { query: "How many continents are there?", actualTier: "free" },
  { query: "What is gravity?", actualTier: "free" },
  { query: "Define 'ubiquitous'", actualTier: "free" },
  { query: "What does 'benevolent' mean?", actualTier: "free" },
  { query: "How many bytes in a kilobyte?", actualTier: "free" },
  { query: "What is H2O commonly known as?", actualTier: "free" },
  { query: "Translate 'good morning' to French", actualTier: "free" },

  // === CHEAP TIER (simple tasks, short code, basic translation) ===
  { query: "Write a Python function to sort a list", actualTier: "cheap" },
  { query: "Explain the difference between TCP and UDP", actualTier: "cheap" },
  { query: "Write a SQL query to find duplicate records", actualTier: "cheap" },
  { query: "Create a REST API endpoint in Express.js", actualTier: "cheap" },
  { query: "Explain Docker containers vs virtual machines", actualTier: "cheap" },
  { query: "Write a regex to validate email addresses", actualTier: "cheap" },
  { query: "Describe the water cycle in simple terms", actualTier: "cheap" },
  { query: "Summarize this article about climate change in 3 bullet points", actualTier: "cheap" },
  { query: "Translate this paragraph from English to French", actualTier: "cheap" },
  { query: "How do I reverse a string in JavaScript?", actualTier: "cheap" },
  { query: "Write a for loop in Python", actualTier: "cheap" },
  { query: "What is the difference between let and const in JavaScript?", actualTier: "cheap" },
  { query: "Explain what an API is to a non-technical person", actualTier: "cheap" },
  { query: "How do I center a div in CSS?", actualTier: "cheap" },
  { query: "Write a basic HTML form", actualTier: "cheap" },
  { query: "Explain git merge vs rebase", actualTier: "cheap" },
  { query: "What is a RESTful API?", actualTier: "cheap" },
  { query: "How do I read a file in Node.js?", actualTier: "cheap" },
  { query: "Write a simple unit test in Jest", actualTier: "cheap" },
  { query: "Explain what a database index does", actualTier: "cheap" },
  { query: "How do I parse JSON in Python?", actualTier: "cheap" },

  // === MID TIER (multi-step, domain knowledge, system design basics) ===
  { query: "Design a REST API for a blog with users, posts, and comments", actualTier: "mid" },
  { query: "Explain how OAuth 2.0 authentication works", actualTier: "mid" },
  { query: "Design a rate limiting system for a web API", actualTier: "mid" },
  { query: "How would you implement a caching layer for a web application?", actualTier: "mid" },
  { query: "Compare and contrast SQL and NoSQL databases", actualTier: "mid" },
  { query: "Design a user authentication system with JWT tokens", actualTier: "mid" },
  { query: "Explain the CAP theorem and its implications", actualTier: "mid" },
  { query: "How do you design a URL shortening service like bit.ly?", actualTier: "mid" },
  { query: "Design a real-time notification system", actualTier: "mid" },
  { query: "Explain the pros and cons of microservices vs monolith", actualTier: "mid" },
  { query: "How would you implement search functionality in a web app?", actualTier: "mid" },
  { query: "Design a payment processing system", actualTier: "mid" },
  { query: "Explain how blockchain achieves consensus", actualTier: "mid" },
  { query: "Design a multi-tenant SaaS architecture", actualTier: "mid" },
  { query: "How do you handle database migrations in production?", actualTier: "mid" },
  { query: "Design a logging and monitoring system", actualTier: "mid" },
  { query: "Explain load balancing algorithms", actualTier: "mid" },
  { query: "How would you design a file upload system?", actualTier: "mid" },
  { query: "Design a chat application with WebSockets", actualTier: "mid" },
  { query: "Explain event-driven architecture patterns", actualTier: "mid" },

  // === PREMIUM TIER (complex reasoning, architecture, novel problems) ===
  { query: "Design a distributed system that handles 10 million requests per second", actualTier: "premium" },
  { query: "Architect a real-time collaboration system like Google Docs", actualTier: "premium" },
  { query: "Design a machine learning pipeline from data ingestion to model serving", actualTier: "premium" },
  { query: "Create a comprehensive technical design for a social media platform at scale", actualTier: "premium" },
  { query: "Design a zero-downtime deployment strategy for a distributed system", actualTier: "premium" },
  { query: "Architect a system that processes streaming data with sub-second latency", actualTier: "premium" },
  { query: "Design a fraud detection system using machine learning", actualTier: "premium" },
  { query: "Create an architecture for a global CDN with edge computing", actualTier: "premium" },
  { query: "Design a multi-region active-active database architecture", actualTier: "premium" },
  { query: "Architect a system for real-time video transcoding at scale", actualTier: "premium" },
  { query: "Design a privacy-preserving data analytics system", actualTier: "premium" },
  { query: "Create a comprehensive security architecture for a fintech application", actualTier: "premium" },
  { query: "Design a system that handles 1 billion events per day", actualTier: "premium" },
  { query: "Architect a serverless system with consistent performance", actualTier: "premium" },
  { query: "Design a data warehouse architecture for petabyte-scale analytics", actualTier: "premium" },
  { query: "Create a multi-cloud hybrid architecture strategy", actualTier: "premium" },
  { query: "Design a system for real-time anomaly detection in financial transactions", actualTier: "premium" },
  { query: "Architect a mesh network for IoT at scale", actualTier: "premium" },
  { query: "Design a comprehensive disaster recovery strategy", actualTier: "premium" },
  { query: "Create an architecture for autonomous vehicle sensor fusion", actualTier: "premium" },
];

import * as fs from 'fs';
const output = { queries: BENCHMARK_QUERIES };
fs.writeFileSync('./data/labeled-benchmark.json', JSON.stringify(output, null, 2));
console.log(`Created benchmark with ${BENCHMARK_QUERIES.length} labeled queries`);
console.log(`Free: ${BENCHMARK_QUERIES.filter(q => q.actualTier === 'free').length}`);
console.log(`Cheap: ${BENCHMARK_QUERIES.filter(q => q.actualTier === 'cheap').length}`);
console.log(`Mid: ${BENCHMARK_QUERIES.filter(q => q.actualTier === 'mid').length}`);
console.log(`Premium: ${BENCHMARK_QUERIES.filter(q => q.actualTier === 'premium').length}`);

#!/usr/bin/env node
/**
 * distill.mjs — System 2 → System 1 distillation corpus generator.
 *
 * Runs advancedRouter.routeQuery (the heuristic "System 2" router) over a
 * synthetic prompt corpus spanning A3M's routing domains, and emits JSONL:
 *
 *   {"context": "<prompt>", "label": <provider idx>, "complexity": 0.42,
 *    "needs_code": true, "options": ["<model option text>", ...]}
 *
 * Train with tools/train_jev.py afterwards.
 *
 * Usage:  npm run build && node tools/distill.mjs > data/jev-distill.jsonl
 */

import { routeQuery, MODEL_PROFILES } from "../dist/routing/advancedRouter.js";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";

// ---------------------------------------------------------------------------
// Synthetic prompt corpus — domain × complexity × intent coverage
// ---------------------------------------------------------------------------

const TEMPLATES = [
  // trivial / short chat
  ["hi", "hello there", "thanks", "ok got it", "good morning", "hey quick question"],
  ["what is 2+2", "define entropy", "what does HTTP stand for", "name a primary color", "capital of France"],
  // simple code
  ["write a python function to reverse a linked list", "add two numbers in javascript", "css center a div",
   "sql select where clause", "regex match an email", "bash list files by size", "git undo last commit",
   "python read a csv file", "js fetch with async await", "html form with validation"],
  // moderate code
  ["implement a LRU cache in typescript with O(1) operations", "write a rate limiter using token bucket",
   "refactor this express app into clean architecture layers", "design a postgres schema for multi-tenant SaaS",
   "write unit tests for a react hook", "dockerize a fastapi service with healthchecks",
   "explain this stack trace and fix the race condition", "optimize this slow SQL query with proper indexes"],
  // hard / architecture
  ["design a distributed rate limiter for 10k rps across regions", "architecture review: should we move from REST to gRPC",
   "implement consensus for a 5-node kv store", "migrate a monolith to event-driven microservices with zero downtime",
   "design a vector database index for billion-scale embeddings", "review this kubernetes manifest for production readiness"],
  // math / reasoning
  ["prove the integral of 1/x is ln|x|", "solve this differential equation numerically", "bayes theorem applied to medical testing",
   "calculate the eigenvalues of this matrix", "explain the central limit theorem with a proof", "monte carlo simulation in python"],
  // domains
  ["diagnose chest pain differential", "explain insulin resistance pathophysiology", "clinical trial design for a new oncology drug",
   "contract clause review for liability limits", "GDPR compliance checklist for a saas", "case law on fair use for AI training data",
   "portfolio optimization with markowitz", "explain this 10-K cash flow statement", "hedge delta-neutral options strategy",
   "fine-tune bert for sentiment classification", "compare adam vs sgd optimizer convergence", "interpret this shapley value plot",
   "promote soil health in organic farming", "structural load calculations for a bridge", "chemical synthesis route planning"],
  // translation / multilingual
  ["translate this sentence to japanese: good morning", "traduce esta frase al español",
   " übersetze diesen Satz ins Deutsche", "translate and localize this UI string to hindi"],
  // creative
  ["write a haiku about the sea", "short story about a robot learning to paint",
   "marketing copy for an eco water bottle", "write a limerick about databases", "brainstorm names for a coffee startup"],
  // security
  ["penetration test plan for a web app", " OWASP top 10 mitigations", "secure secret storage in kubernetes",
   "threat model an oauth flow", "analyze this suspicious payload"],
  // devops / infra
  ["terraform module for vpc with private subnets", "kubernetes hpa based on custom metrics",
   "ci pipeline with canary deploys", "postgres replication lag troubleshooting", "nginx rate limiting config"],
  // multimodal
  ["describe this image and extract the text", "transcribe this audio file to text",
   "analyze this chart and summarize trends", "generate alt text for this screenshot"],
  // long context
  ["summarize this 50 page document about climate policy: " + "policy considerations ".repeat(80),
   "review this long transcript and extract action items: " + "the team discussed ".repeat(100)],
];

const LENGTHS = ["", "be brief", "be detailed and thorough", "step by step",
  "explain like I am five", "with code examples", "in a table", "as a checklist"];

const PREFIXES = ["", "please ", "I need you to ", "can you ", "urgent: ", ""];

function corpus() {
  const prompts = [];
  for (const group of TEMPLATES) {
    for (const p of group) {
      prompts.push(p);
      for (let k = 0; k < 3; k++) {
        const pre = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
        const suf = LENGTHS[Math.floor(Math.random() * LENGTHS.length)];
        prompts.push(pre + p + (suf ? " — " + suf : ""));
      }
    }
  }
  return prompts;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const OUT_DIR = new URL("../data/", import.meta.url).pathname;
mkdirSync(OUT_DIR, { recursive: true });

// warm profile cache
routeQuery("warmup");
const profiles = MODEL_PROFILES;
const modelNames = Object.keys(profiles);
if (modelNames.length === 0) {
  console.error("no model profiles — check provider config");
  process.exit(1);
}

// option text must EXACTLY match jevRouter.optionTextForModel
function optionTextForModel(model) {
  const p = profiles[model];
  const strengths = (p.strengths || []).slice(0, 6).join(",");
  const cost = p.cost_per_1k_input != null ? ((p.cost_per_1k_input + (p.cost_per_1k_output || 0)) / 2).toFixed(4) : "?";
  return `${model} provider:${p.providerName || "?"} type:${p.type || "api"} strengths:${strengths} quality:${p.quality_score ?? "?"} cost:${cost}`;
}

const options = modelNames.map(optionTextForModel);

// merge benchmark prompts if present
let bench = [];
const benchPath = new URL("../eval/benchmark_dataset.jsonl", import.meta.url).pathname;
if (existsSync(benchPath)) {
  bench = readFileSync(benchPath, "utf8").trim().split("\n").map((l) => JSON.parse(l).prompt);
}

const all = [...new Set([...corpus(), ...bench])];
const rows = [];
for (const prompt of all) {
  const d = routeQuery(prompt);
  if (!d.primary_model) continue;
  const label = modelNames.indexOf(d.primary_model);
  if (label < 0) continue;
  rows.push({
    context: prompt,
    label,
    complexity: d.features?.complexity ?? 0.3,
    needs_code: d.features?.has_code ?? false,
    options,
  });
}

const outPath = OUT_DIR + "jev-distill.jsonl";
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join("\n"));
console.error(`wrote ${rows.length} rows → ${outPath} (${modelNames.length} candidate models)`);
const dist = {};
for (const r of rows) dist[modelNames[r.label]] = (dist[modelNames[r.label]] || 0) + 1;
console.error("label distribution:", JSON.stringify(dist, null, 0).slice(0, 400));

/**
 * A3M Router Demo Server
 *
 * Interactive web demo showing parallel multi-LLM routing.
 * Works without API keys — falls back to mock results.
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================
// Lazy-load A3M Router (fail gracefully if not installed locally)
// ============================================================
let a3m;
try {
  a3m = await import("adaptive-memory-multi-model-router");
} catch {
  console.warn("[demo] A3M Router not installed locally — using file:// import");
  // Try relative path for development
  try {
    a3m = await import("../dist/index.js");
  } catch {
    a3m = null;
  }
}

// ============================================================
// Fallback responses for when no real API keys are configured
// ============================================================
const MOCK_RESPONSES = {
  "Write a haiku about Kubernetes": {
    content: `Pods drift through the cloud\nOrchestrator hums softly\nContainers at rest`,
    model: "groq/llama-3.3-70b-versatile",
    provider: "Groq",
  },
  "Explain quantum computing to a 5-year-old": {
    content: `Imagine you have a magical coin. Normal coins are either heads OR tails. But a magical quantum coin can be heads AND tails at the same time! That's what quantum computers use — they have special "magic coins" called qubits (say "kyoo-bits"). 

While a regular computer checks one answer at a time (like trying every key on a keychain), a quantum computer can check ALL the answers at once. That makes it super fast at solving certain puzzles, like finding the right key instantly!`,
    model: "anthropic/claude-sonnet-4-20250514",
    provider: "Anthropic",
  },
  "Write a React component for a search bar": {
    content: `\`\`\`jsx
import React, { useState, useCallback } from 'react';

function SearchBar({ onSearch, placeholder = "Search..." }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback((e) => {
    setQuery(e.target.value);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery("");
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      style={{

        display: "flex",
        alignItems: "center",
        background: isFocused ? "#fff" : "#f5f5f5",
        border: \`2px solid \${isFocused ? "#6366f1" : "#e5e7eb"}\`,
        borderRadius: "12px",
        padding: "8px 16px",
        transition: "all 0.2s ease",
        maxWidth: "500px",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 8 }}>
        <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" fill="#9ca3af"/>
      </svg>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: "16px",
          padding: "4px 0",
          color: "#1f2937",
        }}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "#9ca3af",
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
      <button
        type="submit"
        style={{
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          marginLeft: 8,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        Search
      </button>
    </form>
  );
}

export default SearchBar;
\`\`\``,
    model: "openai/gpt-4o",
    provider: "OpenAI",
  },
};

const DEFAULT_MOCK = {
  content:
    "A3M Router selected the optimal model for your query. Configure API keys to get real LLM responses — the routing engine analyzed your query's complexity, domain, and requirements to find the best provider.",
  model: "a3m-routing/auto",
  provider: "A3M Routing Engine",
};

// ============================================================
// Cost calculator (based on A3M Router token costs)
// ============================================================
const MODEL_COSTS = {
  "groq/llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "anthropic/claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "openai/gpt-4o": { input: 2.5, output: 10.0 },
};

function estimateCost(model, content) {
  const tokens = Math.ceil(content.length / 4); // rough estimate
  const costs = MODEL_COSTS[model] || { input: 0.5, output: 0.5 };
  return ((tokens / 1_000_000) * (costs.input + costs.output)).toFixed(6);
}

// ============================================================
// Express App
// ============================================================
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── GET /api/providers ───────────────────────────────────
app.get("/api/providers", (req, res) => {
  let providers = {};
  let hasRealKeys = false;

  if (a3m) {
    try {
      providers = a3m.getAvailableProviders();
      hasRealKeys = Object.keys(providers).length > 0;
    } catch {
      providers = {};
    }
  }

  // Build a clean list of what's available
  const list = Object.entries(providers).map(([id, p]) => ({
    id,
    name: p.name,
    tier: p.tier,
    models: p.models?.length || 0,
    type: p.type,
    costPerM: p.costPerK
      ? { input: p.costPerK.input, output: p.costPerK.output }
      : { input: 0, output: 0 },
  }));

  res.json({
    count: list.length,
    hasApiKeys: hasRealKeys,
    providers: list,
    note: hasRealKeys
      ? "API keys detected — real LLM responses enabled"
      : "No API keys configured — showing simulated responses",
  });
});

// ── POST /api/analyze ───────────────────────────────────
app.post("/api/analyze", (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  let features = null;
  let routing = null;

  if (a3m) {
    try {
      features = a3m.extractQueryFeatures(prompt);
      routing = a3m.routeQuery(prompt);
    } catch {
      // fallback below
    }
  }

  if (!features) {
    const complexity = Math.min(1, 0.15 + prompt.length / 500);
    features = {
      complexity,
      length: prompt.split(/\s+/).length,
      has_code: /function|class |def |import|<[a-z]+|const |let |var /i.test(prompt),
      has_math: /\d+[\+\-\*\/=]|calculate|sum|equation/i.test(prompt),
      requires_reasoning: /why|explain|analyze|compare|reason/i.test(prompt),
      is_creative: /write|story|poem|create|imagine/i.test(prompt),
      detected_domain: "general",
    };
  }

  if (!routing) {
    routing = {
      primary_model: "a3m/auto-routed",
      confidence: 0.85,
      reasoning: "Intelligent routing based on query complexity and domain",
      estimated_cost: "0.000001",
      estimated_latency_ms: 420,
    };
  }

  res.json({ features, routing });
});

// ── POST /api/route ────────────────────────────────────
app.post("/api/route", async (req, res) => {
  const { prompt, mode } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt is required" });
  }

  const startTime = Date.now();
  const isEnsemble = mode === "ensemble";

  try {
    // 1) Route the query using A3M Router
    let routing = null;
    let features = null;

    if (a3m) {
      try {
        routing = a3m.routeQuery(prompt);
        features = a3m.extractQueryFeatures(prompt);
      } catch {
        // fallback
      }
    }

    // 2) Try real LLM execution via proxy server
    let content = null;
    let provider = null;
    let model = null;
    let usedRealProvider = false;

    // Check if we have any API keys configured
    let availableProviders = {};
    if (a3m) {
      try {
        availableProviders = a3m.getAvailableProviders();
      } catch {}
    }

    const hasRealKeys = Object.keys(availableProviders).length > 0;

    if (hasRealKeys && a3m) {
      try {
        // Try routing via proxy
        const modelName = "auto";
        const messages = [{ role: "user", content: prompt }];

        const modelMapper = await import("../dist/server/modelMapper.js");
        const mapping = modelMapper.resolveModel(modelName, prompt);
        if (mapping && mapping.apiKey) {
          const baseUrl = mapping.baseUrl;
          const body = {
            model: mapping.model,
            messages,
            max_tokens: 512,
          };
          const headers = { "Content-Type": "application/json" };
          if (mapping.apiKey) headers["Authorization"] = `Bearer ${mapping.apiKey}`;

          const resp = await fetch(baseUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });
          const data = await resp.json();
          if (data.choices?.[0]?.message?.content) {
            content = data.choices[0].message.content;
            provider = mapping.providerId;
            model = mapping.model;
            usedRealProvider = true;
          }
        }
      } catch (e) {
        console.warn("[demo] Real provider call failed:", e.message);
      }
    }

    // 3) Fallback to mock if no real response
    if (!content) {
      const mockKey = Object.keys(MOCK_RESPONSES).find((k) => prompt.includes(k));
      const mock = mockKey ? MOCK_RESPONSES[mockKey] : DEFAULT_MOCK;
      content = mock.content;
      provider = mock.provider;
      model = mock.model;
    }

    // 4) Ensemble mode: return multiple responses
    let responses = null;
    if (isEnsemble) {
      const providers = ["Groq", "Anthropic", "OpenAI"];
      responses = providers.map((p) => ({
        provider: p,
        model: p === "Groq"
          ? "llama-3.3-70b-versatile"
          : p === "Anthropic"
            ? "claude-sonnet-4-20250514"
            : "gpt-4o",
        content: `[Simulated response from ${p}] A3M Router selected ${p} for optimal performance on your query. Configure API keys to get real responses from all providers simultaneously.`,
        latency: Math.floor(Math.random() * 400 + 200),
        cost: (Math.random() * 0.002).toFixed(6),
      }));
    }

    const latency = Date.now() - startTime;
    const cost = usedRealProvider
      ? estimateCost(model, content)
      : "0.000001";

    res.json({
      result: content,
      provider,
      model,
      mode: isEnsemble ? "ensemble" : "single",
      latency,
      cost,
      usedMock: !usedRealProvider,
      features,
      routing,
      responses,
      hasRealKeys,
    });
  } catch (err) {
    console.error("[demo] Route error:", err);
    res.status(500).json({
      error: err.message,
      result: "A3M Router encountered an error processing your query.",
      provider: "A3M Router",
      model: "error",
      latency: Date.now() - startTime,
      cost: "0",
      usedMock: true,
    });
  }
});

// ── Serve index.html for all other routes ──────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  A3M Router Demo Server
  ─────────────────────────
  Running:  http://localhost:${PORT}
  API Key:  ${process.env.OPENAI_API_KEY ? "Yes" : "No (mock mode)"}
  Providers: ${a3m ? "A3M SDK loaded" : "A3M SDK not available"}
  Mode:     ${process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY ? "Live" : "Demo (mock responses)"}
  `);
});

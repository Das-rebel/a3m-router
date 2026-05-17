#!/usr/bin/env node
/**
 * A3M Router CLI - Adaptive Memory Multi-Model Router
 * 
 * Usage:
 *   npx a3m-router route "Write a Python function"
 *   npx a3m-router status
 *   npx a3m-router memory add "text" 
 *   npx a3m-router cost
 */

const { createA3MRouter, countTokens, estimateCost, MODEL_COSTS } = require("./index.js");

const args = process.argv.slice(2);
const command = args[0];

function formatRoute(result) {
  console.log("\n🔀 A3M Router — Route Result");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Primary:   " + result.primary_model);
  if (result.fallback_models) {
    console.log("  Fallbacks: " + result.fallback_models.join(", "));
  }
  if (result.estimated_cost) {
    console.log("  Est. Cost: $" + result.estimated_cost.toFixed(6));
  }
  if (result.latency_tier) {
    console.log("  Latency:   " + result.latency_tier);
  }
  if (result.reason) {
    console.log("  Reason:    " + result.reason);
  }
  console.log("");
}

async function main() {
  const router = createA3MRouter({ memory: { maxSize: 1000 } });

  switch (command) {
    case "route": {
      const query = args.slice(1).join(" ");
      if (!query) {
        console.error("Usage: npx a3m-router route \"your query here\"");
        process.exit(1);
      }
      const result = router.route(query);
      formatRoute(result);
      break;
    }

    case "batch": {
      const queries = args.slice(1);
      if (queries.length === 0) {
        console.error("Usage: npx a3m-router batch \"query1\" \"query2\" ...");
        process.exit(1);
      }
      const results = router.routeBatch(queries);
      console.log("\n🔀 A3M Router — Batch Results");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      results.forEach(function(r, i) {
        console.log("  " + (i + 1) + ". \"" + queries[i].substring(0, 40) + "...\" → " + r.primary_model);
      });
      console.log("");
      break;
    }

    case "recommend": {
      const task = args.slice(1).join(" ");
      if (!task) {
        console.error("Usage: npx a3m-router recommend \"coding\"");
        process.exit(1);
      }
      const rec = router.recommend(task);
      console.log("\n🎯 A3M Router — Recommendation");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(JSON.stringify(rec, null, 2));
      break;
    }

    case "status": {
      console.log("\n📊 A3M Router — Status");
      console.log("━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  Version:      1.7.3");
      console.log("  Exports:      66");
      console.log("  Providers:    14");
      console.log("  Integrations: 116");
      console.log("  Keywords:     139");
      console.log("  Subpaths:     11");
      console.log("  Memory:       ✅ MemoryTree + AutoFetch + ObsidianVault");
      console.log("  Compression:  ✅ Enhanced + ISON");
      console.log("  Auth:         ✅ OAuth 2.0 + PKCE");
      console.log("  Cost:         ✅ Tracking + Budgets");
      console.log("  Cache:        ✅ Prefix + Response");
      console.log("  Routing:      ✅ RouteLLM + Adaptive");
      console.log("  Models known: " + Object.keys(MODEL_COSTS).length);
      console.log("");
      break;
    }

    case "cost": {
      const text = args.slice(1).join(" ") || "Hello world this is a test";
      const tokens = countTokens(text);
      var completionTokens = Math.ceil(tokens * 1.5);
      var gpt4oCost = estimateCost(tokens, completionTokens, "gpt-4o");
      var miniCost = estimateCost(tokens, completionTokens, "gpt-4o-mini");
      var haikuCost = estimateCost(tokens, completionTokens, "claude-3-haiku");
      var geminiCost = estimateCost(tokens, completionTokens, "gemini-2.0-flash");
      console.log("\n💰 A3M Router — Cost Estimate");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("  Text:         \"" + text.substring(0, 50) + "\"");
      console.log("  Tokens:       " + tokens);
      console.log("  GPT-4o:       $" + gpt4oCost.toFixed(6));
      console.log("  GPT-4o-mini:  $" + miniCost.toFixed(6));
      console.log("  Claude Haiku: $" + haikuCost.toFixed(6));
      console.log("  Gemini Flash: $" + geminiCost.toFixed(6));
      if (gpt4oCost > 0) {
        var savings = ((1 - miniCost / gpt4oCost) * 100).toFixed(1);
        console.log("  Savings:      " + savings + "% (mini vs GPT-4o)");
      }
      console.log("");
      break;
    }

    case "models": {
      console.log("\n📋 A3M Router — Known Models");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      var models = Object.entries(MODEL_COSTS);
      models.forEach(function(entry) {
        var name = entry[0];
        var cost = entry[1];
        console.log("  " + name.padEnd(25) + " in:$" + String(cost.input_per_1k).padEnd(6) + " out:$" + cost.output_per_1k);
      });
      console.log("  Total: " + models.length + " models");
      console.log("");
      break;
    }

    case "token": {
      const text = args.slice(1).join(" ");
      if (!text) {
        console.error("Usage: npx a3m-router token \"your text here\"");
        process.exit(1);
      }
      const tokens = countTokens(text);
      console.log("  \"" + text + "\" → " + tokens + " tokens");
      break;
    }

    case "memory": {
      const subcmd = args[1];
      if (subcmd === "add") {
        const text = args.slice(2).join(" ");
        router.memory.add(text, { metadata: { cli: true } });
        console.log("  ✅ Added to memory: \"" + text.substring(0, 50) + "\"");
      } else if (subcmd === "search") {
        const query = args.slice(2).join(" ");
        const results = router.memory.search(query);
        console.log("  Found " + results.length + " results for \"" + query + "\"");
        results.forEach(function(r, i) {
          var content = r.content ? r.content.substring(0, 60) : JSON.stringify(r).substring(0, 60);
          console.log("  " + (i + 1) + ". " + content);
        });
      } else {
        const stats = router.memory.getStats();
        console.log("\n🧠 A3M Router — Memory Stats");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log(JSON.stringify(stats, null, 2));
      }
      break;
    }

    default:
      console.log("\n🔀 A3M Router — Adaptive Memory Multi-Model Router");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
      console.log("  Commands:");
      console.log("    route <query>        Route query to best model");
      console.log("    batch <q1> <q2>..    Route multiple queries");
      console.log("    recommend <task>     Get model recommendation");
      console.log("    cost [text]          Estimate token cost across models");
      console.log("    models               List known models + pricing");
      console.log("    token <text>         Count tokens");
      console.log("    memory add <text>    Add to memory tree");
      console.log("    memory search <q>    Search memory");
      console.log("    memory               Show memory stats");
      console.log("    status               Show router status");
      console.log("");
      console.log("  Examples:");
      console.log("    npx a3m-router route \"Write a Python function to sort\"");
      console.log("    npx a3m-router cost \"Hello world\"");
      console.log("    npx a3m-router memory add \"Meeting notes from standup\"");
      console.log("");
  }
}

main().catch(function(err) {
  console.error("Error:", err.message);
  process.exit(1);
});

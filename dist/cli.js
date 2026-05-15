#!/usr/bin/env node
/**
 * TMLPD PI CLI
 */

const { createTMLPD } = require("./dist/index.js");

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "execute": {
      const tmlpd = createTMLPD();
      const prompt = args.slice(1).join(" ");
      const result = await tmlpd.execute(prompt);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "parallel": {
      const tmlpd = createTMLPD();
      const models = args.slice(1).join(" ").split(",").map(m => m.trim());
      const prompt = "Compare these models";
      const result = await tmlpd.executeParallel(prompt, models);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "cost": {
      const tmlpd = createTMLPD();
      const summary = tmlpd.getCostSummary();
      console.log(JSON.stringify(summary, null, 2));
      break;
    }
    case "status": {
      const tmlpd = createTMLPD();
      const status = tmlpd.getProviderStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "cache": {
      const tmlpd = createTMLPD();
      const stats = tmlpd.getCacheStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    }
    default:
      console.log(`TMLPD PI v1.0.0

Usage:
  tmlpd-pi execute <prompt>     Execute single prompt
  tmlpd-pi parallel <models>     Execute in parallel
  tmlpd-pi cost                 Show cost summary
  tmlpd-pi status               Show provider status
  tmlpd-pi cache               Show cache stats
`);
  }
}

main().catch(console.error);
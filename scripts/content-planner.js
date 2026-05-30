#!/usr/bin/env node
const https = require('https');
async function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'a3m-router' } }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('parse')); } });
    }).on('error', reject);
  });
}
async function main() {
  console.log('\n📅 A3M — Content Planner\n');
  let stars = 0, dl = 0, issues = 0;
  try { const r = await getJSON('https://api.github.com/repos/Das-rebel/a3m-router'); stars = r.stargazers_count || 0; issues = r.open_issues_count || 0; } catch {}
  try { const n = await getJSON('https://api.npmjs.org/downloads/point/last-week/adaptive-memory-multi-model-router'); dl = n.downloads || 0; } catch {}
  console.log(`  📦 Weekly downloads: ${dl.toLocaleString()}`);
  console.log(`  ⭐ GitHub stars: ${stars}`);
  console.log(`  🐛 Open issues: ${issues}\n`);
  console.log('  📌 RECOMMENDED: "How A3M Saves $X/Year on LLM Costs" — case study\n');
  console.log('  📌 RECOMMENDED: A3M vs LiteLLM vs RouteLLM — benchmark comparison\n');
  console.log('  📌 RECOMMENDED: Video demo of parallel execution (asciinema)\n');
  console.log('  📌 RECOMMENDED: "How to Save 62% on LLM APIs" blog post\n');
}
main().catch(console.error);

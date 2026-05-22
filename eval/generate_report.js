#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function fmtPct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

function main() {
  const evalDir = path.resolve(__dirname);
  const resultsDir = path.join(evalDir, 'results');

  const routing = readJsonIfExists(path.join(resultsDir, 'latest.json'));
  const faults = readJsonIfExists(path.join(resultsDir, 'fault_injection_latest.json'));
  const shadow = readJsonIfExists(path.join(resultsDir, 'shadow_latest.json'));

  const now = new Date().toISOString();
  const lines = [];
  lines.push('# A3M Eval Report');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push(`Commit: ${process.env.GITHUB_SHA || 'local'}`);
  lines.push('');

  lines.push('## Gate Status');
  lines.push('');

  if (routing) {
    const gate = routing.failures?.length ? 'FAIL' : 'PASS';
    lines.push(`- Routing Eval: **${gate}**`);
  } else {
    lines.push('- Routing Eval: **MISSING**');
  }

  if (faults) {
    const passRate = faults.summary?.pass_rate ?? 0;
    const threshold = faults.thresholds?.required_pass_rate ?? 1;
    const gate = passRate >= threshold ? 'PASS' : 'FAIL';
    lines.push(`- Fault Injection: **${gate}**`);
  } else {
    lines.push('- Fault Injection: **MISSING**');
  }

  if (shadow) {
    lines.push('- Shadow Eval: **INFO**');
  } else {
    lines.push('- Shadow Eval: **MISSING**');
  }

  lines.push('');
  lines.push('## Routing Metrics');
  lines.push('');

  if (routing?.summary) {
    const s = routing.summary;
    lines.push(`- Dataset size: ${s.dataset_size}`);
    lines.push(`- Checks count: ${s.checks_count}`);
    lines.push(`- Complexity accuracy: ${fmtPct(s.complexity_accuracy)}`);
    lines.push(`- Flag accuracy: ${fmtPct(s.flag_accuracy)}`);
    lines.push(`- Domain accuracy: ${fmtPct(s.domain_accuracy)}`);
    lines.push(`- Provider type accuracy: ${fmtPct(s.provider_type_accuracy)}`);
    lines.push(`- Overall score: ${fmtPct(s.overall_score)}`);
    if (routing.failures?.length) {
      lines.push('- Failures:');
      for (const f of routing.failures) lines.push(`  - ${f}`);
    }
  } else {
    lines.push('- No routing results available.');
  }

  lines.push('');
  lines.push('## Fault Injection');
  lines.push('');

  if (faults?.summary) {
    lines.push(`- Total scenarios: ${faults.summary.total}`);
    lines.push(`- Passed: ${faults.summary.passed}`);
    lines.push(`- Failed: ${faults.summary.failed}`);
    lines.push(`- Pass rate: ${fmtPct(faults.summary.pass_rate)}`);
    const failed = (faults.results || []).filter((r) => !r.ok);
    if (failed.length) {
      lines.push('- Failed scenarios:');
      for (const f of failed) lines.push(`  - ${f.name}: ${f.error || 'failed'}`);
    }
  } else {
    lines.push('- No fault injection results available.');
  }

  lines.push('');
  lines.push('## Shadow Eval');
  lines.push('');

  if (shadow?.summary) {
    const s = shadow.summary;
    lines.push(`- Dataset size: ${s.dataset_size}`);
    lines.push(`- Candidate budget multiplier: ${s.candidate_budget_multiplier}`);
    lines.push(`- Divergence rate: ${fmtPct(s.divergence_rate)}`);
    lines.push(`- Changed cases: ${s.changed_cases}`);
    lines.push(`- Projected total cost delta: ${s.projected_total_cost_delta}`);
    lines.push(`- Projected avg cost delta: ${s.projected_avg_cost_delta}`);
  } else {
    lines.push('- No shadow eval results available.');
  }

  lines.push('');
  lines.push('## Artifact Paths');
  lines.push('');
  lines.push('- `eval/results/latest.json`');
  lines.push('- `eval/results/fault_injection_latest.json`');
  lines.push('- `eval/results/shadow_latest.json`');
  lines.push('- `eval/results/report_latest.md`');

  const reportPath = path.join(resultsDir, 'report_latest.md');
  writeFile(reportPath, lines.join('\n') + '\n');
  console.log(`Report generated: ${reportPath}`);
}

main();

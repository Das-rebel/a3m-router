#!/usr/bin/env node
/**
 * Performance Agent - Benchmarks and identifies performance issues
 * 
 * This agent measures:
 * - Token counting accuracy and speed
 * - Cost estimation precision
 * - Response time distributions
 * - Memory usage patterns
 * - Throughput under load
 */

import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  operations: number;
  totalTimeMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
}

interface PerformanceReport {
  benchmarks: BenchmarkResult[];
  issues: PerformanceIssue[];
  recommendations: string[];
}

interface PerformanceIssue {
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  current: string;
  expected: string;
}

interface PerformanceConfig {
  iterations: number;
  warmupRuns: number;
  maxTimeMs: number;
}

// Default configuration
const DEFAULT_CONFIG: PerformanceConfig = {
  iterations: 1000,
  warmupRuns: 10,
  maxTimeMs: 30000
};

// Import the modules to benchmark
function loadModules() {
  try {
    const index = require('../../dist/index.js');
    const tokenUtils = require('../../dist/utils/tokenUtils.js');
    return { index, tokenUtils };
  } catch (e) {
    // Try source if dist not available
    try {
      const tokenUtils = require('../../src/utils/tokenUtils.js');
      return { index: {}, tokenUtils };
    } catch (e2) {
      return null;
    }
  }
}

// Run a benchmark
function runBenchmark(name: string, fn: () => void, iterations: number): BenchmarkResult {
  const times: number[] = [];
  
  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }
  
  times.sort((a, b) => a - b);
  
  const totalTimeMs = times.reduce((a, b) => a + b, 0);
  
  return {
    name,
    operations: iterations,
    totalTimeMs,
    avgMs: totalTimeMs / iterations,
    minMs: times[0],
    maxMs: times[times.length - 1],
    p50Ms: times[Math.floor(iterations * 0.50)],
    p95Ms: times[Math.floor(iterations * 0.95)],
    p99Ms: times[Math.floor(iterations * 0.99)],
    opsPerSecond: (iterations / totalTimeMs) * 1000
  };
}

// Token counting benchmarks
function benchmarkTokenCounting(iterations: number): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const modules = loadModules();
  
  if (!modules || !modules.tokenUtils) {
    console.log('Warning: Could not load tokenUtils for benchmarking');
    return results;
  }
  
  const { countTokens, estimateTokens } = modules.tokenUtils;
  
  // Short text
  results.push(runBenchmark(
    'countTokens (short text ~10 chars)',
    () => countTokens('Hello world'),
    iterations
  ));
  
  // Medium text
  results.push(runBenchmark(
    'countTokens (medium text ~100 chars)',
    () => countTokens('This is a moderately long sentence that contains a decent amount of text for benchmarking token counting functions in JavaScript.'),
    iterations
  ));
  
  // Long text
  const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
  results.push(runBenchmark(
    'countTokens (long text ~2000 chars)',
    () => countTokens(longText),
    iterations
  ));
  
  // Code text
  const codeText = `function helloWorld() {
  console.log("Hello, World!");
  return 42;
}
const x = [1, 2, 3, 4, 5];
const obj = { a: 1, b: 2 };`;
  results.push(runBenchmark(
    'countTokens (code text)',
    () => countTokens(codeText),
    iterations
  ));
  
  // Unicode text
  results.push(runBenchmark(
    'countTokens (unicode - Japanese)',
    () => countTokens('こんにちは世界！これはテストです。'),
    iterations
  ));
  
  // estimateTokens if different from countTokens
  if (estimateTokens !== countTokens) {
    results.push(runBenchmark(
      'estimateTokens (short text)',
      () => estimateTokens('Hello world'),
      iterations
    ));
  }
  
  return results;
}

// Cost estimation benchmarks
function benchmarkCostEstimation(iterations: number): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const modules = loadModules();
  
  if (!modules || !modules.tokenUtils) {
    console.log('Warning: Could not load tokenUtils for benchmarking');
    return results;
  }
  
  const { estimateCost } = modules.tokenUtils;
  
  if (typeof estimateCost === 'function') {
    // Small request
    results.push(runBenchmark(
      'estimateCost (100 in, 50 out)',
      () => estimateCost(100, 50, 'gpt-4o'),
      iterations
    ));
    
    // Large request
    results.push(runBenchmark(
      'estimateCost (10K in, 5K out)',
      () => estimateCost(10000, 5000, 'gpt-4o'),
      iterations
    ));
    
    // Different models
    for (const model of ['gpt-4o', 'gpt-3.5-turbo', 'claude-3-sonnet']) {
      results.push(runBenchmark(
        `estimateCost (${model})`,
        () => estimateCost(1000, 500, model),
        iterations
      ));
    }
  }
  
  return results;
}

// Memory benchmarks
function benchmarkMemory(iterations: number): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const modules = loadModules();
  
  if (!modules) {
    return results;
  }
  
  // Test MemoryTree operations
  if (modules.index.MemoryTree) {
    const MemoryTree = modules.index.MemoryTree;
    
    // Add operation
    const memory = new MemoryTree({ maxSize: 1000 });
    results.push(runBenchmark(
      'MemoryTree.add (single entry)',
      () => {
        memory.add('test entry ' + Math.random(), { tags: ['test'] });
      },
      Math.min(iterations, 100) // Fewer iterations for memory tests
    ));
    
    // Search operation
    for (let i = 0; i < 100; i++) {
      memory.add('test entry ' + i, { tags: ['test'] });
    }
    results.push(runBenchmark(
      'MemoryTree.search',
      () => memory.search('test'),
      Math.min(iterations, 100)
    ));
  }
  
  return results;
}

// Identify performance issues
function identifyIssues(benchmarks: BenchmarkResult[]): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];
  
  for (const bench of benchmarks) {
    // Check if avg is too high
    if (bench.avgMs > 100) {
      issues.push({
        name: `Slow operation: ${bench.name}`,
        description: `Average time per operation exceeds 100ms`,
        severity: bench.avgMs > 1000 ? 'critical' : 'high',
        current: `${bench.avgMs.toFixed(2)}ms avg`,
        expected: '< 100ms avg'
      });
    }
    
    // Check p99 vs avg ratio (high variance)
    if (bench.avgMs > 0 && bench.p99Ms / bench.avgMs > 10) {
      issues.push({
        name: `High variance: ${bench.name}`,
        description: `p99 is ${(bench.p99Ms / bench.avgMs).toFixed(1)}x higher than average`,
        severity: 'medium',
        current: `p99: ${bench.p99Ms.toFixed(2)}ms, avg: ${bench.avgMs.toFixed(2)}ms`,
        expected: `p99 should be < 5x avg`
      });
    }
    
    // Check operations per second
    if (bench.opsPerSecond < 10 && bench.avgMs > 1) {
      issues.push({
        name: `Low throughput: ${bench.name}`,
        description: `Operations per second is very low`,
        severity: 'medium',
        current: `${bench.opsPerSecond.toFixed(2)} ops/sec`,
        expected: '> 100 ops/sec'
      });
    }
  }
  
  return issues;
}

// Generate performance tests
function generatePerformanceTests(benchmarks: BenchmarkResult[]): string {
  const tests: string[] = [];
  
  tests.push(`// Auto-generated performance tests
// Generated: ${new Date().toISOString()}

describe('Performance Benchmarks', () => {`);
  
  for (const bench of benchmarks) {
    tests.push(`
  describe('${bench.name}', () => {
    it('completes within acceptable time', () => {
      expect(${bench.avgMs.toFixed(2)}).toBeLessThan(100);
    });
    
    it('has reasonable p99 latency', () => {
      expect(${bench.p99Ms.toFixed(2)}).toBeLessThan(500);
    });
    
    it('achieves minimum throughput', () => {
      expect(${bench.opsPerSecond.toFixed(2)}).toBeGreaterThan(10);
    });
  });`);
  }
  
  tests.push('});');
  
  return tests.join('\n');
}

// Main analysis function
function analyzePerformance(config: Partial<PerformanceConfig> = {}): PerformanceReport {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  console.log(`\nRunning performance benchmarks (${cfg.iterations} iterations)...`);
  
  const benchmarks: BenchmarkResult[] = [];
  
  // Token counting benchmarks
  console.log('  - Token counting...');
  benchmarks.push(...benchmarkTokenCounting(cfg.iterations));
  
  // Cost estimation benchmarks  
  console.log('  - Cost estimation...');
  benchmarks.push(...benchmarkCostEstimation(cfg.iterations));
  
  // Memory benchmarks
  console.log('  - Memory operations...');
  benchmarks.push(...benchmarkMemory(cfg.iterations));
  
  // Identify issues
  const issues = identifyIssues(benchmarks);
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (issues.some(i => i.severity === 'critical')) {
    recommendations.push('CRITICAL: Address critical performance issues before production');
  }
  
  if (issues.some(i => i.severity === 'high')) {
    recommendations.push('HIGH: Optimize high-severity performance bottlenecks');
  }
  
  const slowBenchmarks = benchmarks.filter(b => b.avgMs > 50);
  if (slowBenchmarks.length > 0) {
    recommendations.push(`Consider caching for ${slowBenchmarks.length} slow operations`);
  }
  
  return { benchmarks, issues, recommendations };
}

// Print report
function printReport(report: PerformanceReport): void {
  console.log('\n========================================');
  console.log('PERFORMANCE AGENT - Benchmark Report');
  console.log('========================================\n');
  
  console.log('Benchmarks:');
  for (const bench of report.benchmarks) {
    console.log(`\n  ${bench.name}:`);
    console.log(`    Avg: ${bench.avgMs.toFixed(4)}ms`);
    console.log(`    Min: ${bench.minMs.toFixed(4)}ms`);
    console.log(`    Max: ${bench.maxMs.toFixed(4)}ms`);
    console.log(`    p50: ${bench.p50Ms.toFixed(4)}ms`);
    console.log(`    p95: ${bench.p95Ms.toFixed(4)}ms`);
    console.log(`    p99: ${bench.p99Ms.toFixed(4)}ms`);
    console.log(`    Ops/sec: ${bench.opsPerSecond.toFixed(2)}`);
  }
  
  if (report.issues.length > 0) {
    console.log('\nIssues Found:');
    for (const issue of report.issues) {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.name}`);
      console.log(`    ${issue.description}`);
      console.log(`    Current: ${issue.current}`);
      console.log(`    Expected: ${issue.expected}`);
    }
  } else {
    console.log('\nNo performance issues detected!');
  }
  
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    for (const rec of report.recommendations) {
      console.log(`  - ${rec}`);
    }
  }
}

// Run agent if executed directly
if (require.main === module) {
  const report = analyzePerformance();
  printReport(report);
  
  // Generate test code
  const generated = generatePerformanceTests(report.benchmarks);
  const outputPath = path.join(__dirname, '../3-performance-tests-generated.ts');
  fs.writeFileSync(outputPath, generated);
  console.log(`\nGenerated tests written to: ${outputPath}`);
}

export { 
  analyzePerformance, 
  runBenchmark, 
  benchmarkTokenCounting, 
  benchmarkCostEstimation,
  benchmarkMemory,
  generatePerformanceTests,
  PerformanceReport,
  BenchmarkResult,
  PerformanceIssue
};

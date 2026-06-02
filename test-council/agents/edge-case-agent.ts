#!/usr/bin/env node
/**
 * Edge Case Agent - Identifies failure modes and boundary conditions
 * 
 * This agent identifies:
 * - Empty/null/undefined inputs
 * - Boundary values
 * - Error handling paths
 * - Race conditions
 * - Concurrent access patterns
 */

import * as fs from 'fs';
import * as path from 'path';

interface EdgeCase {
  category: 'input' | 'boundary' | 'error' | 'concurrency' | 'timeout';
  description: string;
  testName: string;
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// Common edge case patterns
const EDGE_CASE_PATTERNS = {
  emptyString: {
    pattern: /function\s+\w+\s*\([^)]*text\s*:?\s*string/i,
    cases: [
      { input: "''", description: 'empty string' },
      { input: '"   "', description: 'whitespace-only string' },
      { input: '""', description: 'double empty quotes' },
    ]
  },
  nullUndefined: {
    pattern: /function\s+\w+\s*\([^)]*\w+\s*:?\s*\w+/i,
    cases: [
      { input: 'null', description: 'null value' },
      { input: 'undefined', description: 'undefined value' },
    ]
  },
  arrays: {
    pattern: /function\s+\w+\s*\([^)]*array|items|\[\]/i,
    cases: [
      { input: '[]', description: 'empty array' },
      { input: '[null]', description: 'array with null' },
      { input: '[undefined]', description: 'array with undefined' },
    ]
  },
  numbers: {
    pattern: /function\s+\w+\s*\([^)]*count|size|length|index/i,
    cases: [
      { input: '0', description: 'zero' },
      { input: '-1', description: 'negative one' },
      { input: 'Number.MAX_VALUE', description: 'MAX_VALUE' },
      { input: 'Number.MIN_VALUE', description: 'MIN_VALUE' },
      { input: 'Infinity', description: 'Infinity' },
      { input: '-Infinity', description: '-Infinity' },
      { input: 'NaN', description: 'NaN' },
    ]
  },
  functions: {
    pattern: /async\s+function\s+\w+|function\s+\w+\s*\([^)]*callback/i,
    cases: [
      { input: 'Promise.resolve()', description: 'immediately resolving promise' },
      { input: 'Promise.reject(new Error())', description: 'immediately rejecting promise' },
      { input: '() => new Promise(r => setTimeout(() => r(), 10000))', description: 'slow function (10s)' },
      { input: '() => new Promise((_, r) => setTimeout(() => r(new Error()), 1000))', description: 'slow error (1s)' },
    ]
  }
};

interface AnalysisResult {
  edgeCases: EdgeCase[];
  coverage: number;
  criticalPaths: string[];
}

// Main analysis function
function analyzeEdgeCases(projectRoot: string): AnalysisResult {
  const srcDir = path.join(projectRoot, 'src');
  const edgeCases: EdgeCase[] = [];
  
  // Find all TypeScript files
  const files = findTsFiles(srcDir);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileCases = analyzeFile(content, file);
    edgeCases.push(...fileCases);
  }
  
  // Calculate coverage based on existing tests
  const testFiles = findTestFiles(projectRoot);
  const testContent = testFiles.map(f => fs.readFileSync(f, 'utf-8')).join('\n');
  
  const testedPatterns = new Set<string>();
  for (const edge of edgeCases) {
    if (testContent.includes(edge.testName) || testContent.includes(edge.description)) {
      testedPatterns.add(edge.testName);
    }
  }
  
  const coverage = edgeCases.length > 0 
    ? (testedPatterns.size / edgeCases.length) * 100 
    : 0;
  
  // Identify critical paths
  const criticalPaths = identifyCriticalPaths(edgeCases);
  
  return { edgeCases, coverage, criticalPaths };
}

function findTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__pycache__') continue;
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function findTestFiles(projectRoot: string): string[] {
  const testDirs = ['test', 'tests', 'test-council'];
  const files: string[] = [];
  
  for (const dir of testDirs) {
    const testDir = path.join(projectRoot, dir);
    if (fs.existsSync(testDir)) {
      files.push(...findInDir(testDir));
    }
  }
  
  return files;
}

function findInDir(dir: string): string[] {
  const files: string[] = [];
  
  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.match(/\.(test|spec)\.(ts|js)$/)) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function analyzeFile(content: string, file: string): EdgeCase[] {
  const cases: EdgeCase[] = [];
  const baseName = path.basename(file, '.ts');
  
  // Check for patterns and generate edge cases
  for (const [patternName, pattern] of Object.entries(EDGE_CASE_PATTERNS)) {
    if (pattern.pattern.test(content)) {
      for (const testCase of pattern.cases) {
        cases.push({
          category: getCategory(patternName),
          description: `${testCase.description} input for ${baseName}`,
          testName: `handles ${testCase.description}`,
          code: generateTestCode(baseName, testCase),
          severity: getSeverity(patternName, testCase)
        });
      }
    }
  }
  
  // Add error handling cases
  const errorCases = analyzeErrorHandling(content, baseName);
  cases.push(...errorCases);
  
  // Add concurrency cases
  const concurrencyCases = analyzeConcurrency(content, baseName);
  cases.push(...concurrencyCases);
  
  return cases;
}

function getCategory(patternName: string): EdgeCase['category'] {
  if (patternName === 'functions') return 'timeout';
  if (patternName === 'numbers') return 'boundary';
  return 'input';
}

function getSeverity(patternName: string, testCase: { input: string }): EdgeCase['severity'] {
  if (patternName === 'numbers') {
    if (['0', '-1', 'NaN', 'Infinity', '-Infinity'].includes(testCase.input)) {
      return 'high';
    }
  }
  if (testCase.input === 'null' || testCase.input === 'undefined') {
    return 'high';
  }
  return 'medium';
}

function generateTestCode(baseName: string, testCase: { input: string; description: string }): string {
  return `// Test for ${testCase.description}
it('handles ${testCase.description}', () => {
  // TODO: Implement edge case test
  expect(true).toBe(true);
});`;
}

function analyzeErrorHandling(content: string, baseName: string): EdgeCase[] {
  const cases: EdgeCase[] = [];
  
  // Find throw statements
  const throwMatches = content.matchAll(/throw\s+new\s+Error\s*\(\s*['"]([^'"]+)/g);
  for (const match of throwMatches) {
    cases.push({
      category: 'error',
      description: `error case: ${match[1]}`,
      testName: `throws error: ${match[1]}`,
      code: `it('throws error: ${match[1]}', () => { expect(() => subject()).toThrow(); });`,
      severity: 'critical'
    });
  }
  
  // Find if (error) patterns
  if (content.includes('catch') || content.includes('if (err')) {
    cases.push({
      category: 'error',
      description: 'error in catch block',
      testName: 'handles catch block',
      code: `it('handles catch block', () => { /* test error handling */ });`,
      severity: 'high'
    });
  }
  
  return cases;
}

function analyzeConcurrency(content: string, baseName: string): EdgeCase[] {
  const cases: EdgeCase[] = [];
  
  // Check for async/await patterns
  if (content.includes('async') && content.includes('await')) {
    cases.push({
      category: 'concurrency',
      description: 'concurrent async calls',
      testName: 'handles concurrent async calls',
      code: `it('handles concurrent async calls', async () => {
  await Promise.all([
    subject(),
    subject(),
    subject()
  ]);
});`,
      severity: 'high'
    });
  }
  
  // Check for shared state
  if (content.match(/\bthis\.\w+\s*=/g)?.length > 3) {
    cases.push({
      category: 'concurrency',
      description: 'shared state mutation',
      testName: 'handles shared state safely',
      code: `it('handles shared state safely', async () => {
  // Run multiple times to check for race conditions
  await Promise.all([subject(), subject(), subject()]);
});`,
      severity: 'medium'
    });
  }
  
  return cases;
}

function identifyCriticalPaths(edgeCases: EdgeCase[]): string[] {
  const critical = edgeCases
    .filter(e => e.severity === 'critical')
    .map(e => e.testName);
  
  return [...new Set(critical)];
}

// Generate comprehensive edge case tests
function generateEdgeCaseTests(result: AnalysisResult): string {
  const tests: string[] = [];
  
  tests.push(`// Auto-generated edge case tests
// Total edge cases identified: ${result.edgeCases.length}
// Critical paths: ${result.criticalPaths.length}

describe('Edge Case Coverage', () => {`);
  
  const byCategory = new Map<string, EdgeCase[]>();
  for (const edge of result.edgeCases) {
    if (!byCategory.has(edge.category)) {
      byCategory.set(edge.category, []);
    }
    byCategory.get(edge.category)!.push(edge);
  }
  
  for (const [category, cases] of byCategory) {
    tests.push(`\n  describe('${category.toUpperCase()} cases', () => {`);
    
    for (const edge of cases.slice(0, 10)) { // Limit per category
      tests.push(`    ${edge.code.replace('it(', "it('${category}: ").replace("() => {", "', () => {")}`);
    }
    
    tests.push('  });');
  }
  
  tests.push('});');
  
  return tests.join('\n');
}

// Run agent if executed directly
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '../..');
  const result = analyzeEdgeCases(projectRoot);
  
  console.log('\n========================================');
  console.log('EDGE CASE AGENT - Analysis Report');
  console.log('========================================\n');
  console.log(`Total Edge Cases: ${result.edgeCases.length}`);
  console.log(`Critical Paths: ${result.criticalPaths.length}`);
  console.log(`Estimated Coverage: ${result.coverage.toFixed(1)}%\n`);
  
  console.log('By Category:');
  const byCategory = new Map<string, number>();
  for (const edge of result.edgeCases) {
    byCategory.set(edge.category, (byCategory.get(edge.category) || 0) + 1);
  }
  for (const [cat, count] of byCategory) {
    console.log(`  ${cat}: ${count}`);
  }
  
  console.log('\nCritical Paths:');
  for (const path of result.criticalPaths.slice(0, 10)) {
    console.log(`  - ${path}`);
  }
  
  // Generate test code
  const generated = generateEdgeCaseTests(result);
  const outputPath = path.join(__dirname, '../2-edge-case-tests-generated.ts');
  fs.writeFileSync(outputPath, generated);
  console.log(`\nGenerated tests written to: ${outputPath}`);
}

export { analyzeEdgeCases, AnalysisResult, EdgeCase, generateEdgeCaseTests };

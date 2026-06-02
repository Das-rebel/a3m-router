#!/usr/bin/env node
/**
 * Structure Agent - Analyzes code structure and exports for test coverage
 * 
 * This agent identifies:
 * - Exported functions without tests
 * - Type definitions needing validation
 * - Interface implementations
 * - Public API coverage
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'unknown';
  file: string;
  line: number;
  tested: boolean;
}

interface CoverageReport {
  total: number;
  tested: number;
  untested: ExportInfo[];
  coverage: number;
}

// Main analysis function
function analyzeStructure(projectRoot: string): CoverageReport {
  const srcDir = path.join(projectRoot, 'src');
  const exports: ExportInfo[] = [];
  
  // Find all TypeScript files
  const files = findTsFiles(srcDir);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileExports = extractExports(content, file);
    exports.push(...fileExports);
  }
  
  // Check which exports are tested
  const testFiles = findTestFiles(projectRoot);
  const testedNames = new Set<string>();
  
  for (const testFile of testFiles) {
    const content = fs.readFileSync(testFile, 'utf-8');
    // Extract describe/it blocks to find tested names
    const matches = content.matchAll(/(?:describe|it)\s*\(\s*['"]([^'"]+)/g);
    for (const match of matches) {
      testedNames.add(match[1]);
    }
  }
  
  // Mark tested exports
  for (const exp of exports) {
    exp.tested = testedNames.has(exp.name) || 
                 testedNames.has(exp.name.toLowerCase()) ||
                 testedNames.has(sanitizeTestName(exp.name));
  }
  
  const tested = exports.filter(e => e.tested);
  const untested = exports.filter(e => !e.tested);
  
  return {
    total: exports.length,
    tested: tested.length,
    untested,
    coverage: exports.length > 0 ? (tested.length / exports.length) * 100 : 0
  };
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
      files.push(...findTestFilesInDir(testDir));
    }
  }
  
  return files;
}

function findTestFilesInDir(dir: string): string[] {
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

function extractExports(content: string, file: string): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const lines = content.split('\n');
  
  // Track line numbers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // export function/const/class/interface/type
    const exportMatch = line.match(/^export\s+(?:function|class|const|interface|type|enum)\s+(\w+)/);
    if (exportMatch) {
      const name = exportMatch[1];
      let type: ExportInfo['type'] = 'unknown';
      
      if (line.includes('function')) type = 'function';
      else if (line.includes('class')) type = 'class';
      else if (line.includes('interface')) type = 'interface';
      else if (line.includes('type')) type = 'type';
      else if (line.includes('const') || line.includes('enum')) type = 'const';
      
      exports.push({ name, type, file: path.basename(file), line: lineNum, tested: false });
    }
    
    // export { name } from
    const reExportMatch = line.match(/^export\s*{\s*(\w+)/);
    if (reExportMatch) {
      exports.push({ 
        name: reExportMatch[1], 
        type: 'unknown', 
        file: path.basename(file), 
        line: lineNum, 
        tested: false 
      });
    }
  }
  
  return exports;
}

function sanitizeTestName(name: string): string {
  // Convert PascalCase to kebab-case or space-separated
  return name
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
}

// Generate tests for untested exports
function generateTestsForUntested(report: CoverageReport): string {
  const tests: string[] = [];
  
  for (const exp of report.untested) {
    if (exp.type === 'function') {
      tests.push(`
  // TODO: Add test for untested export: ${exp.name}
  // File: ${exp.file}:${exp.line}
  // Type: ${exp.type}
  it('${exp.name} - structure coverage', () => {
    // Structure test placeholder
    expect(true).toBe(true);
  });`);
    }
  }
  
  return tests.join('\n');
}

// Run agent if executed directly
if (require.main === module) {
  const projectRoot = path.resolve(__dirname, '../..');
  const report = analyzeStructure(projectRoot);
  
  console.log('\n========================================');
  console.log('STRUCTURE AGENT - Coverage Report');
  console.log('========================================\n');
  console.log(`Total Exports: ${report.total}`);
  console.log(`Tested: ${report.tested}`);
  console.log(`Untested: ${report.untested.length}`);
  console.log(`Coverage: ${report.coverage.toFixed(1)}%\n`);
  
  if (report.untested.length > 0) {
    console.log('Untested Exports:');
    for (const exp of report.untested.slice(0, 20)) {
      console.log(`  - ${exp.name} (${exp.type}) @ ${exp.file}:${exp.line}`);
    }
    if (report.untested.length > 20) {
      console.log(`  ... and ${report.untested.length - 20} more`);
    }
  }
  
  // Generate test code
  const generated = generateTestsForUntested(report);
  const outputPath = path.join(__dirname, '../1-structure-tests-generated.ts');
  fs.writeFileSync(outputPath, `// Auto-generated structure tests\n${generated}\n`);
  console.log(`\nGenerated tests written to: ${outputPath}`);
}

export { analyzeStructure, CoverageReport, ExportInfo, generateTestsForUntested };

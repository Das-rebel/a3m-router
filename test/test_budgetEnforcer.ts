/**
 * A3M Router - BudgetEnforcer Tests
 */

import { BudgetEnforcer, BudgetConfig, SpendRecord } from '../src/cost/budgetEnforcer';

interface TestResult {
  passed: boolean;
  name: string;
  error?: string;
}

const results: TestResult[] = [];

function assertEqual<T>(name: string, actual: T, expected: T): void {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({
    passed,
    name,
    error: passed ? undefined : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  });
}

function assertTrue(name: string, actual: boolean): void {
  assertEqual(name, actual, true);
}

function assertFalse(name: string, actual: boolean): void {
  assertEqual(name, actual, false);
}

function assertThrows(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ passed: false, name, error: 'Expected function to throw, but it did not' });
  } catch {
    results.push({ passed: true, name });
  }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('Running BudgetEnforcer tests...\n');

  // Test: Basic budget checking
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000, { hardCap: true }); // $100.00 = 10000 cents

    const result = enforcer.checkBudget('test-key', 5000); // $50
    assertTrue('checkBudget allows request under budget', result.allowed);
    assertEqual('remaining after $50 of $100 budget', result.remaining, 5000);
  }

  // Test: Spend recording
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000);

    enforcer.recordSpend('test-key', 3000);
    const spend = enforcer.getSpend('test-key');

    assertEqual('spent after recording $30', spend?.spent, 3000);
    assertEqual('remaining after recording $30 of $100', spend?.remaining, 7000);
  }

  // Test: Cumulative spend tracking
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000);

    enforcer.recordSpend('test-key', 3000);
    enforcer.recordSpend('test-key', 2000);
    const spend = enforcer.getSpend('test-key');

    assertEqual('total spent after two recordings', spend?.spent, 5000);
    assertEqual('remaining after two recordings', spend?.remaining, 5000);
  }

  // Test: Threshold alerts
  {
    const enforcer = new BudgetEnforcer();
    let alertFired = false;
    let alertData: any = null;

    enforcer.on('budget:warning', (data: any) => {
      alertFired = true;
      alertData = data;
    });

    enforcer.setBudget('test-key', 10000, {
      alertThresholds: [0.5, 0.8],
    });

    // Spend to hit 50% threshold
    enforcer.recordSpend('test-key', 5000);

    assertTrue('alert fired at 50% threshold', alertFired);
    assertEqual('alert threshold value', alertData?.threshold, 0.5);
    assertEqual('alert spent value', alertData?.spent, 5000);
  }

  // Test: Threshold only fires once
  {
    const enforcer = new BudgetEnforcer();
    let alertCount = 0;

    enforcer.on('budget:warning', () => {
      alertCount++;
    });

    enforcer.setBudget('test-key', 10000, {
      alertThresholds: [0.5],
    });

    enforcer.recordSpend('test-key', 5000);
    enforcer.recordSpend('test-key', 1000); // More spend, still above 50%
    enforcer.recordSpend('test-key', 1000);

    assertEqual('alert only fires once per threshold', alertCount, 1);
  }

  // Test: Hard cap rejection
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000, { hardCap: true });

    // Spend most of budget
    enforcer.recordSpend('test-key', 9000);

    const result = enforcer.checkBudget('test-key', 2000); // Would exceed
    assertFalse('checkBudget rejects request when hard cap would be exceeded', result.allowed);
    assertTrue('reason provided for rejection', result.reason?.includes('Budget exceeded') ?? false);
  }

  // Test: Hard cap allows if under budget
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000, { hardCap: true });

    enforcer.recordSpend('test-key', 5000);

    const result = enforcer.checkBudget('test-key', 3000);
    assertTrue('checkBudget allows request under hard cap', result.allowed);
    assertEqual('correct remaining', result.remaining, 2000);
  }

  // Test: Budget reset
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000);

    enforcer.recordSpend('test-key', 8000);
    enforcer.resetBudget('test-key');

    const spend = enforcer.getSpend('test-key');
    assertEqual('spent reset to 0', spend?.spent, 0);
    assertEqual('remaining reset to full budget', spend?.remaining, 10000);
  }

  // Test: Set budget on unknown key (permissive)
  {
    const enforcer = new BudgetEnforcer();
    const result = enforcer.checkBudget('unknown-key', 5000);
    assertTrue('unknown key allowed by default', result.allowed);
    assertEqual('unknown key has infinite remaining', result.remaining, Infinity);
  }

  // Test: Update limit
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000);
    enforcer.recordSpend('test-key', 5000);

    enforcer.updateLimit('test-key', 20000);

    const spend = enforcer.getSpend('test-key');
    assertEqual('budget increased', spend?.budget, 20000);
    assertEqual('remaining recalculated', spend?.remaining, 15000);
  }

  // Test: Get all spend records
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('key1', 10000);
    enforcer.setBudget('key2', 20000);
    enforcer.recordSpend('key1', 1000);
    enforcer.recordSpend('key2', 2000);

    const all = enforcer.getAllSpend();
    assertEqual('getAllSpend returns 2 records', all.length, 2);
  }

  // Test: Remove budget
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000);
    enforcer.removeBudget('test-key');

    const config = enforcer.getBudgetConfig('test-key');
    assertEqual('config removed', config, undefined);
  }

  // Test: 100% threshold event
  {
    const enforcer = new BudgetEnforcer();
    let exceededEvent = false;

    enforcer.on('budget:exceeded', () => {
      exceededEvent = true;
    });

    enforcer.setBudget('test-key', 10000, { hardCap: true });
    enforcer.recordSpend('test-key', 10000);

    assertTrue('budget:exceeded event fired', exceededEvent);
  }

  // Test: Soft cap allows request but warns
  {
    const enforcer = new BudgetEnforcer();
    let warningCount = 0;

    enforcer.on('budget:warning', () => {
      warningCount++;
    });

    enforcer.setBudget('test-key', 10000, { hardCap: false });

    // Spend to exceed
    enforcer.recordSpend('test-key', 11000);

    assertTrue('soft cap allows over-budget spend', warningCount >= 1);
  }

  // Test: Days until reset
  {
    const enforcer = new BudgetEnforcer();
    enforcer.setBudget('test-key', 10000);

    const days = enforcer.getDaysUntilReset('test-key');
    assertTrue('days until reset is positive', (days ?? 0) > 0);
    assertTrue('days until reset is <= 31', (days ?? 0) <= 31);
  }

  // Test: getSpend returns undefined for unknown key
  {
    const enforcer = new BudgetEnforcer();
    const spend = enforcer.getSpend('unknown-key');
    assertEqual('getSpend returns undefined for unknown key', spend, undefined);
  }

  // Test: Multiple threshold progression
  {
    const enforcer = new BudgetEnforcer();
    const alerts: number[] = [];

    enforcer.on('budget:warning', (data: any) => {
      alerts.push(data.threshold);
    });

    enforcer.setBudget('test-key', 10000, {
      alertThresholds: [0.5, 0.8, 1.0],
    });

    enforcer.recordSpend('test-key', 5000);  // 50%
    enforcer.recordSpend('test-key', 3000);  // 80%
    enforcer.recordSpend('test-key', 2000);  // 100%

    assertEqual('alerts at 50%, 80%, 100%', JSON.stringify(alerts), JSON.stringify([0.5, 0.8, 1.0]));
  }

  // Test: Factory function
  {
    const enforcer = createBudgetEnforcer();
    enforcer.setBudget('test-key', 10000);
    const result = enforcer.checkBudget('test-key', 1000);
    assertTrue('factory created enforcer works', result.allowed);
  }

  // Print results
  console.log('\n--- Test Results ---');
  let passed = 0;
  let failed = 0;

  for (const r of results) {
    if (r.passed) {
      console.log(`  PASS: ${r.name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${r.name}`);
      if (r.error) console.log(`        ${r.error}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
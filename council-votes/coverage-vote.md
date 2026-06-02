## Test Coverage Vote

### Finding 1: GuardrailEngine Has Zero Tests (CRITICAL)
- **Files:** `src/security/guardrails.ts` (500+ lines)
- **Problem:** Critical security module has NO tests despite handling:
  - Prompt injection detection (DAN, jailbreak, ignore instructions)
  - PII redaction (emails, phones, SSN, credit cards, API keys)
  - Content filtering (violence, hate, self-harm)
  - Output validation and hallucination detection
- **Solution:** Add comprehensive tests for:
  - Each prompt injection pattern detection
  - PII redaction for all types
  - Content filter thresholds
  - GuardrailEngine.checkInput() and checkOutput() full paths
  - Custom guardrail registration
  - Blocklist management
- **Tests gained:** ~25 tests covering security-critical paths

### Finding 2: EnsembleOrchestrator Has Zero Tests (CORE P0)
- **Files:** `src/ensemble.ts`, `tests/routing/ensembleVoting.test.ts` (partial)
- **Problem:** Core P0 feature (parallel multi-LLM execution with result merging) has only partial tests in `tests/routing/`. The `EnsembleOrchestrator` class is NOT tested, and these critical paths are missing:
  - Actual provider calls (mocked in ensembleVoting.test.ts)
  - Majority voting strategy
  - Weighted voting strategy  
  - Conservative strategy with uncertainty detection
  - All-providers-fail error handling
- **Solution:** Add integration tests for EnsembleOrchestrator with:
  - Mock providers returning different answers
  - Strategy-specific voting logic
  - Confidence scoring accuracy
  - Reasoning generation
- **Tests gained:** ~15 tests for the unique differentiator

### Finding 3: CostAnalytics Has Zero Tests (BUSINESS-CRITICAL)
- **Files:** `src/analytics/costAnalytics.ts`
- **Problem:** Cost tracking and savings calculation has no tests:
  - No verification of savings calculation against known baselines
  - No tests for BASELINE_COSTS accuracy
  - No export format tests (JSON/CSV)
  - No period filtering (hour/day/week/month)
  - No auto-rotation when maxRecords exceeded
- **Solution:** Add tests for:
  - Savings calculation accuracy (compare against known costs)
  - Period filtering correctness
  - Export format validation
  - Provider/query type breakdown accuracy
- **Tests gained:** ~12 tests for cost accuracy

### Finding 4: SDK Class (A3MRouter) Has Only Structure Tests
- **Files:** `src/sdk.ts`, `test-council/1-structure-tests.test.ts`
- **Problem:** SDK wrapper has basic type-checking but no behavioral tests:
  - No tests for route() behavior
  - No tests for analyze() feature extraction
  - No tests for tier classification thresholds
  - No tests for recommend() method
- **Solution:** Add behavioral tests verifying:
  - Route decisions match expected patterns
  - Feature extraction accuracy
  - Tier classification boundaries (free/cheap/mid/premium)
  - Batch routing consistency
- **Tests gained:** ~10 tests

### Finding 5: Observability Middleware Not Tested
- **Files:** `src/observability/middleware.ts`
- **Problem:** Middleware components not tested:
  - observabilityMiddleware not tested
  - budgetAlertMiddleware not tested  
  - Integration with Express/Fastify not tested
- **Solution:** Add middleware tests verifying:
  - Request/response interception
  - Header injection
  - Budget alert triggers
  - Error propagation
- **Tests gained:** ~8 tests

---

## Vote

**I vote for Finding #1 (GuardrailEngine) as highest priority.**

### Rationale:
1. **Security-critical code without tests = production risk** - Prompt injection and PII handling bugs can leak sensitive data or bypass safety
2. **Measurable impact** - Every user query goes through guardrails before routing
3. **Clear scope** - 500+ lines with well-defined functions that are easy to test
4. **Existing patterns** - The providerRetry.test.ts shows how to structure similar complex tests

### Implementation estimate:
- **GuardrailEngine:** ~3 hours for comprehensive tests
- **EnsembleOrchestrator:** ~2 hours  
- **CostAnalytics:** ~1.5 hours
- **SDK:** ~1 hour
- **Middleware:** ~1 hour

# A3M Router Test Council

## Overview

The A3M Router Test Council is a multi-agent testing approach inspired by the agent council pattern used in production LLM systems. Instead of a single monolithic test suite, we use **3 specialist agents**, each evaluating the codebase from a distinct perspective.

## Why Agent Council?

Traditional testing treats all tests equally. A council approach recognizes that:

1. **Different aspects of code quality require different testing strategies**
2. **Specialized agents can find issues a general test would miss**
3. **Council decisions are more robust than single-agent decisions**

## The 3 Specialist Agents

### 1. Structure Agent (`1-structure-tests.ts`)

**Focus:** Code architecture, type safety, and export validation

**Specialization:**
- Verifies all exports are present and correctly typed
- Validates provider configuration structure
- Checks model profile completeness
- Ensures class instantiation works
- Validates enum and constant values

**Key Questions:**
- Are all public APIs exported correctly?
- Do model profiles have required fields?
- Are provider configs valid?
- Do class constructors work?

**Example Findings:**
- Missing required fields in provider config
- Inconsistent type definitions
- Invalid enum values
- Missing method exports

### 2. Edge-Case Agent (`2-edge-case-tests.ts`)

**Focus:** Boundary conditions, error handling, and invalid inputs

**Specialization:**
- Tests empty and null inputs
- Validates extremely long inputs
- Checks unknown/invalid models
- Tests missing API key handling
- Verifies concurrent request safety
- Tests special characters and unicode
- Validates error recovery

**Key Questions:**
- What happens with empty strings?
- How does the system handle null inputs?
- What about 10,000 word queries?
- Does concurrent access cause race conditions?
- Are special characters handled safely?

**Example Findings:**
- Null pointer exceptions on empty inputs
- Buffer overflow on very long queries
- Race conditions in shared state
- Missing error boundaries

### 3. Performance Agent (`3-performance-tests.ts`)

**Focus:** Latency, throughput, and scalability

**Specialization:**
- Benchmarks token counting (< 1ms target)
- Measures route decision latency (< 5ms target)
- Tests memory tree operations
- Validates cost estimation accuracy
- Measures batch routing throughput
- Tests concurrent operation performance

**Key Questions:**
- Is token counting fast enough?
- Can we route 100 queries per second?
- Do memory operations scale?
- Is cost estimation accurate?
- Are operations deterministic?

**Example Findings:**
- Token counting too slow for real-time use
- Memory tree operations don't scale
- Inconsistent results under load
- Cost calculation drift over time

## Supporting Test Files

### 4. Integration Tests (`4-integration-tests.ts`)

**Focus:** Full pipeline workflows across components

**Tests:**
- Extract features → Route → Return structure
- Memory tree add → search → verify
- Cost tracker add → verify total
- Provider register → get → deregister
- Cross-component workflows

### 5. Cost Model Tests (`5-cost-model-tests.ts`)

**Focus:** Financial accuracy and budget enforcement

**Tests:**
- MODEL_COSTS matches actual provider pricing
- estimateCost accuracy across tiers (free/cheap/mid/premium)
- Cost comparison between models is correct
- Budget enforcer respects limits
- CostTracker calculations match expected values

## How the Council Evaluates

Each agent runs independently and reports:

```
Agent: Structure
✅ All exports present
✅ Provider configs valid
❌ MODEL_PROFILES missing context_window field
✅ Class instantiation works

Result: 47/48 passed
```

The council **passes** only if **all agents pass**. This ensures:
- No single aspect degrades
- Issues in any dimension are caught
- Overall system quality is maintained

## Success Criteria

For the council to pass, we require:

| Agent | Metric | Target |
|-------|--------|--------|
| Structure | Tests passed | 100% |
| Edge-Case | Tests passed | 100% |
| Performance | Latency targets met | 100% |
| Integration | Pipeline tests passed | 100% |
| Cost Model | Cost accuracy | 100% |

## Running the Council

```bash
# Run all tests
node test-council/1-structure-tests.ts
node test-council/2-edge-case-tests.ts
node test-council/3-performance-tests.ts
node test-council/4-integration-tests.ts
node test-council/5-cost-model-tests.ts

# Or use the test runner
./test-council/run-all.sh
```

## Design Principles

1. **Independence**: Each test file runs standalone
2. **Isolation**: Tests don't depend on each other
3. **Clear reporting**: Pass/fail with actionable messages
4. **Focused scope**: Each agent has clear responsibilities
5. **Realistic inputs**: Tests use real-world query patterns

## Evolution

The council pattern can be extended:

- **Security Agent**: Input sanitization, injection attacks
- **Reliability Agent**: Network failure simulation
- **Scalability Agent**: Load testing with 1000+ concurrent users
- **Compatibility Agent**: Node.js version, dependency conflicts

## Credits

Inspired by:
- Ensemble methods in machine learning
- Agent councils in production LLM systems (Mixtral, GPT-4)
- Test-driven development principles
- Separation of concerns in software architecture

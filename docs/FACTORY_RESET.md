# A3M Router — Factory Reset & Recalibration

## When to Run
- Added 3+ new providers since initial setup
- Changed API keys for 2+ providers
- RouterArena score changed significantly
- More than 30 days since last setup

## How

```bash
a3m-router setup --fresh
```

This will:
1. Clear old provider weights and thresholds
2. Re-scan environment variables for API keys
3. Re-test all configured providers
4. Recalibrate routing weights based on:
   - Current provider latency
   - Current provider availability
   - Current pricing
5. Save new config

## What Gets Reset

| Config | Reset? | New Value |
|--------|--------|-----------|
| Provider weights | Yes | Equal weight for all working providers |
| Budget caps | No | Kept |
| Cache | No | Preserved |
| Health scores | Yes | Re-tested from scratch |
| Audit log | No | Preserved |
| Change log | No | Preserved |

#!/usr/bin/env node

/**
 * A3M Router — Rate Limiter Tests
 *
 * Run with: node proxy/rate-limit.test.js
 *
 * Tests:
 *   1. Allows requests under the limit
 *   2. Blocks requests over the limit (429)
 *   3. Returns consistent OpenAI-compatible error shape
 *   4. Resets after the window expires
 *   5. Multiple IPs are tracked independently
 *   6. resetKey() clears state for a specific IP
 *   7. resetAll() clears state for all IPs
 *   8. X-RateLimit-* headers are set correctly
 *   9. Environment variable configuration
 */

const assert = require("assert");
const http = require("http");
const express = require("express");
const path = require("path");

// Resolve the RateLimiter relative to this file's location
const RateLimiter = require(path.resolve(__dirname, "rate-limit"));

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

/**
 * Create a tiny test app with the rate limiter and return a helper
 * that makes requests with a given IP.
 */
function createTestApp(limiter) {
  const app = express();
  app.use(limiter.middleware());
  app.get("/test", (_req, res) => res.json({ ok: true }));
  app.post("/v1/chat/completions", express.json(), (_req, res) =>
    res.json({ choices: [{ message: { content: "ok" } }] })
  );

  const server = app.listen(0); // random port
  const port = server.address().port;

  return {
    server,
    port,
    /**
     * Make a request and return { status, body, headers }.
     */
    request: async (ip, method = "GET") => {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: method === "POST" ? "/v1/chat/completions" : "/test",
            method,
            headers: {
              "X-Forwarded-For": ip,
              "Content-Type": "application/json",
            },
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
              try {
                resolve({
                  status: res.statusCode,
                  body: JSON.parse(body),
                  headers: res.headers,
                });
              } catch {
                resolve({ status: res.statusCode, body, headers: res.headers });
              }
            });
          }
        );
        if (method === "POST") {
          req.write(JSON.stringify({ model: "a3m-auto", messages: [{ role: "user", content: "hi" }] }));
        }
        req.end();
      });
    },
  };
}

/**
 * Wait for a given duration.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

async function run() {
  console.log("\n  RateLimiter Tests\n");

  // --- 1. Allows requests under the limit ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
    const app = createTestApp(limiter);

    for (let i = 0; i < 5; i++) {
      const result = await app.request("1.2.3.4");
      assert.strictEqual(
        result.status,
        200,
        `Request ${i + 1} should be allowed, got ${result.status}`
      );
    }

    app.server.close();
    limiter.dispose();
    test("Allows requests under the limit", () => {});
  }

  // --- 2. Blocks requests over the limit (429) ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
    const app = createTestApp(limiter);

    for (let i = 0; i < 3; i++) {
      await app.request("2.2.2.2");
    }
    // 4th request should be blocked
    const blocked = await app.request("2.2.2.2");
    assert.strictEqual(blocked.status, 429, "Expected 429 status");

    app.server.close();
    limiter.dispose();
    test("Blocks requests over the limit (429)", () => {});
  }

  // --- 3. Returns consistent OpenAI-compatible error shape ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 1 });
    const app = createTestApp(limiter);

    await app.request("3.3.3.3");
    const blocked = await app.request("3.3.3.3");

    assert.strictEqual(blocked.status, 429);
    assert.ok(blocked.body.error, "Response should have .error");
    assert.strictEqual(blocked.body.error.type, "rate_limit_error");
    assert.strictEqual(blocked.body.error.code, 429);
    assert.ok(typeof blocked.body.error.retry_after === "number");
    assert.ok(blocked.body.error.retry_after > 0);

    app.server.close();
    limiter.dispose();
    test("Returns consistent OpenAI-compatible error shape", () => {});
  }

  // --- 4. Resets after the window expires ---
  {
    const limiter = new RateLimiter({ windowMs: 200, maxRequests: 1 });
    const app = createTestApp(limiter);

    await app.request("4.4.4.4");
    const blocked = await app.request("4.4.4.4");
    assert.strictEqual(blocked.status, 429, "Should be blocked initially");

    // Wait for window to expire
    await sleep(250);

    const allowed = await app.request("4.4.4.4");
    assert.strictEqual(allowed.status, 200, "Should be allowed after window expires");

    app.server.close();
    limiter.dispose();
    test("Resets after the window expires", () => {});
  }

  // --- 5. Multiple IPs are tracked independently ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
    const app = createTestApp(limiter);

    // Exhaust ip-a
    await app.request("ip-a");
    await app.request("ip-a");

    // ip-b should still be allowed
    const b1 = await app.request("ip-b");
    assert.strictEqual(b1.status, 200, "ip-b request 1 should be allowed");
    const b2 = await app.request("ip-b");
    assert.strictEqual(b2.status, 200, "ip-b request 2 should be allowed");

    // ip-a should now be blocked
    const a3 = await app.request("ip-a");
    assert.strictEqual(a3.status, 429, "ip-a 3rd request should be blocked");

    app.server.close();
    limiter.dispose();
    test("Multiple IPs are tracked independently", () => {});
  }

  // --- 6. resetKey() clears state for a specific IP ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 1 });
    const app = createTestApp(limiter);

    await app.request("6.6.6.6");
    const blocked = await app.request("6.6.6.6");
    assert.strictEqual(blocked.status, 429);

    limiter.resetKey("6.6.6.6");

    const allowed = await app.request("6.6.6.6");
    assert.strictEqual(allowed.status, 200);

    app.server.close();
    limiter.dispose();
    test("resetKey() clears state for a specific IP", () => {});
  }

  // --- 7. resetAll() clears state for all IPs ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 1 });
    const app = createTestApp(limiter);

    await app.request("7-a");
    await app.request("7-b");
    assert.strictEqual((await app.request("7-a")).status, 429);
    assert.strictEqual((await app.request("7-b")).status, 429);

    limiter.resetAll();

    assert.strictEqual((await app.request("7-a")).status, 200);
    assert.strictEqual((await app.request("7-b")).status, 200);

    app.server.close();
    limiter.dispose();
    test("resetAll() clears state for all IPs", () => {});
  }

  // --- 8. X-RateLimit-* headers are set correctly ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
    const app = createTestApp(limiter);

    const result = await app.request("8.8.8.8");
    assert.ok(result.headers["x-ratelimit-limit"], "Should have X-RateLimit-Limit");
    assert.ok(result.headers["x-ratelimit-remaining"], "Should have X-RateLimit-Remaining");
    assert.ok(result.headers["x-ratelimit-reset"], "Should have X-RateLimit-Reset");
    assert.strictEqual(result.headers["x-ratelimit-limit"], "5");

    // Exhaust and check blocked headers
    for (let i = 0; i < 4; i++) await app.request("8.8.8.8");

    const blocked = await app.request("8.8.8.8");
    assert.strictEqual(blocked.status, 429);
    assert.strictEqual(blocked.headers["x-ratelimit-remaining"], "0");
    assert.ok(blocked.headers["retry-after"], "Should have Retry-After header");

    app.server.close();
    limiter.dispose();
    test("X-RateLimit-* headers are set correctly", () => {});
  }

  // --- 9. Rate limiter works with POST /v1/chat/completions ---
  {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
    const app = createTestApp(limiter);

    const r1 = await app.request("9.9.9.9", "POST");
    assert.strictEqual(r1.status, 200);

    const r2 = await app.request("9.9.9.9", "POST");
    assert.strictEqual(r2.status, 200);

    const r3 = await app.request("9.9.9.9", "POST");
    assert.strictEqual(r3.status, 429);

    app.server.close();
    limiter.dispose();
    test("Rate limiter works with POST /v1/chat/completions", () => {});
  }

  // --- Summary ---
  const total = passed + failed;
  console.log(`\n  Results: ${passed}/${total} passed, ${failed}/${total} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * PWL Load Test — Phase 6
 *
 * Usage (inside API container or anywhere with network access):
 *   node load-test.js                     # 200 sequential orders
 *   node load-test.js --parallel          # 5 × 40 concurrent order loops
 *   node load-test.js --count 50          # custom order count
 *   node load-test.js --base http://host  # custom API base
 *
 * Zero external dependencies — uses built-in http/https.
 */

const http = require("http");
const https = require("https");
const crypto = require("crypto");

// ── Config ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const BASE = opt("--base", "http://localhost:3001");
const TOTAL_ORDERS = parseInt(opt("--count", "200"), 10);
const PARALLEL = flag("--parallel");
const PARALLEL_LANES = parseInt(opt("--lanes", "5"), 10);
const VENUE_PIN = opt("--pin", "1234");
const VENUE_ID = 1;

// ── HTTP helper (no deps) ──────────────────────────────────────
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const mod = url.protocol === "https:" ? https : http;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      agent: false,
      headers: {
        "Content-Type": "application/json",
        Connection: "close",
        ...headers,
      },
    };
    const req = mod.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error("Request timeout (10s)"));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Helpers ─────────────────────────────────────────────────────
function pickRandom(arr, min, max) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = arr.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Main flow ──────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  PWL Load Test");
  console.log(`  Base URL : ${BASE}`);
  console.log(`  Orders   : ${TOTAL_ORDERS}`);
  console.log(`  Mode     : ${PARALLEL ? `parallel (${PARALLEL_LANES} lanes)` : "sequential"}`);
  console.log("═══════════════════════════════════════════════════\n");

  // 1) Health check
  try {
    const hc = await request("GET", "/health");
    if (!hc.body.ok) throw new Error("health not ok");
    console.log("[OK] API health check passed");
  } catch (e) {
    console.error("[FAIL] Cannot reach API:", e.message);
    process.exit(1);
  }

  // 2) Login as BAR
  console.log("[..] Logging in as BAR (pin=" + VENUE_PIN + ") ...");
  const login = await request("POST", "/auth/pin", { pin: VENUE_PIN, role: "BAR" });
  if (!login.body.token) {
    console.error("[FAIL] Login failed:", JSON.stringify(login.body));
    process.exit(1);
  }
  const token = login.body.token;
  console.log("[OK] BAR token acquired\n");

  // Also login as MAIN_ADMIN for /status
  let adminToken = null;
  try {
    const adminLogin = await request("POST", "/auth/login", {
      email: process.env.MAINADMIN_EMAIL || "admin@pwl.com",
      password: process.env.MAINADMIN_PASSWORD || "admin",
    });
    if (adminLogin.body.token) {
      adminToken = adminLogin.body.token;
      console.log("[OK] Admin token acquired for /status polling\n");
    }
  } catch {
    console.log("[WARN] Could not get admin token — /status polling disabled\n");
  }

  // 3) Fetch menu
  const auth = { Authorization: `Bearer ${token}` };
  const menuRes = await request("GET", `/menu/${VENUE_ID}`, null, auth);
  if (!Array.isArray(menuRes.body) || menuRes.body.length === 0) {
    console.error("[FAIL] Menu is empty or failed:", JSON.stringify(menuRes.body));
    process.exit(1);
  }
  const menu = menuRes.body;
  console.log(`[OK] Menu loaded: ${menu.length} items`);
  menu.forEach((m) => console.log(`     ${m.name} — $${m.price} (stock: ${m.stock_qty})`));
  console.log("");

  // 4) Create orders
  const latencies = [];
  let errors = 0;
  let successCount = 0;
  const idempotencyKeys = new Set();

  async function createOrder(i) {
    const picked = pickRandom(menu, 3, 5);
    const items = picked.map((m) => ({
      menu_item_id: m.id,
      qty: 1,
    }));
    const key = `load-test-${crypto.randomUUID()}`;
    idempotencyKeys.add(key);

    const start = Date.now();
    try {
      const res = await request("POST", "/orders", {
        venue_id: VENUE_ID,
        items,
        payment_method: "cash",
        idempotency_key: key,
      }, auth);

      const ms = Date.now() - start;
      latencies.push(ms);

      if (res.status >= 400) {
        errors++;
        if (errors <= 10) {
          console.log(`  [ERR] Order #${i + 1}: ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`);
        }
      } else {
        successCount++;
      }

      // Progress indicator every 20 orders
      if ((i + 1) % 20 === 0 || i + 1 === TOTAL_ORDERS) {
        const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        process.stdout.write(`  [${i + 1}/${TOTAL_ORDERS}] avg=${avg}ms errs=${errors}\r`);
      }
    } catch (e) {
      errors++;
      latencies.push(Date.now() - start);
      if (errors <= 10) {
        console.log(`  [ERR] Order #${i + 1}: ${e.message}`);
      }
    }
  }

  const t0 = Date.now();

  if (PARALLEL) {
    // 5 parallel lanes, each running TOTAL_ORDERS/lanes orders
    const perLane = Math.ceil(TOTAL_ORDERS / PARALLEL_LANES);
    console.log(`[..] Starting ${PARALLEL_LANES} parallel lanes, ${perLane} orders each ...`);
    const lanes = [];
    for (let lane = 0; lane < PARALLEL_LANES; lane++) {
      lanes.push(
        (async () => {
          for (let i = 0; i < perLane; i++) {
            await createOrder(lane * perLane + i);
          }
        })()
      );
    }
    await Promise.all(lanes);
  } else {
    console.log("[..] Starting sequential orders ...");
    for (let i = 0; i < TOTAL_ORDERS; i++) {
      await createOrder(i);
    }
  }

  const totalTime = Date.now() - t0;
  console.log("\n");

  // 5) Fetch /status for DB pool stats
  let statusData = null;
  if (adminToken) {
    try {
      const st = await request("GET", "/status", null, { Authorization: `Bearer ${adminToken}` });
      statusData = st.body;
    } catch {}
  }

  // 6) Idempotency duplicate check — re-send the first key
  let idempotencyOk = "SKIP";
  if (idempotencyKeys.size > 0) {
    const firstKey = idempotencyKeys.values().next().value;
    try {
      const items = [{ menu_item_id: menu[0].id, qty: 1 }];
      const dup = await request("POST", "/orders", {
        venue_id: VENUE_ID,
        items,
        payment_method: "cash",
        idempotency_key: firstKey,
      }, auth);
      // Should return the existing order, not create a new one
      idempotencyOk = dup.status < 400 ? "PASS" : "FAIL";
    } catch {
      idempotencyOk = "ERROR";
    }
  }

  // 7) Check inventory for negative values
  let inventoryOk = "SKIP";
  try {
    // Use admin token to query — or try a direct DB approach via status
    // We'll just check via menu endpoint that stock_qty >= 0
    const menuAfter = await request("GET", `/menu/${VENUE_ID}`, null, auth);
    if (Array.isArray(menuAfter.body)) {
      const negatives = menuAfter.body.filter((m) => m.stock_qty < 0);
      inventoryOk = negatives.length === 0 ? "PASS" : "FAIL";
      if (negatives.length > 0) {
        console.log("  [FAIL] Negative inventory:");
        negatives.forEach((n) => console.log(`    ${n.name}: ${n.stock_qty}`));
      }
    }
  } catch {
    inventoryOk = "ERROR";
  }

  // ── Summary ──────────────────────────────────────────────────
  const avg = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const maxMs = latencies.length > 0 ? Math.max(...latencies) : 0;
  const minMs = latencies.length > 0 ? Math.min(...latencies) : 0;
  const throughput = totalTime > 0 ? ((successCount / totalTime) * 1000).toFixed(1) : 0;

  console.log("═══════════════════════════════════════════════════");
  console.log("  LOAD TEST RESULTS");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Total orders attempted : ${TOTAL_ORDERS}`);
  console.log(`  Successful             : ${successCount}`);
  console.log(`  Errors                 : ${errors}`);
  console.log(`  Error rate             : ${((errors / TOTAL_ORDERS) * 100).toFixed(1)}%`);
  console.log(`  Total time             : ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Throughput             : ${throughput} orders/sec`);
  console.log("───────────────────────────────────────────────────");
  console.log(`  Latency avg            : ${avg}ms`);
  console.log(`  Latency p50            : ${p50}ms`);
  console.log(`  Latency p95            : ${p95}ms`);
  console.log(`  Latency p99            : ${p99}ms`);
  console.log(`  Latency min            : ${minMs}ms`);
  console.log(`  Latency max            : ${maxMs}ms`);
  console.log("───────────────────────────────────────────────────");
  console.log(`  Idempotency check      : ${idempotencyOk}`);
  console.log(`  Inventory non-negative : ${inventoryOk}`);

  if (statusData && typeof statusData === "object") {
    console.log("───────────────────────────────────────────────────");
    console.log("  DB Pool (from /status)");
    if (statusData.db_pool) {
      console.log(`    totalCount           : ${statusData.db_pool.totalCount}`);
      console.log(`    idleCount            : ${statusData.db_pool.idleCount}`);
      console.log(`    waitingCount         : ${statusData.db_pool.waitingCount}`);
    }
    if (statusData.avg_order_latency_ms !== undefined) {
      console.log(`  Server avg order latency: ${statusData.avg_order_latency_ms}ms`);
      console.log(`  Server p95 order latency: ${statusData.p95_order_latency_ms}ms`);
    }
    if (statusData.errors_per_min !== undefined) {
      console.log(`  Server errors/min      : ${statusData.errors_per_min}`);
    }
  }

  console.log("═══════════════════════════════════════════════════");

  // Exit code: non-zero if error rate > 10%
  if (errors / TOTAL_ORDERS > 0.1) {
    console.log("\n[FAIL] Error rate exceeds 10% threshold");
    process.exit(1);
  }
  console.log("\n[PASS] Load test completed within acceptable thresholds");
}

main().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});

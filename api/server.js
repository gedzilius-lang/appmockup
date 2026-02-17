import Fastify from "fastify";
import cors from "@fastify/cors";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const JWT_SECRET = process.env.JWT_SECRET;

app.get("/", () => ({ status: "ok", service: "pwl-api" }));

// ─── XP Helpers ──────────────────────────────────────────────
function xpForLevel(level) {
  return Math.round(100 * Math.pow(level, 1.35));
}

function calculateLevel(totalXp) {
  let level = 1;
  let cumulative = 0;
  while (true) {
    const needed = xpForLevel(level);
    if (cumulative + needed > totalXp) break;
    cumulative += needed;
    level++;
  }
  return level;
}

async function awardXp(userId, amount) {
  const r = await pool.query(
    "UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp",
    [amount, userId]
  );
  if (r.rowCount === 0) return null;
  const newXp = r.rows[0].xp;
  const newLevel = calculateLevel(newXp);
  await pool.query("UPDATE users SET level = $1 WHERE id = $2", [newLevel, userId]);
  return { xp: newXp, level: newLevel };
}

// ─── Database Init ───────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venues (
      id serial PRIMARY KEY,
      name text NOT NULL,
      city text NOT NULL DEFAULT 'Zurich',
      pin text NOT NULL,
      capacity int,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      email text UNIQUE,
      password_hash text,
      role text NOT NULL,
      venue_id int REFERENCES venues(id),
      points int NOT NULL DEFAULT 0,
      xp int NOT NULL DEFAULT 0,
      level int NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS events (
      id serial PRIMARY KEY,
      title text NOT NULL,
      starts_at timestamptz NOT NULL,
      venue_name text NOT NULL,
      address text,
      genre text,
      description text,
      ticket_url text,
      image_url text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id serial PRIMARY KEY,
      venue_id int NOT NULL REFERENCES venues(id),
      item text NOT NULL,
      qty int NOT NULL,
      low_threshold int NOT NULL DEFAULT 5,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS venue_sessions (
      id serial PRIMARY KEY,
      venue_id int NOT NULL REFERENCES venues(id),
      user_id int NOT NULL REFERENCES users(id),
      uid_tag text,
      started_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz,
      total_spend int NOT NULL DEFAULT 0,
      interactions_count int NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id serial PRIMARY KEY,
      venue_id int NOT NULL REFERENCES venues(id),
      name text NOT NULL,
      category text,
      price int NOT NULL,
      icon text,
      color text,
      inventory_item_id int REFERENCES inventory(id),
      display_order int DEFAULT 0,
      active boolean DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS orders (
      id serial PRIMARY KEY,
      venue_id int NOT NULL REFERENCES venues(id),
      staff_user_id int REFERENCES users(id),
      guest_session_id int REFERENCES venue_sessions(id),
      items jsonb NOT NULL,
      total int NOT NULL,
      payment_method text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS quests (
      id serial PRIMARY KEY,
      venue_id int REFERENCES venues(id),
      title text NOT NULL,
      description text,
      conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
      xp_reward int DEFAULT 0,
      nc_reward int DEFAULT 0,
      min_level int DEFAULT 0,
      starts_at timestamptz,
      ends_at timestamptz,
      max_completions int,
      cooldown_hours int,
      active boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS quest_completions (
      id serial PRIMARY KEY,
      quest_id int REFERENCES quests(id),
      user_id int REFERENCES users(id),
      venue_session_id int REFERENCES venue_sessions(id),
      completed_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id serial PRIMARY KEY,
      venue_id int REFERENCES venues(id),
      target_role text,
      target_user_id int REFERENCES users(id),
      message text NOT NULL,
      read boolean DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id serial PRIMARY KEY,
      venue_id int NOT NULL REFERENCES venues(id),
      name text NOT NULL,
      trigger_type text NOT NULL,
      conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
      actions jsonb NOT NULL DEFAULT '{}'::jsonb,
      active boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS logs (
      id serial PRIMARY KEY,
      venue_id int REFERENCES venues(id),
      type text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id serial PRIMARY KEY,
      name text NOT NULL,
      venue_id int REFERENCES venues(id),
      user_id int REFERENCES users(id),
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // Add idempotency_key column if missing (idempotent migration)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text;
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL`);

  // Performance indexes (idempotent)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_venue_sessions_active ON venue_sessions(venue_id) WHERE ended_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_logs_venue_time ON logs(venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inventory_venue ON inventory(venue_id);
    CREATE INDEX IF NOT EXISTS idx_orders_venue_time ON orders(venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_analytics_venue_time ON analytics_events(venue_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(target_user_id) WHERE read = false;
    CREATE INDEX IF NOT EXISTS idx_menu_items_venue ON menu_items(venue_id) WHERE active = true;
    CREATE INDEX IF NOT EXISTS idx_quests_venue ON quests(venue_id) WHERE active = true;
  `);

  // Seed main admin once
  const email = process.env.MAINADMIN_EMAIL;
  const pass = process.env.MAINADMIN_PASSWORD;
  const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(pass, 10);
    await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'MAIN_ADMIN')",
      [email, hash]
    );
    app.log.info("Seeded MAIN_ADMIN");
  }

  // Seed Supermarket venue + inventory + menu (idempotent)
  const sv = await pool.query("SELECT id FROM venues WHERE name='Supermarket'");
  let supermarketId;
  if (sv.rowCount === 0) {
    const ins = await pool.query(
      "INSERT INTO venues (name, city, pin, capacity) VALUES ('Supermarket','Zurich','1234',200) RETURNING id"
    );
    supermarketId = ins.rows[0].id;
    app.log.info("Seeded venue: Supermarket");
  } else {
    supermarketId = sv.rows[0].id;
  }

  // Seed inventory items (idempotent by venue_id + item name)
  const seedInventory = [
    { item: "Beer", qty: 100, low_threshold: 10 },
    { item: "Wine", qty: 50, low_threshold: 8 },
    { item: "Vodka", qty: 40, low_threshold: 5 },
    { item: "Gin", qty: 40, low_threshold: 5 },
    { item: "Rum", qty: 30, low_threshold: 5 },
    { item: "Whiskey", qty: 30, low_threshold: 5 },
    { item: "Tequila", qty: 25, low_threshold: 5 },
    { item: "Juice", qty: 60, low_threshold: 10 },
    { item: "Soda", qty: 80, low_threshold: 15 },
    { item: "Water", qty: 120, low_threshold: 20 },
    { item: "Energy Drink", qty: 40, low_threshold: 8 },
    { item: "Tonic", qty: 50, low_threshold: 10 },
  ];
  for (const si of seedInventory) {
    const exists = await pool.query("SELECT id FROM inventory WHERE venue_id=$1 AND item=$2", [supermarketId, si.item]);
    if (exists.rowCount === 0) {
      await pool.query(
        "INSERT INTO inventory (venue_id, item, qty, low_threshold) VALUES ($1,$2,$3,$4)",
        [supermarketId, si.item, si.qty, si.low_threshold]
      );
    }
  }

  // Seed menu items (idempotent by venue_id + name)
  const seedMenu = [
    { name: "Beer", category: "Drinks", price: 5, icon: "🍺" },
    { name: "Wine", category: "Drinks", price: 8, icon: "🍷" },
    { name: "Vodka Shot", category: "Shots", price: 6, icon: "🥃" },
    { name: "Gin Tonic", category: "Cocktails", price: 12, icon: "🍸" },
    { name: "Rum Cola", category: "Cocktails", price: 10, icon: "🥤" },
    { name: "Whiskey Sour", category: "Cocktails", price: 14, icon: "🥃" },
    { name: "Tequila Shot", category: "Shots", price: 7, icon: "🌶️" },
    { name: "Juice", category: "Soft", price: 4, icon: "🧃" },
    { name: "Soda", category: "Soft", price: 3, icon: "🥤" },
    { name: "Water", category: "Soft", price: 2, icon: "💧" },
    { name: "Energy Drink", category: "Soft", price: 5, icon: "⚡" },
  ];
  for (let i = 0; i < seedMenu.length; i++) {
    const sm = seedMenu[i];
    const exists = await pool.query("SELECT id FROM menu_items WHERE venue_id=$1 AND name=$2", [supermarketId, sm.name]);
    if (exists.rowCount === 0) {
      // Link to inventory if matching
      const inv = await pool.query("SELECT id FROM inventory WHERE venue_id=$1 AND item=$2", [supermarketId, sm.name.replace(/ Shot| Tonic| Cola| Sour/g, "").trim()]);
      const invId = inv.rowCount > 0 ? inv.rows[0].id : null;
      await pool.query(
        "INSERT INTO menu_items (venue_id, name, category, price, icon, inventory_item_id, display_order, active) VALUES ($1,$2,$3,$4,$5,$6,$7,true)",
        [supermarketId, sm.name, sm.category, sm.price, sm.icon, invId, i]
      );
    }
  }
  app.log.info("Supermarket seed check complete");
}

// ─── Auth Middleware ─────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { uid: user.id, role: user.role, venue_id: user.venue_id ?? null },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function requireAuth(req, reply) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return reply.code(401).send({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    return reply.code(401).send({ error: "Invalid token" });
  }
}

function requireRole(roles) {
  return async (req, reply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;
    if (!roles.includes(req.user.role))
      return reply.code(403).send({ error: "Forbidden" });
  };
}

const ADMIN_ROLES = ["MAIN_ADMIN", "VENUE_ADMIN"];

// ─── Automation Engine ───────────────────────────────────────
async function evaluateRules(venueId, triggerType, context = {}) {
  try {
    const r = await pool.query(
      "SELECT * FROM automation_rules WHERE venue_id=$1 AND trigger_type=$2 AND active=true",
      [venueId, triggerType]
    );
    for (const rule of r.rows) {
      let match = true;
      const conds = rule.conditions || {};

      if (conds.min_qty !== undefined && context.qty !== undefined) {
        if (context.qty > conds.min_qty) match = false;
      }
      if (conds.min_occupancy !== undefined && context.occupancy !== undefined) {
        if (context.occupancy < conds.min_occupancy) match = false;
      }
      if (conds.max_occupancy !== undefined && context.occupancy !== undefined) {
        if (context.occupancy > conds.max_occupancy) match = false;
      }

      if (match) {
        const actions = rule.actions || {};
        if (actions.notify) {
          await pool.query(
            "INSERT INTO notifications (venue_id, target_role, message) VALUES ($1,$2,$3)",
            [venueId, actions.notify.role || null, actions.notify.message || rule.name]
          );
        }
        if (actions.log) {
          await pool.query(
            "INSERT INTO logs (venue_id, type, payload) VALUES ($1,$2,$3)",
            [venueId, actions.log.type || "RULE_TRIGGERED", { rule_id: rule.id, rule_name: rule.name, ...context }]
          );
        }
      }
    }
  } catch (err) {
    app.log.error({ err }, "Rule evaluation failed");
  }
}

// ─── Health ──────────────────────────────────────────────────
app.get("/health", async () => ({ ok: true }));

// ─── Auth ────────────────────────────────────────────────────
app.post("/auth/login", async (req, reply) => {
  const { email, password } = req.body || {};
  const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (r.rowCount === 0) return reply.code(401).send({ error: "Bad credentials" });
  const user = r.rows[0];
  const ok = await bcrypt.compare(password || "", user.password_hash || "");
  if (!ok) return reply.code(401).send({ error: "Bad credentials" });
  return { token: signToken(user), role: user.role, venue_id: user.venue_id };
});

app.post("/auth/pin", async (req, reply) => {
  const { pin, role } = req.body || {};
  if (!["BAR", "RUNNER", "SECURITY", "GUEST", "VENUE_ADMIN"].includes(role)) {
    return reply.code(400).send({ error: "Invalid role" });
  }
  const v = await pool.query("SELECT * FROM venues WHERE pin=$1", [pin]);
  if (v.rowCount === 0) return reply.code(401).send({ error: "Bad pin" });
  const venue = v.rows[0];
  const u = await pool.query(
    "INSERT INTO users (role, venue_id) VALUES ($1,$2) RETURNING *",
    [role, venue.id]
  );
  return { token: signToken(u.rows[0]), role, venue_id: venue.id };
});

// ─── Me ──────────────────────────────────────────────────────
app.get("/me", { preHandler: requireAuth }, async (req) => {
  const u = await pool.query("SELECT id, email, role, venue_id, points, xp, level, created_at FROM users WHERE id=$1", [req.user.uid]);
  if (u.rowCount === 0) return { user: null, session: null };
  const user = u.rows[0];

  const s = await pool.query(
    "SELECT * FROM venue_sessions WHERE user_id=$1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    [req.user.uid]
  );
  return { user, session: s.rows[0] || null };
});

app.get("/me/profile", { preHandler: requireAuth }, async (req) => {
  const u = await pool.query("SELECT id, email, role, venue_id, points, xp, level, created_at FROM users WHERE id=$1", [req.user.uid]);
  if (u.rowCount === 0) return { user: null };
  const user = u.rows[0];
  const nextLevelXp = xpForLevel(user.level);
  const currentLevelXp = user.level > 1 ? xpForLevel(user.level - 1) : 0;

  let cumulativeXpForCurrentLevel = 0;
  for (let i = 1; i < user.level; i++) cumulativeXpForCurrentLevel += xpForLevel(i);
  const xpIntoLevel = user.xp - cumulativeXpForCurrentLevel;

  const sessions = await pool.query(
    "SELECT id, venue_id, started_at, ended_at, total_spend FROM venue_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT 20",
    [req.user.uid]
  );

  const completions = await pool.query(
    `SELECT qc.completed_at, q.title, q.xp_reward, q.nc_reward
     FROM quest_completions qc JOIN quests q ON qc.quest_id = q.id
     WHERE qc.user_id=$1 ORDER BY qc.completed_at DESC LIMIT 20`,
    [req.user.uid]
  );

  return {
    user,
    xp_progress: { current: xpIntoLevel, needed: nextLevelXp },
    visits: sessions.rows,
    quest_completions: completions.rows,
  };
});

app.get("/me/history", { preHandler: requireAuth }, async (req) => {
  const page = Number(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const r = await pool.query(
    "SELECT * FROM venue_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT $2 OFFSET $3",
    [req.user.uid, limit, offset]
  );
  return r.rows;
});

// ─── Guest Check-in / Checkout ───────────────────────────────
app.post("/guest/checkin", async (req, reply) => {
  const { venue_id, uid_tag } = req.body || {};
  if (!venue_id) return reply.code(400).send({ error: "venue_id required" });

  const v = await pool.query("SELECT * FROM venues WHERE id=$1", [venue_id]);
  if (v.rowCount === 0) return reply.code(404).send({ error: "Venue not found" });

  let userId;
  if (uid_tag) {
    const existing = await pool.query(
      "SELECT u.id FROM users u JOIN venue_sessions vs ON vs.user_id = u.id WHERE vs.uid_tag=$1 ORDER BY u.id DESC LIMIT 1",
      [uid_tag]
    );
    if (existing.rowCount > 0) {
      userId = existing.rows[0].id;
    }
  }

  if (!userId) {
    const u = await pool.query(
      "INSERT INTO users (role, venue_id) VALUES ('GUEST', $1) RETURNING id",
      [venue_id]
    );
    userId = u.rows[0].id;
  }

  // Close any open sessions for this user at this venue
  await pool.query(
    "UPDATE venue_sessions SET ended_at=now() WHERE user_id=$1 AND venue_id=$2 AND ended_at IS NULL",
    [userId, venue_id]
  );

  const s = await pool.query(
    "INSERT INTO venue_sessions (venue_id, user_id, uid_tag) VALUES ($1,$2,$3) RETURNING *",
    [venue_id, userId, uid_tag || null]
  );

  // Award check-in XP (50 XP)
  const xpResult = await awardXp(userId, 50);
  // Award check-in points (10 NC)
  await pool.query("UPDATE users SET points = points + 10 WHERE id = $1", [userId]);

  await pool.query(
    "INSERT INTO logs (venue_id, type, payload) VALUES ($1,'CHECK_IN',$2)",
    [venue_id, { user_id: userId, uid_tag, session_id: s.rows[0].id }]
  );

  await evaluateRules(venue_id, "event", { type: "checkin", user_id: userId });

  const user = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
  const token = signToken(user.rows[0]);

  return {
    token,
    session: s.rows[0],
    points_awarded: 10,
    xp_awarded: 50,
    xp: xpResult?.xp,
    level: xpResult?.level,
  };
});

app.post("/guest/checkout", { preHandler: requireAuth }, async (req, reply) => {
  const r = await pool.query(
    "UPDATE venue_sessions SET ended_at=now() WHERE user_id=$1 AND ended_at IS NULL RETURNING *",
    [req.user.uid]
  );
  if (r.rowCount === 0) return reply.code(400).send({ error: "No active session" });
  return { ok: true, session: r.rows[0] };
});

// ─── Wallet Top-up ──────────────────────────────────────────
app.post("/wallet/topup", { preHandler: requireRole(["BAR", "SECURITY", "DOOR", ...ADMIN_ROLES]) }, async (req, reply) => {
  const { amount, user_id, session_id, uid_tag } = req.body || {};
  const a = Number(amount);
  if (!a || a <= 0 || !Number.isFinite(a)) {
    return reply.code(400).send({ error: "amount must be a positive number" });
  }
  if (!user_id && !session_id && !uid_tag) {
    return reply.code(400).send({ error: "Provide one of: user_id, session_id, uid_tag" });
  }

  const venueId = req.user.venue_id;
  let targetUserId = null;

  // Resolve target: session_id > uid_tag > user_id
  if (session_id) {
    const s = await pool.query("SELECT user_id FROM venue_sessions WHERE id=$1", [session_id]);
    if (s.rowCount === 0) return reply.code(404).send({ error: "Session not found" });
    targetUserId = s.rows[0].user_id;
    if (user_id && user_id !== targetUserId) {
      app.log.warn({ session_id, user_id, resolved: targetUserId }, "topup: session_id resolved to different user_id");
    }
  } else if (uid_tag) {
    // Try active session first, then most recent
    let s = await pool.query(
      "SELECT user_id FROM venue_sessions WHERE uid_tag=$1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
      [uid_tag]
    );
    if (s.rowCount === 0) {
      s = await pool.query(
        "SELECT user_id FROM venue_sessions WHERE uid_tag=$1 ORDER BY started_at DESC LIMIT 1",
        [uid_tag]
      );
    }
    if (s.rowCount === 0) return reply.code(404).send({ error: "No session found for uid_tag" });
    targetUserId = s.rows[0].user_id;
  } else {
    targetUserId = user_id;
  }

  // Update balance + log (pool.query auto-releases connections)
  const r = await pool.query(
    "UPDATE users SET points = points + $1 WHERE id = $2 RETURNING points",
    [a, targetUserId]
  );
  if (r.rowCount === 0) {
    return reply.code(404).send({ error: "User not found" });
  }
  const newBalance = r.rows[0].points;
  await pool.query(
    "INSERT INTO logs (venue_id, type, payload) VALUES ($1,'TOPUP',$2)",
    [venueId, { user_id: targetUserId, amount: a, staff_id: req.user.uid, new_balance: newBalance }]
  );
  return { ok: true, new_balance: newBalance, amount: a, user_id: targetUserId, venue_id: venueId };
});

// ─── Venues ──────────────────────────────────────────────────
app.get("/venues", { preHandler: requireRole(ADMIN_ROLES) }, async () => {
  const r = await pool.query("SELECT * FROM venues ORDER BY id DESC");
  return r.rows;
});

app.post("/venues", { preHandler: requireRole(["MAIN_ADMIN"]) }, async (req) => {
  const { name, city, pin, capacity } = req.body || {};
  const r = await pool.query(
    "INSERT INTO venues (name, city, pin, capacity) VALUES ($1,$2,$3,$4) RETURNING *",
    [name, city || "Zurich", pin, capacity || null]
  );
  return r.rows[0];
});

app.put("/venues/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const { name, city, pin, capacity } = req.body || {};
  const r = await pool.query(
    "UPDATE venues SET name=COALESCE($1,name), city=COALESCE($2,city), pin=COALESCE($3,pin), capacity=COALESCE($4,capacity) WHERE id=$5 RETURNING *",
    [name, city, pin, capacity, req.params.id]
  );
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.delete("/venues/:id", { preHandler: requireRole(["MAIN_ADMIN"]) }, async (req, reply) => {
  const r = await pool.query("DELETE FROM venues WHERE id=$1 RETURNING id", [req.params.id]);
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return { ok: true };
});

app.get("/public/venues", async () => {
  const r = await pool.query("SELECT id, name, city FROM venues ORDER BY name");
  return r.rows;
});

// ─── Events ──────────────────────────────────────────────────
app.get("/events", async () => {
  const r = await pool.query("SELECT * FROM events ORDER BY starts_at ASC LIMIT 100");
  return r.rows;
});

app.get("/events/:id", async (req, reply) => {
  const r = await pool.query("SELECT * FROM events WHERE id=$1", [req.params.id]);
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.post("/events", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const e = req.body || {};
  const r = await pool.query(
    `INSERT INTO events (title, starts_at, venue_name, address, genre, description, ticket_url, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [e.title, e.starts_at, e.venue_name, e.address, e.genre, e.description, e.ticket_url, e.image_url]
  );
  return r.rows[0];
});

app.put("/events/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const e = req.body || {};
  const r = await pool.query(
    `UPDATE events SET title=COALESCE($1,title), starts_at=COALESCE($2,starts_at), venue_name=COALESCE($3,venue_name),
     address=COALESCE($4,address), genre=COALESCE($5,genre), description=COALESCE($6,description),
     ticket_url=COALESCE($7,ticket_url), image_url=COALESCE($8,image_url) WHERE id=$9 RETURNING *`,
    [e.title, e.starts_at, e.venue_name, e.address, e.genre, e.description, e.ticket_url, e.image_url, req.params.id]
  );
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.delete("/events/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const r = await pool.query("DELETE FROM events WHERE id=$1 RETURNING id", [req.params.id]);
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return { ok: true };
});

// ─── Menu Items ──────────────────────────────────────────────
app.get("/menu/:venue_id", { preHandler: requireAuth }, async (req) => {
  const r = await pool.query(
    `SELECT mi.*, i.qty as stock_qty, i.low_threshold
     FROM menu_items mi
     LEFT JOIN inventory i ON mi.inventory_item_id = i.id
     WHERE mi.venue_id=$1 AND mi.active=true
     ORDER BY mi.display_order, mi.category, mi.name`,
    [req.params.venue_id]
  );
  return r.rows;
});

app.post("/menu", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const m = req.body || {};
  const r = await pool.query(
    `INSERT INTO menu_items (venue_id, name, category, price, icon, color, inventory_item_id, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [m.venue_id, m.name, m.category, m.price, m.icon, m.color, m.inventory_item_id || null, m.display_order || 0]
  );
  return r.rows[0];
});

app.put("/menu/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const m = req.body || {};
  const r = await pool.query(
    `UPDATE menu_items SET name=COALESCE($1,name), category=COALESCE($2,category), price=COALESCE($3,price),
     icon=COALESCE($4,icon), color=COALESCE($5,color), inventory_item_id=COALESCE($6,inventory_item_id),
     display_order=COALESCE($7,display_order), active=COALESCE($8,active) WHERE id=$9 RETURNING *`,
    [m.name, m.category, m.price, m.icon, m.color, m.inventory_item_id, m.display_order, m.active, req.params.id]
  );
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.delete("/menu/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const r = await pool.query("UPDATE menu_items SET active=false WHERE id=$1 RETURNING id", [req.params.id]);
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return { ok: true };
});

// ─── Orders ──────────────────────────────────────────────────
app.post("/orders", { preHandler: requireRole(["BAR"]) }, async (req, reply) => {
  const { venue_id, items, payment_method, guest_session_id, idempotency_key } = req.body || {};
  if (!venue_id || !items || !Array.isArray(items) || items.length === 0) {
    return reply.code(400).send({ error: "venue_id and items required" });
  }

  // Idempotency check: if key provided and order already exists, return it
  if (idempotency_key) {
    const existing = await pool.query("SELECT * FROM orders WHERE idempotency_key=$1", [idempotency_key]);
    if (existing.rowCount > 0) return existing.rows[0];
  }

  let total = 0;
  for (const item of items) {
    total += (item.price || 0) * (item.qty || 1);
  }

  // Insert order
  const o = await pool.query(
    `INSERT INTO orders (venue_id, staff_user_id, guest_session_id, items, total, payment_method, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [venue_id, req.user.uid, guest_session_id || null, JSON.stringify(items), total, payment_method || "cash", idempotency_key || null]
  );
  const order = o.rows[0];

  // Decrement inventory for each item
  for (const item of items) {
    if (item.inventory_item_id) {
      const inv = await pool.query(
        "UPDATE inventory SET qty = qty - $1, updated_at = now() WHERE id = $2 RETURNING *",
        [item.qty || 1, item.inventory_item_id]
      );
      if (inv.rowCount > 0 && inv.rows[0].qty <= inv.rows[0].low_threshold) {
        await pool.query(
          "INSERT INTO logs (venue_id, type, payload) VALUES ($1,'LOW_STOCK',$2)",
          [venue_id, { item: inv.rows[0].item, qty: inv.rows[0].qty, low_threshold: inv.rows[0].low_threshold }]
        ).catch(() => {});
        evaluateRules(venue_id, "inventory", { item: inv.rows[0].item, qty: inv.rows[0].qty }).catch(() => {});
      }
    }
  }

  // Deduct wallet if guest session linked
  if (guest_session_id) {
    await pool.query(
      "UPDATE venue_sessions SET total_spend = total_spend + $1, interactions_count = interactions_count + 1 WHERE id = $2",
      [total, guest_session_id]
    );
    const sess = await pool.query("SELECT user_id FROM venue_sessions WHERE id=$1", [guest_session_id]);
    if (sess.rowCount > 0) {
      await pool.query(
        "UPDATE users SET points = points - $1 WHERE id = $2",
        [total, sess.rows[0].user_id]
      );
      awardXp(sess.rows[0].user_id, total).catch(() => {});
    }
  }

  // Log the sale
  await pool.query(
    "INSERT INTO logs (venue_id, type, payload) VALUES ($1,'SELL',$2)",
    [venue_id, { order_id: order.id, items, total, payment_method: payment_method || "cash" }]
  );

  return order;
});

app.get("/orders/:venue_id", { preHandler: requireRole(["BAR", ...ADMIN_ROLES]) }, async (req) => {
  const r = await pool.query(
    "SELECT * FROM orders WHERE venue_id=$1 ORDER BY created_at DESC LIMIT 50",
    [req.params.venue_id]
  );
  return r.rows;
});

app.delete("/orders/:id", { preHandler: requireRole(["BAR"]) }, async (req, reply) => {
  // Undo within 60 seconds
  const r = await pool.query(
    "SELECT * FROM orders WHERE id=$1 AND created_at > now() - interval '60 seconds'",
    [req.params.id]
  );
  if (r.rowCount === 0) return reply.code(400).send({ error: "Order not found or undo window expired" });

  const order = r.rows[0];
  // Restore inventory
  for (const item of order.items) {
    if (item.inventory_item_id) {
      await pool.query(
        "UPDATE inventory SET qty = qty + $1, updated_at = now() WHERE id = $2",
        [item.qty || 1, item.inventory_item_id]
      );
    }
  }

  await pool.query("DELETE FROM orders WHERE id=$1", [req.params.id]);
  await pool.query(
    "INSERT INTO logs (venue_id, type, payload) VALUES ($1,'ORDER_UNDO',$2)",
    [order.venue_id, { order_id: order.id, items: order.items, total: order.total }]
  );
  return { ok: true };
});

// ─── Shift Summary ───────────────────────────────────────────
app.get("/shift/summary", { preHandler: requireRole(["BAR"]) }, async (req) => {
  const venueId = req.user.venue_id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const orders = await pool.query(
    "SELECT * FROM orders WHERE venue_id=$1 AND staff_user_id=$2 AND created_at >= $3",
    [venueId, req.user.uid, today.toISOString()]
  );

  let totalRevenue = 0;
  let totalOrders = orders.rowCount;
  const itemCounts = {};
  for (const o of orders.rows) {
    totalRevenue += o.total;
    for (const item of o.items) {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.qty || 1);
    }
  }

  return {
    total_orders: totalOrders,
    total_revenue: totalRevenue,
    top_items: Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count })),
  };
});

// ─── Inventory ───────────────────────────────────────────────
app.get("/inventory/:venue_id", { preHandler: requireAuth }, async (req) => {
  const r = await pool.query(
    "SELECT * FROM inventory WHERE venue_id=$1 ORDER BY id ASC",
    [req.params.venue_id]
  );
  return r.rows;
});

app.post("/inventory/:venue_id", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const { item, qty, low_threshold } = req.body || {};
  const r = await pool.query(
    "INSERT INTO inventory (venue_id, item, qty, low_threshold) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.params.venue_id, item, qty, low_threshold ?? 5]
  );
  return r.rows[0];
});

app.put("/inventory/:venue_id/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const { qty, low_threshold, item } = req.body || {};
  const r = await pool.query(
    "UPDATE inventory SET qty=COALESCE($1,qty), low_threshold=COALESCE($2,low_threshold), item=COALESCE($3,item), updated_at=now() WHERE id=$4 AND venue_id=$5 RETURNING *",
    [qty, low_threshold, item, req.params.id, req.params.venue_id]
  );
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

// Legacy sell action (kept for backward compatibility)
app.post("/actions/sell", { preHandler: requireRole(["BAR"]) }, async (req, reply) => {
  const { venue_id, item, amount } = req.body || {};
  const a = Number(amount || 1);

  // Check stock before selling
  const check = await pool.query(
    "SELECT qty FROM inventory WHERE venue_id=$1 AND item=$2",
    [venue_id, item]
  );
  if (check.rowCount === 0) return reply.code(400).send({ error: "No such item" });
  if (check.rows[0].qty <= 0) return reply.code(400).send({ error: "Out of stock" });
  if (check.rows[0].qty < a) return reply.code(400).send({ error: "Insufficient stock" });

  const r = await pool.query(
    "UPDATE inventory SET qty=qty-$1, updated_at=now() WHERE venue_id=$2 AND item=$3 RETURNING *",
    [a, venue_id, item]
  );
  if (r.rowCount === 0) return reply.code(400).send({ error: "No such item" });

  const inv = r.rows[0];
  await pool.query("INSERT INTO logs (venue_id, type, payload) VALUES ($1,'SELL',$2)",
    [venue_id, { item, amount: a, qty_after: inv.qty }]);

  if (inv.qty <= inv.low_threshold) {
    await pool.query("INSERT INTO logs (venue_id, type, payload) VALUES ($1,'LOW_STOCK',$2)",
      [venue_id, { item, qty: inv.qty, low_threshold: inv.low_threshold }]);
    await evaluateRules(venue_id, "inventory", { item, qty: inv.qty });
  }
  return { ok: true, inventory: inv };
});

// ─── Quests ──────────────────────────────────────────────────
app.get("/quests/:venue_id", { preHandler: requireAuth }, async (req) => {
  const now = new Date().toISOString();
  const r = await pool.query(
    `SELECT * FROM quests WHERE venue_id=$1 AND active=true
     AND (starts_at IS NULL OR starts_at <= $2)
     AND (ends_at IS NULL OR ends_at >= $2)
     AND (min_level <= $3)
     ORDER BY created_at DESC`,
    [req.params.venue_id, now, req.user.level || 1]
  );

  // For each quest, check if user already completed it
  const quests = [];
  for (const q of r.rows) {
    const comp = await pool.query(
      "SELECT COUNT(*) as count FROM quest_completions WHERE quest_id=$1 AND user_id=$2",
      [q.id, req.user.uid]
    );
    quests.push({
      ...q,
      user_completions: Number(comp.rows[0].count),
      can_complete: !q.max_completions || Number(comp.rows[0].count) < q.max_completions,
    });
  }
  return quests;
});

app.post("/quests", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const q = req.body || {};
  const r = await pool.query(
    `INSERT INTO quests (venue_id, title, description, conditions, xp_reward, nc_reward, min_level, starts_at, ends_at, max_completions, cooldown_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [q.venue_id, q.title, q.description, JSON.stringify(q.conditions || {}), q.xp_reward || 0, q.nc_reward || 0,
     q.min_level || 0, q.starts_at || null, q.ends_at || null, q.max_completions || null, q.cooldown_hours || null]
  );
  return r.rows[0];
});

app.put("/quests/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const q = req.body || {};
  const r = await pool.query(
    `UPDATE quests SET title=COALESCE($1,title), description=COALESCE($2,description),
     conditions=COALESCE($3,conditions), xp_reward=COALESCE($4,xp_reward), nc_reward=COALESCE($5,nc_reward),
     min_level=COALESCE($6,min_level), starts_at=COALESCE($7,starts_at), ends_at=COALESCE($8,ends_at),
     max_completions=COALESCE($9,max_completions), cooldown_hours=COALESCE($10,cooldown_hours),
     active=COALESCE($11,active) WHERE id=$12 RETURNING *`,
    [q.title, q.description, q.conditions ? JSON.stringify(q.conditions) : null,
     q.xp_reward, q.nc_reward, q.min_level, q.starts_at, q.ends_at,
     q.max_completions, q.cooldown_hours, q.active, req.params.id]
  );
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.post("/quests/:id/complete", { preHandler: requireAuth }, async (req, reply) => {
  const questId = req.params.id;
  const q = await pool.query("SELECT * FROM quests WHERE id=$1 AND active=true", [questId]);
  if (q.rowCount === 0) return reply.code(404).send({ error: "Quest not found" });

  const quest = q.rows[0];

  // Check max completions
  if (quest.max_completions) {
    const count = await pool.query(
      "SELECT COUNT(*) as count FROM quest_completions WHERE quest_id=$1 AND user_id=$2",
      [questId, req.user.uid]
    );
    if (Number(count.rows[0].count) >= quest.max_completions) {
      return reply.code(400).send({ error: "Quest already completed max times" });
    }
  }

  // Check cooldown
  if (quest.cooldown_hours) {
    const last = await pool.query(
      "SELECT completed_at FROM quest_completions WHERE quest_id=$1 AND user_id=$2 ORDER BY completed_at DESC LIMIT 1",
      [questId, req.user.uid]
    );
    if (last.rowCount > 0) {
      const cooldownEnd = new Date(last.rows[0].completed_at);
      cooldownEnd.setHours(cooldownEnd.getHours() + quest.cooldown_hours);
      if (new Date() < cooldownEnd) {
        return reply.code(400).send({ error: "Quest on cooldown" });
      }
    }
  }

  // Find active session
  const sess = await pool.query(
    "SELECT id FROM venue_sessions WHERE user_id=$1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    [req.user.uid]
  );

  await pool.query(
    "INSERT INTO quest_completions (quest_id, user_id, venue_session_id) VALUES ($1,$2,$3)",
    [questId, req.user.uid, sess.rows[0]?.id || null]
  );

  // Award rewards
  const xpResult = await awardXp(req.user.uid, quest.xp_reward);
  if (quest.nc_reward > 0) {
    await pool.query("UPDATE users SET points = points + $1 WHERE id = $2", [quest.nc_reward, req.user.uid]);
  }

  await pool.query(
    "INSERT INTO logs (venue_id, type, payload) VALUES ($1,'QUEST_COMPLETE',$2)",
    [quest.venue_id, { quest_id: questId, user_id: req.user.uid, title: quest.title, xp: quest.xp_reward, nc: quest.nc_reward }]
  );

  // Send notification
  await pool.query(
    "INSERT INTO notifications (venue_id, target_user_id, message) VALUES ($1,$2,$3)",
    [quest.venue_id, req.user.uid, `Quest complete: ${quest.title}! +${quest.xp_reward} XP${quest.nc_reward ? ` +${quest.nc_reward} NC` : ""}`]
  );

  return { ok: true, xp_awarded: quest.xp_reward, nc_awarded: quest.nc_reward, xp: xpResult?.xp, level: xpResult?.level };
});

// ─── Automation Rules ────────────────────────────────────────
app.get("/rules/:venue_id", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const r = await pool.query(
    "SELECT * FROM automation_rules WHERE venue_id=$1 ORDER BY created_at DESC",
    [req.params.venue_id]
  );
  return r.rows;
});

app.post("/rules", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const rule = req.body || {};
  const r = await pool.query(
    `INSERT INTO automation_rules (venue_id, name, trigger_type, conditions, actions)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [rule.venue_id, rule.name, rule.trigger_type, JSON.stringify(rule.conditions || {}), JSON.stringify(rule.actions || {})]
  );
  return r.rows[0];
});

app.put("/rules/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const rule = req.body || {};
  const r = await pool.query(
    `UPDATE automation_rules SET name=COALESCE($1,name), trigger_type=COALESCE($2,trigger_type),
     conditions=COALESCE($3,conditions), actions=COALESCE($4,actions), active=COALESCE($5,active)
     WHERE id=$6 RETURNING *`,
    [rule.name, rule.trigger_type, rule.conditions ? JSON.stringify(rule.conditions) : null,
     rule.actions ? JSON.stringify(rule.actions) : null, rule.active, req.params.id]
  );
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.delete("/rules/:id", { preHandler: requireRole(ADMIN_ROLES) }, async (req, reply) => {
  const r = await pool.query("DELETE FROM automation_rules WHERE id=$1 RETURNING id", [req.params.id]);
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return { ok: true };
});

// ─── Notifications ───────────────────────────────────────────
app.get("/notifications", { preHandler: requireAuth }, async (req) => {
  const r = await pool.query(
    `SELECT * FROM notifications
     WHERE (target_user_id=$1 OR (target_role=$2 AND venue_id=$3) OR (target_role IS NULL AND target_user_id IS NULL AND venue_id=$3))
     AND read=false ORDER BY created_at DESC LIMIT 50`,
    [req.user.uid, req.user.role, req.user.venue_id]
  );
  return r.rows;
});

app.post("/notifications", { preHandler: requireRole(["BAR", "RUNNER", "SECURITY", ...ADMIN_ROLES]) }, async (req) => {
  const n = req.body || {};
  const r = await pool.query(
    "INSERT INTO notifications (venue_id, target_role, target_user_id, message) VALUES ($1,$2,$3,$4) RETURNING *",
    [n.venue_id || req.user.venue_id, n.target_role || null, n.target_user_id || null, n.message]
  );
  return r.rows[0];
});

app.put("/notifications/:id/read", { preHandler: requireAuth }, async (req) => {
  await pool.query("UPDATE notifications SET read=true WHERE id=$1", [req.params.id]);
  return { ok: true };
});

// ─── Logs ────────────────────────────────────────────────────
app.get("/logs/:venue_id", { preHandler: requireAuth }, async (req) => {
  const since = req.query.since ? new Date(req.query.since) : null;
  const type = req.query.type || null;

  let query = "SELECT * FROM logs WHERE venue_id=$1";
  const params = [req.params.venue_id];
  let idx = 2;

  if (since) {
    query += ` AND created_at > $${idx}`;
    params.push(since);
    idx++;
  }
  if (type) {
    query += ` AND type = $${idx}`;
    params.push(type);
    idx++;
  }

  query += " ORDER BY id DESC LIMIT 200";
  const r = await pool.query(query, params);
  return r.rows;
});

app.post("/logs", { preHandler: requireAuth }, async (req) => {
  const { venue_id, type, payload } = req.body || {};
  const r = await pool.query(
    "INSERT INTO logs (venue_id, type, payload) VALUES ($1,$2,$3) RETURNING *",
    [venue_id || req.user.venue_id, type, payload || {}]
  );
  return r.rows[0];
});

// ─── Analytics ───────────────────────────────────────────────
app.get("/analytics/:venue_id", { preHandler: requireRole(ADMIN_ROLES) }, async (req) => {
  const venueId = req.params.venue_id;

  const activeSessions = await pool.query(
    "SELECT COUNT(*) as count FROM venue_sessions WHERE venue_id=$1 AND ended_at IS NULL",
    [venueId]
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = await pool.query(
    "SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM orders WHERE venue_id=$1 AND created_at >= $2",
    [venueId, todayStart.toISOString()]
  );

  const todaySessions = await pool.query(
    "SELECT COUNT(*) as count FROM venue_sessions WHERE venue_id=$1 AND started_at >= $2",
    [venueId, todayStart.toISOString()]
  );

  const topItems = await pool.query(
    `SELECT payload->>'item' as item, COUNT(*) as count
     FROM logs WHERE venue_id=$1 AND type='SELL' AND created_at >= $2
     GROUP BY payload->>'item' ORDER BY count DESC LIMIT 10`,
    [venueId, todayStart.toISOString()]
  );

  const venue = await pool.query("SELECT capacity FROM venues WHERE id=$1", [venueId]);

  return {
    active_guests: Number(activeSessions.rows[0].count),
    capacity: venue.rows[0]?.capacity || null,
    today: {
      orders: Number(todayOrders.rows[0].count),
      revenue: Number(todayOrders.rows[0].revenue),
      checkins: Number(todaySessions.rows[0].count),
    },
    top_items: topItems.rows,
  };
});

app.post("/track", async (req) => {
  const { name, venue_id, payload } = req.body || {};
  let userId = null;
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.uid;
    } catch {}
  }
  await pool.query(
    "INSERT INTO analytics_events (name, venue_id, user_id, payload) VALUES ($1,$2,$3,$4)",
    [name, venue_id || null, userId, payload || {}]
  );
  return { ok: true };
});

// ─── Headcount ───────────────────────────────────────────────
app.get("/headcount/:venue_id", { preHandler: requireAuth }, async (req) => {
  const r = await pool.query(
    "SELECT COUNT(*) as count FROM venue_sessions WHERE venue_id=$1 AND ended_at IS NULL",
    [req.params.venue_id]
  );
  const venue = await pool.query("SELECT capacity FROM venues WHERE id=$1", [req.params.venue_id]);
  return {
    current: Number(r.rows[0].count),
    capacity: venue.rows[0]?.capacity || null,
  };
});

// ─── Stats (Admin Dashboard) ─────────────────────────────────
app.get("/stats", { preHandler: requireRole(ADMIN_ROLES) }, async () => {
  const venues = await pool.query("SELECT COUNT(*) as count FROM venues");
  const events = await pool.query("SELECT COUNT(*) as count FROM events");
  const sessions = await pool.query(
    "SELECT COUNT(*) as count FROM venue_sessions WHERE ended_at IS NULL"
  );
  return {
    venue_count: Number(venues.rows[0].count),
    event_count: Number(events.rows[0].count),
    active_sessions: Number(sessions.rows[0].count),
  };
});

// ─── Start ───────────────────────────────────────────────────
await initDb();
app.listen({ host: "0.0.0.0", port: 4000 });

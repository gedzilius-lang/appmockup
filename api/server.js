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

async function initDb() {
  await pool.query(`
    create table if not exists venues (
      id serial primary key,
      name text not null,
      city text not null default 'Zurich',
      pin text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists users (
      id serial primary key,
      email text unique,
      password_hash text,
      role text not null,
      venue_id int references venues(id),
      points int not null default 0,
      created_at timestamptz not null default now()
    );

    create table if not exists events (
      id serial primary key,
      title text not null,
      starts_at timestamptz not null,
      venue_name text not null,
      address text,
      genre text,
      description text,
      ticket_url text,
      image_url text,
      created_at timestamptz not null default now()
    );

    create table if not exists inventory (
      id serial primary key,
      venue_id int not null references venues(id),
      item text not null,
      qty int not null,
      low_threshold int not null default 5,
      updated_at timestamptz not null default now()
    );

    create table if not exists logs (
      id serial primary key,
      venue_id int references venues(id),
      type text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
  `);

  // Seed main admin once
  const email = process.env.MAINADMIN_EMAIL;
  const pass = process.env.MAINADMIN_PASSWORD;

  const existing = await pool.query("select id from users where email=$1", [email]);
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(pass, 10);
    await pool.query(
      "insert into users (email, password_hash, role) values ($1,$2,'MAIN_ADMIN')",
      [email, hash]
    );
    app.log.info("Seeded MAIN_ADMIN");
  }
}

function signToken(user) {
  return jwt.sign(
    { uid: user.id, role: user.role, venue_id: user.venue_id ?? null },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, reply) {
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
  return (req, reply) => {
    requireAuth(req, reply);
    if (reply.sent) return;
    if (!roles.includes(req.user.role)) return reply.code(403).send({ error: "Forbidden" });
  };
}

app.get("/health", async () => ({ ok: true }));

// Admin login
app.post("/auth/login", async (req, reply) => {
  const { email, password } = req.body || {};
  const r = await pool.query("select * from users where email=$1", [email]);
  if (r.rowCount === 0) return reply.code(401).send({ error: "Bad credentials" });
  const user = r.rows[0];
  const ok = await bcrypt.compare(password || "", user.password_hash || "");
  if (!ok) return reply.code(401).send({ error: "Bad credentials" });
  return { token: signToken(user), role: user.role, venue_id: user.venue_id };
});

// Venue PIN login for operational roles
app.post("/auth/pin", async (req, reply) => {
  const { pin, role } = req.body || {};
  if (!["BAR","RUNNER","SECURITY","GUEST"].includes(role)) {
    return reply.code(400).send({ error: "Invalid role" });
  }
  const v = await pool.query("select * from venues where pin=$1", [pin]);
  if (v.rowCount === 0) return reply.code(401).send({ error: "Bad pin" });
  const venue = v.rows[0];

  const u = await pool.query(
    "insert into users (role, venue_id) values ($1,$2) returning *",
    [role, venue.id]
  );
  return { token: signToken(u.rows[0]), role, venue_id: venue.id };
});

// Venues (MAIN_ADMIN)
app.post("/venues", { preHandler: requireRole(["MAIN_ADMIN"]) }, async (req) => {
  const { name, city, pin } = req.body || {};
  const r = await pool.query(
    "insert into venues (name, city, pin) values ($1,$2,$3) returning *",
    [name, city || "Zurich", pin]
  );
  return r.rows[0];
});

app.get("/venues", { preHandler: requireRole(["MAIN_ADMIN"]) }, async () => {
  const r = await pool.query("select * from venues order by id desc");
  return r.rows;
});

// Events
app.get("/events", async () => {
  const r = await pool.query("select * from events order by starts_at asc limit 100");
  return r.rows;
});

app.get("/events/:id", async (req, reply) => {
  const r = await pool.query("select * from events where id=$1", [req.params.id]);
  if (r.rowCount === 0) return reply.code(404).send({ error: "Not found" });
  return r.rows[0];
});

app.post("/events", { preHandler: requireRole(["MAIN_ADMIN","VENUE_ADMIN"]) }, async (req) => {
  const e = req.body || {};
  const r = await pool.query(
    `insert into events (title, starts_at, venue_name, address, genre, description, ticket_url, image_url)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
    [e.title, e.starts_at, e.venue_name, e.address, e.genre, e.description, e.ticket_url, e.image_url]
  );
  return r.rows[0];
});

// Inventory + actions
app.get("/inventory/:venue_id", { preHandler: requireAuth }, async (req) => {
  const r = await pool.query("select * from inventory where venue_id=$1 order by id asc", [req.params.venue_id]);
  return r.rows;
});

app.post("/inventory/:venue_id", { preHandler: requireRole(["MAIN_ADMIN","VENUE_ADMIN"]) }, async (req) => {
  const { item, qty, low_threshold } = req.body || {};
  const r = await pool.query(
    "insert into inventory (venue_id, item, qty, low_threshold) values ($1,$2,$3,$4) returning *",
    [req.params.venue_id, item, qty, low_threshold ?? 5]
  );
  return r.rows[0];
});

app.post("/actions/sell", { preHandler: requireRole(["BAR"]) }, async (req, reply) => {
  const { venue_id, item, amount } = req.body || {};
  const a = Number(amount || 1);
  const r = await pool.query(
    "update inventory set qty=qty-$1, updated_at=now() where venue_id=$2 and item=$3 returning *",
    [a, venue_id, item]
  );
  if (r.rowCount === 0) return reply.code(400).send({ error: "No such item" });

  const inv = r.rows[0];
  await pool.query("insert into logs (venue_id, type, payload) values ($1,'SELL',$2)",
    [venue_id, { item, amount: a, qty_after: inv.qty }]
  );

  if (inv.qty <= inv.low_threshold) {
    await pool.query("insert into logs (venue_id, type, payload) values ($1,'LOW_STOCK',$2)",
      [venue_id, { item, qty: inv.qty, low_threshold: inv.low_threshold }]
    );
  }
  return { ok: true, inventory: inv };
});

// Logs polling
app.get("/logs/:venue_id", { preHandler: requireAuth }, async (req) => {
  const since = req.query.since ? new Date(req.query.since) : null;
  const r = since
    ? await pool.query(
        "select * from logs where venue_id=$1 and created_at > $2 order by id desc limit 200",
        [req.params.venue_id, since]
      )
    : await pool.query(
        "select * from logs where venue_id=$1 order by id desc limit 200",
        [req.params.venue_id]
      );
  return r.rows;
});

await initDb();
app.listen({ host: "0.0.0.0", port: 4000 });

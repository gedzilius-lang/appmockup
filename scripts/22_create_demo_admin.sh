#!/usr/bin/env bash
set -euo pipefail

cd /opt/pwl-os

# Load .env variables into the environment (simple + safe)
set -a
source ./.env
set +a

# Run node inside the api container, using the same image/libs
docker compose run --rm api node - <<'NODE'
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const email = process.env.DEMO_ADMIN_EMAIL;
const pass  = process.env.DEMO_ADMIN_PASSWORD;

if (!email || !pass) {
  console.error("Missing DEMO_ADMIN_EMAIL or DEMO_ADMIN_PASSWORD in .env");
  process.exit(1);
}

const existing = await pool.query("select id from users where email=$1", [email]);
if (existing.rowCount > 0) {
  console.log("Demo user already exists:", email);
  await pool.end();
  process.exit(0);
}

const hash = await bcrypt.hash(pass, 10);
await pool.query(
  "insert into users (email, password_hash, role) values ($1,$2,'MAIN_ADMIN')",
  [email, hash]
);

console.log("Demo user created:", email);
await pool.end();
NODE

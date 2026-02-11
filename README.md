# PeopleWeLike OS (Phase 1)

This repo deploys a Phase 1 "combined product" for Zurich nightlife:
- Public event feed + event detail + embedded radio (os.peoplewelike.club)
- Staff/operations dashboard (admin.peoplewelike.club)
- REST API (api.peoplewelike.club)
- Postgres database

Radio runs on a separate VPS and is embedded via iframe.

## Domains
- OS: https://os.peoplewelike.club
- Admin: https://admin.peoplewelike.club
- API: https://api.peoplewelike.club

## Current Phase 1 scope
✅ Live deployment with Docker Compose:
- Nginx reverse proxy
- Next.js OS frontend (event feed)
- Next.js Admin frontend (create venues/events; includes “Sign In Demo” for testing)
- Fastify API (auth + venues + events + basic inventory + logs)
- Postgres

✅ Auth:
- MAIN_ADMIN via email/password
- Demo admin user (optional)
- Venue PIN login endpoint exists for operational roles (UI later)

✅ Operational features (minimal plumbing):
- Venues with PIN
- Inventory items
- Sell action reduces stock and writes logs
- Low-stock logs generated

## Non-goals for Phase 1 (deferred)
- Real NFC/UID login (use UID simulation later)
- Comments, attendance, nitecoin economy/exchange
- Full promoter self-service flow
- Realtime websockets (polling only)
- Strict security hardening (SSH keys, disable root) — recommended next

## Quick start (VPS)
1) Copy `.env.example` → `.env` and set secrets
2) Run: `docker compose up -d --build`
3) Validate:
   - `curl https://api.peoplewelike.club/health`
   - open OS/Admin domains

## Backup
- DB dump: `bash scripts/40_backup_db.sh` (stored in /opt/pwl-os/backups; do NOT commit to GitHub)
- Repo snapshot: `bash scripts/41_backup_repo_snapshot.sh`

## Next development steps (Phase 1.1 → Phase 2)
See `docs/NEXT_STEPS.md`.

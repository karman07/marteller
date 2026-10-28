# Deploying Marteller on the VPS

Run these steps ON the server as root. Layout: `/root/marteller/{backend,frontend,admin,sales}`,
each a separate git clone of `https://github.com/karman07/marteller.git`, each on its own branch:

| Dir | Branch | PM2 process | Port |
|---|---|---|---|
| backend | `main` | `marteller-backend`, `marteller-smtp-submission`, `marteller-mail-inbound` | API (see .env PORT) / 587 / 127.0.0.1:2525 |
| frontend | `frontend` | `marteller-frontend` | 3000 |
| admin | `admin` | `marteller-admin` | 3001 |
| sales | `sales` | `marteller-sales` | see `pm2 describe marteller-sales` |

Public hosts (nginx): `marteller-{backend,user,admin,sales,mail}.karmansingharora.com`.

## Rules
- NEVER overwrite or print `.env` / `.env.local` files; never commit them. Edit by hand only for the keys named below.
- Don't `git reset --hard` or delete anything on the server without checking `git status` first. If a pull conflicts with local server edits, stop and report.
- Deploy backend and frontend together (the `/mail/domains/:id/dns` response changed shape to `{ records: [...] }`).

## Steps
1. **Backend** (`/root/marteller/backend`)
   ```bash
   git pull origin main && npm install && npm run build
   ```
   Check `.env` has `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `FRONTEND_URL`/`ADMIN_URL`/`SALES_URL` (production origins),
   `MAIL_DKIM_ENCRYPTION_KEY`, `DEV_PHONE_AUTH_BYPASS` must be absent/false in production.
   Then: `pm2 restart marteller-backend marteller-smtp-submission marteller-mail-inbound && pm2 save`
2. **Frontend**: `cd /root/marteller/frontend && git pull origin frontend && npm install && npm run build && pm2 restart marteller-frontend`
3. **Admin**: same with `admin` / `marteller-admin`.
4. **Sales** (`/root/marteller/sales` may not be a git clone yet — it was previously shipped by tarball):
   ```bash
   cd /root/marteller
   git clone --branch sales --single-branch https://github.com/karman07/marteller.git sales.new
   cp sales/.env.local sales.new/.env.local
   mv sales sales.prev && mv sales.new sales
   cd sales && npm install && npm run build && pm2 restart marteller-sales && pm2 save
   ```
   Keep `sales.prev` until verified, then remove it.
5. **Resend (optional, only when the owner provides keys)** — add to backend `.env`:
   ```
   MAIL_PROVIDER=resend
   RESEND_API_KEY=re_...
   RESEND_WEBHOOK_SECRET=whsec_...
   SYSTEM_MAIL_FROM="Marteller <noreply@<domain verified in Resend>>"
   ```
   then `pm2 restart marteller-backend marteller-smtp-submission marteller-mail-inbound`.
   Resend webhook URL: `https://marteller-backend.karmansingharora.com/mail/webhooks/resend`
   (events: delivered, bounced, complained, delivery_delayed, opened, clicked). Without `MAIL_PROVIDER=resend`
   mail keeps using the local Postfix relay.

## Verify
```bash
pm2 list                      # all 6 online, no restart loops
pm2 logs marteller-backend --lines 40 --nostream   # "Nest application successfully started", no errors
systemctl is-active nginx postfix rspamd redis-server
for h in backend user admin sales; do curl -s -o /dev/null -w "$h %{http_code}\n" https://marteller-$h.karmansingharora.com; done
```
Report: commit hashes deployed per app, PM2 status, HTTP codes, and anything that failed.

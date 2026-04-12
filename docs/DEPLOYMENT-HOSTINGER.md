# GRIM — Deployment plan (Hostinger VPS, Ubuntu)

This document describes deploying **GRIM** on a **blank Ubuntu** machine (Hostinger **VPS** or similar). The stack is:

| Piece | Role |
|--------|------|
| **Frontend** | Static build (`vite build` → `dist/`) in its own folder |
| **Backend** | Node.js (Express) in a separate folder, listens on a port (default **3000**) |
| **MongoDB** | Installed on the **same** server; same database name and data as your current environment |

> **Hostinger note:** Node.js and MongoDB require a **VPS** or dedicated server. Shared hosting that only serves PHP/static files cannot run this stack as described.

---

## 1. What you are copying from today

From your codebase today:

- **MongoDB connection** (see `backend/src/store.js`):  
  - Default URI: `mongodb://localhost:27017/grim`  
  - Default database name: `grim` (override with `MONGODB_DB`)
- **Backend** stores uploaded files under: `backend/uploads/` (property images, inventory listing images, etc.). **Copy this directory** or URLs in the DB will break.
- **Frontend** calls the API using `VITE_API_URL` (see `frontend/src/lib/api.ts`). That value is **baked in at build time**.

---

## 2. Suggested server layout

Example paths (adjust to taste):

```text
/var/www/grim/
├── frontend/          # git repo or release: contains dist/ after build (or only dist/)
├── backend/           # Node app: package.json, src/, uploads/
```

Or under a deploy user:

```text
/home/deploy/apps/grim-frontend/
/home/deploy/apps/grim-backend/
```

---

## 3. Ubuntu preparation

SSH in as root or a sudo user.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw
```

**Firewall (example):** allow SSH, HTTP, HTTPS; backend stays on localhost (only Nginx talks to it).

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Node.js (LTS):** use Node 20 LTS (or 22 if you prefer).

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

---

## 4. Install MongoDB on the server

Use the official MongoDB Community edition packages for your Ubuntu version (follow MongoDB docs for “Install on Ubuntu”). Typical steps:

1. Import MongoDB GPG key and add the `mongodb-org` APT repo for your Ubuntu release.
2. `sudo apt update && sudo apt install -y mongodb-org`
3. Enable and start:

```bash
sudo systemctl enable mongod
sudo systemctl start mongod
sudo systemctl status mongod
```

**Bind to localhost** for security (backend only; no public Mongo port):

- In `/etc/mongod.conf`, set `net.bindIp: 127.0.0.1` (default on many installs).
- Restart: `sudo systemctl restart mongod`

Optional: enable authentication later (`security.authorization: enabled`) and create an app user; then set `MONGODB_URI` to `mongodb://user:pass@127.0.0.1:27017/grim?authSource=admin`.

---

## 5. Copy database and files from your current machine

### 5.1 Dump the current database

On your **current** machine (where MongoDB has your data):

```bash
mongodump --uri="mongodb://127.0.0.1:27017/grim" --out=./grim-mongo-dump
# If you use a different URI or DB name, adjust --uri and use --db=<name>
```

If your DB name is not `grim`, add `--db=yourDbName` or use a full URI that includes the database.

### 5.2 Transfer the dump to the server

```bash
scp -r ./grim-mongo-dump user@YOUR_SERVER_IP:/tmp/
```

### 5.3 Restore on the new server

On the **Ubuntu** server:

```bash
mongorestore --uri="mongodb://127.0.0.1:27017" /tmp/grim-mongo-dump
# Or if dump contains multiple DBs:
# mongorestore /tmp/grim-mongo-dump
```

Confirm database name is **`grim`** (or set `MONGODB_DB` in backend `.env` to match whatever you restored).

### 5.4 Copy `uploads` (required for images)

From your dev machine (project root):

```bash
scp -r backend/uploads user@YOUR_SERVER_IP:/var/www/grim/backend/uploads
```

Preserve paths so files line up with URLs stored in MongoDB (e.g. `/uploads/...`).

---

## 6. Deploy the backend

1. Clone or upload the repo into `/var/www/grim/backend` (without committing secrets).
2. Install production dependencies:

```bash
cd /var/www/grim/backend
npm ci --omit=dev
```

3. Create `/var/www/grim/backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/grim
MONGODB_DB=grim
PUBLIC_URL=https://api.yourdomain.com
```

- **`PUBLIC_URL`**: Base URL where the API is reachable **externally** (used in links if the app generates absolute URLs). Use your real API domain or the same origin if you only expose one domain behind Nginx.

4. **systemd** unit `/etc/systemd/system/grim-backend.service`:

```ini
[Unit]
Description=GRIM API
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/grim/backend
EnvironmentFile=/var/www/grim/backend/.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Adjust `User` and paths. Ensure `www-data` can read the app and write to `uploads/`:

```bash
sudo chown -R www-data:www-data /var/www/grim/backend/uploads
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable grim-backend
sudo systemctl start grim-backend
sudo journalctl -u grim-backend -f
```

5. **Catalog index** (if you use catalog features): after first successful DB connection, call rebuild once (or rely on server startup if your `index.js` already rebuilds):

```bash
curl -X POST http://127.0.0.1:3000/api/catalog/rebuild
```

---

## 7. Build and deploy the frontend

On your **build machine** (or CI, or the server):

1. Copy `frontend/.env.production` (create if needed):

```env
VITE_API_URL=https://api.yourdomain.com
```

Use the **public** API URL that browsers will call (usually HTTPS, no trailing slash). If Nginx serves API and SPA under **one** domain with paths like `/api`, set `VITE_API_URL` to that origin (e.g. `https://yourdomain.com`) and ensure Nginx routes `/api` to Node.

2. Build:

```bash
cd frontend
npm ci
npm run build
```

3. Upload **`frontend/dist/`** contents to the server, e.g. `/var/www/grim/frontend/dist` or `/var/www/html/grim`.

---

## 8. Nginx (recommended)

- **Static files:** `root` pointing at `dist/` (or alias).
- **API:** `location /api` → `proxy_pass http://127.0.0.1:3000;` (and `/uploads` if served by Express, or proxy those too).

Example skeleton:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/grim/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site, test `nginx -t`, reload Nginx.

**HTTPS:** `sudo apt install certbot python3-certbot-nginx` and run Certbot for your domain.

---

## 9. Same-origin vs split domains

| Setup | `VITE_API_URL` at build |
|--------|-------------------------|
| One domain: `https://app.example.com` with Nginx proxying `/api` | `https://app.example.com` (empty path prefix in client; paths are `/api/...`) |
| API on `https://api.example.com`, SPA on `https://app.example.com` | `https://api.example.com` and configure **CORS** if browsers block (backend already uses permissive `cors({ origin: true })` for development-style setups; tighten for production if needed). |

---

## 10. Post-deploy checklist

- [ ] `mongorestore` completed; `mongo` shell or Compass shows database **`grim`** and expected collections (`properties`, `inventory_*`, `catalog_listings`, `agent_profile`, etc.).
- [ ] `backend/uploads` present and permissions correct; existing property/listing images load.
- [ ] `systemctl status grim-backend` is **active**.
- [ ] `curl http://127.0.0.1:3000/api/...` returns JSON (pick a known GET).
- [ ] Browser: SPA loads, login/data works, API calls go to correct host (DevTools → Network).
- [ ] `POST /api/catalog/rebuild` if catalog must be refreshed after migration.
- [ ] Backups: schedule `mongodump` and archive `uploads/` periodically.

---

## 11. Ongoing backups (recommended)

- **MongoDB:** nightly `mongodump` to a dated folder, or filesystem snapshots.
- **Uploads:** `rsync` or tarball of `backend/uploads`.
- **Config:** keep `.env` in a secrets store, not only on disk unencrypted.

---

## 12. Quick reference — environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `MONGODB_URI` | Backend `.env` | Mongo connection string |
| `MONGODB_DB` | Backend `.env` | DB name (default `grim`) |
| `PORT` | Backend `.env` | API port (default `3000`) |
| `PUBLIC_URL` | Backend `.env` | Public base URL of the API |
| `VITE_API_URL` | Frontend **at build time** | API origin for `fetch` |

---

*Document version: aligned with GRIM backend `store.js` and frontend `api.ts` as of project snapshot. Adjust paths, domains, and MongoDB auth to match your Hostinger VPS and security policy.*

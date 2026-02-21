# RotorBench Production Deployment (Example Domain: `rotor.nori.fish`)

This deployment targets Apache + systemd on this server.
This guide is domain-agnostic. Replace `YOUR_DOMAIN` with your own hostname.
Our team example is `rotor.nori.fish`.

## 1) One-time server prep

### Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### Prepare backend venv

```bash
cd /home/ubuntu/RotorBench/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python migrate_legacy_data.py
```

## 2) Build frontend

```bash
cd /home/ubuntu/RotorBench/rotorbench
npm ci
npm run build
```

Expected output dir:

`/home/ubuntu/RotorBench/rotorbench/build`

## 3) Install and start backend service

```bash
sudo cp /home/ubuntu/RotorBench/backend/rotorbench.service /etc/systemd/system/rotorbench.service
# Edit CORS_ALLOWED_ORIGINS to your frontend origin, e.g. https://rotor.nori.fish
sudo nano /etc/systemd/system/rotorbench.service
sudo systemctl daemon-reload
sudo systemctl enable --now rotorbench
sudo systemctl status rotorbench --no-pager
```

Logs:

```bash
journalctl -u rotorbench -f
```

## 4) Apache virtual host

Create `/etc/apache2/sites-available/rotorbench.conf`:

```apache
<VirtualHost *:80>
    ServerName YOUR_DOMAIN

    DocumentRoot /home/ubuntu/RotorBench/rotorbench/build

    ErrorLog ${APACHE_LOG_DIR}/rotorbench-error.log
    CustomLog ${APACHE_LOG_DIR}/rotorbench-access.log combined

    ProxyPreserveHost On
    ProxyRequests Off

    ProxyPass /api http://127.0.0.1:8100/api
    ProxyPassReverse /api http://127.0.0.1:8100/api

    <Directory /home/ubuntu/RotorBench/rotorbench/build>
        Options +FollowSymLinks -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/api(/|$)
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-f
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-d
    RewriteRule ^ /index.html [L]
</VirtualHost>
```

Enable site:

```bash
sudo a2ensite rotorbench.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## 5) TLS (after DNS points `YOUR_DOMAIN` here)

```bash
sudo certbot --apache -d YOUR_DOMAIN
```

Team example:

```bash
sudo certbot --apache -d rotor.nori.fish
```

This will create HTTPS vhost and can enable HTTP->HTTPS redirect.

## 6) Manual deploy workflow (ongoing)

```bash
cd /home/ubuntu/RotorBench
git pull

cd /home/ubuntu/RotorBench/backend
source .venv/bin/activate
pip install -r requirements.txt
python migrate_legacy_data.py

cd /home/ubuntu/RotorBench/rotorbench
npm ci
npm run build

sudo systemctl restart rotorbench
sudo systemctl reload apache2
```

## 7) Smoke test checklist

1. `curl http://127.0.0.1:8100/api/health` returns `status=ok`.
2. `curl -I https://YOUR_DOMAIN/` returns `200`.
3. `curl -I https://YOUR_DOMAIN/api/health` returns backend health response.
4. In browser, hard-refresh direct routes:
   - `/`
   - `/build`
   - `/analysis`
   - `/saved`
   - `/profile`
   - `/legal`
5. Create/save/delete a build and verify it persists.
6. Run analysis and verify chart/metrics render.
7. If this server hosts other sites, verify they still load after Apache changes.

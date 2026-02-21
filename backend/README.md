# RotorBench Backend

FastAPI backend for RotorBench with JSON data storage in `backend/data`.

## Runtime configuration

Environment variables:

- `APP_ENV`: `development` or `production` (default: `development`)
- `HOST`: bind host (default: `0.0.0.0`)
- `PORT`: bind port (default: `8000`)
- `DATA_DIR`: backend mutable data directory (default: `backend/data`)
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins (for example, `https://rotor.nori.fish` for our team deployment)
- `ENABLE_DOCS`: `true|false` to expose `/docs` and `/openapi.json`

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python migrate_legacy_data.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Production service

`rotorbench.service` runs Gunicorn/Uvicorn on `127.0.0.1:8100`.

```bash
sudo cp backend/rotorbench.service /etc/systemd/system/rotorbench.service
sudo systemctl daemon-reload
sudo systemctl enable --now rotorbench
sudo systemctl status rotorbench
```

## Health endpoint

```bash
curl http://127.0.0.1:8100/api/health
```

## Data migration

`migrate_legacy_data.py` performs one-time migration:

- source: `rotorbench/src/data/builds.json` and `rotorbench/src/data/users.json`
- target: `backend/data/builds.json` and `backend/data/users.json`
- creates timestamped backups of source files before copying when targets are missing.

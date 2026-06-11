# Deployment

## Run Modes

UAIV-Labeler separates three usage modes:

| Mode | Entry | Use Case |
| --- | --- | --- |
| Offline Demo | `offline_demo/run_offline.sh` or `.bat` | Local-only trial with `sample_data/`, manual annotation, and mock predictions |
| Online Live Demo | `http://8.137.184.86` | Public preview of the hosted platform |
| Server Deployment | `scripts/start_public.sh`, Docker, or Gunicorn/Nginx | Team/lab use with mounted datasets and real model services |

Use the offline demo when you only want to try the workflow on the current computer. Use server deployment when the platform must browse a lab data disk or connect GPU model environments.

## Offline Demo

```bash
pip install -r requirements.txt
bash offline_demo/run_offline.sh
```

Open:

```text
http://127.0.0.1:7860
```

This mode binds to localhost and is not a public service.

## Local Server Preview

```bash
pip install -r requirements.txt
bash scripts/start_public.sh
```

Open:

```text
http://127.0.0.1:7860
```

This is useful for development. For a shareable server address, bind to `0.0.0.0` as shown below.

## Public Server

Current public demo:

```text
http://8.137.184.86
```

```bash
URBAN_ANNOTATION_HOST=0.0.0.0 URBAN_ANNOTATION_PORT=7860 bash scripts/start_public.sh
```

Share:

```text
http://<server-ip>:7860
```

Do not share `127.0.0.1`; that address is only visible on the machine running the service.

## Docker

```bash
docker compose up --build
```

Mount your dataset by editing `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data
  - ./exports:/app/exports
  - ./logs:/app/logs
  - /your/dataset/root:/datasets:ro
```

Then import `/datasets/...` in the server-folder panel.

## Runtime Path Variables

```bash
export UAIV_BROWSE_ROOTS="/datasets:/mnt/uaiv:/your/data/root"
export UAIV_DEFAULT_BROWSE_PATH="/datasets"
export UAIV_QA_ROOT="/datasets/qa"
```

## Production Notes

- Use Gunicorn + Nginx for long-running service.
- Add authentication before opening private data on the internet.
- Use SQLite/PostgreSQL for large multi-user annotation.
- Keep model weights and private absolute paths out of public Git commits.

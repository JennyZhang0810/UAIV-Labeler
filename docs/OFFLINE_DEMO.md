# Offline Demo

UAIV-Labeler provides an offline demo mode for local-only use. It is separate from the public live demo and from production server deployment.

## Three Modes

| Mode | Entry | Best For | Notes |
|:--|:--|:--|:--|
| Offline Demo | `offline_demo/run_offline.sh` or `.bat` | Fast local testing, air-gapped preview, manual annotation | Uses sample data and mock backend by default |
| Online Live Demo | `http://121.48.163.156:7860` | Quick public preview | Reads data on the hosted demo server only |
| Server Deployment | `scripts/start_public.sh`, Docker, Gunicorn/Nginx | Lab/team production use | Reads mounted server folders and can connect real model services |

## Start

```bash
bash offline_demo/run_offline.sh
```

Then open:

```text
http://127.0.0.1:7860
```

Windows:

```bat
offline_demo\run_offline.bat
```

## Why This Matters

Low-altitude remote-sensing data is often collected in restricted environments. An offline demo helps users evaluate the platform without uploading data, configuring a cloud server, or exposing local files to the public internet.


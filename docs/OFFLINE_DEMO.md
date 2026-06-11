# Offline Demo

UAIV-Labeler provides an offline demo mode for local-only use. It is a separate workflow from the public live demo and from production server deployment.

The offline demo is designed for local teaching, air-gapped preview, restricted data environments, and manual annotation trials. It does **not** bundle heavyweight YOLO, SAM, SegEarth, OCR, or VLM model weights; those belong to server deployment or to the planned full offline package.

## Three Modes

| Mode | Entry | Best For | Notes |
|:--|:--|:--|:--|
| Offline Demo | `offline_demo/run_offline.sh` or `.bat` | Fast local testing, air-gapped preview, manual annotation | Uses sample data and mock backend by default |
| Online Live Demo | `http://8.137.184.86` | Quick public preview | Reads data on the hosted demo server only |
| Server Deployment | `scripts/start_public.sh`, Docker, Gunicorn/Nginx | Lab/team production use | Reads mounted server folders and can connect real model services |

## Start

```bash
git clone https://github.com/JennyZhang0810/UAIV-Labeler.git
cd UAIV-Labeler
pip install -r requirements.txt
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

## Offline Workflow

1. Start the offline service.
2. Open `http://127.0.0.1:7860`.
3. Import `sample_data/images`.
4. Select an image and review its Metadata.
5. Use manual tools:
   - horizontal bounding box;
   - rotated bounding box;
   - point-by-point polygon region;
   - undo and clear-all.
6. Press `Ctrl+S` to save and move to the next image.
7. Export JSON, COCO, VOC, or QA files.

## Why This Matters

Low-altitude remote-sensing data is often collected in restricted environments. An offline demo helps users evaluate the platform without uploading data, configuring a cloud server, or exposing local files to the public internet.

## Build and Share the Offline Demo

For a GitHub release or a lab-internal handoff, create a clean archive:

```bash
bash scripts/build_offline_bundle.sh
```

The generated file is:

```text
dist/uaiv-labeler-offline-demo-<version>.tar.gz
```

The build script excludes:

- Git metadata.
- Runtime logs.
- Uploaded private data.
- Generated exports.
- Rebuildable SQLite indexes.
- Model weights and checkpoints.

The recipient extracts the archive and starts the local-only workflow:

```bash
bash offline_demo/run_offline.sh
```

This makes the offline story clear:

- **Offline Demo**: manual annotation and workflow trial on `127.0.0.1`.
- **Server Deployment**: team data disks, real model services, and shared access.
- **Planned Full Offline Package**: a future self-contained release with controlled model/runtime packaging.

## Clear Difference from Online Modes

| Item | Offline Demo | Online Live Demo | Server Deployment |
|:--|:--|:--|:--|
| Access URL | `http://127.0.0.1:7860` | Hosted public URL | Team server IP/domain |
| Network | No public network required | Public preview | LAN/public/intranet |
| Data | `sample_data/` by default | Hosted demo data | Mounted server folders |
| Models | Mock/manual by default | Hosted backends | Local GPU or remote model services |
| Audience | One local user | Public preview users | Lab/team annotators |

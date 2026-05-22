# UAIV-Labeler Offline Demo

The offline demo is a lightweight local-only mode for trying UAIV-Labeler without internet access, public server exposure, external model services, or model weights.

It is intended for:

- reviewers who want to test the interface quickly;
- labs with restricted network access;
- intranet demonstrations;
- users who only need manual annotation and export with sample data.

## What Works Offline

- Open the Web interface at `127.0.0.1`.
- Browse the built-in `sample_data/` folder.
- View Metadata fields.
- Manually draw bounding boxes.
- Review QA examples from `sample_data/qa/sample_qa.tsv`.
- Save annotations to `data/annotations.json`.
- Export JSON, COCO, VOC, and QA files.
- Use the built-in mock pre-annotation backend for workflow demonstration.

## What Is Not Included

The offline demo does not bundle heavyweight model environments or model weights. YOLO, SAM, SegEarth, OCR, and VLM models should be connected separately when available.

For production intranet use, see the planned **Offline Full Package** in the main README roadmap.

## Start on Linux/macOS

```bash
bash offline_demo/run_offline.sh
```

Open:

```text
http://127.0.0.1:7860
```

## Start on Windows

Double-click:

```text
offline_demo/run_offline.bat
```

or run in PowerShell/CMD:

```bat
offline_demo\run_offline.bat
```

Open:

```text
http://127.0.0.1:7860
```

## Offline Demo vs Online / Server Deployment

| Mode | Purpose | Network | Data Access | Model Backends |
|:--|:--|:--|:--|:--|
| Offline Demo | Local trial and manual annotation | No public network required | Built-in `sample_data/` by default | Mock backend only by default |
| Online Live Demo | Public preview | Public URL | Server-hosted demo data | Server-configured backends |
| Server Deployment | Lab/team production use | LAN/public/intranet | Mounted server folders | Local or remote model services |


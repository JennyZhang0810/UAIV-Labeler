# Regression Checklist

Use this checklist before releasing a new UAIV-Labeler update. It is designed to prevent new features from breaking existing annotation, QA review, export, and deployment workflows.

## 1. Static Checks

```bash
python -m py_compile app/*.py wsgi.py examples/custom_model_backend.py
node --check app/static/app.js
bash -n scripts/start_public.sh
bash -n offline_demo/run_offline.sh
docker compose config
git diff --check
```

Remove generated caches before committing:

```bash
find . -type d -name __pycache__ -prune -exec rm -rf {} +
```

## 2. Core API Smoke Test

Start the service, then check:

```bash
curl -s -o /tmp/uaiv_home.html -w 'home %{http_code} %{size_download}\n' http://127.0.0.1:7860/
curl -s -o /tmp/uaiv_app.js -w 'appjs %{http_code} %{size_download}\n' http://127.0.0.1:7860/static/app.js
curl -s -o /tmp/uaiv_config.json -w 'config %{http_code} %{size_download}\n' http://127.0.0.1:7860/api/config
curl -s -o /tmp/uaiv_stats.json -w 'stats %{http_code} %{size_download}\n' http://127.0.0.1:7860/api/stats
curl -s -o /tmp/uaiv_quality.json -w 'quality %{http_code} %{size_download}\n' http://127.0.0.1:7860/api/quality-report
curl -s -o /tmp/uaiv_dataset_card.json -w 'dataset_card %{http_code} %{size_download}\n' -X POST http://127.0.0.1:7860/api/dataset-card
curl -s -o /tmp/uaiv_models.json -w 'models %{http_code} %{size_download}\n' http://127.0.0.1:7860/api/models
curl -s -o /tmp/uaiv_images.json -w 'images %{http_code} %{size_download}\n' 'http://127.0.0.1:7860/api/images?limit=5'
```

Expected result: all status codes should be `200`.

## 3. Workbench Manual Test

- Open the homepage and switch between Chinese and English.
- Enter the workbench from the homepage.
- Import `sample_data/images` through server-folder import.
- Select an image from the list.
- Confirm Metadata is shown in the right panel.
- Draw a bounding box manually.
- Draw a rotated bounding box and confirm the object row contains a rotation value.
- Use point-region mode to create a polygon with at least 3 points.
- Confirm the segment list shows the new region.
- Enable edit-geometry mode.
- Drag a box to move it, drag a corner handle to resize it, and drag one polygon vertex.
- Set or type a custom object label.
- Press `Ctrl+S`.
- Confirm a save toast appears and the next image is selected.
- Use undo and clear-all once to confirm annotation tools still respond.

## 4. Model Panel Test

- Open the model panel.
- Confirm available model cards render without overflowing.
- Run the built-in mock backend if no real model environment is available.
- Confirm the processing dialog appears and closes.
- Confirm the UI shows a completion message even if no objects are returned.

For local GPU model environments, additionally test at least one real model backend and confirm model outputs are marked as predictions, not final human annotations.

## 5. QA Review Test

Server-side QA:

- Browse `sample_data/qa` or a configured QA directory.
- Select a `.tsv` file.
- Load TSV review.
- Confirm the first question and paired image appear.
- Edit one field and save.

Local-upload QA:

- Upload a small `.tsv` file.
- Upload its paired image folder if image paths are not embedded or cannot be resolved.
- Confirm the platform loads questions and images after upload.

Evaluation review:

- Load an `.xlsx` result file when available.
- Confirm model answer, ground truth, hit/miss status, and reasoning trace are displayed.

## 6. Export Test

- Export JSON on the server side.
- Download JSON locally.
- If annotations include boxes, export COCO and VOC.
- If QA rows exist, export QA JSONL.
- Confirm export actions show toast messages and create files under `exports/` for server exports.

## 7. Run Mode Test

Offline Demo:

```bash
bash offline_demo/run_offline.sh
```

- Open `http://127.0.0.1:7860`.
- Confirm the service only uses sample data by default.

Online Demo:

- Confirm the public address opens if the hosted server is running.
- Do not describe `127.0.0.1` as a public URL.

Server Deployment:

- Confirm `UAIV_BROWSE_ROOTS`, `UAIV_DEFAULT_BROWSE_PATH`, and `UAIV_QA_ROOT` point to the intended mounted storage.

## 8. Documentation and Logs

- Update `README.md` and `README_zh.md` if user-facing behavior changes.
- Update `USER_GUIDE.md` for workflow changes.
- Update `docs/CUSTOM_MODEL.md` for model API changes.
- Record the change, verification commands, and known limitations in the project work log.

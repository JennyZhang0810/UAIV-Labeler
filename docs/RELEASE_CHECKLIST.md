# GitHub Release Checklist

Before publishing:

- [ ] Replace or confirm all sample images are allowed for public release.
- [ ] Record `assets/demo.gif` using `assets/demo_storyboard.md`.
- [ ] Confirm `config/model_backends.json` contains no private absolute paths.
- [ ] Confirm no private data exists in `data/`, `exports/`, `logs/`, or `sample_data/`.
- [ ] Run `python -m py_compile app/*.py`.
- [ ] Run `node --check app/static/app.js`.
- [ ] Run `docker compose config`.
- [ ] Check README links for UAIV Project, GitHub, and ScienceDB.
- [ ] Add paper DOI when available.
- [ ] Choose repository topics: `remote-sensing`, `uav`, `annotation`, `labeling`, `benchmark`, `sam`, `yolo`, `data-centric-ai`.


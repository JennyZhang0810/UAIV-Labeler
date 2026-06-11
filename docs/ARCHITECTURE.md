# Architecture

```text
Browser UI
  |
  | Flask API
  v
AnnotationStore
  |-- data/metadata.json
  |-- data/annotations.json
  |-- data/index.sqlite3
  |-- data/history/
  |-- exports/
  |
  +-- StorageResolver
  +-- ModelRegistry
  +-- QA Tools
```

## Main Modules

- `app/server.py`: Flask routes, file browsing, import, export, model calls, QA review API.
- `app/annotation_store.py`: Metadata records, annotations, history snapshots, statistics, and format export.
- `app/data_index.py`: Rebuildable SQLite side index derived from JSON storage for faster filtering/status summaries and future multi-user storage migration.
- `app/model_registry.py`: Built-in model registry and custom HTTP model adapter.
- `app/storage_resolver.py`: Path mapping layer for portable storage roots.
- `app/qa_tools.py`: TSV QA review and XLSX result-review utilities.
- `app/static/app.js`: Workbench, QA review, bilingual UI, manual bbox workflow.
- `app/static/styles.css`: Label Studio-inspired clean white UI.

## Design Principles

- Keep original large images in place; index paths instead of copying.
- Treat Metadata as first-class information, not an afterthought.
- Separate model predictions from human-reviewed data where possible.
- Make export formats directly useful for training and Benchmark evaluation.
- Keep heavyweight model environments outside the Web service when possible.

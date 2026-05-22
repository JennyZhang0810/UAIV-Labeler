from __future__ import annotations

import csv
import os
import re
from pathlib import Path
from typing import Any


QA_FIELDS = ["index", "question", "A", "B", "C", "D", "answer", "category", "l2-category", "image_path"]
OPTION_KEYS = ["A", "B", "C", "D"]
QA_ROOT = Path(os.environ.get("UAIV_QA_ROOT", Path(__file__).resolve().parents[1] / "sample_data" / "qa")).resolve()
QA_OUTPUT_DIR = QA_ROOT / "qa_review_outputs"


def normalize_answer(answer: Any) -> str:
    parts = [
        item.strip().upper()
        for item in str(answer or "").replace("，", ",").replace("；", ",").replace(";", ",").split(",")
    ]
    return ",".join([item for item in parts if item in set(OPTION_KEYS)])


def read_tsv(tsv_path: Path) -> list[dict[str, str]]:
    with tsv_path.open("r", encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file, delimiter="\t"))


def clean_path_for(tsv_path: Path) -> Path:
    return QA_OUTPUT_DIR / f"{tsv_path.stem}.clean.tsv"


def read_clean_rows(clean_path: Path) -> dict[str, dict[str, str]]:
    if not clean_path.exists():
        return {}
    with clean_path.open("r", encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file, delimiter="\t"))
    return {row.get("index", str(position)): row for position, row in enumerate(rows)}


def write_clean_row(tsv_path: Path, row_index: int, payload: dict[str, Any]) -> dict[str, Any]:
    rows = read_tsv(tsv_path)
    if row_index < 0 or row_index >= len(rows):
        raise IndexError("QA row index out of range")

    row = rows[row_index]
    for key in ["question", "A", "B", "C", "D", "answer"]:
        row[key] = str(payload.get(key, row.get(key, "")))
    row["answer"] = normalize_answer(row.get("answer", ""))

    clean_path = clean_path_for(tsv_path)
    clean_rows = read_clean_rows(clean_path)
    key = row.get("index", str(row_index))
    clean_rows[key] = {field: row.get(field, "") for field in QA_FIELDS}
    ordered_rows = sorted(
        clean_rows.values(),
        key=lambda item: int(item.get("index", "0")) if str(item.get("index", "")).isdigit() else 0,
    )
    QA_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with clean_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=QA_FIELDS, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(ordered_rows)
    return {"ok": True, "message": f"Saved row {row_index + 1}", "clean_path": str(clean_path), "clean_count": len(clean_rows)}


def tsv_meta(tsv_path: Path) -> dict[str, Any]:
    rows = read_tsv(tsv_path)
    clean_path = clean_path_for(tsv_path)
    return {"total": len(rows), "title": tsv_path.name, "path": str(tsv_path), "clean_path": str(clean_path), "clean_count": len(read_clean_rows(clean_path))}


def tsv_item(tsv_path: Path, row_index: int) -> dict[str, Any]:
    rows = read_tsv(tsv_path)
    if row_index < 0 or row_index >= len(rows):
        raise IndexError("QA row index out of range")
    item = dict(rows[row_index])
    item["row_number"] = row_index + 1
    item["total"] = len(rows)
    item["clean_count"] = len(read_clean_rows(clean_path_for(tsv_path)))
    return item


def normalize_cell(value: Any) -> str:
    try:
        import pandas as pd

        if pd.isna(value):
            return ""
    except Exception:
        pass
    return str(value)


def parse_final_answer(prediction: Any) -> str:
    text = normalize_cell(prediction)
    matches = list(re.finditer(r"final\s+answer\s*[:：]?", text, flags=re.IGNORECASE))
    if matches:
        window = text[matches[-1].end() : matches[-1].end() + 120].upper()
    else:
        window = text[-160:].upper()
    found = re.findall(r"(?<![A-Z])([A-D])(?![A-Z])", window)
    unique = []
    for item in found:
        if item not in unique:
            unique.append(item)
    return ",".join(unique)


def maybe_exact_result_path(xlsx_path: Path) -> Path | None:
    if xlsx_path.name.endswith("_exact_matching_result.xlsx"):
        return xlsx_path
    candidate = xlsx_path.with_name(f"{xlsx_path.stem}_exact_matching_result.xlsx")
    return candidate if candidate.exists() else None


def read_result_rows(xlsx_path: Path, wrong_only: bool = False) -> tuple[list[dict[str, str]], Path]:
    try:
        import pandas as pd
    except ImportError as exc:
        raise RuntimeError("pandas/openpyxl is required for XLSX result review") from exc

    read_path = xlsx_path
    if wrong_only:
        exact_path = maybe_exact_result_path(xlsx_path)
        if exact_path is not None:
            read_path = exact_path

    data = pd.read_excel(read_path, dtype=str).fillna("")
    if "parsed_answer" not in data.columns:
        data["parsed_answer"] = data["prediction"].apply(parse_final_answer) if "prediction" in data.columns else ""
    if "hit" not in data.columns and "answer" in data.columns:
        data["hit"] = [
            "1" if normalize_answer(pred) == normalize_answer(gt) and normalize_answer(gt) else "0"
            for pred, gt in zip(data["parsed_answer"], data["answer"])
        ]
    if wrong_only:
        if "hit" not in data.columns:
            raise ValueError("Wrong-only review requires hit or answer/prediction columns.")
        data = data[data["hit"].astype(str).str.strip() != "1"].copy()

    rows = []
    for _, row in data.iterrows():
        rows.append({key: normalize_cell(row.get(key, "")) for key in data.columns})
    return rows, read_path


def result_meta(xlsx_path: Path, wrong_only: bool = False) -> dict[str, Any]:
    rows, loaded_path = read_result_rows(xlsx_path, wrong_only=wrong_only)
    return {"total": len(rows), "title": loaded_path.name, "path": str(loaded_path), "wrong_only": wrong_only}


def result_item(xlsx_path: Path, row_index: int, wrong_only: bool = False) -> dict[str, Any]:
    rows, loaded_path = read_result_rows(xlsx_path, wrong_only=wrong_only)
    if not rows:
        raise IndexError("Result file has no rows")
    row_index = max(0, min(row_index, len(rows) - 1))
    item = dict(rows[row_index])
    item["row_number"] = row_index + 1
    item["total"] = len(rows)
    item["source_path"] = str(loaded_path)
    return item

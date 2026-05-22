from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
IMAGE_DIR = DATA_DIR / "images"


def draw_scene(path: Path, title: str, palette: tuple[str, str, str], features: list[str]) -> None:
    width, height = 1024, 768
    image = Image.new("RGB", (width, height), palette[0])
    draw = ImageDraw.Draw(image)

    draw.rectangle([0, 0, width, 180], fill=palette[1])
    draw.rectangle([0, 560, width, height], fill=palette[2])
    draw.line([0, 610, width, 520], fill=(235, 235, 220), width=42)
    draw.line([120, 768, 620, 0], fill=(80, 88, 96), width=72)
    draw.line([140, 768, 640, 0], fill=(220, 220, 210), width=4)

    for idx in range(9):
        x = 60 + idx * 105
        y = 230 + (idx % 3) * 48
        draw.rectangle([x, y, x + 74, y + 58], fill=(168, 183, 190), outline=(80, 98, 105), width=2)

    for idx in range(7):
        x = 260 + idx * 92
        y = 525 - (idx % 2) * 35
        draw.rectangle([x, y, x + 40, y + 22], fill=(196, 47, 55), outline=(90, 20, 20))

    if "water" in features:
        draw.polygon([(0, 420), (260, 390), (520, 450), (1024, 400), (1024, 520), (0, 540)], fill=(58, 128, 160))
    if "farm" in features:
        for idx in range(8):
            x0 = idx * 128
            draw.rectangle([x0, 570, x0 + 110, 760], fill=(99, 150 + (idx % 2) * 22, 82))
    if "night" in features:
        overlay = Image.new("RGB", (width, height), (18, 32, 45))
        image = Image.blend(image, overlay, 0.35)
        draw = ImageDraw.Draw(image)
    if "rain" in features:
        for idx in range(95):
            x = (idx * 37) % width
            y = (idx * 71) % height
            draw.line([x, y, x + 18, y + 42], fill=(210, 225, 235), width=2)
    if "fog" in features:
        for y in range(120, 640, 70):
            draw.rectangle([0, y, width, y + 30], fill=(210, 220, 220))

    draw.rectangle([24, 24, 430, 86], fill=(255, 255, 255), outline=(40, 60, 70), width=2)
    draw.text((42, 43), title, fill=(24, 38, 45))
    image.save(path, quality=92)


def main() -> None:
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    records = [
        {
            "id": "urban_batch1_0001",
            "file_name": "urban_batch1_0001.jpg",
            "batch": "第一批",
            "capture_time": "2026-04-18T09:22:00+08:00",
            "flight_height_m": 120,
            "longitude": 104.3971,
            "latitude": 31.1264,
            "weather": "晴",
            "scene": "交通要道",
            "tasks": ["scene_classification", "object_detection", "semantic_segmentation", "event_qa", "urban_structure"],
            "width": 1024,
            "height": 768,
            "clear_pair_id": "",
            "notes": "第一批完整数据示例：城市交通和道路结构。",
        },
        {
            "id": "urban_batch1_0002",
            "file_name": "urban_batch1_0002.jpg",
            "batch": "第一批",
            "capture_time": "2026-04-18T14:40:00+08:00",
            "flight_height_m": 90,
            "longitude": 104.4016,
            "latitude": 31.1198,
            "weather": "晴",
            "scene": "商业区",
            "tasks": ["scene_classification", "ocr", "object_detection", "event_qa"],
            "width": 1024,
            "height": 768,
            "clear_pair_id": "",
            "notes": "商业区 OCR、行人和车辆复核示例。",
        },
        {
            "id": "urban_batch2_0001",
            "file_name": "urban_batch2_0001.jpg",
            "batch": "第二批",
            "capture_time": "2026-05-03T17:18:00+08:00",
            "flight_height_m": 160,
            "longitude": 104.4219,
            "latitude": 31.1062,
            "weather": "雨",
            "scene": "工地",
            "tasks": ["object_detection", "event_qa", "restoration_pairing", "urban_structure"],
            "width": 1024,
            "height": 768,
            "clear_pair_id": "urban_batch2_0002",
            "notes": "第二批扩展数据示例：雨天工地和图像复原配对。",
        },
        {
            "id": "urban_batch2_0002",
            "file_name": "urban_batch2_0002.jpg",
            "batch": "第二批",
            "capture_time": "2026-05-03T17:20:00+08:00",
            "flight_height_m": 160,
            "longitude": 104.4219,
            "latitude": 31.1062,
            "weather": "晴",
            "scene": "工地",
            "tasks": ["restoration_pairing", "object_detection"],
            "width": 1024,
            "height": 768,
            "clear_pair_id": "",
            "notes": "同区域清晰图像，可作为复原 paired target。",
        },
        {
            "id": "eco_batch2_0001",
            "file_name": "eco_batch2_0001.jpg",
            "batch": "第二批",
            "capture_time": "2026-05-05T11:05:00+08:00",
            "flight_height_m": 210,
            "longitude": 104.3568,
            "latitude": 31.1817,
            "weather": "雾",
            "scene": "湿地",
            "tasks": ["scene_classification", "semantic_segmentation", "event_qa", "restoration_pairing"],
            "width": 1024,
            "height": 768,
            "clear_pair_id": "",
            "notes": "生态场景示例：湿地、水体、雾天复原。",
        },
        {
            "id": "eco_batch2_0002",
            "file_name": "eco_batch2_0002.jpg",
            "batch": "第二批",
            "capture_time": "2026-05-06T08:15:00+08:00",
            "flight_height_m": 180,
            "longitude": 104.3321,
            "latitude": 31.2024,
            "weather": "红外",
            "scene": "农田",
            "tasks": ["scene_classification", "semantic_segmentation", "event_qa", "restoration_pairing"],
            "width": 1024,
            "height": 768,
            "clear_pair_id": "",
            "notes": "生态与图像复原扩展类型示例：农田红外。",
        },
    ]

    scene_specs = {
        "urban_batch1_0001": ("Road Scene / Sunny", ("#b7d3df", "#d8ebf0", "#9dbb8f"), []),
        "urban_batch1_0002": ("Commercial Area / OCR", ("#c8d7da", "#e6edf0", "#b8c9a7"), []),
        "urban_batch2_0001": ("Construction Site / Rain", ("#9fb0b7", "#b8c7cd", "#9d9678"), ["rain"]),
        "urban_batch2_0002": ("Construction Site / Clear Pair", ("#bdd7df", "#e3eef1", "#b1a879"), []),
        "eco_batch2_0001": ("Wetland / Fog", ("#b8c9c7", "#d8e0df", "#83a778"), ["water", "fog"]),
        "eco_batch2_0002": ("Farmland / Infrared", ("#80758f", "#a499b0", "#c06a7b"), ["farm"]),
    }
    for item in records:
        title, palette, features = scene_specs[item["id"]]
        draw_scene(IMAGE_DIR / item["file_name"], title, palette, features)

    (DATA_DIR / "metadata.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    annotations_path = DATA_DIR / "annotations.json"
    if not annotations_path.exists():
        annotations_path.write_text("{}", encoding="utf-8")
    print(f"Seeded {len(records)} records at {DATA_DIR}")


if __name__ == "__main__":
    main()

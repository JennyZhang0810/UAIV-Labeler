from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


def patch_torchvision_nms() -> None:
    """Use a pure PyTorch NMS when torchvision C++ ops are broken."""
    try:
        import torch
        import torchvision
    except Exception:
        return

    def python_nms(boxes, scores, iou_threshold):
        if boxes.numel() == 0:
            return torch.empty((0,), dtype=torch.long, device=boxes.device)
        x1, y1, x2, y2 = boxes.unbind(1)
        areas = (x2 - x1).clamp(min=0) * (y2 - y1).clamp(min=0)
        order = scores.argsort(descending=True)
        keep = []
        while order.numel() > 0:
            i = order[0]
            keep.append(i)
            if order.numel() == 1:
                break
            rest = order[1:]
            xx1 = torch.maximum(x1[i], x1[rest])
            yy1 = torch.maximum(y1[i], y1[rest])
            xx2 = torch.minimum(x2[i], x2[rest])
            yy2 = torch.minimum(y2[i], y2[rest])
            inter = (xx2 - xx1).clamp(min=0) * (yy2 - yy1).clamp(min=0)
            union = areas[i] + areas[rest] - inter
            iou = inter / union.clamp(min=1e-7)
            order = rest[iou <= iou_threshold]
        return torch.stack(keep).to(dtype=torch.long) if keep else torch.empty((0,), dtype=torch.long, device=boxes.device)

    try:
        sample_boxes = torch.tensor([[0.0, 0.0, 10.0, 10.0]])
        sample_scores = torch.tensor([0.9])
        torchvision.ops.nms(sample_boxes, sample_scores, 0.5)
    except Exception:
        torchvision.ops.nms = python_nms
        try:
            import torchvision.extension

            torchvision.extension._assert_has_ops = lambda: None
        except Exception:
            pass


patch_torchvision_nms()

from ultralytics import YOLO


def main() -> int:
    if len(sys.argv) not in {3, 4}:
        print(json.dumps({"error": "Usage: yolo_infer.py <weights> <image_path> [model_id]"}), file=sys.stderr)
        return 2

    weights = sys.argv[1]
    image_path = sys.argv[2]
    model_id = sys.argv[3] if len(sys.argv) == 4 else "yolo"
    model = YOLO(weights)
    with Image.open(image_path) as image:
        width, height = image.size
    result = model.predict(image_path, imgsz=960, conf=0.25, verbose=False)[0]
    objects = []
    for box in result.boxes:
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        label = result.names[int(box.cls[0])]
        objects.append(
            {
                "label": label,
                "bbox": [
                    max(0, round(x1, 2)),
                    max(0, round(y1, 2)),
                    round(min(width, x2) - max(0, x1), 2),
                    round(min(height, y2) - max(0, y1), 2),
                ],
                "score": round(float(box.conf[0]), 4),
                "status": f"model:{model_id}",
            }
        )
    print(json.dumps({"objects": objects}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

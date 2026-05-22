from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image
from torchvision import transforms


def main() -> int:
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Usage: segearth_infer.py <repo> <image_path> <name_file>"}), file=sys.stderr)
        return 2

    repo = Path(sys.argv[1])
    image_path = Path(sys.argv[2])
    name_file = Path(sys.argv[3])
    os.chdir(repo)
    sys.path.insert(0, str(repo))

    from segearth_segmentor import SegEarthSegmentation

    if not torch.cuda.is_available():
        raise RuntimeError("SegEarth requires CUDA in this environment.")

    img = Image.open(image_path).convert("RGB")
    img_tensor = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize([0.48145466, 0.4578275, 0.40821073], [0.26862954, 0.26130258, 0.27577711]),
            transforms.Resize((448, 448)),
        ]
    )(img)
    img_tensor = img_tensor.unsqueeze(0).to("cuda")

    model = SegEarthSegmentation(
        clip_type="CLIP",
        vit_type="ViT-B/16",
        model_type="SegEarth",
        ignore_residual=True,
        feature_up=True,
        feature_up_cfg=dict(model_name="jbu_one", model_path="simfeatup_dev/weights/xclip_jbu_one_million_aid.ckpt"),
        cls_token_lambda=-0.3,
        name_path=str(name_file),
        prob_thd=0.1,
    )
    seg_pred = model.predict(img_tensor, data_samples=None).data.cpu().numpy().squeeze(0).astype(np.uint8)
    seg_pred = cv2.resize(seg_pred, img.size, interpolation=cv2.INTER_NEAREST)

    labels = [line.strip() for line in name_file.read_text(encoding="utf-8").splitlines() if line.strip()]
    segments = []
    for class_id, label in enumerate(labels):
        if class_id == 0:
            continue
        mask = (seg_pred == class_id).astype(np.uint8)
        if int(mask.sum()) < 64:
            continue
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours[:4]:
            area = float(cv2.contourArea(contour))
            if area < 80:
                continue
            epsilon = 0.01 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
            if len(approx) < 3:
                continue
            segments.append(
                {
                    "label": label,
                    "points": [[int(x), int(y)] for x, y in approx[:80]],
                    "score": None,
                    "status": "model:segearth_ov",
                    "area": round(area, 2),
                }
            )
    print(json.dumps({"segments": segments}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

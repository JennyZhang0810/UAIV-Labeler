from __future__ import annotations

from flask import Flask, jsonify, request


app = Flask(__name__)


@app.post("/predict")
def predict():
    payload = request.get_json(force=True)
    metadata = payload.get("metadata", {})
    width = int(metadata.get("width") or 1024)
    height = int(metadata.get("height") or 768)

    # Replace this demo response with your detector, segmenter, OCR model, VLM,
    # restoration model, or multi-task remote-sensing model.
    box_w = max(40, width // 6)
    box_h = max(40, height // 7)
    return jsonify(
        {
            "objects": [
                {
                    "label": "vehicle",
                    "bbox": [width // 3, height // 3, box_w, box_h],
                    "score": 0.88,
                    "status": "model:custom",
                    "origin": "model",
                }
            ],
            "segments": [],
            "ocr": [],
            "events": [
                {
                    "label": "demo_event",
                    "question": "Is there a visible target in the selected aerial image?",
                    "answer": "yes",
                    "score": 0.72,
                    "origin": "model",
                }
            ],
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9001, debug=False)


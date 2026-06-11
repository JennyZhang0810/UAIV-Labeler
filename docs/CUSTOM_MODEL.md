# Custom Model Backend

UAIV-Labeler can call external model services through HTTP. This is the recommended way to connect large GPU models without making the Web app environment heavy.

## Start the Example Backend

```bash
pip install flask
python examples/custom_model_backend.py
```

The service listens at:

```text
http://127.0.0.1:9001/predict
```

## Connect in the UI

1. Open the Workbench.
2. Select an image.
3. Find **Custom Model**.
4. Set task type, for example `object_detection` or `multi_task`.
5. Set service URL to `http://127.0.0.1:9001/predict`.
6. Click **Run Custom Model**.

## Request Payload

The platform sends:

```json
{
  "model_name": "my_detector_v1",
  "task": "object_detection",
  "image_id": "sample_bulldozer1",
  "image_path": "/absolute/path/to/image.png",
  "metadata": {
    "id": "sample_bulldozer1",
    "width": 1920,
    "height": 1080
  },
  "annotation": {
    "objects": [],
    "segments": []
  }
}
```

## Response Format

Return any subset of these fields:

```json
{
  "objects": [
    {"label": "vehicle", "bbox": [120, 80, 60, 40], "score": 0.91, "origin": "model"}
  ],
  "segments": [],
  "ocr": [],
  "events": []
}
```

Bounding boxes use original image pixel coordinates:

```text
[x, y, width, height]
```

## Interactive SAM-style Segmentation

For SAM/SAM2/SAM3, the recommended deployment is a separate GPU HTTP service.
Enable the `sam3` entry in `config/model_backends.json` and point it to your
service URL, for example:

```json
{
  "sam3": {
    "enabled": true,
    "mode": "remote",
    "name": "Interactive Segmentation · SAM",
    "task": "instance_segmentation",
    "provider": "SAM Backend",
    "url": "http://127.0.0.1:9002/predict"
  }
}
```

The Workbench sends prompt points to `/api/images/<image_id>/segment-prompt`,
and the platform forwards this payload to the SAM service:

```json
{
  "model_name": "Interactive Segmentation · SAM",
  "task": "instance_segmentation",
  "image_id": "sample_bulldozer1",
  "image_path": "/absolute/path/to/image.png",
  "metadata": {},
  "annotation": {},
  "prompts": {
    "label": "water",
    "points": [{"x": 320, "y": 240, "label": 1}]
  }
}
```

The service should return segments in original image pixel coordinates:

```json
{
  "segments": [
    {
      "label": "water",
      "points": [[300, 220], [360, 220], [360, 280], [300, 280]],
      "score": 0.91,
      "status": "model:sam"
    }
  ]
}
```

A minimal interface demo is available at:

```bash
python examples/sam_prompt_backend.py
```

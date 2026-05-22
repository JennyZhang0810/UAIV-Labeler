# Gemini Visual Prompts for UAIV-Labeler

Use these prompts to generate polished GitHub, project-page, and paper visuals for **UAIV-Labeler**. Recommended output style: clean, bright, professional B2B SaaS, low-altitude remote-sensing, white background with cyan/green accents.

General constraints for all images:

- Use the text `UAIV-Labeler` exactly.
- Avoid fake company logos other than the plain `UAIV` mark.
- Avoid unreadable tiny text.
- Prefer clean UI panels, realistic drone/aerial imagery, maps, metadata chips, bounding boxes, segmentation masks, and QA review panels.
- Use a bright white or very light gray interface, not dark cyberpunk.
- Do not include any private IP address, server path, or personal email.
- If text is likely to be distorted, leave text areas as clean blank UI blocks and let us add text later.

## 1. GitHub README Hero Banner

Purpose: replace or supplement `assets/uaiv_banner.svg`.

Recommended size: `1600 x 480`

Prompt:

```text
Create a professional GitHub README hero banner for an open-source project named "UAIV-Labeler".

Visual concept:
A clean, bright, high-end B2B SaaS interface for low-altitude UAV remote-sensing data annotation. The left side shows a realistic aerial drone image of an urban-rural edge scene, overlaid with bounding boxes, segmentation masks, and small metadata chips such as altitude, weather, GPS, and batch. The right side shows a refined web dashboard UI with panels for Dataset Indexing, Model Pre-annotation, Human Review, QA Review, and Benchmark Export.

Style:
Modern white background, subtle light-gray grid, cyan and green accent colors, crisp typography, professional research software aesthetic, minimal and trustworthy. Use thin 2px line icons, soft shadows, 8px rounded panels, no cartoon style, no dark cyberpunk.

Text to include:
UAIV-Labeler
Metadata-first UAV Remote-Sensing Labeling Platform
Folder Indexing · Model Pre-annotation · QA Review · Benchmark Export

Composition:
Wide banner, strong left-to-right flow, no clutter, plenty of whitespace, visually impressive for GitHub README.
```

## 2. GitHub Social Preview Card

Purpose: GitHub repository social preview image.

Recommended size: `1280 x 640`

Prompt:

```text
Design a GitHub social preview image for "UAIV-Labeler", an open-source annotation and labeling platform for UAV remote-sensing datasets.

The image should feature:
- A clean white SaaS dashboard mockup.
- A central aerial image canvas with bounding boxes and semi-transparent segmentation masks.
- A left sidebar with dataset folders and task modes.
- A right metadata panel showing altitude, longitude, latitude, weather, batch, and review status.
- Small floating chips for COCO, VOC, JSON, QA export.

Main text:
UAIV-Labeler
Open-source UAV Remote-Sensing Annotation Platform

Style:
Bright, premium, academic but product-ready, cyan (#00A7C8) and green (#12B76A) accents, subtle shadows, crisp UI, no dark background, no stock-photo feel.
```

## 3. Workflow Diagram: Data to Benchmark

Purpose: replace or supplement `assets/workflow.svg`; can be used in README and paper.

Recommended size: `1800 x 900`

Prompt:

```text
Create a clean workflow diagram for "UAIV-Labeler" showing a complete low-altitude remote-sensing data construction pipeline.

Pipeline stages:
1. Server Folder Indexing
2. Metadata Extraction: time, altitude, GPS, weather, batch
3. Model Pre-annotation: YOLO, SegEarth, SAM, custom model
4. Human Review: bbox, mask, OCR, event QA, restoration severity
5. QA Review and Result Inspection
6. Benchmark Export: JSON, COCO, VOC, QA JSONL

Design:
Horizontal pipeline with six connected cards. Each card has a small icon and a concise label. Use a light map/grid background, cyan/green accents, white cards, thin connecting arrows, and a professional research software style.

Add a small loop arrow from Human Review back to Model Pre-annotation labeled "active learning / model improvement" if there is enough space.

No dark theme, no excessive decoration, no cartoon style.
```

## 4. Workbench Screenshot-Style Mockup

Purpose: README visual showing what users can do inside the platform.

Recommended size: `1600 x 1000`

Prompt:

```text
Generate a realistic product mockup screenshot for "UAIV-Labeler" workbench.

UI layout:
- Left vertical sidebar with navigation: Home, Workbench, QA Review, Deployment, Guide.
- Left data panel showing server folder import, task domain selection, filters, image list.
- Center large annotation canvas with a UAV aerial image, several bounding boxes, one segmentation mask, and small label tags such as vehicle, ship, construction_machine.
- Top compact toolbar with Previous, Next, Draw Box, Undo, Clear, Save.
- Right inspector panel showing Metadata: file name, batch, capture time, altitude, longitude, latitude, weather, scene, tasks.
- Lower area showing model blocks: s2det-yolov8s, SegEarth, SAM/custom backend.

Style:
Bright white interface, clean Label-Studio-inspired professional layout, dense but readable, cyan and green accents, subtle borders, 8px rounded corners, high contrast annotation overlays.

Text:
Use "UAIV-Labeler" in the top-left brand.
Avoid too much tiny unreadable text.
```

## 5. QA Review Screenshot-Style Mockup

Purpose: demonstrate TSV QA review and XLSX result review.

Recommended size: `1600 x 1000`

Prompt:

```text
Create a polished UI mockup screenshot for the "UAIV-Labeler" QA Review page.

UI layout:
- Left panel: Server QA file browser with sample_qa.tsv selected, QA image directory input, local upload section.
- Main center panel: QA question review with an aerial image containing a red bounding box, a question, four options A/B/C/D, correct answer selection, save + next button.
- Lower or right panel: Model result inspection showing model answer, ground-truth answer, correct/wrong status, and reasoning trace.

Visual style:
Clean bright SaaS UI, white panels, soft gray background, cyan/green accents, professional academic benchmark tool aesthetic. Make it look practical, not decorative.

Include visible labels:
QA Review
Question
Options
Ground Truth
Model Answer
Reasoning Trace
```

## 6. Model Integration Illustration

Purpose: explain custom model backend / YOLO / SAM / SegEarth.

Recommended size: `1600 x 900`

Prompt:

```text
Create an architecture illustration for "UAIV-Labeler" model integration.

Scene:
On the left, the UAIV-Labeler web app with an image canvas and metadata panel. In the middle, an HTTP API connector. On the right, separate model services: YOLO detector, SegEarth segmenter, SAM interactive segmentation, OCR/VLM model, Custom HTTP Backend.

Show arrows:
Image + Metadata -> Model Backend -> Predictions -> Human Review -> Export.

Style:
Modern technical diagram, white background, cyan/green accents, thin lines, rounded rectangles, clean icons, high readability.

Do not use code-heavy text. Make it suitable for README and presentation slides.
```

## 7. Dataset Card / Metadata-First Illustration

Purpose: emphasize the platform's unique Metadata-first value.

Recommended size: `1400 x 900`

Prompt:

```text
Design an illustration explaining the Metadata-first concept of "UAIV-Labeler".

Visual elements:
- A stack of UAV aerial images.
- Metadata chips connected to each image: capture time, altitude, GPS, weather, batch, scene, task type.
- A filtering dashboard showing filters by scene, weather, altitude range, batch, and task.
- A small map panel with coordinate points.

Style:
Clean research data management aesthetic, white background, subtle map grid, cyan and green accents, elegant cards and chips, no dark theme.

Text:
Metadata-first UAV Dataset Construction
Altitude · GPS · Weather · Batch · Scene · Task
```

## 8. Paper Figure: Platform Overview

Purpose: use in a paper or supplementary material.

Recommended size: `2200 x 1200`

Prompt:

```text
Create a publication-quality system overview figure for a paper describing "UAIV-Labeler".

Figure structure:
Panel A: Data sources - UAV images from urban, traffic, water, farmland, forest, wetland scenes under multiple weather and altitude conditions.
Panel B: Platform modules - Metadata Manager, Model Pre-annotation, Manual Review, QA Review, Export Manager.
Panel C: Supported tasks - detection, segmentation, OCR, event QA, restoration severity, benchmark evaluation.
Panel D: Outputs - JSON, COCO, VOC, QA JSONL, dataset statistics, reviewed annotations.

Style:
Scientific figure, clean white background, vector-like diagrams, consistent icons, cyan and green accents, clear panel labels A/B/C/D, suitable for journal paper.

Avoid tiny text and avoid decorative clutter.
```

## 9. Short Demo GIF Key Frames

Purpose: generate a storyboard image if you cannot record the real browser.

Recommended size: `1600 x 900`

Prompt:

```text
Create a four-panel storyboard for a 15-second demo of "UAIV-Labeler".

Panel 1: Import sample_data/images through server folder indexing.
Panel 2: Select a UAV image and display extracted Metadata: altitude, GPS, weather, batch.
Panel 3: Draw a bounding box on the image and assign the label "vehicle".
Panel 4: Press Ctrl+S, show saved confirmation, and automatically move to the next image.

Style:
Bright professional UI, clean SaaS interface, annotation canvas, subtle motion arrows between panels, cyan/green accents.

Text:
Import -> Review Metadata -> Draw Label -> Save & Next
```

## 10. Project Page Hero Image

Purpose: if you later create a GitHub Pages project page.

Recommended size: `1920 x 1080`

Prompt:

```text
Create a project page hero image for "UAIV-Labeler".

Scene:
A full-width bright hero visual showing a low-altitude UAV data labeling platform. Background includes a realistic aerial map-like scene, overlaid with clean annotation UI elements: bounding boxes, segmentation masks, metadata chips, QA panel, and export badges.

Text:
UAIV-Labeler
Open-source labeling platform for low-altitude UAV remote-sensing datasets

Style:
Premium open-source research software, white and light-gray UI, cyan and green accents, high-resolution, polished, trustworthy, not cartoon, not dark cyberpunk.
```

## Recommended Replacement Mapping

After generating images:

- Replace `assets/uaiv_banner.svg` with `assets/uaiv_banner.png` if the generated banner is better.
- Replace or keep `assets/workflow.svg` with `assets/workflow.png`.
- Replace `assets/sample_preview.gif` with a real recorded browser GIF if possible.
- Add `assets/social_preview.png` and set it as the GitHub repository social preview image.
- Add paper figures under `assets/paper/` or `docs/figures/`.


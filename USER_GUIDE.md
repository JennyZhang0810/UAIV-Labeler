# 遥感半自动化标注平台使用说明

## 1. 平台用途

本平台用于无人机低空遥感图像的半自动化标注，面向城市大模型、生态大模型和图像复原任务。平台重点不是单一画框工具，而是把 Metadata 管理、多任务标注、模型预标注、自定义模型接入和 Benchmark 导出整合到同一套数据生产流程中。核心流程是：

1. 导入图像与 Metadata。
2. 使用模型进行预标注。
3. 人工检查、修正和补充标注。
4. 保存复核结果。
5. 导出 JSON、COCO、VOC、QA 等格式，用于训练、Benchmark 或论文统计。

平台默认在仓库根目录运行：

```text
UAIV-Labeler/
```

公开发布或迁移到其他服务器时，不建议在代码里修改绝对路径。请优先使用环境变量：

```bash
export UAIV_BROWSE_ROOTS="/datasets:/mnt/uaiv:/your/data/root"
export UAIV_DEFAULT_BROWSE_PATH="/datasets"
export UAIV_QA_ROOT="/datasets/qa"
```

Docker 试用或公开仓库默认示例路径：

```text
sample_data/images
sample_data/qa/sample_qa.tsv
```

## 2. 开发者信息

开发者：Jiening Zhang

主页：

```text
https://github.com/JennyZhang0810
```

公开主页显示，开发者为 UESTC 计算机方向博士生，研究兴趣包括 Computer Vision、Remote Sensing Generation、Data-centric AI、Low-shot Detection，以及低空多模态遥感数据集相关工作。

相关关键词：

- Remote Sensing
- Data-centric AI
- Low-shot Detection
- UAV Dataset
- Benchmark

## 3. 数据与文件位置

### 3.1 Metadata

Metadata 保存在：

```text
data/metadata.json
```

每条图像记录包含图像 ID、文件名、服务器路径、批次、天气、场景、任务、宽高、经纬度、飞行高度等字段。

### 3.2 标注结果

点击“保存复核”后，当前图像标注写入：

```text
data/annotations.json
```

标注包括目标框、分割区域、OCR、事件 QA、图像复原配对、城市结构理解、复核状态等。

### 3.3 导出结果

服务器导出文件位于：

```text
exports/
```

主要文件：

```text
exports/annotations_full.json
exports/annotations_coco.json
exports/qa_annotations.jsonl
exports/voc/*.xml
```

本地下载导出会由浏览器下载到当前电脑。VOC 是目录格式，下载时会自动打包为 `voc.zip`。

## 4. 数据导入

### 3.1 服务器目录导入

适合数据已经在服务器或挂载盘上。公开版可先使用内置示例：

```text
sample_data/images
/datasets/your_images
```

操作步骤：

1. 在左侧“数据导入”选择“服务器目录”。
2. 输入服务器路径，或点击“浏览”选择目录。
3. 设置批量默认 Metadata，例如批次、飞行高度、经纬度、场景、天气、默认任务。
4. 勾选“递归扫描子目录”后会读取子目录中的图像。
5. 点击“开始导入”或“使用当前目录”。

服务器目录导入不会复制图片，只记录图片的真实服务器路径。导入完成后，页面右上角会弹出“导入完成”提示，并在状态栏显示扫描数量、导入数量和跳过数量。

### 3.2 电脑本地导入

适合从当前电脑的 C/D/F 盘选择文件夹。

浏览器无法让服务器直接读取你电脑硬盘，因此本地导入会把图片上传并复制到服务器：

```text
data/client_uploads/
```

操作步骤：

1. 在左侧“数据导入”选择“电脑本地”。
2. 选择本地文件夹。
3. 设置批量默认 Metadata。
4. 点击“开始导入”。

本地导入完成后同样会弹出成功提示。若没有提示，说明浏览器仍在上传或请求失败，请查看右上角错误提示。

## 5. 图像列表与筛选

左下角“图像列表”显示当前可标注图像。每条记录包含：

- 图像 ID 与场景。
- 数据来源：`实际数据` 或 `示例图`。
- 批次、天气、飞行高度。
- 默认任务。
- 复核状态。

筛选条件包括：

- 任务。
- 场景。
- 天气。
- 批次。
- 数据来源。
- 飞行高度范围。

筛选只作用于已经导入/已经建立索引的图像，用来把当前标注任务缩小到某一批次、某一类天气或某一任务子集；它不会重新读取目录，也不会修改原始数据。

当前平台用窗口化方式显示图像列表，每页显示一部分图像，适合数千张图像的浏览。

## 6. Metadata 查看

右侧 Metadata 面板显示当前图像的完整信息，包括：

- 图像 ID。
- 文件名。
- 本地/服务器路径。
- 批次。
- 拍摄时间。
- 飞行高度。
- 经度、纬度。
- 天气。
- 场景。
- 任务。
- 宽度、高度。
- 相对路径、来源目录。
- 数据来源。

如果字段显示“未提取/未填写”，说明图像本身没有可读 EXIF/GPS，或者导入时没有填写默认值。

## 7. 人工目标框标注

### 6.1 人工画框

用于按目标真实位置画框。

操作步骤：

1. 在工具栏输入目标类别，例如 `ship`、`vehicle`、`person`、`excavator`。
2. 点击“人工画框”。
3. 在图像上按住鼠标并拖拽。
4. 松开鼠标后生成目标框。
5. 右侧“目标框”列表可继续修改类别和坐标。
6. 点击“保存复核”写入 `data/annotations.json`。

### 6.2 添加目标框

“添加目标框”不是点选位置工具，而是快速新增一个可编辑默认框。

逻辑：

- 在当前图像中心添加矩形框。
- 宽度约为原图宽度的 18%。
- 高度约为原图高度的 14%。
- 最小宽高为 32 像素。
- 类别取工具栏目标标签输入框；为空则为 `object`。
- 坐标保存为原图坐标。

适用场景：先快速放一个框，再在右侧手动调整坐标。

## 8. 模型预标注

模型中心位于图像工作区下方。

当前接入方式：

- s2det-yolov8s：目标检测预标注。
- SegEarth-OV：语义分割。
- SAM3：环境已发现，但 runner 当前未完整启用。
- Mock backend：流程演示用。

注意：

s2det-yolov8s 比原通用模型更贴近遥感检测流程，但不同数据集的视角、高度、天气和类别分布仍可能不同。后续可使用平台复核数据继续训练 UAIV 专用模型。

模型运行后会弹窗提示：

- 开始运行。
- 运行完成。
- 生成了多少目标框、分割区域、OCR、事件 QA。
- 如果没有有效结果，也会明确提示。
- 运行失败时会显示错误信息。

## 9. QA 工具

顶部点击“QA 工具”可以进入城市大模型 QA 审阅模块，当前已嵌入两个原独立工具：

- QA 题目核查：读取 `.tsv`，显示图像、题目、A/B/C/D 选项和正确答案，可修改后保存为 clean TSV。
- 评测结果复盘：读取模型评测结果 `.xlsx`，显示图像、题目、正确答案、模型答案、命中结果和推理过程。它用于分析模型为什么答对/答错，不用于修改 QA 题库。

使用方式：

1. 将 `.tsv` 或 `.xlsx` 放在 `UAIV_QA_ROOT` 指向的目录或其子目录；默认示例是 `sample_data/qa`。
2. 或者在“电脑本地 QA 文件”中选择本机 `.tsv` / `.xlsx` 上传，平台会复制到服务器后使用。
3. 打开平台顶部“QA 工具”。
4. 在“文件选择”中浏览目录，点击 `.tsv` 或 `.xlsx` 后，直接点击服务器读取区的“使用选中 TSV 审题”或“使用选中 XLSX 结果”。
5. “高级：手动指定审阅文件”通常不需要展开，仅用于文件不在列表中或需要粘贴完整路径时。
6. TSV 审题保存后会写入：

```text
sample_data/qa/qa_review_outputs/<原文件名>.clean.tsv
```

注意：QA 工具现在已经合并进主平台，不需要再单独启动 `qa_review_server.py` 或 `result_review_server.py`。

如果 TSV/XLSX 里的 `image_path` 在当前服务器上不可读，可以填写“QA 图像服务器目录”，或者上传“电脑本地 QA 图像文件夹”。平台会优先读取原路径；原路径不可读时，会按文件名在图像目录中匹配。上传成功后会弹出提示，并自动把服务器端图像目录填入“QA 图像服务器目录”。

平台内置一个最小 QA 示例：

```text
sample_data/qa/sample_qa.tsv
```

它与 `sample_data/images` 下的示例图像对应，可用于公开仓库快速试用。

关于公开部署：

- 如果部署在公网服务器上，可以发给外部用户的入口是：`http://<server-ip>:7860` 或你的域名。
- `127.0.0.1` 只代表“正在运行浏览器或服务的那台机器自己”，不能作为公开链接发给别人。别人打开 `127.0.0.1` 时访问的是他自己电脑，不是我们的服务器。
- `服务器目录` 指的是当前平台所在服务器的目录，不是访问者自己电脑或另一台服务器的目录。
- 访问者可以上传自己的 TSV/XLSX 文件，但如果文件里的 `image_path` 指向访问者本机或另一台服务器，当前平台无法直接读取那些图片。
- 如果访问者要浏览自己服务器上的大规模图像，推荐把平台部署到他的服务器上，或把数据挂载/同步到当前平台服务器的允许目录下。

### 9.1 自定义模型接口

如果你有自己的目标检测、语义分割、实例分割、OCR、事件理解或多任务模型，可以把模型启动为 HTTP 服务，然后在平台“模型中心”的“自定义模型接口”中填写：

- 模型名称：例如 `my_detector_v1`。
- 任务类型：例如 `object_detection`、`semantic_segmentation`、`ocr`、`multi_task`。
- 接口 URL：例如 `http://<model-server-ip>:9001/predict`。如果模型服务和平台部署在同一台服务器上，也可以使用 `http://127.0.0.1:9001/predict`，但这只是平台服务器内部访问模型服务的地址，不是发给外部用户的平台公网地址。

点击“运行自定义模型”后，平台会向你的模型服务发送 `POST` JSON 请求。

请求示例：

```json
{
  "model_name": "my_detector_v1",
  "task": "object_detection",
  "image_id": "test_00003",
  "image_path": "/datasets/images/00003.jpg",
  "metadata": {
    "id": "test_00003",
    "file_name": "00003.jpg",
    "width": 800,
    "height": 800
  },
  "annotation": {
    "image_id": "test_00003",
    "objects": [],
    "segments": []
  }
}
```

你的模型服务应返回 JSON。可以只返回自己支持的字段。

目标检测返回示例：

```json
{
  "objects": [
    {
      "label": "vehicle",
      "bbox": [120, 80, 60, 40],
      "score": 0.91,
      "status": "model:custom"
    }
  ]
}
```

语义/实例分割返回示例：

```json
{
  "segments": [
    {
      "label": "water",
      "points": [[10, 10], [120, 15], [100, 90], [15, 80]],
      "score": 0.88,
      "status": "model:custom"
    }
  ]
}
```

OCR 返回示例：

```json
{
  "ocr": [
    {
      "text": "示例文字",
      "bbox": [200, 120, 100, 30],
      "score": 0.86,
      "status": "model:custom"
    }
  ]
}
```

事件 QA 返回示例：

```json
{
  "events": [
    {
      "label": "交通拥堵",
      "question": "图像中是否存在交通拥堵？",
      "answer": "存在疑似交通拥堵，需要人工复核。",
      "score": 0.76,
      "status": "model:custom"
    }
  ]
}
```

平台支持接收并写回这些字段：

- `objects`
- `segments`
- `ocr`
- `events`
- `scene`
- `environment`
- `restoration`
- `urban_structure`

最小 Flask 模型服务示例：

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.post("/predict")
def predict():
    payload = request.get_json()
    image_path = payload["image_path"]
    # 在这里调用自己的模型，读取 image_path 并生成结果
    return jsonify({
        "objects": [
            {
                "label": "vehicle",
                "bbox": [120, 80, 60, 40],
                "score": 0.91,
                "status": "model:custom"
            }
        ]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9001)
```

### 9.2 工业化闭环配置

平台已预留几项面向多人协作和数据闭环的后端能力：

- 任务状态机：`unlabeled -> predicted -> labeled -> verified -> rejected`。旧状态 `pending` 会自动映射为 `predicted`，`reviewed` 会自动映射为 `verified`。
- 存储映射层：配置文件为 `config/storage_mappings.json`。如果数据从 `/data5` 迁移到 `/data6`，可以通过修改映射关系来解析旧 Metadata 中的路径，避免批量重写 `metadata.json`。
- 增量训练钩子：配置文件为 `config/training_hooks.json`。默认关闭。开启后，每达到设定的核验数量阈值，可异步通知外部训练或难例挖掘服务。
- 历史快照清理：默认每张图只保留最近 10 个历史快照，可通过环境变量 `UAIV_HISTORY_KEEP` 调整。
- 标注 schema 校验：保存时会检查 `objects / segments / ocr / events` 等字段结构，拦截明显不合规的 JSON。
- 大图切片预留接口：`/api/tiles/<image_id>/<z>/<x>/<y>.jpg`。当前为 PIL fallback，后续可替换为 `libvips/GDAL + Leaflet/OpenSeadragon` 的生产级瓦片服务。
- 空间范围筛选：工作台筛选区支持按最小/最大经度、最小/最大纬度过滤图像。后续接入地图框选时，可直接复用这些查询参数：`min_longitude`、`max_longitude`、`min_latitude`、`max_latitude`。
- 标注时长统计：`/api/stats` 中返回 `lead_time` 字段，根据历史快照估算“模型预标注 -> 人工保存”的间隔，并按模型来源汇总平均耗时。

### 7.2 SAM3 为什么暂未直接接入？

平台已经发现了 SAM3 环境和权重，但暂未启用 runner，原因是：

- SAM3 更适合点、框或文本提示驱动的交互式分割。
- 直接做整图自动分割通常较慢，且结果不一定符合当前标注任务。
- 需要额外设计提示词、点击点、框选区域等交互。

建议后续将 SAM3 做成长驻 GPU 服务，通过“自定义模型接口”接入平台。

### 7.3 远程目标检测服务和 Mock 是什么？

- “预留示例 · 远程目标检测服务”：配置文件中的占位示例，默认未启用。真正使用自己的模型时，建议直接填写页面下方“自定义模型接口”。
- “演示用 · 内置 Mock 预标注”：没有模型环境时演示平台流程，会生成随机示例标注，不代表真实模型效果，不建议用于生产标注。

## 9. 标注复核

右侧“标注复核”面板可修改：

- 复核状态：待复核、已复核、需重标。
- 场景。
- 环境状态。
- 事件类型。
- QA 问题。
- QA 答案。
- 图像复原退化类型。
- 清晰配对 ID。
- 城市结构理解文本。

建议流程：

1. 先查看模型预标注或空标注。
2. 修改目标框、场景、事件、QA 等。
3. 设置复核状态。
4. 点击“保存复核”。

## 10. 保存与切图

点击“保存复核”后，当前图像标注写入：

```text
data/annotations.json
```

快捷键：

- `Ctrl+S` / `Command+S`：保存当前图像，并自动切换到下一张。
- `ArrowRight`：下一张。
- `ArrowLeft`：上一张。
- `Ctrl+Z` / `Command+Z`：撤销上一步前端标注操作。

## 11. 清除、撤销与重新预标注

- 撤销上一步：恢复当前图像最近一次前端标注修改。
- 清除所有：清空当前图像的目标框、分割、OCR、事件、复原和结构理解字段。保存后生效。
- 重新预标注：调用内置 mock 预标注接口，不是 YOLO/SegEarth 真实模型。

## 12. 导出

顶部导出区分为两类。

### 11.1 服务器导出

将文件生成到服务器：

```text
exports/
```

适合服务器训练、批处理、长期归档。

### 11.2 本地下载

由浏览器下载到当前电脑。

适合把标注结果拿到本地查看、发送或备份。

VOC 是目录格式，本地下载时会自动打包成 `voc.zip`。

## 13. 格式说明

### JSON

包含完整 Metadata 与所有标注，适合平台内部复用和科研归档。

### COCO

包含 images、annotations、categories，适合目标检测训练和评测。

### VOC

每张图像一个 XML 文件，适合传统目标检测流程。

### QA

JSONL 格式，每行一条事件理解/问答样本，适合 Benchmark 或大模型评测。

## 14. 常见问题

### 为什么模型效果不好？

当前 YOLO 是 COCO 通用模型，不是低空遥感专用模型。建议后续用本平台复核出的数据训练自有 YOLO/Segmentation/OCR/VLM 模型，再接回模型中心。

### 为什么有些图像没有经纬度或飞行高度？

平台会尝试读取 EXIF/GPS。如果图像没有这些信息，或者导入时没有填写默认 Metadata，就会显示“未提取/未填写”。

### 为什么有些旧图一打开有框？

早期版本曾自动生成 mock 预标注。已经写入 `annotations.json` 的旧框不会自动删除，避免误删复核数据。可使用“清除所有”后保存。

### 服务器目录导入和本地导入有什么区别？

服务器目录导入只记录已有服务器路径，不复制图片。本地导入会把当前电脑的图片上传并复制到服务器。

### 标注框坐标是显示坐标还是原图坐标？

保存的是原图坐标。即使前端为了流畅显示缩放了图像，导出的 bbox 仍按原始图像尺寸保存。

## 15. 推荐工作流

1. 导入一批图像，填写批次、天气、场景、任务等默认 Metadata。
2. 用筛选功能选择一个任务子集。
3. 运行对应模型做预标注。
4. 对每张图人工复核目标框、场景、事件和 QA。
5. 用 `Ctrl+S` 保存并自动进入下一张。
6. 定期刷新统计查看进度。
7. 阶段性导出 JSON/COCO/VOC/QA。
8. 用导出的数据训练更适合低空遥感的模型。
9. 将新模型接回平台，继续提升预标注质量。

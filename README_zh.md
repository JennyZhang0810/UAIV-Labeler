# UAIV-Labeler 中文说明

![UAIV-Labeler](assets/fig1.png)

**UAIV-Labeler** 是一个面向低空无人机遥感数据集的轻量级半自动标注平台。它不是通用画框工具，而是围绕低空遥感数据生产中的 Metadata、模型预标注、人工复核、QA 核查和 Benchmark 导出构建的一套完整工作流。

## 链接

- 在线演示：http://121.48.163.156:7860
- GitHub 仓库：https://github.com/JennyZhang0810/UAIV-Labeler
- UAIV 数据集项目页：https://jennyzhang0810.github.io/LowAltitude-Multimodal-Dataset/

## 三种使用方式

UAIV-Labeler 把“离线本机试用”“公网在线演示”“团队服务器部署”明确区分，避免不同场景混在一起：

| 方式 | 适用场景 | 数据读取 | 模型能力 |
| --- | --- | --- | --- |
| **离线 Demo** | 本机体验、课堂展示、无公网环境预览 | 默认读取仓库内 `sample_data/`，不对外暴露服务 | 支持人工标注和内置 Mock 预标注，不内置大型模型权重 |
| **在线演示** | 快速查看平台界面和流程 | 访问 `http://121.48.163.156:7860`，只能读取该演示服务器上的数据 | 使用演示服务器已配置的后端 |
| **服务器部署** | 实验室/团队长期标注 | 部署到自己的服务器或挂载数据盘后，服务器目录才能浏览自己的数据 | 可接入本机 GPU 模型、远程 HTTP 模型服务或自定义后端 |

当前离线 Demo 是轻量试用版本，不等同于后续计划中的“完整离线包”。完整离线包会进一步考虑模型环境、权重、依赖和内网部署。

## 核心特点

- **面向低空遥感**：批次、飞行高度、经纬度、天气、场景、任务类型等 Metadata 直接进入标注流程。
- **大数据友好**：服务器目录导入只建立索引，不复制大规模原始图像。
- **多任务统一**：支持目标检测、分割、OCR、事件 QA、图像复原配对、城市结构理解等任务。
- **半自动标注**：支持 YOLO、SegEarth、SAM 类服务、OCR、VLM 或自定义 HTTP 模型后端。
- **QA 与 Benchmark 友好**：支持 TSV QA 题目核查、XLSX 评测结果复盘，以及 JSON、COCO、VOC、QA JSONL 导出。
- **开箱即试**：仓库内置 `sample_data/`，克隆后即可试用。
- **离线友好入口**：提供本机离线 Demo，可在不公开服务器的情况下体验人工标注和数据流程。

## 快速开始

### 离线 Demo

```bash
git clone https://github.com/JennyZhang0810/UAIV-Labeler.git
cd UAIV-Labeler
pip install -r requirements.txt
bash offline_demo/run_offline.sh
```

浏览器打开：

```text
http://127.0.0.1:7860
```

内置示例路径：

```text
sample_data/images
sample_data/qa/sample_qa.tsv
```

Windows 用户可运行：

```text
offline_demo\run_offline.bat
```

离线 Demo 只绑定 `127.0.0.1`，默认只在当前电脑可见。详细说明见 [离线 Demo 文档](docs/OFFLINE_DEMO.md)。

### 在线演示

直接打开：

```text
http://121.48.163.156:7860
```

在线演示用于查看平台流程。它不能直接浏览访问者电脑的 C/D/F 盘，也不能读取其他团队服务器上的私有数据盘。

### 服务器部署

如果要给实验室或团队长期使用，在自己的服务器上启动：

```bash
URBAN_ANNOTATION_HOST=0.0.0.0 URBAN_ANNOTATION_PORT=7860 bash scripts/start_public.sh
```

访问地址通常是：

```text
http://<服务器IP>:7860
```

注意：`127.0.0.1` 只代表当前运行服务的机器本身，不能作为公开链接发给别人。

## Docker 启动

```bash
docker compose up --build
```

浏览器打开：

```text
http://localhost:7860
```

如果要读取自己的大规模数据集，可以在 `docker-compose.yml` 中把数据目录挂载到 `/datasets`，然后在平台里使用服务器目录导入 `/datasets/...`。

## 自定义模型接入

平台可以调用外部模型服务。你可以先运行最小示例：

```bash
pip install flask
python examples/custom_model_backend.py
```

然后在平台的自定义模型区域填写：

```text
http://127.0.0.1:9001/predict
```

模型服务可以返回目标框、分割结果、OCR、事件、QA 等字段，平台会把它们作为预标注结果交给人工复核。

## 界面与流程预览

### 数据构建流程

![UAIV workflow](assets/fig3.png)

### 标注工作台

![UAIV-Labeler workbench](assets/fig4.png)

### QA 核查

![UAIV-Labeler QA review](assets/fig5.png)

### 模型接入

![UAIV-Labeler model integration](assets/fig6.png)

### Metadata-first 数据管理

![UAIV-Labeler metadata-first dataset management](assets/fig7.png)

<details>
<summary><b>更多视觉材料</b></summary>

![UAIV-Labeler paper overview](assets/fig8.png)

![UAIV-Labeler demo storyboard](assets/fig9.png)

![UAIV-Labeler project page hero](assets/fig10.png)

</details>

## 相关数据集

UAIV 低空多模态数据集：

- Project: https://jennyzhang0810.github.io/LowAltitude-Multimodal-Dataset/
- GitHub: https://github.com/JennyZhang0810/LowAltitude-Multimodal-Dataset/tree/main
- ScienceDB: https://www.scidb.cn/detail?dataSetId=203705443be44f7882bb9ddfd7d401da

## 时间线

- **2024-2025**：UAIV 数据集建设与第一版公开发布。
- **2026.05**：UAIV-Labeler 初始公开版本，支持 Metadata-first 图像索引、人工框标注、QA 核查、格式导出、Docker 启动、示例数据和轻量离线 Demo。
- **后续计划**：上线完整离线包，增强分割交互，补充更多模型后端示例，并持续扩展低空遥感任务模板。

## 后续计划

- **完整离线包**：提供可在内网、无互联网环境、安全专网中部署的自包含版本；当前仓库已提供轻量离线 Demo。
- **任务模板扩展**：增加火点/烟雾、垃圾堆放、河湖污染、挖机作业、交通拥堵、违章停车、植被受损、农田/湿地监测、图像复原退化程度等任务模板。
- **交互式分割**：接入 SAM/SAM2/SAM3 类点击/框提示分割服务。
- **大图支持**：增强大幅无人机拼接图、GeoTIFF 类图像的瓦片化浏览。
- **Dataset Card 自动生成**：自动统计场景、天气、高度、任务、复核状态和导出结果。
- **多人协作**：从 JSON 存储升级到 SQLite/PostgreSQL，支持团队标注、审计和权限管理。
- **社区任务支持**：如果你有特定的无人机/遥感标注任务需求，欢迎提 issue 或邮件联系，我可以考虑加入对应任务模板。

联系邮箱：

```text
202421080308@std.uestc.edu.cn
```

## 文档

- [英文 README](README.md)
- [使用说明](USER_GUIDE.md)
- [部署说明](docs/DEPLOYMENT.md)
- [离线 Demo](docs/OFFLINE_DEMO.md)
- [离线 Demo 快速说明](offline_demo/README_OFFLINE.md)
- [自定义模型接入](docs/CUSTOM_MODEL.md)
- [系统架构](docs/ARCHITECTURE.md)
- [回归检查清单](docs/REGRESSION_CHECKLIST.md)
- [发布检查清单](docs/RELEASE_CHECKLIST.md)

## 开源协议

本项目使用 [MIT License](LICENSE)。

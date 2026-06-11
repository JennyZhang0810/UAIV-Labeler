const state = {
  config: null,
  facets: null,
  models: [],
  images: [],
  currentId: null,
  metadata: null,
  annotation: null,
  bitmap: null,
  importMode: "server",
  drawingBox: false,
  draftBox: null,
  drawMode: false,
  ocrMode: false,
  rotatedBoxMode: false,
  polygonMode: false,
  samPromptMode: false,
  editGeometryMode: false,
  draftPolygon: [],
  samPromptPoints: [],
  selectedObjectIndex: null,
  selectedSegmentIndex: null,
  activeGeometryDrag: null,
  pendingOcrBox: null,
  listWindowStart: 0,
  listWindowSize: 120,
  imageScale: 1,
  maxCanvasPixels: 1600,
  saveInProgress: false,
  history: [],
  lang: localStorage.getItem("rs_lang") || "zh",
  guideOriginal: null,
  deployOriginal: null,
  taskDomain: localStorage.getItem("uaiv_task_domain") || "urban",
  assistMode: localStorage.getItem("uaiv_assist_mode") || "assisted",
  qa: {
    browsePath: "sample_data/qa",
    selectedTsvPath: "",
    selectedXlsxPath: "",
    tsvPath: "",
    tsvIndex: 0,
    tsvTotal: 0,
    resultPath: "",
    resultIndex: 0,
    resultTotal: 0,
    wrongOnly: false,
    imageRoot: "",
  },
};

const canvas = document.getElementById("imageCanvas");
const ctx = canvas.getContext("2d");

const I18N = {
  zh: {
    title: "遥感半自动化标注平台",
    subtitle: "Metadata · 模型预标注 · 人工复核 · Benchmark",
    workbench: "工作台",
    guide: "使用说明",
    qaTools: "QA 工具",
    deploy: "外部部署",
    home: "首页",
    refreshStats: "刷新统计",
    serverExport: "服务器导出",
    localDownload: "本地下载",
    exportAction: "导出",
    downloadAction: "下载",
    dataImport: "数据导入",
    taskDomain: "任务方向",
    taskDomainMode: "标注模式",
    selectTaskDomain: "选择任务方向",
    domainUrban: "城市大模型",
    domainEcology: "生态大模型",
    domainRestoration: "图像复原",
    domainHintUrban: "城市大模型：目标/区域标注 + QA 对标注 + 城市结构理解。",
    domainHintEcology: "生态大模型：目标/区域标注 + 生态事件 QA 对标注。",
    domainHintRestoration: "图像复原：退化类型 + 退化程度（小/中/大）+ 清晰图像配对。",
    importSubtitle: "批量建立索引",
    serverFolder: "服务器目录",
    localComputer: "电脑本地",
    localTarget: "本地下载",
    serverTarget: "服务器导出",
    serverHint: "适合直接使用平台所在服务器或挂载盘中的大规模影像数据，导入时仅建立索引，不重复复制原图。",
    localHint: "适合从当前电脑选择少量影像进行试用或补充导入，平台会自动完成上传与索引。",
    serverPath: "服务器路径",
    browse: "浏览",
    noServerFolder: "未选择服务器目录",
    recursive: "递归扫描子目录",
    localFolder: "电脑本地文件夹",
    noLocalFolder: "未选择文件夹",
    unannotated: "未标注",
    unknown: "未知",
    batchMeta: "批量默认 Metadata",
    batch: "批次",
    altitude: "飞行高度",
    longitude: "经度",
    latitude: "纬度",
    scene: "场景",
    weather: "天气",
    defaultTasks: "默认任务",
    startImport: "开始导入",
    filters: "筛选",
    task: "任务",
    sourceType: "数据来源",
    all: "全部",
    actualData: "实际数据",
    demoData: "示例图",
    minAltitude: "最低高度",
    maxAltitude: "最高高度",
    minLongitude: "最小经度",
    maxLongitude: "最大经度",
    minLatitude: "最小纬度",
    maxLatitude: "最大纬度",
    applyFilters: "应用筛选",
    resetFilters: "重置筛选",
    clearDatasetIndex: "清空全部已导入记录",
    filterHelp: "筛选只是在已导入/已索引图像中缩小当前列表，不会重新读取目录，也不会删除数据。选择后会自动应用。",
    activeFilterAll: "当前显示全部已导入/已索引图像。",
    activeFilterSummary: (items, n) => `当前筛选：${items.join("；")}。显示 ${n} 张图像。`,
    activeProgressSummary: (total, labeled, verified, pending, unlabeled) => `当前列表进度：已标注 ${labeled} / 已核验 ${verified} / 待复核 ${pending} / 未标注 ${unlabeled} / 总计 ${total}`,
    clearDatasetConfirm: "这会清空平台里全部已导入记录、批次下拉选项和标注缓存，并自动备份到 data/backups。原始图片不会删除。清空后需要重新导入 pilot 或图片目录。确认继续吗？",
    datasetCleared: "全部已导入记录已清空",
    datasetClearedMsg: "平台中的图像记录、批次选项和标注缓存已清空；原始图片未删除。需要继续时请重新导入 pilot 或图片目录。",
    imageList: "图像列表",
    prevImage: "上一张",
    nextImage: "下一张",
    drawBox: "普通框",
    drawRotatedBox: "目标框",
    rotationAngle: "角度",
    pointPolygon: "点选",
    finishPolygon: "完成",
    samPrompt: "SAM提示点",
    runSamPrompt: "运行",
    editGeometry: "几何",
    addBox: "添加",
    undo: "撤销",
    clearAll: "清除",
    rerun: "预标注",
    saveReview: "保存",
    noImage: "未选择图像",
    modelCenter: "模型中心",
    backend: "智能预标注",
    customModel: "自定义模型接入",
    customHint: "可接入团队已有的检测、分割、OCR 或多任务模型，用于对当前图像生成初始标注，随后由人工复核确认。",
    modelName: "模型名称",
    taskType: "任务类型",
    apiUrl: "服务地址",
    runCustom: "运行自定义模型",
    autoRead: "自动读取",
    reviewPanel: "标注复核",
    humanConfirm: "人工确认",
    reviewStatus: "复核状态",
    environment: "环境",
    event: "事件",
    qaQuestion: "QA 问题",
    qaAnswer: "QA 答案",
    degradation: "复原退化类型",
    degradationLevel: "退化程度",
    clearPair: "清晰配对 ID",
    urbanStructure: "城市结构理解",
    objects: "目标框",
    detectCount: "检测/计数",
    stats: "统计",
    overview: "实时概览",
    guideTitle: "平台使用说明",
    guideHero: "面向低空遥感多任务数据集的半自动化标注流程：导入、筛选、模型预标注、人工复核、保存和导出。平台核心竞争力在于以 Metadata 为中心组织低空遥感数据，并把多任务标注、模型预标注、自定义模型接入和 Benchmark 导出放在同一工作流中。",
    toc: "目录",
    language: "语言",
    run: "运行",
    close: "关闭",
    noResult: "未产生有效标注结果。",
    resultSummary: (objects, segments, ocr, events) => `生成 ${objects} 个目标框、${segments} 个分割区域、${ocr} 条 OCR、${events} 条事件/QA。`,
    selectImage: "请先选择图像",
    selectImageForModel: "运行模型前需要先在左侧图像列表中选择一张图片。",
    selectImageForCustom: "运行自定义模型前需要先选择一张图片。",
    modelStart: "模型开始运行",
    modelRunning: (name) => `${name} 正在处理当前图像，请稍候。`,
    modelDone: "模型运行完毕",
    modelDoneMsg: (name, text) => `${name} 已完成。${text}`,
    modelFailed: "模型运行失败",
    customUrlMissing: "缺少接口 URL",
    customUrlMissingMsg: "请填写自定义模型服务地址。该服务需能接收当前图像并返回预标注结果。",
    customStart: "自定义模型开始运行",
    customRunning: (name) => `${name} 正在处理当前图像。`,
    customDone: "自定义模型运行完毕",
    customDoneMsg: (name, text) => `${name} 已完成。${text}`,
    customFailed: "自定义模型失败",
    currentImage: (id) => `当前图像：${id}`,
    backParent: ".. 返回上级",
    folderImages: (n) => `当前目录图片：${n} 张`,
    useCurrentFolder: "使用当前目录",
    noSubdirs: "无子目录",
    previousPage: "上页",
    nextPage: "下页",
    imagesRange: (total, start, end) => `${total} 张 · 显示 ${start}-${end}`,
    selectedImporting: (path, n) => `已选择：${path}，当前层 ${n} 张图片。正在导入...`,
    importingFolder: (path) => `正在导入目录：${path}`,
    modelStatusDone: (id, text) => `模型 ${id} 预标注完成：${text}`,
    customStatusDone: (text) => `自定义模型完成：${text}`,
    modelStatusFailed: (message) => `模型运行失败：${message}`,
    customStatusFailed: (message) => `自定义模型失败：${message}`,
    batchModelPreviewTitle: "批量预标注预览",
    batchModelDoneTitle: "批量预标注完成",
    batchModelFailed: "批量预标注失败",
    batchModelMissing: "请先选择可运行模型。",
    batchModelConfirm: (n, name) => `将对 ${n} 张候选图像运行 ${name}。不会覆盖人工、OCR 导入、已有模型草稿、核验或驳回样本。确认继续吗？`,
    batchModelSummary: (result) => `筛选命中 ${result.matched || 0} 张，候选 ${result.candidate_count || 0} 张，上限 ${result.limit || 0}；已更新 ${result.updated || 0}，失败 ${result.failed || 0}。`,
    riskQueueTitle: "风险队列",
    riskQueueFailed: "风险队列加载失败",
    riskQueueSummary: (result) => {
      const riskTypeText = (result.risk_types || []).length ? `，风险类型：${result.risk_types.join("、")}` : "";
      return `当前筛选命中 ${result.matched || 0} 张，风险样本 ${result.risk_image_count || 0} 张，显示前 ${result.items?.length || 0} 张${riskTypeText}。`;
    },
    totalImages: "图像总量",
    pendingReview: "待复核",
    labeledCount: "已标注",
    reviewedCount: "已核验",
    unlabeledCount: "未标注",
    rulePrefillCount: "规则草稿",
    importedPrefillCount: "导入草稿",
    modelPrefillCount: "模型草稿",
    humanLabeledCount: "人工标注",
    rejectedCount: "驳回",
    noAnnotationCount: "未建记录",
    taskTypes: "任务类型",
    refreshingStats: "正在刷新统计",
    statsRefreshed: "统计已刷新",
    statsRefreshedMsg: (total, reviewed) => `当前共 ${total} 张图像，已复核 ${reviewed} 张。`,
    statsFailed: "刷新统计失败",
    rulePrefillPreviewTitle: "规则回填预览",
    rulePrefillApplyTitle: "规则回填完成",
    rulePrefillFailed: "规则回填失败",
    rulePrefillConfirm: (n) => `将为 ${n} 张未建记录/空 annotation 写入规则草稿，并自动备份 annotations.json。不会覆盖人工、OCR 导入或模型草稿。确认继续吗？`,
    rulePrefillSummary: (result) => `可更新 ${result.would_update || 0} 张：新建 ${result.created || 0}，替换空记录 ${result.replaced_empty || 0}；跳过人工 ${result.skipped_human || 0}，跳过已有草稿 ${result.skipped_prefill || 0}，跳过无规则 ${result.skipped_no_rule || 0}。`,
    localSelected: (n) => `已选择 ${n} 个文件，点击导入后将自动上传并建立索引`,
    drawModeOn: "人工画框模式：在图像上拖拽画框",
    drawModeOff: "已退出人工画框模式",
    rotatedBoxModeOn: "目标框模式：直接拖拽画框；角度为空或 0 为普通框，填写角度为旋转框",
    rotatedBoxModeOff: "已退出目标框模式",
    ocrModeOn: "OCR框模式：拖拽框住文字，松开后输入文字内容",
    ocrModeOff: "已退出OCR框模式",
    ocrAutoUnavailable: "当前没有启用 OCR 模型。可先使用 OCR框 手动标注；自动识别需要配置 PaddleOCR/EasyOCR 或远程 OCR 服务。",
    polygonModeOn: "点选区域模式：在图像上逐点点击，至少 3 点后完成区域",
    polygonModeOff: "已退出点选区域模式",
    polygonNeedPoints: "至少需要 3 个点才能完成区域",
    polygonAdded: "已添加分割区域，可保存或继续编辑",
    polygonCanceled: "已取消当前点选区域",
    samPromptOn: "SAM提示点模式：在图像上点击一个或多个前景点",
    samPromptOff: "已退出SAM提示点模式",
    samPromptNeedPoint: "请先添加至少一个SAM提示点",
    samPromptStart: "SAM交互分割开始运行",
    samPromptRunning: "SAM正在根据提示点生成分割区域。",
    samPromptDone: "SAM交互分割完成",
    samPromptFailed: "SAM交互分割失败",
    samUnavailable: "SAM 后端未启用。请先配置远程 SAM 服务；当前可使用“点选区域”进行手动分割。",
    shortcutSelectEnvironment: (key, label) => `Alt+${key} 选择环境：${label}`,
    shortcutSelectScene: (key, label) => `Alt+${key} 选择场景：${label}`,
    shortcutSelectStructure: (key, label) => `Alt+Shift+${key} 选择城市结构：${label}`,
    shortcutSelectEvent: (key, label) => `${key} 选择事件：${label}`,
    ocrNeedText: "请先输入 OCR 文字内容。",
    ocrAdded: "已添加 OCR 文字框。",
    ocrCanceled: "已取消 OCR 输入。",
    shortcutSavedNext: "已保存并进入下一张",
    clearCurrentConfirm: "确认清除当前图像的目标框、分割、OCR、事件、复原和结构理解标注吗？清除后可先用撤销恢复，保存后才会写入。",
    objectVisible: "显示",
    objectHidden: "隐藏",
    objectLock: "锁定",
    objectUnlock: "解锁",
    objectSelected: (index, label) => `已选中目标 #${index}: ${label}`,
    editGeometryOn: "编辑几何模式：点击已有框或区域顶点后拖拽修改",
    editGeometryOff: "已退出编辑几何模式",
    geometrySelected: "已选中几何对象，可拖拽移动或调整",
    manualToolTitle: "人工标注工具",
    browseFailed: "目录浏览失败",
    browseDone: "目录已加载",
    browseDoneMsg: (path) => `已加载目录：${path}`,
    chooseServerFolder: "请先选择服务器目录",
    chooseLocalFolder: "请先选择电脑本地文件夹",
    importDone: "导入完成",
    importDoneSummary: (scanned, imported, skipped) => `已扫描 ${scanned} 个文件，导入 ${imported} 条记录，跳过 ${skipped} 个`,
    serverImported: (folder, scanned, imported) => `已导入：${folder}，扫描 ${scanned} 个文件，导入 ${imported} 条记录`,
    importFailed: "导入失败",
    boxAdded: "已添加目标框，可在右侧列表编辑坐标或保存",
    boxAddedTitle: "目标框已添加",
    noUndo: "没有可撤销的操作",
    undoDone: "已撤销上一步，保存后生效",
    undoTitle: "已撤销",
    cleared: "已清除当前图像标注，保存后生效",
    clearedTitle: "已清除",
    rerunMocking: "正在重新生成预标注",
    rerunDone: "已重新生成预标注，保存前可撤销",
    rerunFailed: "重新预标注失败",
    saveDone: "复核结果已保存",
    saveNext: "复核结果已保存，正在切换到下一张",
    saveFailed: "保存失败",
    filterApplied: "筛选已应用",
    filterAppliedMsg: (n) => `当前列表显示 ${n} 张图像。筛选只作用于已导入/已索引数据。`,
    drawModeTitle: "人工画框",
    qaBrowseDone: "QA 目录已加载",
    qaBrowseDoneMsg: (path) => `已加载 QA 目录：${path}`,
    qaFileSelected: "QA 文件已选择",
    qaFileSelectedMsg: (kind) => `已选择 ${kind} 文件，点击对应加载按钮即可开始审阅。`,
    qaUploadDone: "QA 上传成功",
    qaImagesUploadDone: "QA 图像上传成功",
    qaImagesSelected: (n) => `已选择 ${n} 个图像文件，上传后将用于匹配 QA 题目图像`,
    qaNoLocalImages: "未选择本地 QA 图像文件夹",
    qaChooseLocalImages: "请先选择本地 QA 图像文件夹。",
    qaImagesUploadedMsg: (n) => `已上传 ${n} 张图像。平台将使用该目录匹配 QA 题目图像。`,
    qaImagesUploadedSummary: (n, folder) => `已上传 ${n} 张图像：${folder}`,
    qaNoLocalFile: "未选择本地 QA 文件",
    qaChooseLocalFile: "请先选择本地 TSV 或 XLSX 文件。",
    qaFileUploadedSummary: (path) => `已上传：${path}`,
    qaFileUploadedMsg: "QA 文件已上传，正在自动加载审阅内容。",
    qaChooseTsv: "请先选择 TSV 文件。",
    qaChooseXlsx: "请先选择 XLSX 文件。",
    qaTsvLoadedStatus: "已加载题目文件；修订后将保存到 clean TSV。",
    qaNoImageInfo: "当前题目未提供图像信息；如已选择图像目录，平台将尝试自动匹配。",
    qaResultLoading: "正在加载评测结果...",
    qaImageMissing: "未找到对应图像。请确认图像目录是否包含该题对应的图片，或重新选择 QA 图像目录。",
    qaLoadDone: "QA 加载完成",
    qaTsvLoadMsg: (n) => `已加载 ${n} 道 TSV 题目。`,
    qaXlsxLoadMsg: (n) => `已加载 ${n} 条评测结果。`,
    exportStart: "开始导出",
    exportingStatus: (targetName, fmt) => `正在${targetName} ${fmt}`,
    downloadingStatus: (fmt) => `已开始下载 ${fmt}`,
    exportedStatus: (fmt, path) => `已导出 ${fmt}: ${path}`,
    exportFailedStatus: (fmt, message) => `导出 ${fmt} 失败：${message}`,
    exportStartMsg: (fmt, targetName) => `正在生成 ${fmt.toUpperCase()} 文件用于${targetName}，请稍候。`,
    downloadStarted: "下载已开始",
    downloadStartedMsg: (fmt) => `${fmt.toUpperCase()} 文件正在由浏览器下载。`,
    serverExportDone: "服务器导出完成",
    serverExportDoneMsg: (fmt, path) => `${fmt.toUpperCase()} 已生成：${path}`,
    exportFailed: "导出失败",
    replaceDatasetConfirm: "将清空当前图像索引和标注缓存，并先自动备份到 data/backups。确认继续导入新数据集吗？",
  },
  en: {
    title: "UAIV-Labeler",
    subtitle: "Metadata · Pre-Annotation · Review · Benchmark",
    workbench: "Workbench",
    guide: "Guide",
    qaTools: "QA Tools",
    deploy: "Deployment",
    home: "Home",
    refreshStats: "Refresh",
    serverExport: "Server",
    localDownload: "Local",
    exportAction: "Export",
    downloadAction: "Download",
    dataImport: "Data Import",
    taskDomain: "Task Domain",
    taskDomainMode: "Annotation Mode",
    selectTaskDomain: "Select Task Domain",
    domainUrban: "Urban Foundation Model",
    domainEcology: "Ecological Foundation Model",
    domainRestoration: "Image Restoration",
    domainHintUrban: "Urban: target/region annotation, QA-pair annotation, and urban-structure review.",
    domainHintEcology: "Ecology: target/region annotation and ecological event QA pairs.",
    domainHintRestoration: "Restoration: degradation type, severity (low/medium/high), and clean-image pairing.",
    importSubtitle: "Batch indexing",
    serverFolder: "Server Folder",
    localComputer: "Local Computer",
    localTarget: "local download",
    serverTarget: "server export",
    serverHint: "Use this for large image collections already available on the platform server or mounted storage. Importing creates an index without duplicating original images.",
    localHint: "Use this for small local trials or supplemental batches. The platform uploads the selected images and indexes them automatically.",
    serverPath: "Server Path",
    browse: "Browse",
    noServerFolder: "No server folder selected",
    recursive: "Scan subfolders recursively",
    localFolder: "Local Folder",
    noLocalFolder: "No folder selected",
    unannotated: "Unannotated",
    unknown: "Unknown",
    batchMeta: "Batch Default Metadata",
    batch: "Batch",
    altitude: "Flight Altitude",
    longitude: "Longitude",
    latitude: "Latitude",
    scene: "Scene",
    weather: "Weather",
    defaultTasks: "Default Tasks",
    startImport: "Start Import",
    filters: "Filters",
    task: "Task",
    sourceType: "Source",
    all: "All",
    actualData: "Actual Data",
    demoData: "Demo",
    minAltitude: "Min Altitude",
    maxAltitude: "Max Altitude",
    minLongitude: "Min Longitude",
    maxLongitude: "Max Longitude",
    minLatitude: "Min Latitude",
    maxLatitude: "Max Latitude",
    applyFilters: "Apply Filters",
    resetFilters: "Reset Filters",
    clearDatasetIndex: "Clear All Imported Records",
    filterHelp: "Filters narrow the currently imported/indexed image list. They do not rescan folders or delete data. Changes are applied automatically.",
    activeFilterAll: "Showing all imported/indexed images.",
    activeFilterSummary: (items, n) => `Active filters: ${items.join("; ")}. Showing ${n} images.`,
    activeProgressSummary: (total, labeled, verified, pending, unlabeled) => `Current list: labeled ${labeled} / verified ${verified} / pending ${pending} / unlabeled ${unlabeled} / total ${total}`,
    clearDatasetConfirm: "This will clear all imported records, batch options, and annotation cache after creating an automatic backup in data/backups. Original image files will not be deleted. Re-import a pilot or image folder afterward. Continue?",
    datasetCleared: "All imported records cleared",
    datasetClearedMsg: "Image records, batch options, and annotation cache were cleared. Original images were not deleted. Re-import a pilot or image folder to continue.",
    imageList: "Image List",
    prevImage: "Previous",
    nextImage: "Next",
    drawBox: "Draw Box",
    drawRotatedBox: "Box",
    rotationAngle: "Angle",
    pointPolygon: "Point Region",
    finishPolygon: "Finish Region",
    samPrompt: "SAM Points",
    runSamPrompt: "Run SAM",
    editGeometry: "Edit Geometry",
    addBox: "Add Box",
    undo: "Undo",
    clearAll: "Clear All",
    rerun: "Re-annotate",
    saveReview: "Save",
    noImage: "No image selected",
    modelCenter: "Model Center",
    backend: "AI Pre-Annotation",
    customModel: "Custom Model",
    customHint: "Connect an existing detection, segmentation, OCR, or multi-task model to generate initial annotations for the current image before human review.",
    modelName: "Model Name",
    taskType: "Task Type",
    apiUrl: "Service URL",
    runCustom: "Run Model",
    autoRead: "Auto-read",
    reviewPanel: "Annotation Review",
    humanConfirm: "Human confirmation",
    reviewStatus: "Review Status",
    environment: "Environment",
    event: "Event",
    qaQuestion: "QA Question",
    qaAnswer: "QA Answer",
    degradation: "Restoration Type",
    degradationLevel: "Degradation Severity",
    clearPair: "Clean Pair ID",
    urbanStructure: "Urban Structure",
    objects: "Objects",
    detectCount: "Detection/Counting",
    stats: "Statistics",
    overview: "Live Overview",
    guideTitle: "Platform Guide",
    guideHero: "A semi-automatic annotation workflow for low-altitude remote-sensing multi-task datasets: import, filtering, model pre-annotation, human review, saving, and export. The platform organizes data around Metadata and unifies multi-task annotation, custom model integration, and Benchmark export in one workflow.",
    toc: "Contents",
    language: "Language",
    run: "Run",
    close: "Close",
    noResult: "No valid annotation was produced.",
    resultSummary: (objects, segments, ocr, events) => `Generated ${objects} boxes, ${segments} segments, ${ocr} OCR items, and ${events} event/QA items.`,
    selectImage: "Please select an image first",
    selectImageForModel: "Select an image from the image list before running a model.",
    selectImageForCustom: "Select an image before running a custom model.",
    modelStart: "Model started",
    modelRunning: (name) => `${name} is processing the current image.`,
    modelDone: "Model completed",
    modelDoneMsg: (name, text) => `${name} has completed. ${text}`,
    modelFailed: "Model failed",
    customUrlMissing: "Missing API URL",
    customUrlMissingMsg: "Please enter a custom model service URL that can receive the current image and return pre-annotations.",
    customStart: "Custom model started",
    customRunning: (name) => `${name} is processing the current image.`,
    customDone: "Custom model completed",
    customDoneMsg: (name, text) => `${name} has completed. ${text}`,
    customFailed: "Custom model failed",
    currentImage: (id) => `Current image: ${id}`,
    backParent: ".. Parent",
    folderImages: (n) => `Images in this folder: ${n}`,
    useCurrentFolder: "Use Current Folder",
    noSubdirs: "No subfolders",
    previousPage: "Prev",
    nextPage: "Next",
    imagesRange: (total, start, end) => `${total} images · ${start}-${end}`,
    selectedImporting: (path, n) => `Selected: ${path}; ${n} images in current level. Importing...`,
    importingFolder: (path) => `Importing folder: ${path}`,
    modelStatusDone: (id, text) => `Model ${id} completed: ${text}`,
    customStatusDone: (text) => `Custom model completed: ${text}`,
    modelStatusFailed: (message) => `Model failed: ${message}`,
    customStatusFailed: (message) => `Custom model failed: ${message}`,
    batchModelPreviewTitle: "Batch pre-annotation preview",
    batchModelDoneTitle: "Batch pre-annotation done",
    batchModelFailed: "Batch pre-annotation failed",
    batchModelMissing: "Select a runnable model first.",
    batchModelConfirm: (n, name) => `Run ${name} on ${n} candidate images? Human, OCR-imported, existing model drafts, verified, and rejected samples will not be overwritten.`,
    batchModelSummary: (result) => `Matched ${result.matched || 0}, candidates ${result.candidate_count || 0}, limit ${result.limit || 0}; updated ${result.updated || 0}, failed ${result.failed || 0}.`,
    riskQueueTitle: "Risk Queue",
    riskQueueFailed: "Failed to load risk queue",
    riskQueueSummary: (result) => {
      const riskTypeText = (result.risk_types || []).length ? `, risk types: ${result.risk_types.join(", ")}` : "";
      return `Matched ${result.matched || 0}, risk images ${result.risk_image_count || 0}, showing ${result.items?.length || 0}${riskTypeText}.`;
    },
    totalImages: "Images",
    pendingReview: "Pending",
    labeledCount: "Labeled",
    reviewedCount: "Verified",
    unlabeledCount: "Unlabeled",
    rulePrefillCount: "Rule Drafts",
    importedPrefillCount: "Imported Drafts",
    modelPrefillCount: "Model Drafts",
    humanLabeledCount: "Human Labeled",
    rejectedCount: "Rejected",
    noAnnotationCount: "No Record",
    taskTypes: "Task Types",
    refreshingStats: "Refreshing statistics",
    statsRefreshed: "Statistics refreshed",
    statsRefreshedMsg: (total, reviewed) => `${total} images, ${reviewed} reviewed.`,
    statsFailed: "Failed to refresh statistics",
    rulePrefillPreviewTitle: "Rule Backfill Preview",
    rulePrefillApplyTitle: "Rule Backfill Done",
    rulePrefillFailed: "Rule backfill failed",
    rulePrefillConfirm: (n) => `Write rule drafts for ${n} images with no/empty annotation and back up annotations.json first? Human, OCR-imported, and model drafts will not be overwritten.`,
    rulePrefillSummary: (result) => `Can update ${result.would_update || 0}: create ${result.created || 0}, replace empty ${result.replaced_empty || 0}; skipped human ${result.skipped_human || 0}, skipped drafts ${result.skipped_prefill || 0}, skipped no-rule ${result.skipped_no_rule || 0}.`,
    localSelected: (n) => `${n} files selected; they will be uploaded to the server.`,
    drawModeOn: "Draw-box mode: drag on the image to create a box",
    drawModeOff: "Exited draw-box mode",
    rotatedBoxModeOn: "Box mode: drag to create a box. Empty or 0 angle is regular; non-zero angle creates a rotated box.",
    rotatedBoxModeOff: "Exited box mode",
    ocrModeOn: "OCR-box mode: drag around text, then enter the transcription",
    ocrModeOff: "Exited OCR-box mode",
    ocrAutoUnavailable: "No OCR model is enabled. Use OCR Box for manual annotation, or configure PaddleOCR/EasyOCR/remote OCR.",
    polygonModeOn: "Point-region mode: click points on the image, then finish after at least 3 points",
    polygonModeOff: "Exited point-region mode",
    polygonNeedPoints: "At least 3 points are required to finish a region",
    polygonAdded: "Region added. Save or continue editing.",
    polygonCanceled: "Current point region canceled",
    samPromptOn: "SAM-point mode: click one or more foreground points on the image",
    samPromptOff: "Exited SAM-point mode",
    samPromptNeedPoint: "Add at least one SAM prompt point first",
    samPromptStart: "SAM interactive segmentation started",
    samPromptRunning: "SAM is generating a region from prompt points.",
    samPromptDone: "SAM interactive segmentation completed",
    samPromptFailed: "SAM interactive segmentation failed",
    samUnavailable: "SAM backend is not enabled. Configure a remote SAM service first; use Point Region for manual segmentation now.",
    shortcutSelectEnvironment: (key, label) => `Alt+${key} selects environment: ${label}`,
    shortcutSelectScene: (key, label) => `Alt+${key} selects scene: ${label}`,
    shortcutSelectStructure: (key, label) => `Alt+Shift+${key} selects urban structure: ${label}`,
    shortcutSelectEvent: (key, label) => `${key} selects event: ${label}`,
    ocrNeedText: "Enter OCR text first.",
    ocrAdded: "OCR text box added.",
    ocrCanceled: "OCR input canceled.",
    shortcutSavedNext: "Saved and moved to the next image",
    clearCurrentConfirm: "Clear objects, segments, OCR, events, restoration, and structure notes for the current image? You can undo before saving.",
    objectVisible: "Show",
    objectHidden: "Hide",
    objectLock: "Lock",
    objectUnlock: "Unlock",
    objectSelected: (index, label) => `Selected object #${index}: ${label}`,
    editGeometryOn: "Edit-geometry mode: click an existing box or region vertex, then drag to modify it",
    editGeometryOff: "Exited edit-geometry mode",
    geometrySelected: "Geometry selected. Drag to move or adjust it.",
    manualToolTitle: "Manual Annotation Tool",
    browseFailed: "Folder browse failed",
    browseDone: "Folder loaded",
    browseDoneMsg: (path) => `Loaded folder: ${path}`,
    chooseServerFolder: "Please select a server folder first",
    chooseLocalFolder: "Please select a local folder first",
    importDone: "Import completed",
    importDoneSummary: (scanned, imported, skipped) => `Scanned ${scanned} files, imported ${imported} records, skipped ${skipped}.`,
    serverImported: (folder, scanned, imported) => `Imported: ${folder}; scanned ${scanned}, imported ${imported}.`,
    importFailed: "Import failed",
    boxAdded: "Box added. Edit its label/coordinates on the right, then save.",
    boxAddedTitle: "Box added",
    noUndo: "No action to undo",
    undoDone: "Undone. Save to persist the change.",
    undoTitle: "Undo completed",
    cleared: "Current annotation cleared. Save to persist the change.",
    clearedTitle: "Cleared",
    rerunMocking: "Regenerating pre-annotation",
    rerunDone: "Pre-annotation regenerated. You can undo before saving.",
    rerunFailed: "Re-annotation failed",
    saveDone: "Review saved",
    saveNext: "Review saved. Moving to next image",
    saveFailed: "Save failed",
    filterApplied: "Filters applied",
    filterAppliedMsg: (n) => `${n} images are shown. Filters only affect already imported/indexed data.`,
    drawModeTitle: "Draw Box",
    qaBrowseDone: "QA folder loaded",
    qaBrowseDoneMsg: (path) => `Loaded QA folder: ${path}`,
    qaFileSelected: "QA file selected",
    qaFileSelectedMsg: (kind) => `${kind} file selected. Click the corresponding load button to start review.`,
    qaUploadDone: "QA upload completed",
    qaImagesUploadDone: "QA images uploaded",
    qaImagesSelected: (n) => `${n} image files selected. Upload them to match QA item images.`,
    qaNoLocalImages: "No local QA image folder selected",
    qaChooseLocalImages: "Please select a local QA image folder first.",
    qaImagesUploadedMsg: (n) => `${n} images uploaded. The platform will use this folder to match QA item images.`,
    qaImagesUploadedSummary: (n, folder) => `${n} images uploaded: ${folder}`,
    qaNoLocalFile: "No local QA file selected",
    qaChooseLocalFile: "Please select a local TSV or XLSX file first.",
    qaFileUploadedSummary: (path) => `Uploaded: ${path}`,
    qaFileUploadedMsg: "QA file uploaded. Loading the review content now.",
    qaChooseTsv: "Please select a TSV file first.",
    qaChooseXlsx: "Please select an XLSX file first.",
    qaTsvLoadedStatus: "Question file loaded. Revisions will be saved to a clean TSV.",
    qaNoImageInfo: "This item does not provide image information. If an image folder is selected, the platform will try to match it automatically.",
    qaResultLoading: "Loading evaluation results...",
    qaImageMissing: "No matching image found. Confirm that the image folder contains the paired image, or select the QA image folder again.",
    qaLoadDone: "QA loaded",
    qaTsvLoadMsg: (n) => `${n} TSV questions loaded.`,
    qaXlsxLoadMsg: (n) => `${n} result rows loaded.`,
    exportStart: "Export started",
    exportingStatus: (targetName, fmt) => `Exporting ${fmt} for ${targetName}`,
    downloadingStatus: (fmt) => `Download started: ${fmt}`,
    exportedStatus: (fmt, path) => `Exported ${fmt}: ${path}`,
    exportFailedStatus: (fmt, message) => `Export ${fmt} failed: ${message}`,
    exportStartMsg: (fmt, targetName) => `Generating ${fmt.toUpperCase()} for ${targetName}.`,
    downloadStarted: "Download started",
    downloadStartedMsg: (fmt) => `${fmt.toUpperCase()} is being downloaded by the browser.`,
    serverExportDone: "Server export completed",
    serverExportDoneMsg: (fmt, path) => `${fmt.toUpperCase()} generated: ${path}`,
    exportFailed: "Export failed",
    replaceDatasetConfirm: "This will clear the current image index and annotation cache after creating an automatic backup in data/backups. Continue importing the new dataset?",
  },
};

function t(key) {
  return I18N[state.lang]?.[key] || I18N.zh[key] || key;
}

function optionList(values, names = {}) {
  return values.map((value) => `<option value="${value}">${optionLabel(value, names)}</option>`).join("");
}

function optionLabel(value, names = {}) {
  if (state.lang === "en") {
    if (value === "") return t("all");
    if (value === "actual") return t("actualData");
    if (value === "demo") return t("demoData");
  }
  return names[value] || value;
}

async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

async function init() {
  bindViewSwitching();
  bindLanguageSwitching();
  bindTaskDomain();
  state.config = await api("/api/config");
  state.facets = await api("/api/facets");
  state.models = await api("/api/models");
  fillSelect("taskFilter", state.config.tasks, state.config.task_names, true);
  fillSelect("sceneFilter", state.config.scene_labels, {}, true);
  fillSelect("weatherFilter", state.config.weather_labels, {}, true);
  fillSelect("importScene", state.config.scene_labels, {}, true);
  fillSelect("importWeather", state.config.weather_labels, {}, true);
  fillSelect("importTasks", state.config.tasks, state.config.task_names);
  setDefaultImportTasks();
  fillDatalist("objectLabelOptions", state.config.object_labels);
  document.getElementById("newBoxLabel").value = state.config.object_labels[0] || "object";
  fillDatalist("sceneLabelOptions", state.config.scene_labels);
  fillDatalist("urbanStructureOptions", state.config.urban_structure_labels || []);
  fillSelect("environmentLabel", state.config.weather_labels);
  fillDatalist("eventLabelOptions", state.config.event_labels);
  renderLabelShortcuts("environmentShortcutPanel", state.config.weather_labels, "environment");
  renderLabelShortcuts("sceneShortcutPanel", state.config.scene_labels, "scene");
  renderLabelShortcuts("urbanStructureShortcutPanel", state.config.urban_structure_labels || [], "structure");
  renderLabelShortcuts("eventShortcutPanel", state.config.event_labels, "event");
  fillSelect("degradationLabel", state.config.restoration_types, {}, true);
  bindCustomModel();
  bindQaTools();
  refreshBatchOptions();
  await browsePath("", false);
  renderModels();
  updateSamControls();
  await loadImages();
  await loadStats();
  applyLanguage();
  applyTaskDomain();
  renderTaskAssist();
}

function bindLanguageSwitching() {
  const select = document.getElementById("languageSelect");
  select.value = state.lang;
  select.addEventListener("change", () => {
    state.lang = select.value;
    localStorage.setItem("rs_lang", state.lang);
    applyLanguage();
    renderImageList();
    renderMetadata();
    const rawStats = document.getElementById("statsView").textContent || "{}";
    try {
      renderSummary(JSON.parse(rawStats));
    } catch {
      renderSummary({});
    }
  });
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function applyLanguage() {
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
  document.title = t("title");
  setText(".topbar h1", t("title"));
  setText(".topbar .brand p", t("subtitle"));
  setText("#showHome", t("home"));
  setText("#showWorkbench", t("workbench"));
  setText("#showQaTools", t("qaTools"));
  setText("#showDeploy", t("deploy"));
  setText("#showGuide", t("guide"));
  setText('[data-rail-view="home"]', t("home"));
  setText('[data-rail-view="workbench"]', t("workbench"));
  setText('[data-rail-view="qa"]', state.lang === "en" ? "QA Review" : "QA 核查");
  setText('[data-rail-view="deploy"]', t("deploy"));
  setText('[data-rail-view="guide"]', t("guide"));
  setText("#refreshStats", t("refreshStats"));
  setText(".task-domain-panel .panel-head h2", t("taskDomain"));
  setText(".task-domain-panel .panel-head span", t("taskDomainMode"));
  updateTaskDomainLabels();
  const groupLabels = document.querySelectorAll(".action-group-label");
  if (groupLabels[0]) groupLabels[0].textContent = t("serverExport");
  if (groupLabels[1]) groupLabels[1].textContent = t("localDownload");
  const exportRunButtons = document.querySelectorAll("[data-export-run]");
  exportRunButtons.forEach((button) => {
    button.textContent = button.dataset.exportRun === "local" ? t("downloadAction") : t("exportAction");
  });
  setText(".import-panel .panel-head h2", t("dataImport"));
  setText(".import-panel .panel-head span", t("importSubtitle"));
  setText("#serverImportTab", t("serverFolder"));
  setText("#clientImportTab", t("localComputer"));
  setText("#serverImportPane .hint", t("serverHint"));
  setText("#clientImportPane .hint", t("localHint"));
  setText("#browseFolder", t("browse"));
  setText("#selectedFolderSummary", t("noServerFolder"));
  setText("#clientUploadSummary", t("noLocalFolder"));
  setText(".metadata-block h3", t("batchMeta"));
  setText("#importFolder", t("startImport"));
  setText("#applyFilters", t("applyFilters"));
  setText(".filter-help", t("filterHelp"));
  setText(".list-panel h2", t("imageList"));
  setText("#prevImage", t("prevImage"));
  setText("#nextImage", t("nextImage"));
  setText("#drawBoxMode", t("drawBox"));
  setText("#drawRotatedBoxMode", t("drawRotatedBox"));
  setText("#drawOcrMode", "OCR框");
  setText("#pointPolygonMode", t("pointPolygon"));
  setText("#finishPolygon", t("finishPolygon"));
  setText("#samPromptMode", t("samPrompt"));
  setText("#runSamPrompt", t("runSamPrompt"));
  setText("#editGeometryMode", t("editGeometry"));
  const rotationInput = document.getElementById("rotationAngle");
  if (rotationInput) rotationInput.title = t("rotationAngle");
  setText("#addBox", t("addBox"));
  setText("#undoAction", t("undo"));
  setText("#clearAnnotations", t("clearAll"));
  setText("#rerunPrediction", t("rerun"));
  setText("#saveReview", t("saveReview"));
  if (!state.currentId) setText("#statusText", t("noImage"));
  setText(".model-center > .panel-head h2", t("modelCenter"));
  setText(".model-center > .panel-head span", t("backend"));
  setText(".custom-model-box .panel-head h2", t("customModel"));
  setText(".custom-model-box .hint", t("customHint"));
  setText("#runCustomModel", t("runCustom"));
  setText(".inspector .panel:nth-child(1) .panel-head span", t("autoRead"));
  setText(".inspector .panel:nth-child(2) .panel-head h2", t("reviewPanel"));
  setText(".inspector .panel:nth-child(2) .panel-head span", t("humanConfirm"));
  setText(".inspector .panel:nth-child(3) .panel-head h2", t("objects"));
  setText(".inspector .panel:nth-child(3) .panel-head span", t("detectCount"));
  setText(".inspector .panel:nth-child(3) .panel-note", state.lang === "en" ? "Supports horizontal boxes and rotated boxes. Rotation is in degrees; positive values follow the canvas clockwise direction." : "支持水平框与旋转框；角度单位为度，正值为顺时针方向。");
  setText(".inspector .panel:nth-child(4) .panel-head h2", state.lang === "en" ? "Segments" : "分割区域");
  setText(".inspector .panel:nth-child(4) .panel-head span", state.lang === "en" ? "Manual points" : "手动点选");
  setText(".inspector .panel:nth-child(4) .panel-note", state.lang === "en" ? "Click Point Region, click vertices on the image, then finish after at least 3 points." : "点击“点选区域”后在图像上逐点点击，至少 3 个点后点击“完成区域”。");
  setText(".inspector .panel:nth-child(5) .panel-head h2", t("stats"));
  setText(".inspector .panel:nth-child(5) .panel-head span", t("overview"));
  setText("#guideView .guide-hero h2", t("guideTitle"));
  setText("#guideView .guide-hero p", t("guideHero"));
  setText("#guideView .guide-toc h2", t("toc"));
  setLanguageLabel();
  updateStaticOptions();
  renderGuide();
  renderModels();
  applyLabelTranslations();
  applyStaticPageTranslations();
}

function applyStaticPageTranslations() {
  const zh = state.lang !== "en";
  const pairs = [
    ["#processingTitle", zh ? "模型处理中" : "Processing"],
    ["#processingMessage", zh ? "正在生成预标注，请稍候。" : "Generating pre-annotations. Please wait."],
    [".home-kicker", "UAIV-Labeler"],
    [".home-hero h2", zh ? "低空城市治理数据标注生产平台" : "Low-altitude Urban Governance Annotation Platform"],
    [".home-hero p", zh ? "围绕真实无人机影像的数据生产流程，把服务器目录索引、12 组任务分配、规则/OCR/模型草稿、人工复核、风险队列、抽检清单和 Benchmark 导出放在同一个工作台里。" : "A production workflow for real UAV imagery: server-side indexing, 12-group task assignment, rule/OCR/model drafts, human review, risk queues, sampling lists, and Benchmark export in one workspace."],
    ['[data-home-action="workbench"]', zh ? "进入标注工作台" : "Open Workspace"],
    ['[data-home-action="qa"]', zh ? "进入 QA 核查" : "Open QA Review"],
    [".project-page-button", zh ? "项目主页" : "Project Page"],
    [".github-button", "GitHub"],
    [".admin-entry-panel .panel-head h2", zh ? "管理员入口" : "Admin Entry"],
    [".admin-entry-panel .panel-head span", zh ? "数据导入" : "Data Import"],
    [".admin-entry-panel p", zh ? "导入服务器目录、电脑本地文件夹，或执行规则回填。" : "Import server folders, local folders, or run rule backfill."],
    ["#openAdminImport", zh ? "打开数据导入" : "Open Data Import"],
    [".home-section-head h3", zh ? "任务入口" : "Task Entry"],
    [".home-section-head p", zh ? "先选择数据建设方向，再进入对应标注流程。" : "Choose a data construction direction before entering the corresponding workflow."],
    ['[data-home-domain="urban"] strong', zh ? "城市大模型" : "Urban Foundation Model"],
    ['[data-home-domain="urban"] p', zh ? "场景识别、目标检测/计数、事件 QA、OCR、城市结构理解。" : "Scene recognition, detection/counting, event QA, OCR, and urban structure understanding."],
    ['[data-home-domain="ecology"] strong', zh ? "生态大模型" : "Ecological Foundation Model"],
    ['[data-home-domain="ecology"] p', zh ? "林地、农田、湖泊、湿地及生态事件与污染核查。" : "Forest, farmland, lake, wetland, ecological event, and pollution review."],
    ['[data-home-domain="restoration"] strong', zh ? "图像复原" : "Image Restoration"],
    ['[data-home-domain="restoration"] p', zh ? "雨、雾、红外等退化类型、退化程度与清晰图像配对。" : "Degradation types, severity levels, and clean-image pairing for rain, fog, infrared, and related conditions."],
    [".home-advantages .home-kicker", "Production-Oriented"],
    [".home-advantages h3", zh ? "把复杂标注流程交给平台，把简单操作留给标注员" : "Move workflow complexity into the platform, keep annotation simple"],
    [".home-advantages p", zh ? "UAIV-Labeler 不只是画框工具。它会根据每张图的 metadata 自动显示该做的任务，先给出可追踪草稿，再让人工确认、修改和补漏，最后用风险队列和抽检清单支撑质控。" : "UAIV-Labeler is more than a drawing tool. It uses image metadata to show only the required tasks, provides traceable drafts first, lets humans confirm and correct them, and supports quality control through risk queues and sampling exports."],
    [".uaiv-dataset .home-kicker", "Published Dataset"],
    [".uaiv-dataset h3", zh ? "UAIV 低空多模态数据集" : "UAIV Low-altitude Multimodal Dataset"],
    [".uaiv-dataset p", zh ? "UAIV 面向低空城市智能，覆盖多场景、多模态、多条件真实无人机影像，支持场景理解、时空学习、图像复原和城市治理相关 Benchmark 构建。本平台作为后续扩展数据的半自动化标注与核查工具，延续 UAIV 的 Metadata-first、多任务统一组织和可复用导出流程。" : "UAIV targets low-altitude urban intelligence with real UAV imagery across multiple scenes, modalities, and conditions. It supports scene understanding, spatiotemporal learning, image restoration, and urban-governance Benchmarks. This platform extends UAIV with semi-automatic annotation, QA review, metadata-first organization, and reusable export workflows."],
    [".home-flow h3", zh ? "正式标注流程" : "Formal Annotation Workflow"],
    [".home-flow p", zh ? "先由管理员导入并预填，再由标注员按组复核，最后由管理员质检、抽检和导出。" : "Administrators import and prefill data first, annotators review by group, and administrators finish with QA, sampling, and exports."],
    [".public-ready .home-kicker", "Open-source Ready"],
    [".public-ready h3", zh ? "三种使用方式，边界清楚" : "Three run modes with clear boundaries"],
    [".public-ready p", zh ? "离线 Demo、在线演示和服务器部署面向不同场景。离线 Demo 适合本机试用和手动标注；在线演示用于快速预览；服务器部署用于读取团队数据盘并接入真实模型环境。" : "Offline Demo, Online Demo, and Server Deployment serve different use cases. Offline Demo is for local trials and manual annotation; Online Demo is for preview; Server Deployment is for team storage and real model environments."],
    [".project-page-link span", "Public Project Page"],
    [".project-page-link strong", zh ? "公开介绍页用于展示平台定位、功能边界和开源说明；真实标注工作仍在当前生产工作台完成。" : "The public project page presents positioning, feature boundaries, and open-source notes; real annotation work stays in this production workspace."],
    [".project-page-link a", zh ? "打开 UAIV-Labeler 项目主页" : "Open UAIV-Labeler Project Page"],
    [".offline-flow .home-kicker", "Offline Workflow"],
    [".offline-flow h3", zh ? "离线 Demo 是独立本机流程" : "Offline Demo is a separate local workflow"],
    [".offline-flow p", zh ? "离线模式不依赖公网入口，也不会读取访问者之外的服务器磁盘。它用于本机试用、无网络演示和手动标注教学，默认只读取仓库内置示例数据。" : "Offline mode does not depend on a public endpoint and does not browse another server's disk. It is for local trials, no-network demos, and manual-annotation teaching, using the built-in sample data by default."],
    [".qa-tools-view .guide-hero h2", zh ? "QA 工具" : "QA Tools"],
    [".qa-tools-view .guide-hero p", zh ? "面向城市大模型 Benchmark 的 QA 数据核查与评测结果复盘。支持审阅题目、选项、正确答案、模型回答和推理过程，便于统一修订与质量控制。" : "QA dataset review and evaluation-result inspection for urban foundation-model Benchmarks. Review questions, options, ground-truth answers, model responses, and reasoning traces for consistent quality control."],
    [".qa-file-panel .panel-head h2", zh ? "文件选择" : "File Selection"],
    [".qa-source-block:nth-child(1) h3", zh ? "服务器读取" : "Server Files"],
    [".qa-source-block:nth-child(1) .hint", zh ? "读取平台服务器上的 QA 文件和配套图像目录，适合大规模数据集核查。" : "Read QA files and paired image folders available on the platform server. Recommended for large datasets."],
    ["#qaBrowseFolder", zh ? "浏览" : "Browse"],
    ['label[for="qaWrongOnly"]', zh ? "只看错误题" : "Wrong only"],
    ["#useQaTsvPath", zh ? "使用选中 TSV 审题" : "Load Selected TSV"],
    ["#useQaXlsxPath", zh ? "使用选中 XLSX 结果" : "Load Selected XLSX"],
    [".qa-source-block:nth-child(2) h3", zh ? "电脑本地上传" : "Local Upload"],
    [".qa-source-block:nth-child(2) .hint", zh ? "上传当前电脑中的 QA 文件；如题目无法自动显示图像，请继续上传对应图像文件夹。" : "Upload QA files from your computer. If images are not shown automatically, upload the paired image folder as well."],
    ["#uploadQaLocalFile", zh ? "上传并使用" : "Upload and Load"],
    ["#uploadQaLocalImages", zh ? "上传图像文件夹" : "Upload Image Folder"],
    [".qa-advanced-paths summary", zh ? "高级：手动指定审阅文件" : "Advanced: Specify Review Files"],
    [".advanced-filter summary", zh ? "空间范围筛选" : "Spatial Range Filter"],
    [".qa-advanced-paths .hint", zh ? "通常无需使用。仅当文件不在列表中、需要粘贴完整路径，或需要重新加载特定结果文件时展开。" : "Usually not needed. Use this only when the file is not listed, a full path must be pasted, or a specific result file must be reloaded."],
    ["#loadQaTsv", zh ? "加载 TSV 审题" : "Load TSV"],
    ["#loadQaResult", zh ? "加载 XLSX 结果" : "Load XLSX"],
    [".qa-review-panel .panel-head h2", zh ? "QA 题目核查" : "QA Item Review"],
    [".qa-review-panel .panel-note", zh ? "用于核查和修订 QA 数据本身：题目、选项、正确答案和配套图像。" : "Review and revise QA data: questions, options, ground-truth answers, and paired images."],
    ["#qaTsvPrev", zh ? "上一题" : "Previous"],
    ["#qaTsvNext", zh ? "下一题" : "Next"],
    ["#qaTsvJump", zh ? "跳转" : "Jump"],
    ["#qaTsvSave", zh ? "保存 + 下一题" : "Save + Next"],
    [".qa-result-panel .panel-head h2", zh ? "评测结果复盘" : "Evaluation Review"],
    [".qa-result-panel .panel-note", zh ? "用于查看模型评测后的 XLSX 结果：模型答案、正确答案、是否命中以及推理过程；不用于修改 QA 题库。" : "Inspect XLSX evaluation results: model answer, ground truth, hit/miss status, and reasoning trace. This does not edit the QA dataset."],
    ["#qaResultPrev", zh ? "上一题" : "Previous"],
    ["#qaResultNext", zh ? "下一题" : "Next"],
    ["#qaResultJump", zh ? "跳转" : "Jump"],
  ];
  pairs.forEach(([selector, text]) => setText(selector, text));
  updateHomeMetricText();
  updateAdvantageCards();
  updateDatasetHighlightText();
  updateRunModeCards();
  setLabelText("#qaFolderPath", zh ? "QA 目录" : "QA Folder");
  setLabelText("#qaImageRoot", zh ? "QA 图像目录" : "QA Image Folder");
  setLabelText("#qaLocalFile", zh ? "电脑本地 QA 文件" : "Local QA File");
  setLabelText("#qaLocalImageFiles", zh ? "电脑本地 QA 图像文件夹" : "Local QA Image Folder");
  setLabelText("#qaTsvPath", zh ? "TSV 题目文件" : "TSV Question File");
  setLabelText("#qaXlsxPath", zh ? "XLSX 结果文件" : "XLSX Result File");
  setLabelText("#qaWrongOnly", zh ? "只看错误题" : "Wrong only");
  setLabelText("#qaTsvRow", zh ? "题号" : "Row");
  setLabelText("#qaResultRow", zh ? "题号" : "Row");
  updateInlineQaLabels();
  updateAnnotationModuleText();
  updateDegradationLevelOptions();
  updateHomeFlowList();
  updateOfflineFlowList();
  updateDeployLanguage();
}

function updateRunModeCards() {
  const cards = document.querySelectorAll(".public-ready-grid div");
  const values = state.lang === "en"
    ? [
        ["Offline Demo", "Run on 127.0.0.1 with sample_data by default. No public exposure."],
        ["Online Demo", "Public preview only. It reads data available on the hosted demo server."],
        ["Server Deployment", "Deploy on a team server to browse that server or mounted dataset storage."],
        ["Model Plugin", "Real YOLO / SAM / SegEarth / VLM backends must be configured in the deployment environment."],
      ]
    : [
        ["Offline Demo", "本机 127.0.0.1 试用，默认读取 sample_data，不暴露公网。"],
        ["Online Demo", "公开地址用于预览，只能读取演示服务器上的数据。"],
        ["Server Deployment", "部署到团队服务器后，才能浏览该服务器或挂载盘数据。"],
        ["Model Plugin", "真实 YOLO / SAM / SegEarth / VLM 模型需在部署环境中配置。"],
      ];
  cards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    const span = card.querySelector("span");
    if (strong && values[index]) strong.textContent = values[index][0];
    if (span && values[index]) span.textContent = values[index][1];
  });
}

function updateAdvantageCards() {
  const cards = document.querySelectorAll(".advantage-grid div");
  const values = state.lang === "en"
    ? [
        ["Task-aware interface", "Object detection, OCR, scene labels, urban functions, events, and environment fields are shown according to the current image."],
        ["Rule and label prefill", "Scene, urban function, observation condition, and event drafts can come from folder names and metadata; OCR A reviews imported labels."],
        ["Semi-automatic but controlled", "Rule, OCR, model, and human sources are tracked separately, so unreviewed drafts are not treated as final labels."],
        ["Management and QA loop", "Administrators can batch pre-annotate filtered data, inspect risky samples, export sampling lists, and generate release formats."],
      ]
    : [
        ["任务感知界面", "目标检测、OCR、场景、城市功能、事件、环境等模块按当前图像自动显示。"],
        ["规则与已有标签预填", "场景、城市功能、观测条件和事件可按文件夹名/metadata 预填；OCR A 组可复核已有标签。"],
        ["半自动化但可控", "规则、OCR、模型草稿和人工标注分来源统计，不把未复核草稿直接当最终标签。"],
        ["管理与质检闭环", "管理员可按筛选范围批量预标注、查看风险样本、导出抽检清单和发布格式。"],
      ];
  cards.forEach((card, index) => {
    const strong = card.querySelector("strong");
    const span = card.querySelector("span");
    if (strong && values[index]) strong.textContent = values[index][0];
    if (span && values[index]) span.textContent = values[index][1];
  });
}

function updateAnnotationModuleText() {
  const zh = state.lang !== "en";
  const modules = Array.from(document.querySelectorAll(".annotation-module"));
  const baseModule = modules.find((item) => item.querySelector("#sceneLabel"));
  const objectModule = modules.find((item) => item.querySelector(".hint") && !item.querySelector("#qaQuestion") && !item.querySelector("#degradationLabel"));
  const eventModule = modules.find((item) => item.querySelector("#eventLabel"));
  const qaModule = modules.find((item) => item.querySelector("#qaQuestion"));
  const ocrModule = modules.find((item) => item.querySelector("#ocrTextInput"));
  const restorationModule = modules.find((item) => item.querySelector("#degradationLabel"));
  if (baseModule) {
    baseModule.querySelector("h3").textContent = zh ? "基础分类" : "Basic Labels";
  }
  if (objectModule) {
    objectModule.querySelector("h3").textContent = zh ? "目标与区域标注" : "Objects / Regions";
    objectModule.querySelector(".hint").textContent = zh
      ? "检测任务标注目标类别和 bbox；分割任务标注像素掩码。当前手动画框和模型预标注在中间工作区完成。"
      : "Detection uses object categories and bounding boxes; segmentation uses pixel masks. Manual boxes and model pre-annotations are handled in the central workspace.";
  }
  if (eventModule) {
    eventModule.querySelector("h3").textContent = zh ? "事件标注" : "Event Labeling";
  }
  if (qaModule) {
    qaModule.querySelector("h3").textContent = zh ? "QA 对标注" : "QA Pair Annotation";
    qaModule.querySelector(".hint").textContent = zh
      ? "这里用于当前图像的 QA 标注；顶部 QA 工具用于已有 QA 数据集的核查。"
      : "Use this for QA annotation on the current image. The QA Tools page is for reviewing existing QA datasets.";
  }
  const ocrListModule = modules.find((item) => item.querySelector("#ocrList"));
  if (ocrListModule) {
    ocrListModule.querySelector("h3").textContent = zh ? "OCR 文字标注" : "OCR Text";
    ocrListModule.querySelector(".hint").textContent = zh
      ? "使用中间工具栏的 OCR 框，拖拽框住文字后会直接弹出输入框。OCR 标注独立保存，不进入目标框列表。"
      : "Use OCR Box in the canvas toolbar. Drag around text, then enter the transcription. OCR is stored separately from object boxes.";
  } else if (ocrModule) {
    ocrModule.querySelector("h3").textContent = zh ? "OCR 文字标注" : "OCR Text";
    ocrModule.querySelector(".hint").textContent = zh
      ? "先用普通框框住文字区域并选中该框，再输入文字内容并转为 OCR。"
      : "Draw and select a normal box around text, then enter the transcription and convert it to OCR.";
  }
  if (restorationModule) {
    restorationModule.querySelector("h3").textContent = zh ? "图像复原标注" : "Restoration";
    restorationModule.querySelector(".hint").textContent = zh
      ? "标注退化类型、退化程度和清晰图像配对关系。"
      : "Annotate degradation type, degradation severity, and clean-image pairing.";
  }
}

function setLabelText(selector, text) {
  const field = document.querySelector(selector);
  const label = field?.closest("label");
  if (!label) return;
  for (const node of label.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      node.textContent = text;
      return;
    }
  }
}

function updateHomeFlowList() {
  const items = document.querySelectorAll(".home-flow li");
  const labels = state.lang === "en"
    ? ["Import data and build a metadata index", "Prefill rule/OCR/model drafts", "Review by annotator group and fix missing labels", "Use risk queues, sampling exports, and release-ready formats"]
    : ["导入数据并建立 metadata 索引", "预填规则/OCR/模型草稿", "按标注组人工复核并补漏修正", "用风险队列、抽检清单和发布格式完成质控"];
  items.forEach((item, index) => {
    item.textContent = labels[index] || item.textContent;
  });
}

function updateOfflineFlowList() {
  const items = document.querySelectorAll(".offline-flow li");
  const labels = state.lang === "en"
    ? ["Clone the repository and install dependencies", "Run bash offline_demo/run_offline.sh", "Open http://127.0.0.1:7860", "Import sample_data/images for manual annotation and export"]
    : ["克隆仓库并安装依赖", "运行 bash offline_demo/run_offline.sh", "打开 http://127.0.0.1:7860", "导入 sample_data/images 并手动标注/导出"];
  items.forEach((item, index) => {
    item.textContent = labels[index] || item.textContent;
  });
}

function updateInlineQaLabels() {
  const zh = state.lang !== "en";
  setText("#qaResultAnswer", document.getElementById("qaResultAnswer")?.textContent || "-");
  const answerLabels = document.querySelectorAll(".qa-answer-grid span");
  const labels = zh ? ["正确答案", "模型答案", "命中"] : ["Ground Truth", "Model Answer", "Hit"];
  answerLabels.forEach((item, index) => {
    item.textContent = labels[index] || item.textContent;
  });
  const resultSpans = document.querySelectorAll(".qa-result-card > span");
  const resultLabels = zh ? ["模型回答 / 思考过程", "匹配日志"] : ["Model Response / Reasoning Trace", "Matching Log"];
  resultSpans.forEach((item, index) => {
    item.textContent = resultLabels[index] || item.textContent;
  });
}

function updateHomeMetricText() {
  const values = state.lang === "en"
    ? [["Current Batch", "4796 Images / 12 Groups"], ["Workflow", "Draft + Review + QA"], ["Control", "Risk Queue + Sampling"]]
    : [["当前批次", "4796 张 / 12 组"], ["工作流", "草稿 + 复核 + QA"], ["质控", "风险队列 + 抽检"]];
  document.querySelectorAll(".home-metrics div").forEach((item, index) => {
    const span = item.querySelector("span");
    const strong = item.querySelector("strong");
    if (span && values[index]) span.textContent = values[index][0];
    if (strong && values[index]) strong.textContent = values[index][1];
  });
}

function updateDatasetHighlightText() {
  const values = state.lang === "en"
    ? [["Modalities", "RGB / IR / Metadata"], ["Conditions", "Rain · Snow · Fog · Haze"], ["Tasks", "Understanding · Restoration · Benchmark"]]
    : [["模态", "RGB / IR / Metadata"], ["条件", "Rain · Snow · Fog · Haze"], ["任务", "Understanding · Restoration · Benchmark"]];
  document.querySelectorAll(".dataset-highlights div").forEach((item, index) => {
    const span = item.querySelector("span");
    const strong = item.querySelector("strong");
    if (span && values[index]) span.textContent = values[index][0];
    if (strong && values[index]) strong.textContent = values[index][1];
  });
}

function updateDegradationLevelOptions() {
  const labels = state.lang === "en"
    ? {"": "Unannotated", low: "Low", medium: "Medium", high: "High"}
    : {"": "未标注", low: "小", medium: "中", high: "大"};
  document.querySelectorAll("#degradationLevel option").forEach((option) => {
    option.textContent = labels[option.value] || option.textContent;
  });
}

function updateDeployLanguage() {
  const hero = document.querySelector("#deployView .guide-hero");
  const toc = document.querySelector("#deployView .guide-toc");
  const content = document.querySelector("#deployView .guide-content");
  if (!hero || !toc || !content) return;
  if (!state.deployOriginal) {
    state.deployOriginal = { hero: hero.innerHTML, toc: toc.innerHTML, content: content.innerHTML };
  }
  if (state.lang !== "en") {
    hero.innerHTML = state.deployOriginal.hero;
    toc.innerHTML = state.deployOriginal.toc;
    content.innerHTML = state.deployOriginal.content;
    return;
  }
  setText("#deployView .guide-hero h2", "Deployment");
  setText("#deployView .guide-hero p", "Use the public address for preview. For production annotation, run the platform on the server that stores your images and model weights, or mount that storage to the platform server.");
  toc.innerHTML = `
    <h2>Contents</h2>
    <a href="#deploy-modes">Run Modes</a>
    <a href="#deploy-offline">Offline Workflow</a>
    <a href="#deploy-fast">Quick Start</a>
    <a href="#deploy-data">Data Placement</a>
    <a href="#deploy-public">Public Access</a>
    <a href="#deploy-domain">Domain and Production Service</a>
    <a href="#deploy-limits">Notes</a>
  `;
  content.innerHTML = `
    <section id="deploy-modes">
      <h2>1. Choose the Right Run Mode</h2>
      <table>
        <tr><th>Offline Demo</th><td>Runs on the current computer and binds to <code>127.0.0.1</code>. It uses <code>sample_data/</code> by default and is suitable for local trials, teaching, and air-gapped manual annotation previews.</td></tr>
        <tr><th>Online Demo</th><td>Opens the public hosted preview. It can only read files available on the hosted demo server, not a visitor's private computer or another team's server disk.</td></tr>
        <tr><th>Server Deployment</th><td>Runs on your own server or mounted storage. Server-folder import can then browse that machine's large image folders, TSV/XLSX files, and model outputs.</td></tr>
      </table>
    </section>
    <section id="deploy-offline">
      <h2>2. Complete Offline Demo Workflow</h2>
      <p>The offline demo is a local workflow for environments without public network access or for users who only need to try manual annotation and export. It uses <code>sample_data/</code> by default, does not bundle heavyweight model weights, and does not expose the machine to external visitors.</p>
      <ol>
        <li>Clone or copy the <code>UAIV-Labeler</code> repository to the local machine.</li>
        <li>Install dependencies with <code>pip install -r requirements.txt</code>.</li>
        <li>Start with <code>bash offline_demo/run_offline.sh</code>; Windows users can run <code>offline_demo\\run_offline.bat</code>.</li>
        <li>Open <code>http://127.0.0.1:7860</code> in the browser.</li>
        <li>Import <code>sample_data/images</code>, then try boxes, rotated boxes, point regions, save, and export.</li>
      </ol>
      <p>Online demo and server deployment are separate modes for public preview, team storage, mounted datasets, and real model services.</p>
    </section>
    <section id="deploy-fast">
      <h2>3. Quick Start</h2>
      <h3>Offline Demo</h3>
      <pre>cd /path/to/UAIV-Labeler
pip install -r requirements.txt
bash offline_demo/run_offline.sh</pre>
      <p>The offline demo opens at <code>http://127.0.0.1:7860</code> and is visible only on the current computer.</p>
      <h3>Server Deployment</h3>
      <p>Prepare a Python environment on the team server, enter the platform directory, and start the service:</p>
      <pre>cd /path/to/UAIV-Labeler
pip install -r requirements.txt
bash scripts/start_public.sh</pre>
      <p>Docker users can start a lightweight demo with:</p>
      <pre>docker compose up --build</pre>
      <p>Then open:</p>
      <pre>http://&lt;server-ip&gt;:7860</pre>
    </section>
    <section id="deploy-data">
      <h2>4. Data Placement</h2>
      <p>Place images, QA files, and evaluation results on the same server, for example:</p>
      <pre>/data/UAIV/images
/data/UAIV/QA/questions.tsv
/data/UAIV/QA/results.xlsx</pre>
      <p>For QA review, keep QA files and paired images in the same data area when possible. The platform can also match images through a manually specified QA image folder.</p>
    </section>
    <section id="deploy-public">
      <h2>5. Public Access</h2>
      <p>The current public demo address is:</p>
      <pre>http://8.137.184.86</pre>
      <p>For another deployment, open TCP port 7860 on that server and cloud security group:</p>
      <pre>http://&lt;server-ip&gt;:7860</pre>
      <p><code>127.0.0.1</code> is only for local access inside the server and should not be sent as the public link.</p>
    </section>
    <section id="deploy-domain">
      <h2>6. Domain and Production Service</h2>
      <p>For long-term public use, use Gunicorn + Nginx. Templates are provided:</p>
      <pre>deploy/nginx_annotation.conf
deploy/uaiv-labeler.service
deploy/DOMAIN_DEPLOYMENT.md</pre>
    </section>
    <section id="deploy-limits">
      <h2>7. Notes</h2>
      <ul>
        <li>The public demo can use the current Flask service; formal multi-user use should add authentication.</li>
        <li>Local upload is suitable for small QA files or small image batches. Large datasets should use server folders or mounted storage.</li>
        <li>YOLO, SegEarth, SAM, and custom models require matching environments and weights on the deployed server.</li>
      </ul>
    </section>
  `;
}

function setLanguageLabel() {
  const label = document.getElementById("languageSelect")?.closest("label");
  if (!label) return;
  for (const node of label.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      node.textContent = t("language");
      break;
    }
  }
}

function updateStaticOptions() {
  updateTaskDomainLabels();
  const source = document.getElementById("sourceTypeFilter");
  if (source) {
    source.querySelector('option[value=""]').textContent = t("all");
    source.querySelector('option[value="actual"]').textContent = t("actualData");
    source.querySelector('option[value="demo"]').textContent = t("demoData");
  }
  const review = document.getElementById("reviewStatus");
  if (review) {
    ["predicted", "labeled", "verified", "rejected"].forEach((value) => {
      const option = review.querySelector(`option[value="${value}"]`);
      if (option) option.textContent = statusName(value);
    });
  }
  const degradation = document.getElementById("degradationLabel")?.querySelector('option[value=""]');
  if (degradation) degradation.textContent = state.lang === "en" ? "None" : "无";
  ["taskFilter", "sceneFilter", "weatherFilter", "batchFilter", "importScene", "importWeather", "degradationLabel"].forEach((id) => {
    const option = document.getElementById(id)?.querySelector('option[value=""]');
    if (!option) return;
    if (id === "importScene") option.textContent = t("unannotated");
    else if (id === "importWeather") option.textContent = t("unknown");
    else if (id !== "degradationLabel") option.textContent = t("all");
  });
}

function updateTaskDomainLabels() {
  const select = document.getElementById("taskDomain");
  if (!select) return;
  const labels = {
    urban: t("domainUrban"),
    ecology: t("domainEcology"),
    restoration: t("domainRestoration"),
  };
  Object.entries(labels).forEach(([value, label]) => {
    const option = select.querySelector(`option[value="${value}"]`);
    if (option) option.textContent = label;
  });
  updateTaskDomainHint();
}

function bindTaskDomain() {
  const select = document.getElementById("taskDomain");
  const assistSelect = document.getElementById("assistMode");
  if (select) {
    select.value = state.taskDomain;
    select.addEventListener("change", () => {
      state.taskDomain = select.value;
      localStorage.setItem("uaiv_task_domain", state.taskDomain);
      applyTaskDomain();
    });
  }
  if (assistSelect) {
    assistSelect.value = state.assistMode;
    assistSelect.addEventListener("change", () => {
      state.assistMode = assistSelect.value;
      localStorage.setItem("uaiv_assist_mode", state.assistMode);
      if (state.annotation) renderForm();
      renderTaskAssist();
      updateInspectorTaskMode();
    });
  }
}

function isManualMode() {
  return state.assistMode === "manual";
}

function displayPrefillValue(container, keys, fallback = "") {
  if (isManualMode() && container?.status === "rule_prefill") return "";
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const key of keyList) {
    const value = container?.[key];
    if (Array.isArray(value) && value.length) return value.join("+");
    if (value) return value;
  }
  return isManualMode() ? "" : (fallback || "");
}

function applyTaskDomain() {
  const select = document.getElementById("taskDomain");
  if (select) select.value = state.taskDomain;
  const assistSelect = document.getElementById("assistMode");
  if (assistSelect) assistSelect.value = state.assistMode;
  document.querySelectorAll("[data-domain-field], [data-domain-block]").forEach((el) => {
    const domains = (el.dataset.domainField || el.dataset.domainBlock || "").split(/\s+/);
    el.classList.toggle("domain-hidden", !domains.includes(state.taskDomain));
  });
  const detectionVisible = state.taskDomain !== "restoration";
  ["newBoxLabel", "drawBoxMode", "addBox", "rerunPrediction"].forEach((id) => {
    document.getElementById(id)?.classList.toggle("domain-hidden", !detectionVisible);
  });
  setDefaultImportTasks();
  updateTaskDomainHint();
}

function updateTaskDomainHint() {
  const hint = document.getElementById("taskDomainHint");
  if (!hint) return;
  const key = {
    urban: "domainHintUrban",
    ecology: "domainHintEcology",
    restoration: "domainHintRestoration",
  }[state.taskDomain] || "domainHintUrban";
  hint.textContent = t(key);
}

function applyLabelTranslations() {
  const labels = [
    ["#folderPath", t("serverPath")],
    ["#taskDomain", t("selectTaskDomain")],
    ["#clientFolderFiles", t("localFolder")],
    ["#importBatch", t("batch")],
    ["#importAltitude", t("altitude")],
    ["#importLongitude", t("longitude")],
    ["#importLatitude", t("latitude")],
    ["#importScene", t("scene")],
    ["#importWeather", t("weather")],
    ["#importTasks", t("defaultTasks")],
    ["#taskFilter", t("task")],
    ["#sceneFilter", t("scene")],
    ["#weatherFilter", t("weather")],
    ["#batchFilter", t("batch")],
    ["#sourceTypeFilter", t("sourceType")],
    ["#minAltitude", t("minAltitude")],
    ["#maxAltitude", t("maxAltitude")],
    ["#minLongitude", t("minLongitude")],
    ["#maxLongitude", t("maxLongitude")],
    ["#minLatitude", t("minLatitude")],
    ["#maxLatitude", t("maxLatitude")],
    ["#customModelName", t("modelName")],
    ["#customModelTask", t("taskType")],
    ["#customModelUrl", t("apiUrl")],
    ["#reviewStatus", t("reviewStatus")],
    ["#sceneLabel", t("scene")],
    ["#environmentLabel", t("environment")],
    ["#eventLabel", t("event")],
    ["#qaQuestion", t("qaQuestion")],
    ["#qaAnswer", t("qaAnswer")],
    ["#degradationLabel", t("degradation")],
    ["#degradationLevel", t("degradationLevel")],
    ["#clearPairId", t("clearPair")],
    ["#urbanStructure", t("urbanStructure")],
  ];
  for (const [selector, text] of labels) {
    const field = document.querySelector(selector);
    const label = field?.closest("label");
    if (!label) continue;
    for (const node of label.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.textContent = text;
        break;
      }
    }
  }
  const recursive = document.getElementById("importRecursive")?.closest("label");
  if (recursive) {
    const textNode = Array.from(recursive.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) textNode.textContent = ` ${t("recursive")}`;
  }
}

function renderGuide() {
  const toc = document.querySelector("#guideView .guide-toc");
  const content = document.querySelector("#guideView .guide-content");
  if (!toc || !content) return;
  if (!state.guideOriginal) {
    state.guideOriginal = { toc: toc.innerHTML, content: content.innerHTML };
  }
  if (state.lang === "en") {
    toc.innerHTML = `
      <h2>${t("toc")}</h2>
      <a href="#guide-purpose">Platform Purpose</a>
      <a href="#guide-developer">Developer</a>
      <a href="#guide-files">Data Files</a>
      <a href="#guide-import">Data Import</a>
      <a href="#guide-filter">List and Filters</a>
      <a href="#guide-metadata">Metadata</a>
      <a href="#guide-annotation">Manual Annotation</a>
      <a href="#guide-models">Model Pre-Annotation</a>
      <a href="#guide-save">Saving and Shortcuts</a>
      <a href="#guide-export">Export</a>
      <a href="#guide-faq">FAQ</a>
      <a href="#guide-workflow">Recommended Workflow</a>
    `;
    content.innerHTML = `
      <section id="guide-purpose">
        <h2>1. Platform Purpose</h2>
        <p>This platform is designed for semi-automatic annotation of low-altitude UAV remote-sensing images. It supports urban foundation-model tasks, ecological foundation-model tasks, and image restoration data construction. Its core value is not only drawing boxes, but organizing Metadata, multi-task annotations, model pre-annotation, custom model integration, and Benchmark export in one reproducible workflow.</p>
      </section>
      <section id="guide-developer">
        <h2>2. Developer</h2>
        <div class="developer-card">
          <div>
            <h3>Jiening Zhang</h3>
            <p>PhD student in Computer Science at UESTC. Research interests include Computer Vision, Remote Sensing Generation, Data-centric AI, Low-shot Detection, and low-altitude multimodal remote-sensing dataset construction.</p>
            <p>GitHub: <a href="https://github.com/JennyZhang0810/UAIV-Labeler" target="_blank" rel="noreferrer">https://github.com/JennyZhang0810/UAIV-Labeler</a></p>
          </div>
          <div class="developer-tags">
            <span>Remote Sensing</span><span>Data-centric AI</span><span>Low-shot Detection</span><span>UAV Dataset</span><span>Benchmark</span>
          </div>
        </div>
      </section>
      <section id="guide-files">
        <h2>3. Data and File Locations</h2>
        <table><tbody>
          <tr><th>Metadata</th><td><code>data/metadata.json</code></td></tr>
          <tr><th>Saved annotations</th><td><code>data/annotations.json</code></td></tr>
          <tr><th>Server exports</th><td><code>exports/</code></td></tr>
          <tr><th>Full guide</th><td><code>USER_GUIDE.md</code></td></tr>
        </tbody></table>
      </section>
      <section id="guide-import">
        <h2>4. Data Import</h2>
        <h3>Server Folder</h3>
        <p>Use this when images are already available on the platform server or mounted storage. The platform creates an index for large image collections without duplicating original files.</p>
        <ol><li>Select <strong>Server Folder</strong>.</li><li>Enter a path or click <strong>Browse</strong>.</li><li>Fill batch, altitude, longitude, latitude, weather, scene, and default tasks.</li><li>Click <strong>Start Import</strong> or <strong>Use Current Folder</strong>.</li></ol>
        <h3>Local Computer</h3>
        <p>Use this for small local trials or supplemental batches. The platform uploads the selected images and indexes them automatically.</p>
        <p>After import, a toast shows the scanned, imported, and skipped counts.</p>
      </section>
      <section id="guide-filter">
        <h2>5. Image List and Filters</h2>
        <p>The image list shows image ID, scene, batch, weather, altitude, tasks, review status, and source type. Source types are <strong>Actual Data</strong> and <strong>Demo</strong>. Filters include task, scene, weather, batch, source type, and altitude range. Filters only narrow the already imported/indexed image set; they do not rescan folders or modify source data.</p>
      </section>
      <section id="guide-metadata">
        <h2>6. Metadata</h2>
        <p>The Metadata panel shows file path, batch, capture time, flight altitude, longitude, latitude, weather, scene, tasks, image size, and source folder. If a field is shown as not extracted or empty, the image has no readable EXIF/GPS data or no default value was provided during import.</p>
      </section>
      <section id="guide-annotation">
        <h2>7. Manual Annotation</h2>
        <h3>Draw Box</h3>
        <p>Enter an object label in the toolbar, such as <code>ship</code>, <code>vehicle</code>, or <code>person</code>, click <strong>Draw Box</strong>, then drag on the image to create a bbox. The object list on the right can edit labels and coordinates.</p>
        <h3>Rotated Box</h3>
        <p>Enter an angle, click <strong>Rotated Box</strong>, then drag on the image. The angle is stored in the object's <code>rotation</code> field and is preserved in JSON/COCO/VOC exports.</p>
        <h3>Point Region</h3>
        <p>Click <strong>Point Region</strong>, add polygon vertices on the image, then click <strong>Finish Region</strong> or double-click after at least three points. The result is saved as <code>segments[].points</code> for roads, water, wetlands, farmland, and other regions.</p>
        <h3>SAM Prompt Points</h3>
        <p>Click <strong>SAM Points</strong>, add one or more foreground prompt points on the image, then click <strong>Run SAM</strong>. The platform forwards the image path, Metadata, current annotation, and prompt points to a separate SAM-style HTTP service. Returned masks are appended to <code>segments[]</code> for human review and editing.</p>
        <h3>Edit Geometry</h3>
        <p>Click <strong>Edit Geometry</strong>, then select an existing box or polygon. Drag inside a box to move it, drag box handles to resize it, drag polygon vertices to refine boundaries, or drag inside a polygon to move the whole region.</p>
        <h3>Add Box</h3>
        <p>This creates a default editable box near the image center. Use it for quick placement; use <strong>Draw Box</strong> when the box location needs to be drawn precisely.</p>
        <h3>Review Fields</h3>
        <p>The review panel edits scene, environment, event, QA, image restoration pair, and urban structure fields.</p>
      </section>
      <section id="guide-models">
        <h2>8. Model Pre-Annotation</h2>
        <p>The object-detection backend is <code>s2det-yolov8s</code>, used for low-altitude remote-sensing object pre-annotation. SegEarth-OV is used for semantic-segmentation pre-annotation. A toast is shown after each model run even when no valid annotation is produced.</p>
        <h3>Custom Model Integration</h3>
        <p>If your team has an existing detector, segmenter, OCR model, or multi-task model, connect it in the Custom Model Integration block to generate initial annotations for human review.</p>
        <p>For advanced integration, the service should receive the current image information and return standard annotation results such as boxes, masks, OCR text, events, or QA items.</p>
        <pre>{
  "objects": [
    {"label": "vehicle", "bbox": [120, 80, 60, 40], "score": 0.91, "status": "model:custom"}
  ],
  "segments": [],
  "ocr": [],
  "events": []
}</pre>
        <h3>How should SAM be connected?</h3>
        <p>Use <strong>SAM Points</strong> and <strong>Run SAM</strong> in the toolbar after enabling the remote <code>sam3</code> backend in <code>config/model_backends.json</code>. The Web app stays lightweight, while SAM/SAM2/SAM3 runs as a separate GPU HTTP service.</p>
      </section>
      <section id="guide-save">
        <h2>9. Saving and Shortcuts</h2>
        <ul><li>Click <strong>Save Review</strong>: writes to <code>data/annotations.json</code>.</li><li><code>Ctrl+S</code> / <code>Command+S</code>: save and move to the next image.</li><li><code>ArrowRight</code>: next image.</li><li><code>ArrowLeft</code>: previous image.</li><li><code>Ctrl+Z</code> / <code>Command+Z</code>: undo the previous action.</li></ul>
        <p><strong>Clear All</strong> clears objects, segments, OCR, events, restoration, and structure fields for the current image. <strong>Re-annotate</strong> regenerates the current pre-annotation and can be undone before saving.</p>
      </section>
      <section id="guide-export">
        <h2>10. Export</h2>
        <p>Export buttons are split into <strong>Server Export</strong> and <strong>Local Download</strong>. Server exports are written to <code>exports/</code>; local downloads are downloaded by the browser. VOC is packed as <code>voc.zip</code>.</p>
        <table><tbody><tr><th>JSON</th><td>Full Metadata and annotations for archiving and platform reuse.</td></tr><tr><th>COCO</th><td>For object detection training and evaluation.</td></tr><tr><th>VOC</th><td>One XML file per image for traditional detection pipelines.</td></tr><tr><th>QA</th><td>JSONL for event understanding and large-model Benchmarks.</td></tr></tbody></table>
      </section>
      <section id="guide-faq">
        <h2>11. FAQ</h2>
        <h3>Why can model results still be weak?</h3><p>The object detector has been switched to <code>s2det-yolov8s</code>, which is more relevant than the original general model. Different datasets can still vary in altitude, weather, viewpoint, and label distribution. The next step is to train a UAIV-specific model using reviewed platform data.</p>
        <h3>Why do some images have no longitude or latitude?</h3><p>The platform tries to read EXIF/GPS. If the image has no readable GPS and no default longitude/latitude/altitude was provided during import, the field stays empty.</p>
        <h3>Why do some old images already have boxes?</h3><p>Earlier versions generated mock pre-annotations automatically. Saved old boxes are not deleted automatically to avoid losing review data; use <strong>Clear All</strong> and save if needed.</p>
        <h3>Are geometry coordinates in original image coordinates?</h3><p>Yes. The frontend may scale large images for display, but saved and exported bbox values, rotation angles, and polygon points use original image coordinates.</p>
      </section>
      <section id="guide-workflow">
        <h2>12. Recommended Workflow</h2>
        <ol><li>Import a batch of images and fill default Metadata.</li><li>Use filters to select a task subset.</li><li>Run the relevant model for pre-annotation.</li><li>Manually review boxes, scene, events, and QA.</li><li>Use <code>Ctrl+S</code> to save and move to the next image.</li><li>Refresh statistics regularly to check progress.</li><li>Export JSON, COCO, VOC, or QA by stage.</li><li>Train a better low-altitude remote-sensing model and connect it back to the platform.</li></ol>
      </section>
    `;
    return;
  }
  toc.innerHTML = state.guideOriginal.toc;
  content.innerHTML = state.guideOriginal.content;
}

function bindCustomModel() {
  document.getElementById("runCustomModel").addEventListener("click", runCustomModel);
}

function bindQaTools() {
  const browseButton = document.getElementById("qaBrowseFolder");
  if (!browseButton) return;
  browseButton.addEventListener("click", async () => {
    try {
      await browseQaFiles(document.getElementById("qaFolderPath").value.trim());
    } catch (err) {
      showToast(t("browseFailed"), err.message, "error", 9000);
    }
  });
  document.getElementById("loadQaTsv").addEventListener("click", () => loadQaTsv().catch((err) => showToast("QA TSV", err.message, "error", 9000)));
  document.getElementById("loadQaResult").addEventListener("click", () => loadQaResult().catch((err) => showToast("QA Result", err.message, "error", 9000)));
  document.getElementById("useQaTsvPath").addEventListener("click", () => loadQaTsv().catch((err) => showToast("QA TSV", err.message, "error", 9000)));
  document.getElementById("useQaXlsxPath").addEventListener("click", () => loadQaResult().catch((err) => showToast("QA Result", err.message, "error", 9000)));
  document.getElementById("qaLocalFile").addEventListener("change", updateQaLocalSummary);
  document.getElementById("uploadQaLocalFile").addEventListener("click", uploadQaLocalFile);
  document.getElementById("qaLocalImageFiles").addEventListener("change", updateQaLocalImageSummary);
  document.getElementById("uploadQaLocalImages").addEventListener("click", uploadQaLocalImages);
  document.getElementById("qaImageRoot").addEventListener("input", (event) => {
    state.qa.imageRoot = event.target.value.trim();
    refreshQaImages();
  });
  document.getElementById("qaTsvPrev").addEventListener("click", () => loadQaTsvItem(state.qa.tsvIndex - 1).catch((err) => showToast("QA TSV", err.message, "error", 9000)));
  document.getElementById("qaTsvNext").addEventListener("click", () => loadQaTsvItem(state.qa.tsvIndex + 1).catch((err) => showToast("QA TSV", err.message, "error", 9000)));
  document.getElementById("qaTsvJump").addEventListener("click", () => loadQaTsvItem(Number(document.getElementById("qaTsvRow").value) - 1).catch((err) => showToast("QA TSV", err.message, "error", 9000)));
  document.getElementById("qaTsvSave").addEventListener("click", () => saveQaTsv(true).catch((err) => showToast("QA TSV", err.message, "error", 9000)));
  document.getElementById("qaResultPrev").addEventListener("click", () => loadQaResultItem(state.qa.resultIndex - 1).catch((err) => showToast("QA Result", err.message, "error", 9000)));
  document.getElementById("qaResultNext").addEventListener("click", () => loadQaResultItem(state.qa.resultIndex + 1).catch((err) => showToast("QA Result", err.message, "error", 9000)));
  document.getElementById("qaResultJump").addEventListener("click", () => loadQaResultItem(Number(document.getElementById("qaResultRow").value) - 1).catch((err) => showToast("QA Result", err.message, "error", 9000)));
}

function updateQaLocalImageSummary() {
  const files = document.getElementById("qaLocalImageFiles").files;
  document.getElementById("qaLocalImageSummary").textContent = files.length
    ? t("qaImagesSelected")(files.length)
    : t("qaNoLocalImages");
}

async function uploadQaLocalImages() {
  const files = Array.from(document.getElementById("qaLocalImageFiles").files);
  if (!files.length) {
    showToast("QA Images", t("qaChooseLocalImages"), "warning");
    return;
  }
  try {
    const form = new FormData();
    for (const file of files) {
      form.append("files", file, file.webkitRelativePath || file.name);
    }
    const result = await api("/api/qa/upload-images", {
      method: "POST",
      body: form,
    });
    state.qa.imageRoot = result.folder;
    document.getElementById("qaImageRoot").value = result.folder;
    document.getElementById("qaLocalImageSummary").textContent = t("qaImagesUploadedSummary")(result.saved, result.folder);
    refreshQaImages();
    showToast(t("qaImagesUploadDone"), t("qaImagesUploadedMsg")(result.saved), "success");
  } catch (err) {
    showToast("QA Images", err.message, "error", 9000);
  }
}

function updateQaLocalSummary() {
  const file = document.getElementById("qaLocalFile").files[0];
  document.getElementById("qaLocalUploadSummary").textContent = file
    ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
    : t("qaNoLocalFile");
}

async function uploadQaLocalFile() {
  const file = document.getElementById("qaLocalFile").files[0];
  if (!file) {
    showToast("QA Upload", t("qaChooseLocalFile"), "warning");
    return;
  }
  try {
    const form = new FormData();
    form.append("file", file, file.name);
    const result = await api("/api/qa/upload-file", {
      method: "POST",
      body: form,
    });
    if (result.suffix === ".tsv") {
      document.getElementById("qaTsvPath").value = result.path;
    } else {
      document.getElementById("qaXlsxPath").value = result.path;
    }
    ensureQaImageRootForLocalUpload();
    document.getElementById("qaLocalUploadSummary").textContent = t("qaFileUploadedSummary")(result.path);
    showToast(t("qaUploadDone"), t("qaFileUploadedMsg"), "success");
    if (result.suffix === ".tsv") {
      await loadQaTsv();
    } else {
      await loadQaResult();
    }
  } catch (err) {
    showToast("QA Upload", err.message, "error", 9000);
  }
}

function ensureQaImageRootForLocalUpload() {
  const input = document.getElementById("qaImageRoot");
  if (!input || input.value.trim()) return;
  const currentQaFolder = document.getElementById("qaFolderPath")?.value.trim();
  if (currentQaFolder) {
    input.value = currentQaFolder;
    state.qa.imageRoot = currentQaFolder;
  }
}

function refreshQaImages() {
  if (state.qa.tsvPath && state.qa.tsvTotal) {
    loadQaTsvItem(state.qa.tsvIndex);
  }
  if (state.qa.resultPath && state.qa.resultTotal) {
    loadQaResultItem(state.qa.resultIndex);
  }
}

async function browseQaFiles(path = "") {
  const query = path ? `?path=${encodeURIComponent(path)}&ext=.tsv,.xlsx` : "?ext=.tsv,.xlsx";
  const data = await api(`/api/qa/browse${query}`);
  state.qa.browsePath = data.path;
  document.getElementById("qaFolderPath").value = data.path;
  const browser = document.getElementById("qaFileBrowser");
  browser.dataset.loaded = "1";
  const parentButton = data.parent
    ? `<button class="folder-row parent" data-qa-dir="${data.parent}" type="button">${t("backParent")}</button>`
    : "";
  const dirRows = data.dirs.map((item) => `<button class="folder-row" data-qa-dir="${item.path}" type="button">${item.name}</button>`).join("");
  const fileRows = data.files
    .map((item) => `<button class="folder-row qa-file-row" data-qa-file="${item.path}" data-suffix="${item.suffix}" type="button">${item.name}</button>`)
    .join("");
  browser.innerHTML = `<div class="folder-rows">${parentButton}${dirRows}${fileRows || `<div class="empty-row">${t("noSubdirs")}</div>`}</div>`;
  browser.querySelectorAll("[data-qa-dir]").forEach((button) => {
    button.addEventListener("click", () => browseQaFiles(button.dataset.qaDir).catch((err) => showToast(t("browseFailed"), err.message, "error", 9000)));
  });
  browser.querySelectorAll("[data-qa-file]").forEach((button) => {
    const target = button.dataset.suffix === ".tsv" ? "qaTsvPath" : "qaXlsxPath";
    button.addEventListener("click", async () => {
      document.getElementById(target).value = button.dataset.qaFile;
      if (button.dataset.suffix === ".tsv") {
        state.qa.selectedTsvPath = button.dataset.qaFile;
      } else {
        state.qa.selectedXlsxPath = button.dataset.qaFile;
      }
      setQaImageRootFromFile(button.dataset.qaFile, true);
      showToast(t("qaFileSelected"), t("qaFileSelectedMsg")(button.dataset.suffix.toUpperCase()), "info", 4200);
      if (button.dataset.suffix === ".tsv") {
        await loadQaTsv();
      } else {
        await loadQaResult();
      }
    });
  });
  showToast(t("qaBrowseDone"), t("qaBrowseDoneMsg")(data.path), "success", 3600);
}

function setQaImageRootFromFile(filePath, force = false) {
  const input = document.getElementById("qaImageRoot");
  if (!input || !filePath) return;
  if (!force && input.value.trim()) return;
  const normalized = String(filePath).replaceAll("\\", "/");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return;
  const root = normalized.slice(0, index);
  input.value = root;
  state.qa.imageRoot = root;
}

async function loadQaTsv() {
  const input = document.getElementById("qaTsvPath");
  const path = input.value.trim() || state.qa.selectedTsvPath || "";
  if (!path) {
    showToast("QA TSV", t("qaChooseTsv"), "warning");
    return;
  }
  input.value = path;
  setQaImageRootFromFile(path, false);
  state.qa.tsvPath = path;
  const meta = await api(`/api/qa/tsv/meta?path=${encodeURIComponent(path)}`);
  state.qa.tsvTotal = meta.total;
  document.getElementById("qaTsvMeta").textContent = `${meta.title} · ${meta.total} rows · clean ${meta.clean_count}`;
  document.getElementById("qaTsvStatus").textContent = t("qaTsvLoadedStatus");
  await loadQaTsvItem(0);
  showToast(t("qaLoadDone"), t("qaTsvLoadMsg")(meta.total), "success");
}

async function loadQaTsvItem(index) {
  if (!state.qa.tsvPath || !state.qa.tsvTotal) return;
  const safeIndex = Math.max(0, Math.min(state.qa.tsvTotal - 1, Number.isFinite(index) ? index : 0));
  const item = await api(`/api/qa/tsv/item?path=${encodeURIComponent(state.qa.tsvPath)}&i=${safeIndex}`);
  state.qa.tsvIndex = safeIndex;
  document.getElementById("qaTsvRow").value = safeIndex + 1;
  document.getElementById("qaTsvMeta").textContent = `${item.row_number} / ${item.total} · ${item.category || ""} · ${item["l2-category"] || ""}`;
  document.getElementById("qaQuestionEdit").value = item.question || "";
  document.getElementById("qaOptionA").value = item.A || "";
  document.getElementById("qaOptionB").value = item.B || "";
  document.getElementById("qaOptionC").value = item.C || "";
  document.getElementById("qaOptionD").value = item.D || "";
  setQaAnswer(item.answer || "");
  setQaImage("qaTsvImage", item);
  document.getElementById("qaTsvStatus").textContent = qaImageReference(item) || t("qaNoImageInfo");
}

function getQaAnswer() {
  return Array.from(document.querySelectorAll(".answer-checks input:checked")).map((item) => item.value).join(",");
}

function setQaAnswer(answer) {
  const values = new Set(String(answer || "").split(/[，,;；\s]+/).map((item) => item.trim().toUpperCase()));
  document.querySelectorAll(".answer-checks input").forEach((input) => {
    input.checked = values.has(input.value);
  });
}

async function saveQaTsv(goNext = false) {
  if (!state.qa.tsvPath) return;
  const payload = {
    question: document.getElementById("qaQuestionEdit").value,
    A: document.getElementById("qaOptionA").value,
    B: document.getElementById("qaOptionB").value,
    C: document.getElementById("qaOptionC").value,
    D: document.getElementById("qaOptionD").value,
    answer: getQaAnswer(),
  };
  const result = await api(`/api/qa/tsv/save?path=${encodeURIComponent(state.qa.tsvPath)}&i=${state.qa.tsvIndex}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  document.getElementById("qaTsvStatus").textContent = `${result.message} · ${result.clean_path}`;
  showToast("QA TSV", result.message, "success");
  if (goNext) await loadQaTsvItem(state.qa.tsvIndex + 1);
}

async function loadQaResult() {
  const input = document.getElementById("qaXlsxPath");
  const path = input.value.trim() || state.qa.selectedXlsxPath || "";
  if (!path) {
    showToast("QA Result", t("qaChooseXlsx"), "warning");
    return;
  }
  input.value = path;
  setQaImageRootFromFile(path, false);
  state.qa.resultPath = path;
  state.qa.wrongOnly = document.getElementById("qaWrongOnly").checked;
  const meta = await api(`/api/qa/result/meta?path=${encodeURIComponent(path)}&wrong=${state.qa.wrongOnly ? 1 : 0}`);
  state.qa.resultTotal = meta.total;
  document.getElementById("qaResultMeta").textContent = `${meta.title} · ${meta.total} rows`;
  document.getElementById("qaResultQuestion").textContent = t("qaResultLoading");
  await loadQaResultItem(0);
  showToast(t("qaLoadDone"), t("qaXlsxLoadMsg")(meta.total), "success");
}

async function loadQaResultItem(index) {
  if (!state.qa.resultPath || !state.qa.resultTotal) return;
  const safeIndex = Math.max(0, Math.min(state.qa.resultTotal - 1, Number.isFinite(index) ? index : 0));
  const item = await api(`/api/qa/result/item?path=${encodeURIComponent(state.qa.resultPath)}&wrong=${state.qa.wrongOnly ? 1 : 0}&i=${safeIndex}`);
  state.qa.resultIndex = safeIndex;
  document.getElementById("qaResultRow").value = safeIndex + 1;
  document.getElementById("qaResultMeta").textContent = `${item.row_number} / ${item.total} · ${item.category || ""} · ${item["l2-category"] || ""}`;
  document.getElementById("qaResultQuestion").textContent = item.question || "";
  const answerSet = parseQaLetters(item.answer);
  const predSet = parseQaLetters(item.parsed_answer);
  document.getElementById("qaResultOptions").innerHTML = ["A", "B", "C", "D"].map((key) => {
    const classes = ["qa-result-option"];
    if (answerSet.has(key)) classes.push("answer");
    if (predSet.has(key)) classes.push("pred");
    return `<div class="${classes.join(" ")}"><b>${key}</b><span>${escapeHtml(item[key] || "")}</span></div>`;
  }).join("");
  document.getElementById("qaResultAnswer").textContent = item.answer || "-";
  document.getElementById("qaResultParsed").textContent = item.parsed_answer || "-";
  const hitText = String(item.hit || "") === "1" ? "Correct" : (String(item.hit || "") === "0" ? "Wrong" : item.hit || "-");
  document.getElementById("qaResultHit").textContent = hitText;
  document.getElementById("qaResultPrediction").textContent = item.prediction || "";
  document.getElementById("qaResultLog").textContent = item.log || "";
  setQaImage("qaResultImage", item);
}

function parseQaLetters(value) {
  return new Set(String(value || "").split(/[，,;；\s]+/).map((item) => item.trim().toUpperCase()).filter((item) => ["A", "B", "C", "D"].includes(item)));
}

function qaImageReference(item) {
  return item.image_path || item.img_path || item.image || item.file_name || item.filename || item.image_name || item.file || item.id || item.index || "";
}

function setQaImage(id, itemOrPath) {
  const image = document.getElementById(id);
  const imagePath = typeof itemOrPath === "string" ? itemOrPath : qaImageReference(itemOrPath || {});
  if (!imagePath && !state.qa.imageRoot && !document.getElementById("qaImageRoot")?.value.trim()) {
    image.removeAttribute("src");
    return;
  }
  image.onerror = () => {
    const statusId = id === "qaTsvImage" ? "qaTsvStatus" : "";
    if (statusId) {
      document.getElementById(statusId).textContent = t("qaImageMissing");
    }
  };
  const imageRoot = document.getElementById("qaImageRoot")?.value.trim() || state.qa.imageRoot || "";
  const rootQuery = imageRoot ? `&image_root=${encodeURIComponent(imageRoot)}` : "";
  const filename = imagePath || "";
  image.src = `/api/qa/image?path=${encodeURIComponent(imagePath || "")}&filename=${encodeURIComponent(filename)}${rootQuery}&t=${Date.now()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindViewSwitching() {
  const home = document.getElementById("homeView");
  const workbench = document.getElementById("workbenchView");
  const qaTools = document.getElementById("qaToolsView");
  const deploy = document.getElementById("deployView");
  const guide = document.getElementById("guideView");
  const homeButton = document.getElementById("showHome");
  const workbenchButton = document.getElementById("showWorkbench");
  const qaToolsButton = document.getElementById("showQaTools");
  const deployButton = document.getElementById("showDeploy");
  const guideButton = document.getElementById("showGuide");
  function showView(name) {
    home.classList.toggle("hidden", name !== "home");
    workbench.classList.toggle("hidden", name !== "workbench");
    qaTools.classList.toggle("hidden", name !== "qa");
    deploy.classList.toggle("hidden", name !== "deploy");
    guide.classList.toggle("hidden", name !== "guide");
    homeButton.classList.toggle("active", name === "home");
    workbenchButton.classList.toggle("active", name === "workbench");
    qaToolsButton.classList.toggle("active", name === "qa");
    deployButton.classList.toggle("active", name === "deploy");
    guideButton.classList.toggle("active", name === "guide");
    document.querySelectorAll("[data-rail-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.railView === name);
    });
    if (name !== "workbench") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  homeButton.addEventListener("click", () => {
    showView("home");
  });
  workbenchButton.addEventListener("click", () => {
    showView("workbench");
  });
  qaToolsButton.addEventListener("click", async () => {
    showView("qa");
    if (!document.getElementById("qaFileBrowser").dataset.loaded) {
      try {
        await browseQaFiles();
      } catch (err) {
        showToast(t("browseFailed"), err.message, "error", 9000);
      }
    }
  });
  deployButton.addEventListener("click", () => {
    showView("deploy");
  });
  guideButton.addEventListener("click", () => {
    showView("guide");
  });
  document.querySelectorAll("[data-rail-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      const view = button.dataset.railView;
      if (view === "home") {
        homeButton.click();
      } else if (view === "workbench") {
        workbenchButton.click();
      } else if (view === "qa") {
        qaToolsButton.click();
      } else if (view === "deploy") {
        deployButton.click();
      } else if (view === "guide") {
        guideButton.click();
      }
    });
  });
  document.querySelectorAll("[data-home-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.homeAction === "qa") qaToolsButton.click();
      else workbenchButton.click();
    });
  });
  document.querySelectorAll("[data-home-domain]").forEach((button) => {
    button.addEventListener("click", () => {
      state.taskDomain = button.dataset.homeDomain;
      localStorage.setItem("uaiv_task_domain", state.taskDomain);
      applyTaskDomain();
      workbenchButton.click();
    });
  });
}

function renderModels() {
  const list = document.getElementById("modelList");
  const visibleModels = state.models
    .filter((model) => model.id !== "remote_detector");
  list.innerHTML = visibleModels
    .map((model) => {
      const runnable = model.status === "ready";
      const disabled = runnable ? "" : "disabled";
      const messages = (model.health?.messages || []).map((msg) => `<li>${msg}</li>`).join("");
      return `
        <div class="model-card ${model.status}">
          <div>
            <strong>${model.name}</strong>
            <span>${model.provider} · ${model.task} · ${model.mode}</span>
            <p>${model.description}</p>
            <ul>${messages}</ul>
          </div>
          <button data-model="${model.id}" ${disabled}>${runnable ? t("run") : statusName(model.status)}</button>
        </div>`;
    })
    .join("");
  list.querySelectorAll("[data-model]").forEach((button) => {
    button.addEventListener("click", () => runRegisteredModel(button.dataset.model, button));
  });
  updateBatchModelSelect(visibleModels);
  updateSamControls();
}

function updateBatchModelSelect(models) {
  const select = document.getElementById("batchModelSelect");
  if (!select) return;
  const runnableModels = models.filter((model) => model.status === "ready" && model.id !== "mock_backend" && model.id !== "remote_detector");
  select.innerHTML = runnableModels.length
    ? runnableModels.map((model) => `<option value="${model.id}">${escapeHtml(model.name)} · ${escapeHtml(model.task)}</option>`).join("")
    : `<option value="">${t("batchModelMissing")}</option>`;
}

function batchModelPayload(dryRun = true) {
  const includeStages = ["no_annotation", "empty_annotation"];
  if (document.getElementById("batchIncludeRulePrefill")?.checked) includeStages.push("rule_prefill");
  return {
    dry_run: dryRun,
    filters: filtersObject(),
    include_stages: includeStages,
    limit: Number(document.getElementById("batchModelLimit")?.value || 20),
  };
}

async function runBatchModel(dryRun = true) {
  const select = document.getElementById("batchModelSelect");
  const modelId = select?.value;
  const model = state.models.find((item) => item.id === modelId);
  if (!modelId || model?.status !== "ready") {
    showToast(t("batchModelFailed"), t("batchModelMissing"), "warning", 6000);
    return;
  }
  const previewButton = document.getElementById("previewBatchModel");
  const runButton = document.getElementById("runBatchModel");
  const summary = document.getElementById("batchModelSummary");
  try {
    previewButton.disabled = true;
    runButton.disabled = true;
    const preview = await api(`/api/predict-model-batch/${modelId}`, {
      method: "POST",
      body: JSON.stringify(batchModelPayload(true)),
    });
    const previewMessage = t("batchModelSummary")(preview);
    if (summary) summary.textContent = previewMessage;
    if (dryRun) {
      document.getElementById("statusText").textContent = previewMessage;
      showToast(t("batchModelPreviewTitle"), previewMessage, "info", 8000);
      return;
    }
    if (!preview.candidate_count) {
      showToast(t("batchModelDoneTitle"), previewMessage, "info", 6000);
      return;
    }
    if (!window.confirm(t("batchModelConfirm")(preview.candidate_count, model.name || modelId))) return;
    showProcessing(t("batchModelDoneTitle"), state.lang === "en" ? "Running batch model..." : "正在批量运行模型...");
    const result = await api(`/api/predict-model-batch/${modelId}`, {
      method: "POST",
      body: JSON.stringify(batchModelPayload(false)),
    });
    const resultMessage = t("batchModelSummary")(result);
    if (summary) summary.textContent = resultMessage;
    document.getElementById("statusText").textContent = resultMessage;
    showToast(t("batchModelDoneTitle"), resultMessage, result.failed ? "warning" : "success", 9000);
    await loadImages();
    await loadStats();
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("batchModelFailed")}: ${err.message}`;
    showToast(t("batchModelFailed"), err.message, "error", 9000);
  } finally {
    hideProcessing();
    if (previewButton) previewButton.disabled = false;
    if (runButton) runButton.disabled = false;
  }
}

function eventShortcutKeys() {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
}

function environmentShortcutKeys() {
  return ["Q", "W", "E", "R", "T"];
}

function renderLabelShortcuts(panelId, labels, kind) {
  const panel = document.getElementById(panelId);
  if (!panel || !labels?.length) return;
  const keys = kind === "environment" ? environmentShortcutKeys() : eventShortcutKeys();
  const titleFn = kind === "environment" ? t("shortcutSelectEnvironment") : kind === "scene" ? t("shortcutSelectScene") : kind === "structure" ? t("shortcutSelectStructure") : t("shortcutSelectEvent");
  panel.innerHTML = labels
    .slice(0, keys.length)
    .map((label, index) => {
      const key = keys[index];
      const displayKey = kind === "environment" ? `Alt+${key}` : kind === "scene" ? `Alt+${key}` : kind === "structure" ? `Alt+Shift+${key}` : key;
      return `<button type="button" class="shortcut-chip ${kind}-shortcut" data-shortcut-kind="${kind}" data-shortcut-label="${escapeHtml(label)}" title="${escapeHtml(titleFn(key, label))}"><kbd>${escapeHtml(displayKey)}</kbd>${escapeHtml(label)}</button>`;
    })
    .join("");
  panel.querySelectorAll("[data-shortcut-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      applyLabelShortcut(button.dataset.shortcutKind, button.dataset.shortcutLabel, button.querySelector("kbd")?.textContent || "");
    });
  });
}

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || target?.isContentEditable;
}

function applyLabelShortcut(kind, label, displayKey) {
  const targetId = kind === "environment" ? "environmentLabel" : kind === "scene" ? "sceneLabel" : kind === "structure" ? "urbanStructure" : "eventLabel";
  const target = document.getElementById(targetId);
  if (!target || !label) return false;
  target.value = label;
  document.getElementById("reviewStatus").value = "labeled";
  syncFormToAnnotation();
  renderForm();
  const titleFn = kind === "environment" ? t("shortcutSelectEnvironment") : kind === "scene" ? t("shortcutSelectScene") : kind === "structure" ? t("shortcutSelectStructure") : t("shortcutSelectEvent");
  document.getElementById("statusText").textContent = titleFn(displayKey.replace("Alt+Shift+", "").replace("Alt+", ""), label);
  return true;
}

function applyKeyboardShortcut(key, altKey = false, shiftKey = false) {
  if (altKey && !shiftKey) {
    const envKeys = environmentShortcutKeys();
    const envIndex = envKeys.indexOf(String(key).toUpperCase());
    if (envIndex >= 0) {
      const label = state.config?.weather_labels?.[envIndex];
      if (!label) return false;
      applyLabelShortcut("environment", label, `Alt+${envKeys[envIndex]}`);
      return true;
    }
  }
  const keys = eventShortcutKeys();
  const index = keys.indexOf(key);
  if (index < 0) return false;
  const kind = altKey && shiftKey ? "structure" : altKey ? "scene" : "event";
  const labels = kind === "scene" ? state.config?.scene_labels : kind === "structure" ? state.config?.urban_structure_labels : state.config?.event_labels;
  const label = labels?.[index];
  if (!label) return false;
  applyLabelShortcut(kind, label, kind === "structure" ? `Alt+Shift+${key}` : altKey ? `Alt+${key}` : key);
  return true;
}

function samBackendReady() {
  return state.models.some((model) => model.id === "sam3" && model.status === "remote_configured");
}

function updateSamControls() {
  const ready = samBackendReady();
  const samButton = document.getElementById("samPromptMode");
  const runButton = document.getElementById("runSamPrompt");
  if (samButton) {
    samButton.disabled = false;
    samButton.classList.toggle("unavailable-tool", !ready);
    samButton.title = ready ? t("samPrompt") : t("samUnavailable");
  }
  if (runButton) {
    runButton.disabled = false;
    runButton.classList.toggle("unavailable-tool", !ready);
    runButton.title = ready ? t("runSamPrompt") : t("samUnavailable");
  }
}

async function runRegisteredModel(modelId, button = null) {
  if (!state.currentId) {
    document.getElementById("statusText").textContent = t("selectImage");
    showToast(t("selectImage"), t("selectImageForModel"), "warning");
    return;
  }
  const model = state.models.find((item) => item.id === modelId);
  const modelName = model?.name || modelId;
  document.getElementById("statusText").textContent = state.lang === "en" ? `Running model: ${modelId}` : `正在运行模型：${modelId}`;
  showToast(t("modelStart"), t("modelRunning")(modelName), "info", 2600);
  showProcessing(t("modelStart"), t("modelRunning")(modelName));
  if (button) button.disabled = true;
  try {
    state.annotation = await api(`/api/images/${state.currentId}/predict-model/${modelId}`, { method: "POST" });
    renderForm();
    renderObjects();
    renderSegments();
    drawCanvas();
    await loadStats();
    const summary = annotationSummary(state.annotation);
    document.getElementById("statusText").textContent = t("modelStatusDone")(modelId, summary.text);
    showToast(t("modelDone"), t("modelDoneMsg")(modelName, summary.text), summary.total > 0 ? "success" : "warning");
  } catch (err) {
    document.getElementById("statusText").textContent = t("modelStatusFailed")(err.message);
    showToast(t("modelFailed"), err.message, "error", 9000);
  } finally {
    hideProcessing();
    if (button) button.disabled = false;
  }
}

async function runCustomModel() {
  if (!state.currentId) {
    document.getElementById("statusText").textContent = t("selectImage");
    showToast(t("selectImage"), t("selectImageForCustom"), "warning");
    return;
  }
  const name = document.getElementById("customModelName").value.trim() || "custom_model";
  const task = document.getElementById("customModelTask").value;
  const url = document.getElementById("customModelUrl").value.trim();
  if (!url) {
    showToast(t("customUrlMissing"), t("customUrlMissingMsg"), "warning");
    return;
  }
  const button = document.getElementById("runCustomModel");
  button.disabled = true;
  document.getElementById("statusText").textContent = state.lang === "en" ? `Running custom model: ${name}` : `正在运行自定义模型：${name}`;
  showToast(t("customStart"), t("customRunning")(name), "info", 2600);
  showProcessing(t("customStart"), t("customRunning")(name));
  try {
    state.annotation = await api(`/api/images/${state.currentId}/predict-custom`, {
      method: "POST",
      body: JSON.stringify({ name, task, url, timeout: 180 }),
    });
    renderForm();
    renderObjects();
    renderSegments();
    drawCanvas();
    await loadStats();
    const summary = annotationSummary(state.annotation);
    document.getElementById("statusText").textContent = t("customStatusDone")(summary.text);
    showToast(t("customDone"), t("customDoneMsg")(name, summary.text), summary.total > 0 ? "success" : "warning");
  } catch (err) {
    document.getElementById("statusText").textContent = t("customStatusFailed")(err.message);
    showToast(t("customFailed"), err.message, "error", 9000);
  } finally {
    hideProcessing();
    button.disabled = false;
  }
}

async function runSamPrompt() {
  if (!samBackendReady()) {
    showToast(t("samPromptFailed"), t("samUnavailable"), "warning", 7000);
    document.getElementById("statusText").textContent = t("samUnavailable");
    return;
  }
  if (!state.currentId) {
    showToast(t("selectImage"), t("selectImageForModel"), "warning");
    return;
  }
  if (!state.samPromptPoints.length) {
    showToast(t("samPromptNeedPoint"), t("samPromptOn"), "warning");
    return;
  }
  const button = document.getElementById("runSamPrompt");
  const label = document.getElementById("newBoxLabel").value.trim() || "region";
  button.disabled = true;
  document.getElementById("statusText").textContent = t("samPromptRunning");
  showToast(t("samPromptStart"), t("samPromptRunning"), "info", 2600);
  showProcessing(t("samPromptStart"), t("samPromptRunning"));
  try {
    state.annotation = await api(`/api/images/${state.currentId}/segment-prompt`, {
      method: "POST",
      body: JSON.stringify({ label, points: state.samPromptPoints }),
    });
    state.samPromptPoints = [];
    state.samPromptMode = false;
    document.getElementById("samPromptMode").classList.toggle("active-tool", false);
    document.getElementById("runSamPrompt").disabled = false;
    renderForm();
    renderObjects();
    renderSegments();
    drawCanvas();
    await loadStats();
    const summary = annotationSummary(state.annotation);
    document.getElementById("statusText").textContent = t("customStatusDone")(summary.text);
    showToast(t("samPromptDone"), summary.text, summary.total > 0 ? "success" : "warning");
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("samPromptFailed")}: ${err.message}`;
    showToast(t("samPromptFailed"), err.message, "error", 9000);
  } finally {
    hideProcessing();
    button.disabled = false;
  }
}

function showProcessing(title, message) {
  const overlay = document.getElementById("processingOverlay");
  if (!overlay) return;
  document.getElementById("processingTitle").textContent = title;
  document.getElementById("processingMessage").textContent = message;
  overlay.classList.remove("hidden");
}

function hideProcessing() {
  document.getElementById("processingOverlay")?.classList.add("hidden");
}

function annotationSummary(annotation) {
  const objects = annotation.objects?.length || 0;
  const segments = annotation.segments?.length || 0;
  const ocr = annotation.ocr?.length || 0;
  const events = annotation.events?.length || 0;
  const total = objects + segments + ocr + events;
  if (!total) {
    return { total, text: t("noResult") };
  }
  return {
    total,
    text: t("resultSummary")(objects, segments, ocr, events),
  };
}

function showToast(title, message, type = "info", duration = 5200) {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const heading = document.createElement("strong");
  heading.textContent = title;
  const body = document.createElement("p");
  body.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = t("close");
  close.addEventListener("click", () => toast.remove());
  toast.append(heading, body, close);
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), duration);
}

function fillSelect(id, values, names = {}, keepExisting = false) {
  const el = document.getElementById(id);
  if (!keepExisting) {
    el.innerHTML = "";
  }
  el.innerHTML += optionList(values, names);
}

function fillDatalist(id, values) {
  document.getElementById(id).innerHTML = values.map((value) => `<option value="${value}"></option>`).join("");
}

function filtersToQuery() {
  const params = new URLSearchParams();
  for (const [id, key] of filterControlPairs()) {
    const value = document.getElementById(id).value;
    if (value) params.set(key, value);
  }
  return params.toString();
}

function filterControlPairs() {
  return [
    ["taskFilter", "task"],
    ["sceneFilter", "scene"],
    ["weatherFilter", "weather"],
    ["batchFilter", "batch"],
    ["annotatorGroupFilter", "annotator_group"],
    ["sourceTypeFilter", "source_type"],
    ["minAltitude", "min_altitude"],
    ["maxAltitude", "max_altitude"],
    ["minLongitude", "min_longitude"],
    ["maxLongitude", "max_longitude"],
    ["minLatitude", "min_latitude"],
    ["maxLatitude", "max_latitude"],
  ];
}

function filtersObject() {
  const filters = {};
  for (const [id, key] of filterControlPairs()) {
    const value = document.getElementById(id).value;
    if (value) filters[key] = value;
  }
  return filters;
}

function activeFilterLabels() {
  const labels = [];
  const configs = [
    ["taskFilter", t("task")],
    ["sceneFilter", t("scene")],
    ["weatherFilter", t("weather")],
    ["batchFilter", t("batch")],
    ["annotatorGroupFilter", "标注组别"],
    ["sourceTypeFilter", t("sourceType")],
    ["minAltitude", t("minAltitude")],
    ["maxAltitude", t("maxAltitude")],
    ["minLongitude", t("minLongitude")],
    ["maxLongitude", t("maxLongitude")],
    ["minLatitude", t("minLatitude")],
    ["maxLatitude", t("maxLatitude")],
  ];
  for (const [id, label] of configs) {
    const el = document.getElementById(id);
    if (!el || !el.value) continue;
    const value = el.selectedOptions?.[0]?.textContent || el.value;
    labels.push(`${label}=${value}`);
  }
  return labels;
}

function currentListStatusCounts() {
  const counts = { total: state.images.length, labeled: 0, verified: 0, pending: 0, unlabeled: 0, rejected: 0 };
  for (const item of state.images) {
    const status = normalizeStatus(item.review_status);
    if (status === "labeled") counts.labeled += 1;
    else if (status === "verified") counts.verified += 1;
    else if (status === "predicted") counts.pending += 1;
    else if (status === "rejected") counts.rejected += 1;
    else counts.unlabeled += 1;
  }
  return counts;
}

function updateActiveFilterSummary() {
  const summary = document.getElementById("activeFilterSummary");
  if (!summary) return;
  const labels = activeFilterLabels();
  const counts = currentListStatusCounts();
  const filterText = labels.length ? t("activeFilterSummary")(labels, state.images.length) : t("activeFilterAll");
  summary.textContent = `${filterText} ${t("activeProgressSummary")(counts.total, counts.labeled, counts.verified, counts.pending, counts.unlabeled)}`;
}

async function loadImages() {
  const query = filtersToQuery();
  state.images = await api(`/api/images${query ? `?${query}` : ""}`);
  if (state.currentId && !state.images.some((item) => item.id === state.currentId)) {
    state.currentId = null;
  }
  renderImageList();
  if (!state.currentId && state.images.length) {
    await selectImage(state.images[0].id);
  }
  updateActiveFilterSummary();
}

function renderImageList() {
  const list = document.getElementById("imageList");
  const currentIndex = getCurrentIndex();
  if (currentIndex >= 0) {
    state.listWindowStart = Math.max(0, Math.min(currentIndex - Math.floor(state.listWindowSize / 2), Math.max(0, state.images.length - state.listWindowSize)));
  }
  const start = state.listWindowStart;
  const end = Math.min(state.images.length, start + state.listWindowSize);
  const visible = state.images.slice(start, end);
  document.getElementById("imageCount").textContent = state.lang === "en"
    ? t("imagesRange")(state.images.length, start + 1, end)
    : t("imagesRange")(state.images.length, start + 1, end);
  list.innerHTML = `
    <div class="list-nav">
      <button id="listPrevPage" type="button">${t("previousPage")}</button>
      <span>${start + 1}-${end} / ${state.images.length}</span>
      <button id="listNextPage" type="button">${t("nextPage")}</button>
    </div>
    ${visible
    .map(
      (item) => `
      <div class="image-item ${item.id === state.currentId ? "active" : ""}" data-id="${item.id}">
        <div class="image-title">
          <span>${item.id} · ${item.scene}</span>
          <span class="source-badge ${item.source_type || "demo"}">${sourceTypeName(item.source_type)}</span>
        </div>
        <div class="image-meta"><span>${item.batch}</span><span>${item.weather}</span><span>${item.flight_height_m || "-"}m</span></div>
        <div class="image-meta">${item.tasks.map((task) => state.config.task_names[task] || task).join(state.lang === "en" ? ", " : "、")}</div>
        <div class="status-pill ${normalizeStatus(item.review_status)}">${statusName(item.review_status)}</div>
      </div>`
    )
    .join("")}`;
  document.getElementById("listPrevPage").addEventListener("click", () => {
    state.listWindowStart = Math.max(0, state.listWindowStart - state.listWindowSize);
    renderImageList();
  });
  document.getElementById("listNextPage").addEventListener("click", () => {
    state.listWindowStart = Math.min(Math.max(0, state.images.length - state.listWindowSize), state.listWindowStart + state.listWindowSize);
    renderImageList();
  });
  list.querySelectorAll(".image-item").forEach((node) => {
    node.addEventListener("click", () => selectImage(node.dataset.id));
  });
}

async function selectImage(imageId) {
  state.currentId = imageId;
  state.history = [];
  state.drawingBox = false;
  state.draftBox = null;
  state.drawMode = false;
  state.ocrMode = false;
  state.rotatedBoxMode = true;
  state.polygonMode = false;
  state.samPromptMode = false;
  state.editGeometryMode = false;
  state.draftPolygon = [];
  state.samPromptPoints = [];
  state.selectedObjectIndex = null;
  state.selectedSegmentIndex = null;
  state.activeGeometryDrag = null;
  state.pendingOcrBox = null;
  document.getElementById("drawBoxMode")?.classList.toggle("active-tool", false);
  document.getElementById("drawOcrMode")?.classList.toggle("active-tool", false);
  document.getElementById("drawRotatedBoxMode")?.classList.toggle("active-tool", true);
  document.getElementById("pointPolygonMode")?.classList.toggle("active-tool", false);
  document.getElementById("samPromptMode")?.classList.toggle("active-tool", false);
  document.getElementById("editGeometryMode")?.classList.toggle("active-tool", false);
  if (document.getElementById("finishPolygon")) document.getElementById("finishPolygon").disabled = true;
  if (document.getElementById("runSamPrompt")) document.getElementById("runSamPrompt").disabled = false;
  const detail = await api(`/api/images/${imageId}`);
  state.metadata = detail.metadata;
  state.annotation = detail.annotation;
  if (state.metadata.object_label && !isManualMode()) {
    document.getElementById("newBoxLabel").value = state.metadata.object_label;
  } else if (isManualMode()) {
    document.getElementById("newBoxLabel").value = "";
  }
  state.bitmap = await loadBitmap(`/api/images/${imageId}/file`);
  setCanvasSize();
  renderImageList();
  renderMetadata();
  renderTaskAssist();
  renderForm();
  updateInspectorTaskMode();
  renderObjects();
  renderSegments();
  renderOcr();
  drawCanvas();
  document.getElementById("statusText").textContent = t("currentImage")(imageId);
}

function cloneAnnotation(annotation) {
  return JSON.parse(JSON.stringify(annotation));
}

function pushHistory() {
  if (!state.annotation) return;
  state.history.push(cloneAnnotation(state.annotation));
  if (state.history.length > 30) state.history.shift();
}

function restoreAnnotation(annotation, message) {
  state.annotation = cloneAnnotation(annotation);
  renderForm();
  renderObjects();
  renderSegments();
  renderOcr();
  drawCanvas();
  document.getElementById("statusText").textContent = message;
}

function setCanvasSize() {
  const sourceWidth = Number(state.metadata.width || state.bitmap.width || 1);
  const sourceHeight = Number(state.metadata.height || state.bitmap.height || 1);
  state.imageScale = Math.min(1, state.maxCanvasPixels / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.max(1, Math.round(sourceWidth * state.imageScale));
  canvas.height = Math.max(1, Math.round(sourceHeight * state.imageScale));
}

function getCurrentIndex() {
  return state.images.findIndex((item) => item.id === state.currentId);
}

async function selectRelativeImage(delta) {
  if (!state.images.length) return;
  const index = getCurrentIndex();
  const nextIndex = Math.max(0, Math.min(state.images.length - 1, (index < 0 ? 0 : index) + delta));
  await selectImage(state.images[nextIndex].id);
}

function loadBitmap(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function renderMetadata() {
  const view = document.getElementById("metadataView");
  const fields = state.lang === "en"
    ? [
      ["Image ID", "id"],
      ["File", "file_name"],
      ["Path", "image_path"],
      ["Batch", "batch"],
      ["Time", "capture_time"],
      ["Altitude", "flight_height_m"],
      ["Longitude", "longitude"],
      ["Latitude", "latitude"],
      ["Weather", "weather"],
      ["Scene", "scene"],
      ["Tasks", "tasks"],
      ["Width", "width"],
      ["Height", "height"],
      ["Relative", "relative_path"],
      ["Source Dir", "source_folder"],
      ["Source", "source_type"],
    ]
    : [
      ["图像 ID", "id"],
      ["文件", "file_name"],
      ["本地路径", "image_path"],
      ["批次", "batch"],
      ["时间", "capture_time"],
      ["高度", "flight_height_m"],
      ["经度", "longitude"],
      ["纬度", "latitude"],
      ["天气", "weather"],
      ["场景", "scene"],
      ["任务", "tasks"],
      ["宽度", "width"],
      ["高度", "height"],
      ["相对路径", "relative_path"],
      ["来源目录", "source_folder"],
      ["数据来源", "source_type"],
    ];
  view.innerHTML = fields
    .map(([label, key]) => `<dt>${label}</dt><dd>${formatMetaValue(state.metadata[key])}</dd>`)
    .join("");
}

function renderTaskAssist() {
  const title = document.getElementById("taskAssistTitle");
  const body = document.getElementById("taskAssistBody");
  const steps = document.getElementById("taskAssistSteps");
  if (!title || !body || !steps) return;
  if (!state.metadata) {
    title.textContent = "先选择一张图像";
    body.textContent = "从左侧筛选自己的批次或标注组别，然后点击图像开始。进入图像后默认可直接拖拽画目标框。";
    steps.innerHTML = "";
    return;
  }
  const tasks = new Set(state.metadata.tasks || []);
  const chips = [];
  const notes = [];
  if (tasks.has("object_detection")) {
    chips.push("拖拽画目标框", "检查标签", "Ctrl+S 保存");
    notes.push("默认已进入目标框模式；角度为 0 是普通框，非 0 是旋转框。");
  }
  if (tasks.has("ocr")) {
    chips.push("按 O", "框文字", "输入转录");
    notes.push("OCR 用 OCR 框，不要把文字写进目标框标签。");
  }
  if (tasks.has("scene_classification")) {
    chips.push("填场景", "mixed 填补充标签");
    notes.push("场景识别只看整图主场景，混合场景填场景补充标签。");
  }
  if (tasks.has("urban_structure")) {
    chips.push("填城市结构", "多功能填补充标签");
    notes.push("城市功能看地块用途，不只看外观。");
  }
  if (tasks.has("event_qa") || tasks.has("event_understanding")) {
    chips.push("填事件", "必要时写 QA");
    notes.push("事件图像需填写事件标签；异常样本用驳回重标和异常原因。");
  }
  if (tasks.has("environment_state")) {
    chips.push("确认环境");
    notes.push("夜间、雨天、晴天等写在环境字段。");
  }
  if (!chips.length) {
    chips.push("检查字段", "保存");
    notes.push("根据左侧批次和右侧 Metadata 判断本图需要标什么。");
  }
  title.textContent = `当前任务：${(state.metadata.tasks || []).map((task) => state.config?.task_names?.[task] || task).join("、") || "未设置任务"}`;
  body.textContent = notes.join(" ");
  steps.innerHTML = chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("");
  updateInspectorTaskMode();
}

function currentTaskSet() {
  return new Set(state.metadata?.tasks || []);
}

function hasAnyTask(taskList, tasks) {
  return taskList
    .split(/\s+/)
    .filter(Boolean)
    .some((task) => tasks.has(task));
}

function requiredFieldItems(tasks) {
  const items = [];
  if (tasks.has("object_detection")) items.push(["目标框", "画出所有可辨目标并检查标签"]);
  if (tasks.has("event_qa") || tasks.has("event_understanding")) items.push(["事件", "选择事件标签，必要时补 QA"]);
  if (tasks.has("scene_classification")) items.push(["场景", "填写主场景；mixed 填补充标签"]);
  if (tasks.has("urban_structure")) items.push(["城市功能", "填写主功能；多功能填补充标签"]);
  if (tasks.has("environment_state")) items.push(["环境", "确认 night / rainy / sunny"]);
  if (tasks.has("ocr")) items.push(["OCR", "框文字并核对转录内容"]);
  if (tasks.has("semantic_segmentation") || tasks.has("instance_segmentation")) items.push(["分割", "点选或导入区域"]);
  if (tasks.has("restoration_pairing")) items.push(["复原", "填写退化类型和配对信息"]);
  return items;
}

function taskGuideItems(tasks) {
  const items = [];
  if (tasks.has("object_detection")) {
    items.push(["目标检测", "进入图像后默认是目标框模式。先确认目标类别，直接拖拽画框；框不准时点“几何”后拖动或拉伸；标签不对时可在目标框列表或批量改标签区修改。"]);
  }
  if (tasks.has("ocr")) {
    items.push(["OCR", "按 O 或点击 OCR框，拖拽框住文字，弹出输入框后填写转录内容。已有 OCR 草稿时重点核对框位置和文字。"]);
  }
  if (tasks.has("scene_classification")) {
    items.push(["场景识别", "判断整图主场景。若是 mixed，需要填写补充标签，说明混合了哪些场景。"]);
  }
  if (tasks.has("urban_structure")) {
    items.push(["城市功能", "按地块用途判断主功能，不只看建筑外观。多功能区域要补充次级功能。"]);
  }
  if (tasks.has("event_qa") || tasks.has("event_understanding")) {
    items.push(["事件标注", "选择最匹配的事件标签；规则草稿正确就保留，不正确就修改。必要时补 QA 问答。"]);
  }
  if (tasks.has("environment_state")) {
    items.push(["观测条件", "确认 night / rainy / sunny 等环境标签。"]);
  }
  if (tasks.has("semantic_segmentation") || tasks.has("instance_segmentation")) {
    items.push(["分割", "点击点选区域后逐点圈出区域，至少 3 个点后完成。"]);
  }
  if (tasks.has("restoration_pairing")) {
    items.push(["图像复原", "填写退化类型、退化程度和清晰图像配对 ID。"]);
  }
  return items;
}

function rulePrefillItems() {
  if (!state.annotation || isManualMode()) return [];
  const items = [];
  if (state.annotation.scene?.status === "rule_prefill" && (state.annotation.scene.label || state.annotation.scene.combination_label)) items.push("场景");
  if (state.annotation.environment?.status === "rule_prefill" && state.annotation.environment.label) items.push("环境");
  if (state.annotation.events?.some((event) => event.status === "rule_prefill" && event.label)) items.push("事件");
  if (state.annotation.urban_structure?.status === "rule_prefill" && (state.annotation.urban_structure.label || state.annotation.urban_structure.summary)) items.push("城市功能");
  return items;
}

function updateInspectorTaskMode() {
  const inspector = document.querySelector(".inspector");
  if (!inspector) return;
  const tasks = currentTaskSet();
  const hasImage = Boolean(state.metadata);
  inspector.classList.toggle("has-current-task", hasImage);
  inspector.dataset.currentTasks = Array.from(tasks).join(" ");

  const group = document.getElementById("inspectorTaskGroup");
  const summary = document.getElementById("inspectorTaskSummary");
  const fields = document.getElementById("inspectorRequiredFields");
  const guide = document.getElementById("taskGuideBody");
  if (group) group.textContent = state.metadata?.annotator_group || state.metadata?.batch || "未选择";
  if (summary) {
    const taskNames = (state.metadata?.tasks || []).map((task) => state.config?.task_names?.[task] || task);
    summary.textContent = hasImage ? `本图任务：${taskNames.join("、") || "未设置任务"}` : "先从左侧选择自己的标注组别，再点击图像开始。";
  }
  if (fields) {
    const items = requiredFieldItems(tasks);
    const prefill = rulePrefillItems();
    const prefillHtml = prefill.length
      ? `<div><strong>规则预填</strong><span>${escapeHtml(prefill.join("、"))} 已由目录/metadata 自动带出，请确认或修改</span></div>`
      : "";
    fields.innerHTML = prefillHtml + (items.length
      ? items.map(([name, desc]) => `<div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(desc)}</span></div>`).join("")
      : "<div><strong>开始</strong><span>选择图像后只显示相关标注区域</span></div>");
  }
  if (guide) {
    if (!hasImage) {
      guide.innerHTML = "先选择自己的标注组别，再点击图像。平台会按当前图像任务显示需要填写的区域。";
    } else {
      const guideItems = taskGuideItems(tasks);
      guide.innerHTML = guideItems.length
        ? guideItems.map(([name, desc]) => `<div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(desc)}</p></div>`).join("")
        : "<div><strong>当前图像</strong><p>按页面显示的字段检查并保存。</p></div>";
    }
  }

  document.querySelectorAll("[data-task-panel]").forEach((node) => {
    const visible = !hasImage || hasAnyTask(node.dataset.taskPanel || "", tasks);
    node.classList.toggle("task-hidden", !visible);
  });

  document.querySelectorAll("[data-task-field]").forEach((node) => {
    const fieldTasks = node.dataset.taskField || "";
    const always = fieldTasks === "review";
    const visible = !hasImage || always || hasAnyTask(fieldTasks, tasks);
    node.classList.toggle("task-hidden", !visible);
  });
}

function sourceTypeName(sourceType) {
  return sourceType === "actual" ? t("actualData") : t("demoData");
}

function formatMetaValue(value) {
  if (Array.isArray(value)) return value.join(state.lang === "en" ? ", " : "、");
  if (value === null || value === undefined || value === "") return state.lang === "en" ? "Not extracted / empty" : "未提取/未填写";
  if (value === "actual") return t("actualData");
  if (value === "demo") return t("demoData");
  return value;
}

function statusName(status) {
  const zh = {
    unlabeled: "未标注",
    pending: "待复核",
    predicted: "模型预标注",
    labeled: "已标注",
    reviewed: "已核验",
    verified: "已核验",
    rejected: "驳回重标",
    ready: "可用",
    needs_config: "需配置",
    needs_checkpoint: "缺权重",
    missing_weight: "缺权重",
    disabled: "未启用",
    needs_gpu: "需GPU",
    remote_configured: "远程",
  };
  const en = {
    unlabeled: "Unlabeled",
    pending: "Pending",
    predicted: "Predicted",
    labeled: "Labeled",
    reviewed: "Verified",
    verified: "Verified",
    rejected: "Rejected",
    ready: "Ready",
    needs_config: "Needs config",
    needs_checkpoint: "Missing checkpoint",
    missing_weight: "Missing weight",
    disabled: "Disabled",
    needs_gpu: "Needs GPU",
    remote_configured: "Remote",
    configured: "Configured",
  };
  return (state.lang === "en" ? en : zh)[normalizeStatus(status)] || status;
}

function normalizeStatus(status) {
  const aliases = {pending: "predicted", reviewed: "verified", ready: "verified"};
  const value = String(status || "unlabeled").toLowerCase();
  return aliases[value] || value;
}

function setDefaultImportTasks() {
  const presets = {
    urban: ["scene_classification", "environment_state", "object_detection", "ocr", "event_qa", "urban_structure"],
    ecology: ["scene_classification", "environment_state", "object_detection", "semantic_segmentation", "event_qa"],
    restoration: ["environment_state", "restoration_pairing"],
  };
  const defaults = new Set(presets[state.taskDomain] || presets.urban);
  Array.from(document.getElementById("importTasks").options).forEach((option) => {
    option.selected = defaults.has(option.value);
  });
}

function refreshBatchOptions() {
  const batchFilter = document.getElementById("batchFilter");
  const current = batchFilter.value;
  batchFilter.innerHTML = `<option value="">${t("all")}</option>`;
  for (const batch of state.facets?.batches || []) {
    batchFilter.innerHTML += `<option value="${batch}">${batch}</option>`;
  }
  batchFilter.value = current;
  const groupFilter = document.getElementById("annotatorGroupFilter");
  if (groupFilter) {
    const currentGroup = groupFilter.value;
    groupFilter.innerHTML = `<option value="">${t("all")}</option>`;
    for (const group of state.facets?.annotator_groups || []) {
      groupFilter.innerHTML += `<option value="${group}">${group}</option>`;
    }
    groupFilter.value = currentGroup;
  }
}

async function browsePath(path = "", notify = false) {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  const data = await api(`/api/browse${query}`);
  const browser = document.getElementById("folderBrowser");
  document.getElementById("folderPath").value = data.path;
  const parentButton = data.parent
    ? `<button class="folder-row parent" data-path="${data.parent}" type="button">${t("backParent")}</button>`
    : "";
  const rows = data.dirs
    .map((item) => `<button class="folder-row" data-path="${item.path}" type="button">${item.name}</button>`)
    .join("");
  browser.innerHTML = `
    <div class="browser-head">
      <span>${t("folderImages")(data.image_count)}</span>
      <button id="useCurrentFolder" type="button">${t("useCurrentFolder")}</button>
    </div>
    <div class="folder-rows">${parentButton}${rows || `<div class="empty-row">${t("noSubdirs")}</div>`}</div>
  `;
  browser.querySelectorAll(".folder-row").forEach((button) => {
    button.addEventListener("click", () => browsePath(button.dataset.path, true));
  });
  document.getElementById("useCurrentFolder").addEventListener("click", () => {
    document.getElementById("folderPath").value = data.path;
    document.getElementById("selectedFolderSummary").textContent = t("selectedImporting")(data.path, data.image_count);
    document.getElementById("statusText").textContent = t("importingFolder")(data.path);
    importData();
  });
  if (notify) {
    showToast(t("browseDone"), t("browseDoneMsg")(data.path), "success", 3200);
  }
}

function renderForm() {
  const ann = state.annotation;
  const isEventTask = currentImageHasTask("event_qa") || currentImageHasTask("event_understanding");
  document.getElementById("reviewStatus").value = normalizeStatus(ann.review_status || "predicted");
  document.getElementById("rejectReason").value = ann.reject_reason || "";
  document.getElementById("reviewNotes").value = ann.notes || "";
  document.getElementById("sceneLabel").value = displayPrefillValue(ann.scene, "label", state.metadata.scene);
  document.getElementById("sceneSecondaryLabels").value = displayPrefillValue(ann.scene, ["combination_label", "secondary_labels"], state.metadata.scene_combination_label);
  document.getElementById("environmentLabel").value = displayPrefillValue(ann.environment, "label", state.metadata.weather);
  const event = ann.events?.[0] || {};
  document.getElementById("eventLabel").value = displayPrefillValue(event, "label", state.metadata.event_label || (isEventTask ? state.config.event_labels[0] : ""));
  document.getElementById("qaQuestion").value = event.question || "";
  document.getElementById("qaAnswer").value = event.answer || "";
  document.getElementById("degradationLabel").value = ann.restoration?.degradation || "";
  document.getElementById("degradationLevel").value = ann.restoration?.level || "";
  document.getElementById("clearPairId").value = ann.restoration?.clear_pair_id || "";
  document.getElementById("urbanStructure").value = displayPrefillValue(ann.urban_structure, ["label", "summary"], state.metadata.urban_structure_label);
  document.getElementById("urbanSecondaryLabels").value = displayPrefillValue(ann.urban_structure, ["combination_label", "secondary_labels"], state.metadata.urban_combination_label);
  updateInspectorTaskMode();
}

function currentImageHasTask(taskId) {
  return Boolean(state.metadata?.tasks?.includes(taskId));
}

function parseSupplementLabels(value) {
  return String(value || "")
    .split(/[+,，;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function requiredFieldWarnings() {
  if (!state.annotation || state.annotation.review_status === "rejected") return [];
  const warnings = [];
  const tasks = new Set(state.metadata?.tasks || []);
  if (tasks.has("object_detection") && !(state.annotation.objects || []).length) {
    warnings.push("检测任务尚未标注任何目标框。");
  }
  const expectedObjectLabel = state.metadata?.object_label;
  if (tasks.has("object_detection") && expectedObjectLabel && (state.annotation.objects || []).some((obj) => obj.label && obj.label !== expectedObjectLabel)) {
    warnings.push(`检测框标签与目录默认类别不一致：本目录建议 ${expectedObjectLabel}。`);
  }
  if ((tasks.has("semantic_segmentation") || tasks.has("instance_segmentation")) && !(state.annotation.segments || []).length) {
    warnings.push("分割任务尚未标注任何区域。");
  }
  if (tasks.has("ocr") && !(state.annotation.ocr || []).length) {
    warnings.push("OCR 任务尚未标注文字框或转录内容。");
  }
  if (tasks.has("scene_classification") && !state.annotation.scene?.label) {
    warnings.push("场景识别任务尚未填写场景标签。");
  }
  if (tasks.has("scene_classification") && state.annotation.scene?.label === "mixed" && !(state.annotation.scene?.combination_label || state.annotation.scene?.secondary_labels || []).length) {
    warnings.push("mixed 场景尚未填写场景补充标签。");
  }
  if (tasks.has("urban_structure") && !(state.annotation.urban_structure?.label || state.annotation.urban_structure?.summary)) {
    warnings.push("城市功能/结构任务尚未填写主功能标签。");
  }
  if ((tasks.has("event_qa") || tasks.has("event_understanding")) && !state.annotation.events?.[0]?.label) {
    warnings.push("事件任务尚未填写事件标签。");
  }
  if (tasks.has("environment_state") && !state.annotation.environment?.label) {
    warnings.push("环境状态任务尚未填写环境标签。");
  }
  if (tasks.has("restoration_pairing") && !state.annotation.restoration?.degradation) {
    warnings.push("图像复原任务尚未填写退化类型。");
  }
  return warnings;
}

function syncFormToAnnotation() {
  const ann = state.annotation;
  const isSceneTask = currentImageHasTask("scene_classification");
  const isEventTask = currentImageHasTask("event_qa") || currentImageHasTask("event_understanding");
  const isEnvironmentTask = currentImageHasTask("environment_state");
  const isUrbanTask = currentImageHasTask("urban_structure");
  ann.review_status = document.getElementById("reviewStatus").value;
  ann.reject_reason = document.getElementById("rejectReason").value.trim();
  ann.notes = document.getElementById("reviewNotes").value.trim();
  if (isEnvironmentTask || ann.environment?.label) {
    ann.environment = { ...(ann.environment || {}), label: document.getElementById("environmentLabel").value, status: "human" };
  }
  if ((state.taskDomain === "urban" || state.taskDomain === "ecology") && isSceneTask) {
    const sceneCombination = document.getElementById("sceneSecondaryLabels").value.trim();
    ann.scene = {
      ...(ann.scene || {}),
      label: document.getElementById("sceneLabel").value,
      combination_label: sceneCombination,
      secondary_labels: parseSupplementLabels(sceneCombination),
      status: "human",
    };
  }
  if (state.taskDomain === "urban" || state.taskDomain === "ecology") {
    const eventLabel = document.getElementById("eventLabel").value.trim();
    const qaQuestion = document.getElementById("qaQuestion").value.trim();
    const qaAnswer = document.getElementById("qaAnswer").value.trim();
    const shouldSaveEvent = isEventTask || eventLabel || qaQuestion || qaAnswer;
    if (shouldSaveEvent) {
      ann.events = [
        {
          ...(ann.events?.[0] || {}),
          label: eventLabel,
          question: qaQuestion,
          answer: qaAnswer,
          status: "human",
        },
      ];
    } else {
      ann.events = [];
    }
  }
  if (state.taskDomain === "urban" && isUrbanTask) {
    const urbanCombination = document.getElementById("urbanSecondaryLabels").value.trim();
    ann.urban_structure = {
      ...(ann.urban_structure || {}),
      label: document.getElementById("urbanStructure").value,
      summary: document.getElementById("urbanStructure").value,
      combination_label: urbanCombination,
      secondary_labels: parseSupplementLabels(urbanCombination),
      status: "human",
    };
  }
  if (state.taskDomain === "restoration") {
    ann.restoration = {
      ...(ann.restoration || {}),
      degradation: document.getElementById("degradationLabel").value,
      level: document.getElementById("degradationLevel").value,
      clear_pair_id: document.getElementById("clearPairId").value,
      status: "human",
    };
  }
}

function renderObjects() {
  const list = document.getElementById("objectList");
  updateSelectedObjectLabelControl();
  list.innerHTML = (state.annotation.objects || [])
    .map((obj, index) => {
      const [x, y, w, h] = obj.bbox;
      const rotation = Number(obj.rotation || obj.angle || 0);
      const selected = index === state.selectedObjectIndex ? " selected" : "";
      const hidden = obj.hidden ? " hidden-object" : "";
      const locked = obj.locked ? " locked-object" : "";
      return `
        <div class="object-row${selected}${hidden}${locked}" data-index="${index}">
          <input class="obj-label" list="objectLabelOptions" value="${obj.label || ""}">
          <input class="obj-x" type="number" value="${Math.round(x)}">
          <input class="obj-y" type="number" value="${Math.round(y)}">
          <input class="obj-w" type="number" value="${Math.round(w)}">
          <input class="obj-h" type="number" value="${Math.round(h)}">
          <input class="obj-rot" type="number" min="-180" max="180" step="1" value="${Math.round(rotation)}" title="rotation">
          <button class="visibility-btn" type="button" title="${obj.hidden ? t("objectVisible") : t("objectHidden")}">${obj.hidden ? "显" : "隐"}</button>
          <button class="lock-btn" type="button" title="${obj.locked ? t("objectUnlock") : t("objectLock")}">${obj.locked ? "解" : "锁"}</button>
          <button class="delete-btn">×</button>
        </div>`;
    })
    .join("");
  list.querySelectorAll(".object-row").forEach((row) => {
    const obj = state.annotation.objects[Number(row.dataset.index)];
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      state.selectedObjectIndex = Number(row.dataset.index);
      state.selectedSegmentIndex = null;
      updateSelectedObjectLabelControl();
      document.getElementById("statusText").textContent = t("objectSelected")(state.selectedObjectIndex + 1, obj.label || "object");
      drawCanvas();
    });
    row.querySelectorAll("input,select").forEach((input) => {
      input.addEventListener("focus", () => {
        if (input.dataset.historyReady === "1") return;
        pushHistory();
        input.dataset.historyReady = "1";
      });
    });
    row.querySelectorAll("input,select").forEach((input) => input.addEventListener("input", syncObjectsFromRows));
    row.querySelector(".visibility-btn").addEventListener("click", () => {
      pushHistory();
      obj.hidden = !obj.hidden;
      renderObjects();
      drawCanvas();
    });
    row.querySelector(".lock-btn").addEventListener("click", () => {
      pushHistory();
      obj.locked = !obj.locked;
      renderObjects();
      drawCanvas();
    });
    row.querySelector(".delete-btn").addEventListener("click", () => {
      pushHistory();
      state.annotation.objects.splice(Number(row.dataset.index), 1);
      if (state.selectedObjectIndex === Number(row.dataset.index)) state.selectedObjectIndex = null;
      renderObjects();
      drawCanvas();
    });
  });
}

function syncObjectsFromRows() {
  document.querySelectorAll(".object-row").forEach((row) => {
    const index = Number(row.dataset.index);
    state.annotation.objects[index] = {
      ...(state.annotation.objects[index] || {}),
      label: row.querySelector(".obj-label").value,
      bbox: [
        Number(row.querySelector(".obj-x").value),
        Number(row.querySelector(".obj-y").value),
        Number(row.querySelector(".obj-w").value),
        Number(row.querySelector(".obj-h").value),
      ],
      rotation: Number(row.querySelector(".obj-rot")?.value || 0),
      status: "human",
    };
  });
  drawCanvas();
  updateSelectedObjectLabelControl();
}

function updateSelectedObjectLabelControl() {
  const input = document.getElementById("selectedObjectLabel");
  if (!input) return;
  const obj = state.annotation?.objects?.[state.selectedObjectIndex];
  input.value = obj?.label || "";
  input.disabled = !obj;
  input.placeholder = obj ? "选中框标签" : "选框后改标签";
}

function updateSelectedObjectLabel() {
  const input = document.getElementById("selectedObjectLabel");
  const obj = state.annotation?.objects?.[state.selectedObjectIndex];
  if (!input || !obj) return;
  obj.label = input.value.trim() || "object";
  obj.status = "human";
  renderObjects();
  drawCanvas();
}

function bulkRelabelObjects(mode) {
  if (!state.annotation?.objects?.length) {
    showToast("目标框", "当前图像没有目标框可修改。", "warning");
    return;
  }
  const labelInput = document.getElementById("bulkObjectLabel");
  const fallback = document.getElementById("newBoxLabel")?.value || "";
  const targetLabel = (labelInput?.value || fallback).trim();
  if (!targetLabel) {
    showToast("目标框", "请先输入要批量改成的标签。", "warning");
    labelInput?.focus();
    return;
  }
  const selectedObj = state.annotation.objects[state.selectedObjectIndex];
  let changed = 0;
  pushHistory();
  state.annotation.objects.forEach((obj, index) => {
    const shouldChange =
      mode === "all" ||
      (mode === "selected" && index === state.selectedObjectIndex) ||
      (mode === "same" && selectedObj && obj.label === selectedObj.label);
    if (!shouldChange) return;
    obj.label = targetLabel;
    obj.status = "human";
    changed += 1;
  });
  if (!changed) {
    state.history.pop();
    showToast("目标框", mode === "selected" ? "请先点击选中一个目标框。" : "没有匹配的目标框。", "warning");
    return;
  }
  if (labelInput) labelInput.value = targetLabel;
  renderObjects();
  drawCanvas();
  document.getElementById("statusText").textContent = `已批量修改 ${changed} 个目标框标签为 ${targetLabel}`;
  showToast("目标框", `已批量修改 ${changed} 个目标框标签。`, "success");
}

function renderSegments() {
  const list = document.getElementById("segmentList");
  if (!list) return;
  const segments = state.annotation?.segments || [];
  list.innerHTML = segments
    .map((seg, index) => {
      const count = Array.isArray(seg.points) ? seg.points.length : 0;
      const selected = index === state.selectedSegmentIndex ? " selected" : "";
      return `
        <div class="segment-row${selected}" data-index="${index}">
          <input class="seg-label" list="objectLabelOptions" value="${seg.label || ""}">
          <span>${count} pts</span>
          <button class="delete-btn">×</button>
        </div>`;
    })
    .join("");
  list.querySelectorAll(".segment-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      state.selectedSegmentIndex = Number(row.dataset.index);
      state.selectedObjectIndex = null;
      drawCanvas();
    });
    row.querySelector(".seg-label").addEventListener("focus", (event) => {
      if (event.currentTarget.dataset.historyReady === "1") return;
      pushHistory();
      event.currentTarget.dataset.historyReady = "1";
    });
    row.querySelector(".seg-label").addEventListener("input", () => {
      const index = Number(row.dataset.index);
      state.annotation.segments[index] = {
        ...(state.annotation.segments[index] || {}),
        label: row.querySelector(".seg-label").value || "region",
        status: "human",
      };
      drawCanvas();
    });
    row.querySelector(".delete-btn").addEventListener("click", () => {
      pushHistory();
      state.annotation.segments.splice(Number(row.dataset.index), 1);
      renderSegments();
      drawCanvas();
    });
  });
}

function renderOcr() {
  const list = document.getElementById("ocrList");
  if (!list) return;
  const items = state.annotation?.ocr || [];
  list.innerHTML = items
    .map((item, index) => {
      const [x, y, w, h] = item.bbox || [0, 0, 0, 0];
      return `
        <div class="ocr-row" data-index="${index}">
          <input class="ocr-text" value="${escapeHtml(item.text || "")}" placeholder="文字">
          <span>${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)}</span>
          <button class="delete-btn" type="button">×</button>
        </div>`;
    })
    .join("");
  list.querySelectorAll(".ocr-row").forEach((row) => {
    row.querySelector(".ocr-text").addEventListener("focus", (event) => {
      if (event.currentTarget.dataset.historyReady === "1") return;
      pushHistory();
      event.currentTarget.dataset.historyReady = "1";
    });
    row.querySelector(".ocr-text").addEventListener("input", () => {
      const index = Number(row.dataset.index);
      state.annotation.ocr[index] = {
        ...(state.annotation.ocr[index] || {}),
        text: row.querySelector(".ocr-text").value,
        status: "human",
      };
      drawCanvas();
    });
    row.querySelector(".delete-btn").addEventListener("click", () => {
      pushHistory();
      state.annotation.ocr.splice(Number(row.dataset.index), 1);
      renderOcr();
      drawCanvas();
    });
  });
}

function showOcrPrompt(sourceBbox, clientX, clientY) {
  state.pendingOcrBox = sourceBbox;
  const popover = document.getElementById("ocrPromptPopover");
  const input = document.getElementById("ocrPromptInput");
  const left = Math.min(window.innerWidth - 300, Math.max(12, clientX + 12));
  const top = Math.min(window.innerHeight - 130, Math.max(12, clientY + 12));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.classList.remove("hidden");
  input.value = "";
  input.focus();
}

function hideOcrPrompt(message = "") {
  state.pendingOcrBox = null;
  const popover = document.getElementById("ocrPromptPopover");
  popover.classList.add("hidden");
  if (message) document.getElementById("statusText").textContent = message;
}

function savePendingOcr() {
  if (!state.pendingOcrBox || !state.annotation) return;
  const input = document.getElementById("ocrPromptInput");
  const text = input.value.trim();
  if (!text) {
    showToast("OCR", t("ocrNeedText"), "warning");
    input.focus();
    return;
  }
  pushHistory();
  state.annotation.ocr = state.annotation.ocr || [];
  state.annotation.ocr.push({
    text,
    bbox: state.pendingOcrBox.map((value) => Number(value)),
    status: "human",
  });
  hideOcrPrompt(t("ocrAdded"));
  renderOcr();
  drawCanvas();
}

function runAutoOcr() {
  const ocrModel = state.models.find((model) => model.task === "ocr" && ["ready", "remote_configured"].includes(model.status));
  if (!ocrModel) {
    showToast("OCR", t("ocrAutoUnavailable"), "warning", 7000);
    document.getElementById("statusText").textContent = t("ocrAutoUnavailable");
    return;
  }
  runRegisteredModel(ocrModel.id, document.getElementById("runOcrModel"));
}

function rotatedRectPath(x, y, w, h, rotationDeg) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = (Number(rotationDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([dx, dy]) => [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
}

function strokeRotatedRect(x, y, w, h, rotationDeg) {
  const points = rotatedRectPath(x, y, w, h, rotationDeg);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.closePath();
  ctx.stroke();
}

function objectHandles(obj) {
  const [x, y, w, h] = obj.bbox || [0, 0, 0, 0];
  const rotation = Number(obj.rotation || obj.angle || 0);
  const points = rotation ? rotatedRectPath(x, y, w, h, rotation) : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  return ["nw", "ne", "se", "sw"].map((name, index) => ({ name, x: points[index][0], y: points[index][1] }));
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function hitTestGeometry(canvasPt) {
  const scale = state.imageScale || 1;
  const sourcePt = { x: canvasPt.x / scale, y: canvasPt.y / scale };
  const hitRadius = 10 / scale;

  for (let segIndex = (state.annotation.segments || []).length - 1; segIndex >= 0; segIndex -= 1) {
    const seg = state.annotation.segments[segIndex];
    const points = seg.points || [];
    for (let pointIndex = points.length - 1; pointIndex >= 0; pointIndex -= 1) {
      const [x, y] = points[pointIndex];
      if (dist(sourcePt, { x, y }) <= hitRadius) {
        return { type: "segment-vertex", segIndex, pointIndex, sourcePt };
      }
    }
    if (points.length >= 3 && pointInPolygon(sourcePt, points)) {
      return { type: "segment-move", segIndex, sourcePt };
    }
  }

  for (let objIndex = (state.annotation.objects || []).length - 1; objIndex >= 0; objIndex -= 1) {
    const obj = state.annotation.objects[objIndex];
    if (obj.hidden || obj.locked) continue;
    for (const handle of objectHandles(obj)) {
      if (dist(sourcePt, handle) <= hitRadius) {
        return { type: "object-resize", objIndex, handle: handle.name, sourcePt };
      }
    }
    const [x, y, w, h] = obj.bbox || [0, 0, 0, 0];
    if (pointInPolygon(sourcePt, rotatedRectPath(x, y, w, h, Number(obj.rotation || 0)))) {
      return { type: "object-move", objIndex, sourcePt };
    }
  }
  return null;
}

function applyGeometryDrag(canvasPt) {
  const drag = state.activeGeometryDrag;
  if (!drag) return;
  const scale = state.imageScale || 1;
  const current = { x: canvasPt.x / scale, y: canvasPt.y / scale };
  const dx = current.x - drag.start.x;
  const dy = current.y - drag.start.y;
  if (drag.type === "object-move") {
    const obj = state.annotation.objects[drag.objIndex];
    obj.bbox = [drag.original.bbox[0] + dx, drag.original.bbox[1] + dy, drag.original.bbox[2], drag.original.bbox[3]];
    obj.status = "human";
  } else if (drag.type === "object-resize") {
    const obj = state.annotation.objects[drag.objIndex];
    let [x, y, w, h] = drag.original.bbox;
    if (drag.handle.includes("w")) {
      x += dx;
      w -= dx;
    }
    if (drag.handle.includes("e")) w += dx;
    if (drag.handle.includes("n")) {
      y += dy;
      h -= dy;
    }
    if (drag.handle.includes("s")) h += dy;
    if (w < 4) w = 4;
    if (h < 4) h = 4;
    obj.bbox = [x, y, w, h];
    obj.status = "human";
  } else if (drag.type === "segment-vertex") {
    const seg = state.annotation.segments[drag.segIndex];
    seg.points[drag.pointIndex] = [current.x, current.y];
    seg.status = "human";
  } else if (drag.type === "segment-move") {
    const seg = state.annotation.segments[drag.segIndex];
    seg.points = drag.original.points.map(([x, y]) => [x + dx, y + dy]);
    seg.status = "human";
  }
}

function drawCanvas() {
  if (!state.bitmap) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.bitmap, 0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 3;
  ctx.font = "18px sans-serif";
  const scale = state.imageScale || 1;

  for (const seg of state.annotation.segments || []) {
    const segIndex = (state.annotation.segments || []).indexOf(seg);
    const points = (seg.points || []).map(([x, y]) => [x * scale, y * scale]);
    if (points.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach((pt) => ctx.lineTo(pt[0], pt[1]));
    ctx.closePath();
    ctx.fillStyle = "rgba(47, 158, 68, 0.22)";
    ctx.strokeStyle = "#2f9e44";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2f9e44";
    ctx.fillText(seg.label, points[0][0], points[0][1] - 8);
    if (segIndex === state.selectedSegmentIndex) {
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#0ca678";
      for (const [px, py] of points) {
        ctx.beginPath();
        ctx.rect(px - 5, py - 5, 10, 10);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  if (state.draftPolygon?.length) {
    const points = state.draftPolygon;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.strokeStyle = "#12b886";
    ctx.fillStyle = "rgba(18, 184, 134, 0.16)";
    ctx.setLineDash([7, 5]);
    if (points.length > 2) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [index, pt] of points.entries()) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#12b886";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(String(index + 1), pt.x + 6, pt.y - 6);
    }
  }

  if (state.samPromptPoints?.length) {
    for (const [index, pt] of state.samPromptPoints.entries()) {
      ctx.beginPath();
      ctx.arc(pt.x * scale, pt.y * scale, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#0b7285";
      ctx.fill();
      ctx.strokeStyle = "#e3fafc";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#0b7285";
      ctx.fillText(`SAM ${index + 1}`, pt.x * scale + 10, pt.y * scale - 8);
    }
    ctx.lineWidth = 3;
  }

  for (const [objIndex, obj] of (state.annotation.objects || []).entries()) {
    if (obj.hidden) continue;
    const [rawX, rawY, rawW, rawH] = obj.bbox;
    const [x, y, w, h] = [rawX * scale, rawY * scale, rawW * scale, rawH * scale];
    const rotation = Number(obj.rotation || obj.angle || 0);
    ctx.strokeStyle = obj.status === "human" ? "#ffd43b" : "#1c7ed6";
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    if (rotation) {
      strokeRotatedRect(x, y, w, h, rotation);
    } else {
      ctx.strokeRect(x, y, w, h);
    }
    ctx.fillRect(x, Math.max(0, y - 24), Math.max(90, obj.label.length * 18), 24);
    ctx.fillStyle = "#fff";
    ctx.fillText(rotation ? `${obj.label} ${rotation}°` : obj.label, x + 6, Math.max(18, y - 6));
    if (objIndex === state.selectedObjectIndex) {
      ctx.strokeStyle = "#ff922b";
      ctx.setLineDash([5, 4]);
      if (rotation) strokeRotatedRect(x, y, w, h, rotation);
      else ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      const handles = objectHandles(obj);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#ff922b";
      for (const handle of handles) {
        ctx.beginPath();
        ctx.rect(handle.x * scale - 5, handle.y * scale - 5, 10, 10);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  if (state.draftBox) {
    const [x, y, w, h] = state.draftBox;
    ctx.strokeStyle = state.ocrMode ? "#f76707" : "#00e5ff";
    ctx.setLineDash([8, 6]);
    const rotation = state.rotatedBoxMode ? Number(document.getElementById("rotationAngle")?.value || 0) : 0;
    if (rotation) strokeRotatedRect(x, y, w, h, rotation);
    else ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  for (const item of state.annotation.ocr || []) {
    const [rawX, rawY, rawW, rawH] = item.bbox;
    const [x, y, w, h] = [rawX * scale, rawY * scale, rawW * scale, rawH * scale];
    ctx.strokeStyle = "#f76707";
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#f76707";
    ctx.fillText(item.text, x, y + h + 22);
  }
}

async function loadStats() {
  const stats = await api("/api/stats");
  document.getElementById("statsView").textContent = JSON.stringify(stats, null, 2);
  renderSummary(stats);
  return stats;
}

function renderSummary(stats) {
  const counts = currentListStatusCounts();
  const stages = stats.annotation_stage_counts || {};
  const tasks = new Set(state.images.flatMap((item) => item.tasks || [])).size;
  document.getElementById("summaryGrid").innerHTML = [
    [t("totalImages"), stats.total_images || counts.total],
    [t("rulePrefillCount"), stages.rule_prefill || 0],
    [t("importedPrefillCount"), stages.imported_prefill || 0],
    [t("modelPrefillCount"), stages.model_prefill || counts.pending],
    [t("humanLabeledCount"), stages.human_labeled || counts.labeled],
    [t("reviewedCount"), counts.verified],
    [t("rejectedCount"), counts.rejected],
    [t("noAnnotationCount"), stages.no_annotation || 0],
    [t("taskTypes"), tasks],
  ]
    .map(([label, value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

async function loadRiskQueue() {
  const list = document.getElementById("riskQueueList");
  const summary = document.getElementById("riskQueueSummary");
  const button = document.getElementById("loadRiskQueue");
  if (!list || !summary) return;
  button.disabled = true;
  try {
    const query = filtersToQuery();
    const params = new URLSearchParams(query);
    const riskType = document.getElementById("riskTypeFilter")?.value || "";
    if (riskType) params.set("risk_type", riskType);
    params.set("limit", "50");
    const suffix = `?${params.toString()}`;
    const result = await api(`/api/risk-queue${suffix}`);
    summary.textContent = t("riskQueueSummary")(result);
    list.classList.remove("hidden");
    list.innerHTML = (result.items || []).length
      ? result.items.map((item) => `
          <button class="risk-row" type="button" data-image-id="${escapeHtml(item.image_id)}">
            <strong>${escapeHtml(item.annotator_group || "unknown")} · ${escapeHtml(item.relative_path || item.image_id)}</strong>
            <span>${escapeHtml(item.stage)} · ${escapeHtml((item.risks || []).join("、"))}</span>
          </button>
        `).join("")
      : `<div class="empty-row">${state.lang === "en" ? "No risk samples in current filters." : "当前筛选范围没有风险样本。"}</div>`;
    list.querySelectorAll("[data-image-id]").forEach((row) => {
      row.addEventListener("click", () => selectImage(row.dataset.imageId));
    });
    showToast(t("riskQueueTitle"), summary.textContent, "info", 6000);
  } catch (err) {
    summary.textContent = `${t("riskQueueFailed")}: ${err.message}`;
    showToast(t("riskQueueFailed"), err.message, "error", 9000);
  } finally {
    button.disabled = false;
  }
}

document.getElementById("applyFilters").addEventListener("click", async () => {
  try {
    await loadImages();
    showToast(t("filterApplied"), t("filterAppliedMsg")(state.images.length), "success");
  } catch (err) {
    showToast(t("filterApplied"), err.message, "error", 9000);
  }
});
document.getElementById("loadRiskQueue")?.addEventListener("click", loadRiskQueue);
document.getElementById("clearRiskQueue")?.addEventListener("click", () => {
  document.getElementById("riskQueueList")?.classList.add("hidden");
});

function clearFilterInputs() {
  [
    "taskFilter",
    "sceneFilter",
    "weatherFilter",
    "batchFilter",
    "annotatorGroupFilter",
    "sourceTypeFilter",
    "minAltitude",
    "maxAltitude",
    "minLongitude",
    "maxLongitude",
    "minLatitude",
    "maxLatitude",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

let filterApplyTimer = null;

function scheduleFilterApply() {
  window.clearTimeout(filterApplyTimer);
  filterApplyTimer = window.setTimeout(async () => {
    try {
      await loadImages();
    } catch (err) {
      showToast(t("filterApplied"), err.message, "error", 9000);
    }
  }, 180);
}

[
  "taskFilter",
  "sceneFilter",
  "weatherFilter",
  "batchFilter",
  "annotatorGroupFilter",
  "sourceTypeFilter",
  "minAltitude",
  "maxAltitude",
  "minLongitude",
  "maxLongitude",
  "minLatitude",
  "maxLatitude",
].forEach((id) => {
  document.getElementById(id)?.addEventListener("change", scheduleFilterApply);
  document.getElementById(id)?.addEventListener("input", scheduleFilterApply);
});

document.getElementById("resetFilters")?.addEventListener("click", async () => {
  clearFilterInputs();
  await loadImages();
  showToast(t("filterApplied"), t("filterAppliedMsg")(state.images.length), "success");
});

document.getElementById("clearDatasetIndex")?.addEventListener("click", async () => {
  const ok = window.confirm(t("clearDatasetConfirm"));
  if (!ok) return;
  try {
    await api("/api/reset-dataset", { method: "POST", body: JSON.stringify({}) });
    clearFilterInputs();
    state.facets = await api("/api/facets");
    refreshBatchOptions();
    state.currentId = null;
    state.metadata = null;
    state.annotation = null;
    state.bitmap = null;
    await loadImages();
    await loadStats();
    document.getElementById("statusText").textContent = t("datasetCleared");
    showToast(t("datasetCleared"), t("datasetClearedMsg"), "success", 8000);
  } catch (err) {
    showToast(t("datasetCleared"), err.message, "error", 9000);
  }
});
document.getElementById("refreshStats").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  document.getElementById("statusText").textContent = t("refreshingStats");
  try {
    const stats = await loadStats();
    const total = stats.total_images || 0;
    const reviewed = (stats.review_status_counts?.verified || 0) + (stats.review_status_counts?.reviewed || 0);
    showToast(t("statsRefreshed"), t("statsRefreshedMsg")(total, reviewed), "success");
    document.getElementById("statusText").textContent = t("statsRefreshed");
  } catch (err) {
    showToast(t("statsFailed"), err.message, "error", 9000);
    document.getElementById("statusText").textContent = `${t("statsFailed")}: ${err.message}`;
  } finally {
    button.disabled = false;
  }
});
document.getElementById("prevImage").addEventListener("click", () => selectRelativeImage(-1));
document.getElementById("nextImage").addEventListener("click", () => selectRelativeImage(1));
document.getElementById("openAdminImport")?.addEventListener("click", () => {
  const panel = document.getElementById("adminImportPanel");
  if (!panel) return;
  panel.open = true;
  panel.scrollIntoView({ block: "start", behavior: "smooth" });
});
document.getElementById("serverImportTab").addEventListener("click", () => setImportMode("server"));
document.getElementById("clientImportTab").addEventListener("click", () => setImportMode("client"));
document.getElementById("clientFolderFiles").addEventListener("change", () => {
  const files = document.getElementById("clientFolderFiles").files;
  document.getElementById("clientUploadSummary").textContent = files.length
    ? t("localSelected")(files.length)
    : t("noLocalFolder");
});

function setManualMode(mode) {
  const nextDraw = mode === "box" ? !state.drawMode : false;
  const nextOcr = mode === "ocr" ? !state.ocrMode : false;
  const nextPolygon = mode === "polygon" ? !state.polygonMode : false;
  if (mode === "ocr") hideOcrPrompt();
  state.drawMode = nextDraw;
  state.ocrMode = nextOcr;
  state.polygonMode = nextPolygon;
  if (nextDraw || nextOcr || nextPolygon) {
    state.rotatedBoxMode = false;
    state.samPromptMode = false;
    state.editGeometryMode = false;
    state.samPromptPoints = [];
  }
  if (!state.polygonMode) state.draftPolygon = [];
  document.getElementById("drawBoxMode").classList.toggle("active-tool", state.drawMode);
  document.getElementById("drawOcrMode").classList.toggle("active-tool", state.ocrMode);
  document.getElementById("drawRotatedBoxMode").classList.toggle("active-tool", false);
  document.getElementById("pointPolygonMode").classList.toggle("active-tool", state.polygonMode);
  document.getElementById("samPromptMode").classList.toggle("active-tool", false);
  document.getElementById("editGeometryMode").classList.toggle("active-tool", false);
  document.getElementById("finishPolygon").disabled = !state.polygonMode;
  document.getElementById("runSamPrompt").disabled = false;
  const status = mode === "ocr"
    ? (state.ocrMode ? t("ocrModeOn") : t("ocrModeOff"))
    : mode === "polygon"
      ? (state.polygonMode ? t("polygonModeOn") : t("polygonModeOff"))
      : (state.drawMode ? t("drawModeOn") : t("drawModeOff"));
  document.getElementById("statusText").textContent = status;
  showToast(mode === "ocr" ? "OCR" : t("manualToolTitle"), status, "info", 2600);
  drawCanvas();
}

document.getElementById("drawBoxMode").addEventListener("click", () => setManualMode("box"));

document.getElementById("drawOcrMode").addEventListener("click", () => setManualMode("ocr"));

document.getElementById("drawRotatedBoxMode").addEventListener("click", () => {
  state.rotatedBoxMode = !state.rotatedBoxMode;
  if (state.rotatedBoxMode) {
    state.drawMode = false;
    state.ocrMode = false;
    state.polygonMode = false;
    state.samPromptMode = false;
    state.editGeometryMode = false;
    state.draftPolygon = [];
    state.samPromptPoints = [];
  }
  document.getElementById("drawRotatedBoxMode").classList.toggle("active-tool", state.rotatedBoxMode);
  document.getElementById("drawBoxMode").classList.toggle("active-tool", false);
  document.getElementById("drawOcrMode").classList.toggle("active-tool", false);
  document.getElementById("pointPolygonMode").classList.toggle("active-tool", false);
  document.getElementById("samPromptMode").classList.toggle("active-tool", false);
  document.getElementById("editGeometryMode").classList.toggle("active-tool", false);
  document.getElementById("finishPolygon").disabled = true;
  document.getElementById("runSamPrompt").disabled = false;
  document.getElementById("statusText").textContent = state.rotatedBoxMode ? t("rotatedBoxModeOn") : t("rotatedBoxModeOff");
  showToast(t("manualToolTitle"), state.rotatedBoxMode ? t("rotatedBoxModeOn") : t("rotatedBoxModeOff"), "info", 3000);
  drawCanvas();
});

document.getElementById("pointPolygonMode").addEventListener("click", () => setManualMode("polygon"));

document.getElementById("finishPolygon").addEventListener("click", () => {
  finishDraftPolygon();
});

document.getElementById("selectedObjectLabel")?.addEventListener("focus", () => {
  if (state.annotation?.objects?.[state.selectedObjectIndex]) pushHistory();
});

document.getElementById("selectedObjectLabel")?.addEventListener("input", updateSelectedObjectLabel);

document.getElementById("samPromptMode").addEventListener("click", () => {
  if (!samBackendReady()) {
    showToast(t("samPromptFailed"), t("samUnavailable"), "warning", 7000);
    return;
  }
  state.samPromptMode = !state.samPromptMode;
  if (state.samPromptMode) {
    state.drawMode = false;
    state.ocrMode = false;
    state.rotatedBoxMode = false;
    state.polygonMode = false;
    state.editGeometryMode = false;
    state.draftPolygon = [];
    state.samPromptPoints = [];
  } else {
    state.samPromptPoints = [];
  }
  document.getElementById("samPromptMode").classList.toggle("active-tool", state.samPromptMode);
  document.getElementById("drawBoxMode").classList.toggle("active-tool", false);
  document.getElementById("drawOcrMode").classList.toggle("active-tool", false);
  document.getElementById("drawRotatedBoxMode").classList.toggle("active-tool", false);
  document.getElementById("pointPolygonMode").classList.toggle("active-tool", false);
  document.getElementById("editGeometryMode").classList.toggle("active-tool", false);
  document.getElementById("finishPolygon").disabled = true;
  document.getElementById("runSamPrompt").disabled = false;
  document.getElementById("statusText").textContent = state.samPromptMode ? t("samPromptOn") : t("samPromptOff");
  showToast(t("samPrompt"), state.samPromptMode ? t("samPromptOn") : t("samPromptOff"), "info", 3200);
  drawCanvas();
});

document.getElementById("runSamPrompt").addEventListener("click", () => {
  runSamPrompt();
});

document.getElementById("runOcrModel").addEventListener("click", runAutoOcr);
document.getElementById("ocrPromptSave").addEventListener("click", savePendingOcr);
document.getElementById("ocrPromptCancel").addEventListener("click", () => {
  hideOcrPrompt(t("ocrCanceled"));
  drawCanvas();
});
document.getElementById("ocrPromptInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    savePendingOcr();
  } else if (event.key === "Escape") {
    event.preventDefault();
    hideOcrPrompt(t("ocrCanceled"));
    drawCanvas();
  }
});

document.getElementById("editGeometryMode").addEventListener("click", () => {
  state.editGeometryMode = !state.editGeometryMode;
  if (state.editGeometryMode) {
    state.drawMode = false;
    state.ocrMode = false;
    state.rotatedBoxMode = false;
    state.polygonMode = false;
    state.samPromptMode = false;
    state.draftPolygon = [];
    state.samPromptPoints = [];
  } else {
    state.selectedObjectIndex = null;
    state.selectedSegmentIndex = null;
    state.activeGeometryDrag = null;
  }
  updateSelectedObjectLabelControl();
  document.getElementById("editGeometryMode").classList.toggle("active-tool", state.editGeometryMode);
  document.getElementById("drawBoxMode").classList.toggle("active-tool", false);
  document.getElementById("drawOcrMode").classList.toggle("active-tool", false);
  document.getElementById("drawRotatedBoxMode").classList.toggle("active-tool", false);
  document.getElementById("pointPolygonMode").classList.toggle("active-tool", false);
  document.getElementById("samPromptMode").classList.toggle("active-tool", false);
  document.getElementById("finishPolygon").disabled = true;
  document.getElementById("runSamPrompt").disabled = false;
  document.getElementById("statusText").textContent = state.editGeometryMode ? t("editGeometryOn") : t("editGeometryOff");
  showToast(t("manualToolTitle"), state.editGeometryMode ? t("editGeometryOn") : t("editGeometryOff"), "info", 3000);
  drawCanvas();
});

canvas.addEventListener("mousedown", (event) => {
  if (!state.annotation) return;
  const point = canvasPoint(event);
  if (state.editGeometryMode) {
    const hit = hitTestGeometry(point);
    state.selectedObjectIndex = hit?.objIndex ?? null;
    state.selectedSegmentIndex = hit?.segIndex ?? null;
    updateSelectedObjectLabelControl();
    if (hit) {
      pushHistory();
      const original = hit.type.startsWith("object")
        ? { bbox: [...state.annotation.objects[hit.objIndex].bbox] }
        : { points: (state.annotation.segments[hit.segIndex].points || []).map((pt) => [...pt]) };
      state.activeGeometryDrag = { ...hit, start: hit.sourcePt, original };
      document.getElementById("statusText").textContent = t("geometrySelected");
    } else {
      state.activeGeometryDrag = null;
    }
    drawCanvas();
    return;
  }
  if (state.polygonMode) {
    state.draftPolygon.push(point);
    document.getElementById("statusText").textContent = `${t("pointPolygon")} · ${state.draftPolygon.length} pts`;
    drawCanvas();
    return;
  }
  if (state.samPromptMode) {
    const scale = state.imageScale || 1;
    state.samPromptPoints.push({ x: Math.round(point.x / scale), y: Math.round(point.y / scale), label: 1 });
    document.getElementById("runSamPrompt").disabled = false;
    document.getElementById("statusText").textContent = `${t("samPrompt")} · ${state.samPromptPoints.length} pts`;
    drawCanvas();
    return;
  }
  if (!state.drawMode && !state.rotatedBoxMode && !state.ocrMode) return;
  state.drawingBox = true;
  state.draftBox = [point.x, point.y, 0, 0];
});

canvas.addEventListener("mousemove", (event) => {
  if (state.activeGeometryDrag) {
    applyGeometryDrag(canvasPoint(event));
    renderObjects();
    renderSegments();
    drawCanvas();
    return;
  }
  if (!state.drawingBox || !state.draftBox) return;
  const point = canvasPoint(event);
  state.draftBox[2] = point.x - state.draftBox[0];
  state.draftBox[3] = point.y - state.draftBox[1];
  drawCanvas();
});

canvas.addEventListener("mouseup", (event) => {
  if (state.activeGeometryDrag) {
    state.activeGeometryDrag = null;
    renderObjects();
    renderSegments();
    drawCanvas();
    return;
  }
  if (!state.drawingBox || !state.draftBox) return;
  let [x, y, w, h] = state.draftBox;
  if (w < 0) {
    x += w;
    w = Math.abs(w);
  }
  if (h < 0) {
    y += h;
    h = Math.abs(h);
  }
  state.drawingBox = false;
  state.draftBox = null;
  if (w < 8 || h < 8) {
    drawCanvas();
    return;
  }
  state.annotation.objects = state.annotation.objects || [];
  const scale = state.imageScale || 1;
  if (state.ocrMode) {
    showOcrPrompt(
      [Math.round(x / scale), Math.round(y / scale), Math.round(w / scale), Math.round(h / scale)],
      event.clientX,
      event.clientY
    );
    drawCanvas();
    return;
  }
  pushHistory();
  state.annotation.objects.push({
    label: document.getElementById("newBoxLabel").value.trim() || "object",
    bbox: [Math.round(x / scale), Math.round(y / scale), Math.round(w / scale), Math.round(h / scale)],
    rotation: state.rotatedBoxMode ? Number(document.getElementById("rotationAngle").value || 0) : 0,
    score: null,
    status: "human",
  });
  renderObjects();
  renderSegments();
  drawCanvas();
});

canvas.addEventListener("dblclick", (event) => {
  if (!state.polygonMode) return;
  event.preventDefault();
  finishDraftPolygon();
});

function finishDraftPolygon() {
  if (!state.annotation || !state.polygonMode) return;
  if (state.draftPolygon.length < 3) {
    showToast(t("manualToolTitle"), t("polygonNeedPoints"), "warning");
    return;
  }
  const scale = state.imageScale || 1;
  pushHistory();
  state.annotation.segments = state.annotation.segments || [];
  state.annotation.segments.push({
    label: document.getElementById("newBoxLabel").value.trim() || "region",
    points: state.draftPolygon.map((pt) => [Math.round(pt.x / scale), Math.round(pt.y / scale)]),
    score: null,
    status: "human",
    type: "polygon",
  });
  state.draftPolygon = [];
  state.polygonMode = false;
  document.getElementById("pointPolygonMode").classList.toggle("active-tool", false);
  document.getElementById("finishPolygon").disabled = true;
  renderSegments();
  drawCanvas();
  document.getElementById("statusText").textContent = t("polygonAdded");
  showToast(t("manualToolTitle"), t("polygonAdded"), "success");
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches?.[0]?.clientX ?? event.clientX;
  const clientY = event.touches?.[0]?.clientY ?? event.clientY;
  return {
    x: Math.max(0, Math.min(canvas.width, ((clientX - rect.left) / rect.width) * canvas.width)),
    y: Math.max(0, Math.min(canvas.height, ((clientY - rect.top) / rect.height) * canvas.height)),
  };
}

function setImportMode(mode) {
  state.importMode = mode;
  document.getElementById("serverImportTab").classList.toggle("active", mode === "server");
  document.getElementById("clientImportTab").classList.toggle("active", mode === "client");
  document.getElementById("serverImportPane").classList.toggle("active", mode === "server");
  document.getElementById("clientImportPane").classList.toggle("active", mode === "client");
}

document.getElementById("browseFolder").addEventListener("click", async () => {
  const path = document.getElementById("folderPath").value.trim();
  try {
    await browsePath(path, true);
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("browseFailed")}: ${err.message}`;
    showToast(t("browseFailed"), err.message, "error", 9000);
  }
});

document.getElementById("importFolder").addEventListener("click", importData);
document.getElementById("previewRulePrefill")?.addEventListener("click", () => runRulePrefill(true));
document.getElementById("applyRulePrefill")?.addEventListener("click", () => runRulePrefill(false));

async function runRulePrefill(dryRun = true) {
  const previewButton = document.getElementById("previewRulePrefill");
  const applyButton = document.getElementById("applyRulePrefill");
  const summary = document.getElementById("rulePrefillSummary");
  try {
    previewButton.disabled = true;
    applyButton.disabled = true;
    const preview = await api("/api/prefill/rules", {
      method: "POST",
      body: JSON.stringify({ dry_run: true }),
    });
    const message = t("rulePrefillSummary")(preview);
    if (summary) summary.textContent = message;
    if (dryRun) {
      document.getElementById("statusText").textContent = message;
      showToast(t("rulePrefillPreviewTitle"), message, "info", 7000);
      return;
    }
    if (!preview.would_update) {
      showToast(t("rulePrefillApplyTitle"), message, "info", 5000);
      return;
    }
    if (!window.confirm(t("rulePrefillConfirm")(preview.would_update))) return;
    const result = await api("/api/prefill/rules", {
      method: "POST",
      body: JSON.stringify({ dry_run: false }),
    });
    const doneMessage = t("rulePrefillSummary")(result);
    if (summary) summary.textContent = doneMessage;
    document.getElementById("statusText").textContent = doneMessage;
    showToast(t("rulePrefillApplyTitle"), doneMessage, "success", 8000);
    await loadImages();
    await loadStats();
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("rulePrefillFailed")}: ${err.message}`;
    showToast(t("rulePrefillFailed"), err.message, "error", 9000);
  } finally {
    if (previewButton) previewButton.disabled = false;
    if (applyButton) applyButton.disabled = false;
  }
}

async function importData() {
  const tasks = Array.from(document.getElementById("importTasks").selectedOptions).map((option) => option.value);
  const common = {
    batch: document.getElementById("importBatch").value.trim(),
    scene: document.getElementById("importScene").value,
    weather: document.getElementById("importWeather").value,
    flight_height_m: document.getElementById("importAltitude").value,
    longitude: document.getElementById("importLongitude").value,
    latitude: document.getElementById("importLatitude").value,
    tasks,
    replace_existing: state.importMode === "server"
      ? document.getElementById("replaceDataset").checked
      : document.getElementById("replaceDatasetClient").checked,
  };
  if (common.replace_existing) {
    const ok = window.confirm(t("replaceDatasetConfirm"));
    if (!ok) return;
  }
  try {
    let result;
    if (state.importMode === "server") {
      const payload = {
        ...common,
        folder: document.getElementById("folderPath").value.trim(),
        recursive: document.getElementById("importRecursive").checked,
      };
      if (!payload.folder) {
        document.getElementById("statusText").textContent = t("chooseServerFolder");
        showToast(t("importFailed"), t("chooseServerFolder"), "warning");
        return;
      }
      result = await api("/api/import-folder", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } else {
      const files = Array.from(document.getElementById("clientFolderFiles").files);
      if (!files.length) {
        document.getElementById("statusText").textContent = t("chooseLocalFolder");
        showToast(t("importFailed"), t("chooseLocalFolder"), "warning");
        return;
      }
      const form = new FormData();
      for (const file of files) {
        form.append("files", file, file.webkitRelativePath || file.name);
      }
      for (const [key, value] of Object.entries(common)) {
        if (Array.isArray(value)) {
          value.forEach((item) => form.append(key, item));
        } else {
          form.append(key, value === true ? "1" : value);
        }
      }
      result = await api("/api/upload-folder", {
        method: "POST",
        headers: {},
        body: form,
      });
    }
    state.facets = await api("/api/facets");
    refreshBatchOptions();
    state.currentId = null;
    await loadImages();
    await loadStats();
    if (state.importMode === "server") {
      document.getElementById("selectedFolderSummary").textContent = t("serverImported")(result.folder, result.scanned, result.imported);
    }
    const message = t("importDoneSummary")(result.scanned, result.imported, result.skipped.length);
    document.getElementById("statusText").textContent = message;
    showToast(t("importDone"), message, "success", 7000);
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("importFailed")}: ${err.message}`;
    showToast(t("importFailed"), err.message, "error", 9000);
  }
}

document.getElementById("addBox").addEventListener("click", () => {
  if (!state.annotation) {
    document.getElementById("statusText").textContent = t("selectImage");
    showToast(t("boxAddedTitle"), t("selectImage"), "warning");
    return;
  }
  state.annotation.objects = state.annotation.objects || [];
  const sourceWidth = Number(state.metadata.width || state.bitmap?.width || 1000);
  const sourceHeight = Number(state.metadata.height || state.bitmap?.height || 800);
  const w = Math.max(32, Math.round(sourceWidth * 0.18));
  const h = Math.max(32, Math.round(sourceHeight * 0.14));
  pushHistory();
  state.annotation.objects.push({
    label: document.getElementById("newBoxLabel").value.trim() || "object",
    bbox: [Math.round((sourceWidth - w) / 2), Math.round((sourceHeight - h) / 2), w, h],
    rotation: Number(document.getElementById("rotationAngle")?.value || 0),
    score: null,
    status: "human",
  });
  renderObjects();
  renderSegments();
  drawCanvas();
  document.getElementById("statusText").textContent = t("boxAdded");
  showToast(t("boxAddedTitle"), t("boxAdded"), "success");
});

document.getElementById("undoAction").addEventListener("click", () => {
  if (!state.history.length) {
    document.getElementById("statusText").textContent = t("noUndo");
    showToast(t("undoTitle"), t("noUndo"), "warning");
    return;
  }
  restoreAnnotation(state.history.pop(), t("undoDone"));
  showToast(t("undoTitle"), t("undoDone"), "success");
});

document.getElementById("clearAnnotations").addEventListener("click", () => {
  if (!state.annotation) {
    document.getElementById("statusText").textContent = t("selectImage");
    showToast(t("clearedTitle"), t("selectImage"), "warning");
    return;
  }
  if (!window.confirm(t("clearCurrentConfirm"))) {
    return;
  }
  pushHistory();
  state.annotation.objects = [];
  state.annotation.segments = [];
  state.draftBox = null;
  state.draftPolygon = [];
  state.samPromptPoints = [];
  hideOcrPrompt();
  state.drawingBox = false;
  state.annotation.ocr = [];
  state.annotation.events = [];
  state.annotation.reject_reason = "";
  state.annotation.notes = "";
  state.annotation.restoration = {
    ...(state.annotation.restoration || {}),
    degradation: "",
    clear_pair_id: "",
    quality: "",
    status: "human",
  };
  state.annotation.urban_structure = { summary: "", status: "human" };
  renderForm();
  renderObjects();
  renderSegments();
  renderOcr();
  drawCanvas();
  document.getElementById("statusText").textContent = t("cleared");
  showToast(t("clearedTitle"), t("cleared"), "success");
});

document.getElementById("rerunPrediction").addEventListener("click", async () => {
  if (!state.currentId) {
    document.getElementById("statusText").textContent = t("selectImage");
    showToast(t("modelFailed"), t("selectImage"), "warning");
    return;
  }
  pushHistory();
  document.getElementById("statusText").textContent = t("rerunMocking");
  try {
    state.annotation = await api(`/api/images/${state.currentId}/predict`, { method: "POST" });
    renderForm();
    renderObjects();
    renderSegments();
    renderOcr();
    drawCanvas();
    loadStats();
    document.getElementById("statusText").textContent = t("rerunDone");
    showToast(t("modelDone"), t("rerunDone"), "success");
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("rerunFailed")}: ${err.message}`;
    showToast(t("rerunFailed"), err.message, "error", 9000);
  }
});

async function saveReview(autoNext = false) {
  if (!state.currentId || state.saveInProgress) return;
  state.saveInProgress = true;
  setSaveButtonsDisabled(true);
  syncFormToAnnotation();
  syncObjectsFromRows();
  if (state.annotation.review_status === "rejected" && !state.annotation.reject_reason) {
    const ok = window.confirm("当前状态为“驳回重标”，但尚未填写异常/弃标原因。仍然保存吗？");
    if (!ok) {
      state.saveInProgress = false;
      setSaveButtonsDisabled(false);
      return;
    }
  }
  const warnings = requiredFieldWarnings();
  if (warnings.length) {
    const ok = window.confirm(`当前样本存在可能漏填项：\n\n${warnings.join("\n")}\n\n仍然保存吗？`);
    if (!ok) {
      state.saveInProgress = false;
      setSaveButtonsDisabled(false);
      return;
    }
  }
  const savedId = state.currentId;
  try {
    state.annotation = await api(`/api/images/${savedId}/annotation`, {
      method: "POST",
      body: JSON.stringify(state.annotation),
    });
    const local = state.images.find((item) => item.id === savedId);
    if (local) local.review_status = state.annotation.review_status || "verified";
    renderImageList();
    loadStats();
    document.getElementById("statusText").textContent = autoNext ? t("saveNext") : t("saveDone");
    showToast(t("saveDone"), autoNext ? t("saveNext") : t("saveDone"), "success", 3600);
    if (autoNext) {
      const savedIndex = state.images.findIndex((item) => item.id === savedId);
      const nextIndex = Math.min(state.images.length - 1, savedIndex + 1);
      if (nextIndex >= 0 && state.images[nextIndex]?.id !== savedId) {
        await selectImage(state.images[nextIndex].id);
      }
    }
  } catch (err) {
    document.getElementById("statusText").textContent = `${t("saveFailed")}: ${err.message}`;
    showToast(t("saveFailed"), err.message, "error", 9000);
  } finally {
    state.saveInProgress = false;
    setSaveButtonsDisabled(false);
  }
}

function setSaveButtonsDisabled(disabled) {
  ["saveReview", "saveReviewSticky", "confirmAndNext"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = disabled;
  });
}

function confirmAndNext() {
  if (!state.annotation) return;
  const review = document.getElementById("reviewStatus");
  if (review && review.value !== "rejected") review.value = "labeled";
  saveReview(true);
}

document.getElementById("saveReview").addEventListener("click", () => saveReview(false));
document.getElementById("saveReviewSticky")?.addEventListener("click", () => saveReview(false));
document.getElementById("confirmAndNext")?.addEventListener("click", confirmAndNext);
document.getElementById("bulkRelabelSelected")?.addEventListener("click", () => bulkRelabelObjects("selected"));
document.getElementById("bulkRelabelAll")?.addEventListener("click", () => bulkRelabelObjects("all"));
document.getElementById("bulkRelabelSame")?.addEventListener("click", () => bulkRelabelObjects("same"));
document.getElementById("previewBatchModel")?.addEventListener("click", () => runBatchModel(true));
document.getElementById("runBatchModel")?.addEventListener("click", () => runBatchModel(false));

document.addEventListener("keydown", (event) => {
  const typing = isTypingTarget(event.target);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveReview(true);
  } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    saveReview(true);
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    document.getElementById("undoAction").click();
  } else if (!typing && event.key === "Enter" && state.draftPolygon?.length >= 3) {
    event.preventDefault();
    finishDraftPolygon();
  } else if (!typing && event.key === "ArrowRight") {
    selectRelativeImage(1);
  } else if (!typing && event.key === "ArrowLeft") {
    selectRelativeImage(-1);
  } else if (!typing && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "b") {
    event.preventDefault();
    document.getElementById("drawRotatedBoxMode").click();
  } else if (!typing && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "o") {
    event.preventDefault();
    setManualMode("ocr");
  } else if (!typing && !event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    setManualMode("polygon");
  } else if (!typing && applyKeyboardShortcut(event.key, event.altKey, event.shiftKey)) {
    event.preventDefault();
  }
});

document.querySelectorAll("[data-export-run]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = button.dataset.exportRun || "server";
    const fmt = document.querySelector(`[data-export-format="${target}"]`)?.value || "json";
    button.disabled = true;
    const targetName = target === "local" ? t("localTarget") : t("serverTarget");
    document.getElementById("statusText").textContent = t("exportingStatus")(targetName, fmt);
    showToast(t("exportStart"), t("exportStartMsg")(fmt, targetName), "info", 2600);
    try {
      if (target === "local") {
        window.location.href = `/api/export/${fmt}/download`;
        document.getElementById("statusText").textContent = t("downloadingStatus")(fmt);
        showToast(t("downloadStarted"), t("downloadStartedMsg")(fmt), "success", 7000);
      } else {
        const result = await api(`/api/export/${fmt}`, { method: "POST" });
        document.getElementById("statusText").textContent = t("exportedStatus")(fmt, result.path);
        showToast(t("serverExportDone"), t("serverExportDoneMsg")(fmt, result.path), "success", 9000);
      }
    } catch (err) {
      document.getElementById("statusText").textContent = t("exportFailedStatus")(fmt, err.message);
      showToast(t("exportFailed"), err.message, "error", 9000);
    } finally {
      button.disabled = false;
    }
  });
});

init().catch((err) => {
  document.getElementById("statusText").textContent = err.message;
  console.error(err);
});

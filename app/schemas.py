TASKS = [
    "scene_classification",
    "environment_state",
    "object_detection",
    "semantic_segmentation",
    "instance_segmentation",
    "ocr",
    "event_qa",
    "restoration_pairing",
    "urban_structure",
]

TASK_NAMES = {
    "scene_classification": "场景识别",
    "environment_state": "环境状态识别",
    "object_detection": "目标检测/计数",
    "semantic_segmentation": "语义分割",
    "instance_segmentation": "实例分割",
    "ocr": "OCR",
    "event_qa": "事件理解/QA",
    "restoration_pairing": "图像复原配对",
    "urban_structure": "城市结构理解",
}

SCENE_LABELS = [
    "工地",
    "工业园区",
    "交通要道",
    "居住区",
    "商业区",
    "学校区",
    "菜市场",
    "加油站",
    "酒店",
    "通信/电力塔",
    "林地",
    "农田",
    "湖面",
    "湿地",
]

OBJECT_LABELS = [
    "ship",
    "vehicle",
    "non_motor_vehicle",
    "vendor",
    "person",
    "crane",
    "truck",
    "excavator",
    "building",
    "tower",
    "smoke",
    "fire",
    "garbage",
    "illegal_parking",
]

SEGMENT_LABELS = ["道路", "河道", "农林园田", "湿地公园", "建筑物", "水体"]

EVENT_LABELS = [
    "河道排污",
    "燃烧",
    "挖机作业",
    "垃圾堆放",
    "庆典集会",
    "人群聚集",
    "操场运动",
    "交通拥堵",
    "违章停车",
    "盗采",
    "秸秆燃烧",
    "河道/湖泊污染",
]

WEATHER_LABELS = ["晴", "雨", "雾", "夜间", "红外"]

RESTORATION_TYPES = ["雨", "雾", "红外", "低照度", "模糊"]

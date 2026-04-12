# AI 早报内容工厂 v2 升级交付文档

日期：2026-04-10
范围：E:\zaobao
目标：按 v2 升级说明逐步推进，完成可运行升级并形成可验收交付物。

## 1. 本次升级总览

本次变更已完成以下 v2 关键升级：

1. 采集层从 v1 升级为多类型 collector 并存：
- official-rss
- rsshub
- opencli
- browser fallback

2. 标准化层升级：
- 每条候选统一补齐 sourceType/newsType/clusterId/score
- 建立 v2 评分规则（模型/研究/工具加分，官方源加分，二手与营销降分）

3. 去重聚类与候选池升级：
- 保留 72 小时去重窗口
- 新增事件聚类（cluster）
- 新增候选池输出 candidates.json（10-20 条能力位）
- 主片入选压缩为 5-6 条（受时长约束）

4. 编辑中台中间产物落地：
- candidates.json
- issue.json

5. 小红书链路改造：
- 从视频改为多张信息卡图片
- 输出 xiaohongshu-card-01.png...-0n.png
- 保留 xiaohongshu-note.md

6. TTS 架构改造：
- 新增可插拔 TTS 入口
- 默认 edge-tts
- 自动回退 Windows TTS

7. 视频主链路与抖音切片升级：
- Remotion 作为默认主渲染路径
- Remotion 异常时自动回退 ffmpeg（可配置 strict）
- 抖音改为 1-3 条独立竖版切片输出

8. 自动化调度能力补齐：
- 新增 Windows 计划任务创建脚本
- 支持每天定时在早上 8 点前自动生成

9. 审校闭环与状态流：
- 支持 `--review-file` 输入审校决策
- issue 级状态支持 approved/edited/rejected/pending
- 可输出 review-summary.json 审校统计

10. OpenCLI 采集增强：
- 支持分页（maxPages）
- 支持重试（retry）
- 支持 JSON/JSON Lines 输出

11. 小红书模板体系增强：
- 增加封面卡 + 条目卡 + 总结卡三段式输出

## 2. 逐步升级清单（执行顺序）

### Step 1：候选标准化与评分
变更文件：
- src/core/candidate-normalizer.js
- src/collectors/index.js

结果：采集结果已统一为 v2 候选结构，评分逻辑集中管理。

### Step 2：72 小时去重 + 聚类 + 来源择优
变更文件：
- src/core/build-digest.js

结果：从“单纯去重”升级为“去重+聚类+择优”，并形成 candidatePool。

### Step 3：编辑中台中间产物
变更文件：
- src/core/create-daily-package.js
- src/core/write-daily-package.js

结果：输出 candidates.json 与 issue.json，可用于审校、复查、回溯。

### Step 4：小红书产物改为图片卡
变更文件：
- src/render/xiaohongshu-cards.js
- src/cli/build-digest.js
- src/core/write-daily-package.js

结果：不再写 xiaohongshu-video.mp4，改为多张卡片图片。

### Step 5：TTS 改造为可插拔
变更文件：
- src/audio/synthesize-segments.js
- src/audio/windows-tts.js
- src/render/ffmpeg-renderer.js
- src/render/remotion-renderer.js

结果：默认走 edge-tts，失败自动回退到 Windows TTS。

### Step 6：v2 信源分层与采集器扩展
变更文件：
- src/collectors/opencli.js
- src/collectors/rsshub.js
- src/collectors/index.js
- src/config/default-sources.js
- README.md

结果：默认配置具备 A/B/C 分层信息，并支持 official-rss/rsshub/opencli 类型。

### Step 7：视频主路径切换与抖音 1-3 切片
变更文件：
- src/core/create-daily-package.js
- src/core/write-daily-package.js
- src/render/render-package.js
- src/render/ffmpeg-renderer.js
- src/render/remotion-renderer.js

结果：
- 默认渲染引擎改为 Remotion（失败自动回退 ffmpeg）
- 抖音输出由单文件升级为 1-3 条切片（douyin-video-01/02/03.mp4）

### Step 8：自动化定时生成（Windows）
变更文件：
- src/cli/setup-windows-schedule.js
- package.json
- README.md

结果：可通过 npm 命令直接创建 Windows 计划任务，满足“早上 8 点前自动生成”落地路径。

### Step 9：审校闭环（review-file）
变更文件：
- src/core/review-workflow.js
- src/cli/build-digest.js
- src/core/create-daily-package.js
- README.md

结果：
- 支持构建前审校决策输入并应用到 issue
- 支持 edited 覆盖主稿字段
- 支持 rejected 自动剔除
- 输出 review-summary.json 便于审校回溯

### Step 10：OpenCLI 生产级增强
变更文件：
- src/collectors/opencli.js
- README.md

结果：
- OpenCLI 支持分页和重试
- 支持 JSON 数组/对象(items)/JSON Lines 三种返回

### Step 11：小红书多模板卡片
变更文件：
- src/render/xiaohongshu-cards.js

结果：
- 卡片序列升级为 封面卡 + 逐条新闻卡 + 总结卡

## 3. 产物契约变化

升级后输出目录（output/YYYY-MM-DD）新增/变化如下：

新增：
- candidates.json
- issue.json
- review-summary.json（使用 review-file 时）
- xiaohongshu-card-01.png ... xiaohongshu-card-0n.png

保留：
- master-digest.md
- wechat.md
- wechat.html
- bilibili-cover.html
- bilibili-cover-prompt.md
- bilibili-meta.md
- bilibili.srt
- bilibili-video.mp4
- douyin-meta.md
- douyin-video.mp4
- douyin-video-01.mp4 ... douyin-video-03.mp4
- xiaohongshu-note.md
- review-report.md

移除（按 v2 方向）：
- xiaohongshu-video.mp4

## 4. 验收结果

执行命令：
- npm test

结果：
- 全部测试通过（12/12）
- 当前工程无新增报错

## 5. 与 v2 规格逐项对齐说明

已对齐：
- 采集层四类 collector 并存
- 标准化字段
- 72 小时去重与聚类
- 候选池 + 结构化 issue
- 小红书改图片卡片
- TTS 可插拔并默认非 Windows 主路径
- Remotion 默认主路径 + ffmpeg 回退
- 抖音 1-3 条独立切片输出
- Windows 自动定时任务创建脚本
- 审校状态流（approved/edited/rejected/pending）
- OpenCLI 分页+重试+多格式返回
- 小红书三段式卡片模板

部分能力已预留但可继续增强：
- OpenCLI 目前为命令接入位，依赖 OPENCLI_FETCH_CMD 外部实现
- Remotion 已保留主路径能力，场景动画仍可继续加深（网页截图、品牌图层、更多动态镜头）
- 信源清单已扩展样例，仍可按运营节奏继续丰富 A/B/C 源

## 6. 回滚与兼容说明

- 保留 ffmpeg 与 remotion 双渲染引擎切换能力（ZAOBAO_RENDER_ENGINE）
- 保留 Windows TTS fallback，确保 edge-tts 不可用时仍可出片
- 旧的 fixture/rss/url/browser 类型继续兼容

## 7. 建议的下一阶段（v2.1）

1. 引入来源可信度配置与动态评分权重文件化
2. 增加 issue 人工审校状态字段（approved/rejected/edited）
3. OpenCLI 接入生产级命令链路（当前仍依赖 OPENCLI_FETCH_CMD）
4. 视频素材规划层接入网页截图/品牌图/补图编排

# AI 早报内容工厂 V2 升级说明

## 1. 文档目的

本文档用于定义 `E:\zaobao` 项目的 `v2` 升级方向，作为后续实现、拆分任务、验收和迭代的统一依据。

`v2` 的目标不是继续堆一个“能跑”的 demo，而是把当前项目升级为一套更稳定的半自动内容生产系统，能够围绕 `公众号 + B站 + 抖音 + 小红书` 每天产出一套可审后手动发布的内容包。

## 2. 已确认的产品目标

- 每天在 `早上 8 点前` 自动生成一套日报交付包。
- 资讯范围以 `全球 AI` 为主，但内容选择优先关注：
  - 新模型发布
  - 新技术/研究突破
  - 新产品能力更新
  - 开发者工具与 agent 工作流变化
- 输出平台包括：
  - `公众号`：完整长文
  - `B站`：`3-4 分钟` 横版完整日报视频
  - `抖音`：从主稿中拆出的竖版短视频切片
  - `小红书`：不做视频，改为 `多张卡片图片`，每张图片对应一条新闻，并配套笔记文案
- 最终发布仍由人工完成，`v2` 不做自动代发。

## 3. 当前 v1 存在的问题

### 3.1 采集层过薄

当前默认信源只有少量 RSS 与 fixture，抓取能力不足，导致：

- 候选新闻数量明显不足
- 一手源比例偏低
- “新模型/新技术”信号容易漏掉
- 对中文平台和非 RSS 站点几乎没有覆盖

### 3.2 编辑中台缺失

当前流程更像“抓几条新闻后直接生成”，缺少中间层：

- 没有稳定的候选池
- 没有成熟的事件聚类与来源择优
- 没有清晰的模型/技术优先评分机制
- 审校信息不够丰富

### 3.3 视频模板仍是早期方案

当前主路径是：

`主稿 -> TTS -> 静态卡片图 -> ffmpeg 拼接`

这会导致：

- 横竖版排版差异处理不足
- 画面过静
- 文字卡片与音频节奏耦合粗糙
- 裁剪与留白容易失衡
- 动画层缺失

### 3.4 配音质量不足

当前使用 Windows `System.Speech`，存在明显机械感，不适合长期做内容品牌。

### 3.5 小红书产物类型不匹配

原方案把小红书也当作视频平台处理，但实际更适合产出：

- 多张卡片图
- 每张卡片聚焦一条新闻
- 再配一段适合小红书的笔记文案与标签

## 4. v2 的总体原则

### 4.1 先做厚“采集与编辑层”，再做精“视频层”

日报系统的质量首先来自：

- 找到足够好的新闻
- 正确判断哪些值得讲
- 对同一事件去重并择优引用

而不是先堆复杂动画。

### 4.2 统一主稿，多端派生

所有平台内容都从同一份结构化主稿派生，不做四套互相独立的内容流。

### 4.3 平台适配而不是平台复制

- `公众号` 重完整信息密度
- `B站` 重完整叙事
- `抖音` 重强开头与短节奏
- `小红书` 重信息卡视觉和笔记感

### 4.4 保留人工把关

`v2` 的目标是“高自动化”，不是“全自动无人值守”。

## 5. v2 目标工作流

### 5.1 总体流程

```text
信源发现
-> 采集
-> 标准化
-> 去重/聚类
-> 优先级打分
-> 生成候选池
-> 生成结构化主稿
-> 派生公众号/B站/抖音/小红书产物
-> 渲染视频与图片
-> 导出日报交付包
```

### 5.2 视频链路目标流程

```text
结构化主稿
-> 口播稿句级拆分
-> TTS 合成
-> 音频时长计算
-> 画面素材规划
-> HTML 卡片 / 网页截图 / 品牌图 / 补图生成
-> Remotion 时间轴编排
-> ffmpeg 导出横版与竖版视频
```

### 5.3 小红书链路目标流程

```text
结构化主稿
-> 每条新闻生成一张信息卡
-> 统一主题色和卡片模板
-> 导出多张 PNG / WebP
-> 生成小红书笔记文案
-> 生成标题与标签建议
```

## 6. 平台产物重新定义

### 6.1 公众号

交付物：

- `wechat.md`
- `wechat.html`

要求：

- 使用日报专用模板
- 顶部标题区 + 概览索引区 + 分条正文区 + 来源区
- 保持橘鸦式“高信息密度但不乱”的布局风格

### 6.2 B站

交付物：

- `bilibili-video.mp4`
- `bilibili.srt`
- `bilibili-meta.md`
- `bilibili-cover.html`
- `bilibili-cover-prompt.md`

要求：

- `3-4 分钟` 横版完整日报
- 覆盖当天 `5-6 条` 高价值新闻
- 节奏完整但不拖沓
- 画面应包含标题卡、信息卡、网页截图、来源标识等多种元素

### 6.3 抖音

交付物：

- `douyin-video.mp4`
- `douyin-meta.md`

要求：

- 从主稿中拆出 `1-3` 条更适合传播的竖版短视频
- 前 3 秒更强
- 字幕更紧凑
- 不是简单裁切 B 站横版

### 6.4 小红书

交付物：

- `xiaohongshu-card-01.png` ... `xiaohongshu-card-n.png`
- `xiaohongshu-note.md`

要求：

- 每张图片只讲一条新闻
- 卡片设计统一、可连续滑动阅读
- 笔记文案偏总结与观点导语
- 不生成视频

## 7. v2 模块设计

### 7.1 信源层

分为三档：

- `A档：一手官方源`
  - OpenAI
  - Anthropic
  - Google AI / DeepMind
  - Meta
  - Mistral
  - xAI
  - Microsoft
  - NVIDIA
  - Hugging Face
  - Cohere
  - 通义 / 豆包 / 百度 / 月之暗面等中文模型厂商
- `B档：高价值媒体/聚合源`
  - Techmeme
  - The Verge AI
  - TechCrunch AI
  - VentureBeat AI
  - Ars Technica AI
  - Reuters AI
- `C档：平台补充源`
  - X
  - 公众号
  - B站
  - 小红书

补充说明：

- `公众号` 在 `v2` 中固定为 `补充来源`，不是主来源
- 公众号主要用于：
  - 中文解读补充
  - 国内模型厂商动态发现
  - 候选线索发现
- 已确认首个公众号种子源为：`橘鸦Juya`
- 后续新增公众号遵循以下规则：
  - 官方认证或官网明确关联
  - 近 `60 天` 内活跃
  - 以模型、研究、产品能力更新为主
  - 不优先接纯营销号或泛搬运号

### 7.2 采集层

建议四类 collector 并存：

- `official-rss collector`
- `rsshub collector`
- `opencli collector`
- `browser fallback collector`

说明：

- `RSSHub` 用于补齐无 RSS 的高价值站点或账号流
- `OpenCLI` 用于平台型抓取，优先支持：
  - `weixin`
  - `bilibili`
  - `xiaohongshu`
- `browser fallback` 用于动态页面与兜底抓取

### 7.3 标准化层

每条候选新闻统一落为：

```json
{
  "id": "string",
  "title": "string",
  "source": "string",
  "url": "string",
  "publishedAt": "ISO string",
  "content": "string",
  "lang": "zh|en|...",
  "tags": ["..."],
  "sourceType": "official|media|platform",
  "newsType": "model|research|product|tooling|policy|industry",
  "score": 0,
  "clusterId": "string|null"
}
```

### 7.4 去重、聚类与评分层

`v2` 需要从简单标题去重升级为三层判断：

- 标题级去重
- `72 小时` 事件聚类
- 来源择优

评分建议：

- 新模型发布：`+25`
- 新技术/研究突破：`+20`
- 开发者工具/agent 基础设施更新：`+16`
- 官方一手源：`+20`
- 多源交叉确认：`+15`
- 二手转述：`-15`
- 明显营销稿：`-10`

产出：

- 每天先形成 `10-20 条` 候选池
- 再压成 `5-6 条` 主片入选条目

### 7.5 编辑中台

应新增两个核心中间产物：

- `candidates.json`
- `issue.json`

作用：

- 让系统先沉淀“候选池”
- 再从候选池生成结构化主稿
- 让审校、回溯、来源复查更容易

### 7.6 主稿层

每条入选新闻的主稿结构统一为：

- 标题
- 一句话结论
- 为什么重要
- 关键事实 `1-2` 条
- 来源链接
- 推荐画面类型

这样平台稿、口播稿、卡片图、封面图都能从同一结构派生。

### 7.7 视频生成层

`v2` 应使用双层架构：

- `Remotion`：负责场景、动画、时间轴、字幕布局、横竖版 composition
- `ffmpeg`：负责音视频拼接、导出、压制、格式处理

说明：

- 当前 `ffmpeg 静态卡片拼接` 可以保留为 fallback
- 正式主路径应迁移为 `Remotion + ffmpeg`
- 动画实现遵循 [$remotion-best-practices](C:\Users\wenpengw\.agents\skills\remotion-best-practices\SKILL.md)

### 7.8 图片卡片层

小红书图片卡片建议采用：

- 统一尺寸，如 `3:4` 或适合小红书的竖向比例
- 每张卡片只承载一条新闻
- 结构为：
  - 顶部编号/栏目
  - 核心标题
  - 一句话摘要
  - 关键点 `1-2` 条
  - 来源角标

图片来源优先级：

- HTML 信息卡渲染
- 网页/产品截图
- 品牌 Logo / 官方配图
- AI 补图

### 7.9 TTS 层

建议改为可插拔：

- `默认主路径`：edge-tts
- `后续升级位`：OpenAI TTS
- `更高质量升级位`：ElevenLabs
- `最后 fallback`：Windows TTS

目标：

- 默认不再直接使用 Windows TTS 做主路径
- 优先解决“机械音严重”的问题
- 在不增加付费依赖的前提下先把人声自然度拉起来

## 8. 外部工具与复用建议

### 8.1 建议优先复用

- [RSSHub](https://github.com/DIYgod/RSSHub)
  - 用于丰富信源，不重复手写大量站点适配器
- [OpenCLI](https://opencli.info/docs/zh/guide/getting-started.html)
  - 作为平台型采集 adapter
- [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler)
  - 作为中文平台采集的重型备选
- [edge-tts](https://github.com/rany2/edge-tts)
  - 作为无 API key 条件下更自然的 TTS fallback
- `juya-news-card` 的卡片化思路
  - 已适合继续用于封面卡、摘要卡、片头卡、小红书信息卡

### 8.2 当前本机可直接帮助推进的 skill

- `multi-search-engine`
- `baoyu-url-to-markdown`
- `baoyu-danger-x-to-markdown`
- `agent-browser`
- `videoagent-audio-studio`
- `baoyu-html-to-wechat`
- `baoyu-markdown-to-html`
- `$remotion-best-practices`

### 8.3 三个核心开源项目的融入方案

本项目 `v2` 暂不引入 `n8n` 作为主依赖，优先融入以下三个项目：

#### RSSHub

定位：

- 采集层核心增强模块

接入方式：

- 新增 `rsshub collector`
- 扩展 source schema，支持标记 `type: "rsshub"`
- 在 `default sources` 之外维护一份更完整的 AI 信源清单
- 通过 RSSHub 将更多官方博客、媒体源和部分平台内容转成统一可拉取源
- 正式运行方式固定为：`本机 Docker`
- 不将公共 RSSHub 实例作为正式生产依赖

用于解决：

- 候选新闻过少
- 非原生 RSS 站点难接入
- 一手源覆盖不足

在架构中的位置：

```text
official-rss collector
+ rsshub collector
+ opencli collector
+ browser fallback collector
```

默认安全策略：

- 仅本机访问
- 默认绑定 `localhost`
- 不暴露到公网或局域网
- 不注入敏感账号 cookie
- `v2` 初期默认使用内存缓存，后续如有必要再补 redis

风险判断：

- 整体风险较低
- 主要风险来自：
  - Docker 资源占用
  - 个别 route 失效
  - 配置不当导致服务暴露
- 在“本机 Docker + localhost”前提下，属于可接受风险

#### Playwright

定位：

- 浏览器抓取与截图基础设施

接入方式：

- 继续保留并强化 `browser fallback collector`
- 增加 `screenshot renderer`
- 统一负责：
  - 动态网页抓取
  - 登录后页面抓取
  - HTML 卡片渲染截图
  - 网页发布页/产品页截图

用于解决：

- 普通 URL 抓取失败
- 需要真实浏览器环境的页面
- 视频与小红书图片素材缺乏真实视觉内容

在架构中的位置：

```text
结构化主稿
-> HTML 卡片 / 网页页面
-> Playwright 渲染与截图
-> 视频素材 / 小红书卡片图素材
```

实现默认：

- 默认浏览器固定为本机 `Chrome` 或 `Edge`
- 所有“网页截图 / 卡片截图 / 页面素材截图”统一走 Playwright
- 不再并存多套截图方案
- 浏览器登录态优先复用用户本机已有可登录浏览器环境

#### Remotion

定位：

- 视频模板与时间轴主引擎

接入方式：

- 重建 `B站横版主片` composition
- 重建 `抖音竖版切片` composition
- 使用 `useCurrentFrame()` 驱动动画
- 使用 `calculateMetadata` 根据音频时长动态计算 composition 时长
- 保持 `ffmpeg` 负责最终导出、转码与拼接

用于解决：

- 当前静态卡片拼接过于生硬
- 横竖版布局不能独立优化
- 动画、字幕、过场、场景编排能力不足

在架构中的位置：

```text
结构化主稿
-> 句级口播与字幕 JSON
-> Remotion composition
-> ffmpeg 导出成片
```

实现默认：

- `B站横版主片` 与 `抖音竖版短片` 分别建立独立 composition
- 动画统一遵循 `$remotion-best-practices`
- 字幕默认改为 JSON captions 驱动
- `ffmpeg` 仅承担导出、转码、拼接与压制职责

### 8.4 三个项目的集成顺序

推荐顺序：

1. `RSSHub`
2. `Playwright`
3. `Remotion`

原因：

- 先解决“有没有足够好的新闻”
- 再解决“有没有足够好的画面素材”
- 最后解决“如何把这些素材编排成质量更高的视频”

该顺序在 `v2` 阶段视为默认执行顺序，不再反复重新评估，除非后续出现新的外部约束

### 8.5 需要用户配合的事项

为顺利推进 `v2`，用户侧已确认或建议提供以下条件：

- 已确认允许本地接入或运行 `RSSHub`
- 已确认 `RSSHub` 采用 `Docker` 运行
- 保留一个可登录的 `Chrome` 或 `Edge`
  - 便于后续 Playwright 复用真实浏览器环境
- 已确认真人配音先采用“开源免费优先”
- 当前默认 TTS 方案按 `edge-tts` 规划
- 用户后续继续补充 `5-10` 个优先信源
  - 优先是模型厂商、研究团队、技术博客、长期关注的公众号

### 8.6 当前阶段不引入 n8n 的原因

`n8n` 有价值，但当前不作为 `v2` 主依赖，原因如下：

- 它更适合做调度、通知、审批流和系统间编排
- 不适合承载本项目的核心业务逻辑：
  - 候选池
  - 去重
  - 聚类
  - 优先级评分
  - 视频模板渲染
- 过早引入会增加系统复杂度，而不会先解决“新闻质量”和“视频质量”两个主问题

因此：

- `v2` 先完成内容中台和渲染中台
- `n8n` 可以在更后阶段用于定时任务、失败告警和人工审批流

补充说明：

- `ChatGPT Plus` 不等于 OpenAI API 额度
- 若未来接入 OpenAI TTS，需要单独使用 OpenAI API 并单独计费
- 因此 `v2` 的默认设计不依赖 ChatGPT Plus 直接提供程序化 TTS 能力

## 9. v2 每日交付包定义

```text
output/YYYY-MM-DD/
  master-digest.md
  candidates.json
  issue.json
  wechat.md
  wechat.html
  bilibili-cover.html
  bilibili-cover-prompt.md
  bilibili-meta.md
  bilibili.srt
  bilibili-video.mp4
  douyin-meta.md
  douyin-video.mp4
  xiaohongshu-card-01.png
  xiaohongshu-card-02.png
  ...
  xiaohongshu-note.md
  review-report.md
```

## 10. 分阶段实施方案

### 阶段 A：采集与评分升级

目标：

- 从“少量 RSS + fixture”升级到“多源候选池”

任务：

- 增加官方源白名单
- 接入 RSSHub collector
- 接入 OpenCLI collector
- 丰富候选新闻标准化字段
- 实现模型/技术优先评分

### 阶段 B：编辑中台升级

目标：

- 从“直接生成”升级到“候选池 -> 主稿”

任务：

- 产出 `candidates.json`
- 产出 `issue.json`
- 增强审校报告
- 引入 72 小时事件聚类

### 阶段 C：视频模板升级

目标：

- 从“静态图拼接”升级到“时间轴驱动视频”

任务：

- 重建 Remotion composition
- 设计横版主片模板
- 设计抖音竖版模板
- 字幕改为 JSON 驱动
- 引入标题卡、新闻卡、来源卡、结尾卡

### 阶段 D：配音升级

目标：

- 解决机械音问题

任务：

- 接入 edge-tts fallback
- 预留 ElevenLabs / OpenAI TTS provider
- 实现 provider 选择机制

### 阶段 E：小红书图片卡片升级

目标：

- 将小红书产物从视频改为卡片图

任务：

- 定义卡片模板
- 生成多张图片
- 输出笔记文案与标签建议

### 阶段 F：自动化与稳定性

目标：

- 稳定日更

任务：

- 增加定时任务入口
- 失败重试
- 日志与审计
- 产物完整性检查

## 11. 验收标准

`v2` 至少应满足：

- 每天候选新闻数 `>= 15`
- 可入选高质量条目 `>= 5`
- 主片 `3-4 分钟` 能稳定覆盖 `5-6 条` 新闻
- 横版与竖版不再出现严重留白、裁切失配或文字溢出
- 配音不再以 Windows 机械音作为主路径
- 小红书稳定输出多张卡片图而非视频
- 审校报告能明确列出：
  - 低可信度内容
  - 来源缺失项
  - 素材缺失项
  - 采集失败项

## 12. 推荐执行顺序

推荐按以下顺序推进：

1. 采集层升级
2. 评分与候选池升级
3. 小红书卡片图产物改造
4. 视频模板迁移到 Remotion
5. TTS 升级
6. 自动化与稳定性

原因：

- 先解决“有没有足够好的新闻”
- 再解决“这些新闻怎么被选中”
- 再解决“怎么更好地呈现”

## 13. 本文档对应的决策结论

- 小红书从 `视频产物` 调整为 `多张卡片图片 + 笔记文案`
- 视频主链长期应迁移到 `Remotion + ffmpeg`
- `ffmpeg 静态卡片拼接` 继续保留为 fallback
- 采集层优先接 `官方源 + RSSHub + OpenCLI`
- TTS 优先接 `edge-tts / ElevenLabs`
- `v2` 仍采用“系统产出成稿包，人工最终发布”的工作方式

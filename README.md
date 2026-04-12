# AI 早报四平台内容工厂 v1

一个面向 `公众号 + B站 + 抖音 + 小红书` 的本地日报流水线项目。

## 当前能力

- 统一采集入口：`RSS / RSSHub / OpenCLI / URL / browser`
- 候选资讯处理：初筛、去重、时长控制、日报主稿生成
- 多平台产物：公众号文稿、B站元信息与字幕、抖音文案、小红书笔记
- 视频主链：使用 `Remotion` 渲染横版主片与竖版切片
- 配音主链：使用 `edge-tts`

## 快速开始

```powershell
npm install
npm test
node src/cli/build-digest.js --date 2026-04-10 --output output
```

## 产物目录

```text
output/YYYY-MM-DD/
  candidates.json
  issue.json
  review-summary.json (可选，使用 --review-file 时生成)
  master-digest.md
  wechat.md
  wechat.html
  bilibili-cover.html
  bilibili-cover-prompt.md
  bilibili-meta.md
  bilibili.srt
  bilibili-video.mp4
  douyin-meta.md
  douyin-video.mp4
  douyin-video-01.mp4 ... douyin-video-03.mp4
  xiaohongshu-note.md
  xiaohongshu-card-01.png ... xiaohongshu-card-0n.png
  review-report.md
```

## 常用参数

```powershell
node src/cli/build-digest.js --help
```

- `--date YYYY-MM-DD` 指定日报日期
- `--output DIR` 指定输出目录
- `--sources FILE` 指定来源配置 JSON
- `--review-file FILE` 指定审校决策 JSON（可选）
- `--skip-render` 仅供测试旁路使用，高质量模式默认不允许

## 信源配置

默认配置见 [default-sources.js](/E:/zaobao/src/config/default-sources.js)。
仓库内附带的 [sources.fixture.json](/E:/zaobao/sources.fixture.json) 仅用于测试和调试，不参与高质量正式生成。

如果要自定义，可以提供一个 JSON 文件，数组元素格式如下：

```json
[
  {
    "id": "sample-fixture",
    "type": "fixture",
    "name": "Sample Fixture",
    "path": "data/fixtures/sample-ai-news.json",
    "tags": ["ai", "fixture"]
  }
]
```

支持类型：

- `rss`
- `official-rss`
- `rsshub`
- `opencli`
- `url`
- `browser`

说明：

- `official-rss` 对应 A 档官方源。
- `rsshub` 用于无 RSS 站点补齐。
- `opencli` 可通过环境变量 `OPENCLI_FETCH_CMD` 接入平台抓取。
- 高质量模式下不允许使用 `fixture` 作为正式信源。
- 高质量模式下如果某个信源抓取失败，整次构建会直接失败，不再静默继续。

`opencli` 源支持可选字段：

- `maxPages`：抓取分页数（默认 1）
- `retry`：失败重试次数（默认 2）

OpenCLI 输出支持：

- JSON 数组
- 含 `items` 字段的 JSON 对象
- JSON Lines

## 渲染引擎

高质量模式下只允许使用 `Remotion`：

```powershell
node src/cli/build-digest.js --date 2026-04-10 --output output
```

## TTS 引擎

- 高质量模式下只允许使用 `edge-tts`。
- 如果要显式指定路径，可设置：

```powershell
$env:ZAOBAO_EDGE_TTS_BIN = "C:\Users\wenpengw\AppData\Local\Programs\Python\Python310\Scripts\edge-tts.exe"
node src/cli/build-digest.js --date 2026-04-10 --output output
```

## 每日自动生成（Windows）

可创建 Windows 计划任务，让日报在早上 8 点前自动生成：

```powershell
npm run schedule:windows -- --time 07:30 --output output
```

查看将执行的命令（不真正创建任务）：

```powershell
npm run schedule:windows -- --time 07:30 --dry-run
```

## 审校闭环（可选）

你可以在构建时传入审校决策文件控制条目流转：

- `approved`：通过
- `edited`：通过并覆盖主稿字段
- `rejected`：剔除

示例：

```json
{
  "issues": [
    {"id": "issue-1", "status": "approved"},
    {
      "id": "issue-2",
      "status": "edited",
      "notes": "标题更偏中文",
      "override": {
        "title": "Google 发布新一代推理能力",
        "oneLineConclusion": "核心是推理成本下降并保持质量"
      }
    },
    {"id": "issue-3", "status": "rejected", "notes": "重复事件"}
  ]
}
```

运行：

```powershell
node src/cli/build-digest.js --date 2026-04-10 --output output --review-file review.json
```

## 抓取策略

- 主浏览器建议保留 `Chrome` 或 `Edge`，它们更适合真实兼容性、登录态复用、浏览器扩展和后续平台化抓取。
- `Lightpanda` 适合作为“公开网页快速抓取”的辅助浏览器，不建议作为本项目的唯一浏览器底座。
- 这是因为本项目后续很可能同时覆盖：
  - 公众号文章提取
  - B站 / 小红书等平台化内容抓取
  - 可能接入 `OpenCLI` 这类依赖真实浏览器会话与扩展的工具
- 如果你安装 `Lightpanda`，更推荐把它理解成：
  - 抓公开页面时更轻、更快的备用引擎
  - 不是 `Chrome` / `Edge` 的替代品
- `OpenCLI` 不是 v1 硬依赖，但很适合在后续接成可选 adapter，优先覆盖：
  - `weixin`
  - `bilibili`
  - `xiaohongshu`
- `RSSHub` 的正式推荐运行方式是本机实例，默认基址使用 `http://127.0.0.1:1200`，可通过 `RSSHUB_BASE_URL` 覆盖。

## 说明

- v1 默认以稳定出片为优先，视频风格是清爽简洁的暖橘/淡粉卡片。
- 公众号 HTML 现在采用日报专用模板，包含概览分组、编号索引、摘要引用块和正文条目。
- 同时会额外生成 `bilibili-cover.html` 与 `bilibili-cover-prompt.md`，用于封面卡、片头卡和后续截图流程。
- `browser` 采集器当前会回退到普通 URL 抓取，后续可以替换成更强的浏览器抓取命令。
- 自动发布没有纳入 v1，适合你做最终审稿和手动发布。

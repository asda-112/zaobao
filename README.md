# AI 早报四平台内容工厂 v1

一个面向 `公众号 + B站 + 抖音 + 小红书` 的本地日报流水线项目。

## 当前能力

- 统一采集入口：`fixture / RSS / URL / browser(回退到 URL)`
- 候选资讯处理：初筛、去重、时长控制、日报主稿生成
- 多平台产物：公众号文稿、B站元信息与字幕、抖音文案、小红书笔记
- 视频初版：默认使用 `ffmpeg` 卡片式渲染，生成横版主片和竖版切片
- 实验引擎：保留 `Remotion` 模板，可通过环境变量切换

## 快速开始

```powershell
npm install
npm test
node src/cli/build-digest.js --date 2026-04-10 --skip-render --output output
node src/cli/build-digest.js --date 2026-04-10 --output output
```

## 产物目录

```text
output/YYYY-MM-DD/
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
  xiaohongshu-note.md
  xiaohongshu-video.mp4
  review-report.md
```

## 常用参数

```powershell
node src/cli/build-digest.js --help
```

- `--date YYYY-MM-DD` 指定日报日期
- `--output DIR` 指定输出目录
- `--sources FILE` 指定来源配置 JSON
- `--skip-render` 只生成文稿和元数据，不跑视频

## 信源配置

默认配置见 [default-sources.js](/E:/zaobao/src/config/default-sources.js)。
仓库内也附带了一个只使用本地样例数据的 [sources.fixture.json](/E:/zaobao/sources.fixture.json)。

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

- `fixture`
- `rss`
- `url`
- `browser`

## 渲染引擎

默认使用 `ffmpeg`：

```powershell
node src/cli/build-digest.js --date 2026-04-10 --output output
```

如果想尝试 `Remotion`：

```powershell
$env:ZAOBAO_RENDER_ENGINE = "remotion"
node src/cli/build-digest.js --date 2026-04-10 --output output
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

## 说明

- v1 默认以稳定出片为优先，视频风格是清爽简洁的暖橘/淡粉卡片。
- 公众号 HTML 现在采用日报专用模板，包含概览分组、编号索引、摘要引用块和正文条目。
- 同时会额外生成 `bilibili-cover.html` 与 `bilibili-cover-prompt.md`，用于封面卡、片头卡和后续截图流程。
- `browser` 采集器当前会回退到普通 URL 抓取，后续可以替换成更强的浏览器抓取命令。
- 自动发布没有纳入 v1，适合你做最终审稿和手动发布。

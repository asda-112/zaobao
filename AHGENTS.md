# AHGENTS.md

本文件用于说明 `E:\zaobao` 项目的协作约定，帮助代理或新加入的开发者快速理解当前目标、结构和工作方式。

## 项目定位

`zaobao` 是一个面向 `公众号 + B站 + 抖音 + 小红书` 的 AI 早报内容工厂。

当前状态：

- `v1` 已可跑通基础链路
- `v2` 正在方案阶段，设计文档见：
  - [v2 升级说明](/E:/zaobao/docs/superpowers/specs/2026-04-10-zaobao-v2-upgrade-design.md)

## 当前平台策略

- `公众号`：完整长文
- `B站`：`3-4 分钟` 横版完整日报视频
- `抖音`：竖版短视频切片
- `小红书`：多张卡片图片 + 笔记文案，不做视频

## 当前实现状态

- 采集入口支持：
  - `fixture`
  - `rss`
  - `url`
  - `browser`
- 当前默认视频主链：
  - `主稿 -> TTS -> 卡片画面 -> ffmpeg 拼接`
- `Remotion` 相关代码已存在，但仍属于待升级主链
- 当前 TTS 仍有较强机械感，`v2` 默认规划迁移到 `edge-tts`

## v2 已确认方向

- 采集层优先接入：
  - `RSSHub`
  - `Playwright`
  - `Remotion`
- 集成顺序固定为：
  1. `RSSHub`
  2. `Playwright`
  3. `Remotion`
- 当前阶段不引入 `n8n` 作为主依赖
- `RSSHub` 计划本机通过 `Docker` 运行
- `公众号` 在信源体系中定义为 `补充来源`
- 首个确认加入的公众号源：`橘鸦Juya`

## 目录说明

- [src](/E:/zaobao/src)
  - 主代码目录
- [src/collectors](/E:/zaobao/src/collectors)
  - 各类信源采集器
- [src/core](/E:/zaobao/src/core)
  - 日报构建、成稿与导出逻辑
- [src/render](/E:/zaobao/src/render)
  - 视频渲染相关逻辑
- [src/audio](/E:/zaobao/src/audio)
  - TTS 与音频相关逻辑
- [src/cards](/E:/zaobao/src/cards)
  - 卡片样式与封面图逻辑
- [data/fixtures](/E:/zaobao/data/fixtures)
  - 本地样例新闻数据
- [test](/E:/zaobao/test)
  - 测试目录
- [docs/superpowers/specs](/E:/zaobao/docs/superpowers/specs)
  - 设计与升级文档

## 常用命令

安装依赖：

```powershell
npm install
```

运行测试：

```powershell
npm test
```

仅生成文稿，不渲染视频：

```powershell
node src/cli/build-digest.js --date 2026-04-10 --skip-render --output output
```

生成完整日报包：

```powershell
node src/cli/build-digest.js --date 2026-04-10 --output output
```

切换到 Remotion 实验渲染：

```powershell
$env:ZAOBAO_RENDER_ENGINE = "remotion"
node src/cli/build-digest.js --date 2026-04-10 --output output
```

## 协作约定

- 优先依据 `v2` 文档推进，不要脱离既定设计随意扩展
- 涉及平台策略、信源层级、视频工作流时，先检查 `v2` 文档是否已有定论
- 小红书相关产物默认做图片卡片，不要重新引回视频方案
- 公众号源默认为补充来源，不应默认高于官网、论文、官方博客
- `ffmpeg` 目前是稳定 fallback，长期目标是 `Remotion + ffmpeg`
- 若未来引入 OpenAI TTS：
  - 视为独立 API 能力
  - 不应假设 ChatGPT Plus 可直接复用为程序化 TTS

## 当前已知问题

- 候选新闻池仍偏薄
- 视频表现力仍弱于目标效果
- TTS 人声质量仍需升级
- 小红书卡片图链路尚未落地

## 建议的工作顺序

1. 先完善采集层和候选池
2. 再完善评分、聚类和主稿结构
3. 然后升级视频链路与素材链路
4. 最后再处理更高级的调度、告警和自动化

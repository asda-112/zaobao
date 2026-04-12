# OpenCLI 采集接入说明

## 目标

让 opencli collector 从“接入位”进入可用状态，补齐平台型信源采集。

## 环境变量

配置 OPENCLI_FETCH_CMD，例如：

```powershell
$env:OPENCLI_FETCH_CMD = "opencli fetch --json"
```

说明：

- 程序会把 source 配置中的 platform/account/url 以及 --page 参数附加到命令后。

## source 配置字段

opencli 源支持：

- platform：平台标识（如 weixin/bilibili/xiaohongshu）
- account：账号标识
- url：回退抓取地址
- maxPages：分页抓取页数，默认 1
- retry：失败重试次数，默认 2

## 输出格式要求

OpenCLI 输出支持以下任一格式：

1. JSON 数组
2. JSON 对象（包含 items 数组）
3. JSON Lines（每行一个 JSON 对象）

每条建议包含字段：

- id
- title
- source
- url
- publishedAt
- content 或 summary
- lang
- tags
- score

## 失败与回退

- 若未配置 OPENCLI_FETCH_CMD 且 source 含 url，会自动回退 url 采集。
- 若命令失败会触发重试，超过重试次数后记录失败源，不阻塞整体构建。

## 联调建议

1. 先使用单个 opencli source 和 --skip-render 进行联调。
2. 再开启多 source 混采，验证去重聚类结果。
3. 最后观察 issue.json 与 review-report.md 的候选入选质量。

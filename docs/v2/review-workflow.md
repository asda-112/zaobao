# 审校闭环说明（review-file）

## 目标

在生成日报前，对 issue 做人工审校决策，实现可审后发布。

## CLI 参数

在构建命令中增加：

```powershell
node src/cli/build-digest.js --date 2026-04-10 --output output --review-file review.json
```

## 状态定义

- approved：通过
- edited：通过并覆盖字段
- rejected：剔除
- pending：未审（默认状态）

## 支持覆盖字段

当状态为 edited 时，支持 override：

- title
- oneLineConclusion
- whyImportant
- keyFacts

## 输入样例

见模板文件：

- ../templates/review-file.example.json

## 产出变化

使用 review-file 后，输出目录会新增：

- review-summary.json

并在 issue.json 中带出：

- reviewStatus
- reviewNotes

## 注意事项

1. id 需对应 issue.json 中的 issue id（如 issue-1）。
2. 全部被 rejected 时，系统会自动回退使用原始 issues，避免空包。
3. edited 覆盖会同步影响口播与标题文案衍生结果。

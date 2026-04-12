# Windows 定时任务说明

## 目标

在每天早上固定时间自动生成日报交付包，满足 8 点前产出目标。

## 命令

创建任务：

```powershell
npm run schedule:windows -- --time 07:30 --output output
```

预览命令（不创建）：

```powershell
npm run schedule:windows -- --time 07:30 --dry-run
```

指定信源文件：

```powershell
npm run schedule:windows -- --time 07:30 --output output --sources sources.fixture.json
```

## 可选参数

- --task-name：任务名，默认 ZaobaoDailyDigestV2
- --time：执行时间，默认 07:30
- --output：输出目录，默认 output
- --sources：来源配置文件，可选
- --dry-run：仅输出 schtasks 命令

## 验证步骤

1. 运行 dry-run，检查命令正确。
2. 创建任务后执行：

```powershell
schtasks /Query /TN ZaobaoDailyDigestV2
```

3. 手动触发一次：

```powershell
schtasks /Run /TN ZaobaoDailyDigestV2
```

4. 检查 output/YYYY-MM-DD 目录是否生成完整产物。

## 建议

1. 首次上线建议设置在白天时间段，确认稳定后再改到 07:30。
2. 若需严格 Remotion，可在系统环境变量设置 ZAOBAO_RENDER_STRICT=1。
3. 若使用审校流程，可在任务命令中追加 --review-file 参数。

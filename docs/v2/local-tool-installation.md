# 本机工具安装说明

本文档用于在当前 Windows 机器上补齐 `v2` 所需的本机工具环境。

当前已确认状态：

- `OpenCLI`：已安装
- `Docker Desktop`：未安装
- `Python / pip`：未安装
- `edge-tts`：未安装

## 1. OpenCLI

当前状态：

- 已安装到：
  - `C:\Users\wenpengw\.npm-global\opencli.cmd`

如果 PowerShell 里直接输入 `opencli` 仍然提示找不到命令，需要把以下目录加入用户级 `PATH`：

```text
C:\Users\wenpengw\.npm-global
```

推荐做法：

1. 打开“环境变量”
2. 编辑当前用户的 `Path`
3. 新增：

```text
C:\Users\wenpengw\.npm-global
```

4. 重新打开终端
5. 验证：

```powershell
opencli --version
opencli list
```

## 2. Docker Desktop

用途：

- 运行本机 `RSSHub`

推荐安装方式：

1. 前往 Docker Desktop 官网下载安装包
2. 安装时保持默认选项
3. 若提示启用虚拟化 / WSL，请按向导完成
4. 安装完成后重启机器（如安装器要求）
5. 打开 Docker Desktop，确认状态为 Running

验证命令：

```powershell
docker --version
docker ps
```

安装完成后，RSSHub 可先按最简模式运行：

```powershell
docker run -d --name rsshub -p 1200:1200 diygod/rsshub
```

验证：

```powershell
Invoke-WebRequest http://127.0.0.1:1200
```

说明：

- 我们项目默认 RSSHub 基址按 `http://127.0.0.1:1200`
- 如需改地址，可设置环境变量：

```powershell
$env:RSSHUB_BASE_URL = "http://127.0.0.1:1200"
```

## 3. Python 与 pip

用途：

- 安装 `edge-tts`

推荐安装方式：

1. 下载并安装 Python 3.x for Windows
2. 安装时勾选：
  - `Add python.exe to PATH`
3. 安装完成后重新打开终端

验证：

```powershell
python --version
pip --version
```

## 4. edge-tts

用途：

- 作为 `v2` 默认免费 TTS 主路径

安装方式：

```powershell
pip install edge-tts
```

验证：

```powershell
edge-tts --version
```

建议额外测试一次中文声音：

```powershell
edge-tts --voice zh-CN-XiaoxiaoNeural --text "这是 AI 早报配音测试" --write-media test.mp3
```

## 5. Chrome / Edge

用途：

- Playwright 抓取与截图
- 未来可能配合 OpenCLI 的浏览器桥接

要求：

- 保留一个可正常登录的 `Chrome` 或 `Edge`
- 不建议只依赖轻量浏览器

## 6. 推荐安装顺序

建议顺序如下：

1. 先把 `OpenCLI` 的 PATH 配好
2. 安装 `Docker Desktop`
3. 启动并验证 `RSSHub`
4. 安装 `Python`
5. 安装 `edge-tts`

这样完成后，`v2` 采集层和免费 TTS 主链就基本具备真实运行条件了。

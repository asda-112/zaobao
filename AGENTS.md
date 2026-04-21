# AGENTS.md

## Project
AI daily content factory for WeChat, Bilibili, Douyin, and Xiaohongshu.
- Default branch behavior is **v1**. Do not change v1 behavior unless the task explicitly targets v2.
- Prefer minimal, focused edits over broad refactors.

## Tech Stack
- Node.js with native ESM (`"type": "module"` in package.json).
- No TypeScript, no linter, no formatter, no pre-commit hooks configured.

## Developer Commands
- Install: `npm install`
- Run all tests: `npm test` (alias for `node test/run-tests.js`)
- Run a single test file: `node --test test/<file>.test.js`
- Build digest: `node src/cli/build-digest.js --date YYYY-MM-DD --output output`
- Skip render (testing only): `node src/cli/build-digest.js --date YYYY-MM-DD --skip-render --output output`
- Windows schedule: `npm run schedule:windows -- --time 07:30 --output output`
- CLI help: `node src/cli/build-digest.js --help`

## Architecture & Pipeline
Pipeline flow must stay intact: **collect -> plan -> package -> render -> write**.

Entry point: `src/cli/build-digest.js`
- `src/cli/` – workflow orchestration and argument parsing.
- `src/collectors/` – source adapters. Safe collection pattern isolates single-source failures.
- `src/core/` – candidate normalization, scoring, clustering, digest planning (`build-digest.js`), quality enforcement (`quality-mode.js`), review workflow, package creation, and file writing.
- `src/render/` – video rendering. High-quality mode enforces **Remotion** only.
- `src/audio/` – TTS synthesis (`synthesize-segments.js`), WAV utilities, Windows PowerShell fallback.
- `src/cards/` – card and visual content helpers.
- `src/config/` – source config defaults.

## High-Quality Mode Constraints (Default for CLI)
Enforced by `src/core/quality-mode.js`:
- `fixture` sources are rejected.
- Any source collection failure fails the entire build.
- `--skip-render` is rejected.
- Render engine must be `remotion`.

Programmatic callers (e.g., tests) can bypass these via `buildDigestPackage({allowFixtureSources: true, allowPartialCollection: true, allowSkipRender: true})`.

## Render Engine
- Code default is `remotion`. `src/render/render-package.js` throws if `ZAOBAO_RENDER_ENGINE` is set to anything else in high-quality mode.
- `src/render/ffmpeg-renderer.js` exists but is not used in the current high-quality path.

## Testing
- Uses Node.js built-in test runner (`node:test` + `node:assert/strict`). `test/run-tests.js` is a custom importer that loads all test files; there is no Jest/Vitest/Mocha.
- Run a single test file: `node --test test/<file>.test.js`.
- Tests are integration-focused. Many call `buildDigestPackage` with bypass flags to avoid requiring real TTS/video binaries.
- No CI workflows, no linting, no formatting, and no typechecking are configured.
- When changing behavior, update or add tests in `test/` in the same task.

## Environment Variables
- `ZAOBAO_RENDER_ENGINE` – defaults to `remotion`.
- `ZAOBAO_EDGE_TTS_BIN` – explicit path to `edge-tts` binary.
- `ZAOBAO_TTS_ENGINE` – defaults to `edge-tts`; high-quality mode rejects anything else.
- `ZAOBAO_EDGE_TTS_VOICE` – defaults to `zh-CN-XiaoxiaoNeural`.
- `ZAOBAO_REMOTION_LOG_LEVEL` – defaults to `info`.
- `ZAOBAO_POWERSHELL_BIN` – explicit PowerShell path for Windows TTS fallback.
- `ZAOBAO_ENABLE_X_OFFICIAL_SOURCES` – enable X official sources when set to `1`/`true`/`yes`.
- `REMOTION_BROWSER_EXECUTABLE` – custom Chrome/Edge path for Remotion.
- `REMOTION_CHROME_MODE` – defaults to `chrome-for-testing`.
- `REMOTION_GL` – defaults to `angle`.
- `OPENCLI_FETCH_CMD` – command for OpenCLI source adapter.
- `BROWSER_ARTICLE_FETCH_CMD` – reserved; unimplemented in v1 (falls back to URL fetch).
- `RSSHUB_BASE_URL` – defaults to `http://127.0.0.1:1200`.

## Runtime Prerequisites
`npm install` installs only JS dependencies. The following must be present on the host:
- **Chrome** or **Edge** – required by Remotion. The code hardcodes Windows `Program Files` paths; override with `REMOTION_BROWSER_EXECUTABLE` on other platforms.
- **Python + pip** – required to install `edge-tts` (`pip install edge-tts`).
- **edge-tts** – the `edge-tts` Python binary must be discoverable (or set `ZAOBAO_EDGE_TTS_BIN`).
- **RSSHub** – expected at `http://127.0.0.1:1200` by default; run locally via Docker (`docker run -d --name rsshub -p 1200:1200 diygod/rsshub`).
- **ffmpeg** – provided by the `ffmpeg-static` npm dependency, but the project spawns it as a subprocess.

## Runtime Notes
- Remotion components are bundled **at runtime** by `@remotion/bundler`; there is no `remotion.config.*` file. Composition id is `digest-video`.
- High-quality mode **only** allows `edge-tts`; the Windows PowerShell TTS fallback exists in `src/audio/windows-tts.js` but is rejected in high-quality mode.
- Windows-specific hardcoded paths: Chrome/Edge under `C:\Program Files`, Python/edge-tts under `%LOCALAPPDATA%\Programs\Python`, and system font `C:/Windows/Fonts/msyh.ttc`. Override via env vars when running elsewhere.
- Output contract: files are written to `output/YYYY-MM-DD/` (see README for full file list).

## Source Semantics
- `candidates.json` = full candidate pool after collection and normalization.
- `issue.json` = final selected set after planning, clustering, and review.
- Keep these semantics distinct; do not conflate them.

## Existing Instruction Files
- `.github/copilot-instructions.md` – project guidelines and conventions.
- `README.md` – usage, commands, and source configuration.
- `docs/v2/` – v2 upgrade docs (do not duplicate in AGENTS.md).

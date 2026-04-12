# Project Guidelines

## Scope
- This repository is an AI daily content factory for WeChat, Bilibili, Douyin, and Xiaohongshu.
- Keep changes aligned with current v1 behavior unless the task explicitly targets v2 upgrades.
- Prefer minimal, focused edits over broad refactors.

## Build and Test
- Install dependencies: `npm install`
- Run all tests: `npm test`
- Build digest (default date/output): `node src/cli/build-digest.js`
- Build digest for a specific date: `node src/cli/build-digest.js --date YYYY-MM-DD --output output`
- Build without rendering videos: `node src/cli/build-digest.js --date YYYY-MM-DD --skip-render --output output`
- Build with custom sources: `node src/cli/build-digest.js --date YYYY-MM-DD --output output --sources sources.json`
- Build with review decisions: `node src/cli/build-digest.js --date YYYY-MM-DD --output output --review-file review-file.json`
- Show CLI options: `node src/cli/build-digest.js --help`

## Architecture
- `src/cli/`: workflow orchestration and argument parsing.
- `src/collectors/`: source adapters and safe collection (single-source failure should be isolated, not crash all collection).
- `src/core/`: candidate normalization, scoring, clustering, digest planning, and platform package creation.
- `src/render/`: render engine selection and platform rendering outputs.
- `src/audio/`: TTS synthesis, runtime path resolution, and WAV utilities.
- `src/cards/`: card and visual content helpers for platform assets.
- `src/config/`: source config defaults.
- `test/`: integration-focused test suite via `test/run-tests.js`.

## Conventions
- Keep the pipeline flow intact: collect -> plan -> package -> render -> write.
- One source failure must not break the whole run; follow the safe-collection pattern in `src/collectors/index.js`.
- Respect current planning constraints in `src/core/build-digest.js`:
  - 72-hour de-duplication window.
  - Duration pruning to target range.
- Keep `candidates.json` (candidate pool) and `issue.json` (final selected set) semantics distinct.
- Keep platform outputs derived from the same digest plan; avoid platform-specific logic leaking back into collector/core boundaries.
- Preserve current file output contract under `output/YYYY-MM-DD/`.

## Environment and Runtime Notes
- Default render engine is `ffmpeg`; switch via `ZAOBAO_RENDER_ENGINE=remotion` when needed.
- High-quality flows may enforce stricter runtime checks (source quality, render path, and review constraints).
- Remotion path may require an available Chrome/Edge runtime.
- TTS runtime on Windows may rely on PowerShell fallback if edge-tts is unavailable.

## Docs Index (Link, Do Not Duplicate)
- Project usage and commands: `README.md`
- v2 architecture/delivery overview: `docs/v2/2026-04-10-v2-upgrade-delivery.md`
- v2 target design: `docs/superpowers/specs/2026-04-10-zaobao-v2-upgrade-design.md`
- Local tooling setup and troubleshooting: `docs/v2/local-tool-installation.md`
- OpenCLI source integration details: `docs/v2/opencli-integration.md`
- Review workflow and decision file format: `docs/v2/review-workflow.md`
- Windows scheduling: `docs/v2/windows-schedule.md`

## Change Guidance for Agents
- For behavior changes, update or add tests in `test/` in the same task.
- Do not introduce new dependencies unless required; if added, justify in the change summary.
- Keep comments concise and only where logic is non-obvious.

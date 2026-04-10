# Project Guidelines

## Scope
- This repository is an AI daily content factory for WeChat, Bilibili, Douyin, and Xiaohongshu.
- Keep changes aligned with current v1 behavior unless the task explicitly targets v2 design upgrades.
- Prefer minimal, focused edits over broad refactors.

## Build and Test
- Install dependencies: `npm install`
- Run all tests: `npm test`
- Build digest (default date/output): `node src/cli/build-digest.js`
- Build digest for a specific date: `node src/cli/build-digest.js --date YYYY-MM-DD --output output`
- Build without rendering videos: `node src/cli/build-digest.js --date YYYY-MM-DD --skip-render --output output`
- Show CLI options: `node src/cli/build-digest.js --help`

## Architecture
- `src/cli/`: entry points and argument parsing (`build-digest.js`, `render-digest.js`).
- `src/collectors/`: source adapters (`fixture`, `rss`, `url`, `browser`) and safe orchestration.
- `src/core/`: digest planning and multi-platform package generation.
- `src/render/`: video render engine dispatch (`ffmpeg` by default, optional `remotion`).
- `src/audio/`: TTS and WAV duration utilities.
- `src/cards/`: visual card style helpers.
- `src/config/`: default source configuration.
- `test/`: integration and unit-like test scripts run through `test/run-tests.js`.

## Conventions
- Keep the pipeline flow intact: collect -> plan -> package -> render -> write.
- One source failure must not break the whole run; follow the safe-collection pattern in `src/collectors/index.js`.
- Respect current planning constraints in `src/core/build-digest.js`:
  - 72-hour de-duplication window.
  - Duration pruning to target range.
- Keep platform outputs derived from the same digest plan; avoid platform-specific logic leaking back into collector/core boundaries.
- Preserve current file output contract under `output/YYYY-MM-DD/`.

## Environment and Runtime Notes
- Default render engine is `ffmpeg`; switch via `ZAOBAO_RENDER_ENGINE=remotion`.
- Remotion path may require an available Chrome/Edge runtime.
- TTS implementation in `src/audio/windows-tts.js` is Windows-oriented (PowerShell-based).

## Docs Index (Link, Do Not Duplicate)
- Project usage and commands: `README.md`
- v2 product and architecture target: `docs/superpowers/specs/2026-04-10-zaobao-v2-upgrade-design.md`

## Change Guidance for Agents
- For behavior changes, update or add tests in `test/` in the same task.
- Do not introduce new dependencies unless required; if added, justify in the change summary.
- Keep comments concise and only where logic is non-obvious.

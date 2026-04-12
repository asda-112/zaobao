# V2 High-Quality Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `v2` run only on the high-quality path (`real sources + edge-tts + Remotion + real image cards`) and regenerate the `2026-04-10` digest as the acceptance artifact.

**Architecture:** Tighten the current pipeline so the CLI fails fast whenever it would previously fall back to fixture data, placeholder render output, Windows TTS, or ffmpeg-only video generation. Then stabilize the Remotion and TTS runtime layers, wire real-source collection into the strict build path, and use the rebuilt pipeline to regenerate the April 10, 2026 digest package end to end.

**Tech Stack:** Node.js, Remotion, ffmpeg, edge-tts, RSSHub, OpenCLI, Playwright-compatible browser automation, Node test runner

---

## File Map

- [ ] `E:\zaobao\src\cli\build-digest.js`
  Purpose: strict high-quality build entrypoint, source validation, render gating, final package export.
- [ ] `E:\zaobao\src\core\quality-mode.js`
  Purpose: centralized strict-mode policy for source types, partial collection failures, and render restrictions.
- [ ] `E:\zaobao\src\collectors\index.js`
  Purpose: strict collection orchestration and failure surfacing.
- [ ] `E:\zaobao\src\collectors\opencli.js`
  Purpose: OpenCLI real-source collection with no homepage fallback.
- [ ] `E:\zaobao\src\collectors\rsshub.js`
  Purpose: RSSHub feed collection for local RSSHub-backed sources.
- [ ] `E:\zaobao\src\config\default-sources.js`
  Purpose: strict default source list for official/media/wechat/platform seeds without fixture data.
- [ ] `E:\zaobao\src\audio\runtime-paths.js`
  Purpose: resolve TTS/runtime executables explicitly.
- [ ] `E:\zaobao\src\audio\synthesize-segments.js`
  Purpose: edge-tts-only segment synthesis and explicit failure reporting.
- [ ] `E:\zaobao\src\render\render-package.js`
  Purpose: Remotion-only video render orchestration.
- [ ] `E:\zaobao\src\render\remotion-renderer.js`
  Purpose: actual Remotion render path, muxing, captions, output verification.
- [ ] `E:\zaobao\src\render\xiaohongshu-cards.js`
  Purpose: real card image rendering for Xiaohongshu, no placeholder output in strict mode.
- [ ] `E:\zaobao\README.md`
  Purpose: user-facing truth about strict high-quality mode.
- [ ] `E:\zaobao\docs\superpowers\specs\2026-04-10-zaobao-v2-upgrade-design.md`
  Purpose: keep the v2 design doc aligned with the final strict execution rules.
- [ ] `E:\zaobao\data\fixtures\2026-04-10-real-ai-news.json`
  Purpose: temporary manually researched regression dataset; must not remain part of the strict production path.
- [ ] `E:\zaobao\sources.real-2026-04-10.json`
  Purpose: current manually curated input for the April 10 digest; must be replaced by real-source configs for final acceptance.
- [ ] `E:\zaobao\test\cli.test.js`
  Purpose: CLI behavior tests with explicit testing bypass flags only where needed.
- [ ] `E:\zaobao\test\source-and-timeline.test.js`
  Purpose: source metadata and prioritization coverage.
- [ ] `E:\zaobao\test\opencli.test.js`
  Purpose: OpenCLI strict behavior coverage.
- [ ] `E:\zaobao\test\audio-runtime.test.js`
  Purpose: runtime executable resolution coverage.
- [ ] `E:\zaobao\test\quality-mode.test.js`
  Purpose: high-quality policy enforcement coverage.

### Task 1: Lock Strict High-Quality Mode

**Files:**
- Modify: `E:\zaobao\src\cli\build-digest.js`
- Modify: `E:\zaobao\src\core\quality-mode.js`
- Modify: `E:\zaobao\src\config\default-sources.js`
- Modify: `E:\zaobao\README.md`
- Test: `E:\zaobao\test\quality-mode.test.js`
- Test: `E:\zaobao\test\source-and-timeline.test.js`

- [ ] **Step 1: Write the failing test**

Add/adjust tests so strict mode rejects:
- `fixture` sources in default production config
- partial source failures
- `--skip-render` in production mode

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL in the strict-mode policy tests until the production defaults and CLI behavior are aligned.

- [ ] **Step 3: Write minimal implementation**

Implement or refine:
- strict source validation in `quality-mode.js`
- CLI enforcement in `build-digest.js`
- fixture-free production defaults in `default-sources.js`
- README wording so docs no longer advertise fallback-first behavior

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for policy and source tests.

- [ ] **Step 5: Commit**

```bash
git add src/cli/build-digest.js src/core/quality-mode.js src/config/default-sources.js README.md test/quality-mode.test.js test/source-and-timeline.test.js
git commit -m "feat: enforce strict high-quality digest mode"
```

### Task 2: Make Remotion the Only Video Path

**Files:**
- Modify: `E:\zaobao\src\render\render-package.js`
- Modify: `E:\zaobao\src\render\remotion-renderer.js`
- Modify: `E:\zaobao\src\core\write-daily-package.js`
- Test: `E:\zaobao\test\cli.test.js`

- [ ] **Step 1: Write the failing test**

Add a CLI-level or renderer-level assertion that production builds fail if Remotion cannot produce real video outputs. The test should verify the pipeline does not silently substitute placeholder buffers or ffmpeg fallback output.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL showing the current renderer does not yet verify real Remotion-produced outputs strongly enough.

- [ ] **Step 3: Write minimal implementation**

Implement:
- `render-package.js` as Remotion-only in strict mode
- explicit output verification in `remotion-renderer.js`
- clear error messages when video files are missing, zero-byte, or placeholder-like
- ensure `write-daily-package.js` only writes buffers returned by successful Remotion renders

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, with renderer behavior failing loudly instead of falling back.

- [ ] **Step 5: Commit**

```bash
git add src/render/render-package.js src/render/remotion-renderer.js src/core/write-daily-package.js test/cli.test.js
git commit -m "feat: require remotion for production video renders"
```

### Task 3: Make edge-tts the Only Production TTS Path

**Files:**
- Modify: `E:\zaobao\src\audio\runtime-paths.js`
- Modify: `E:\zaobao\src\audio\synthesize-segments.js`
- Modify: `E:\zaobao\src\audio\windows-tts.js`
- Test: `E:\zaobao\test\audio-runtime.test.js`

- [ ] **Step 1: Write the failing test**

Add or tighten tests so:
- `edge-tts` must be discoverable through explicit resolution logic
- production synthesis rejects non-`edge-tts` engines
- missing `edge-tts` produces an actionable error instead of a fallback

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL until strict TTS behavior is fully enforced.

- [ ] **Step 3: Write minimal implementation**

Implement:
- stable resolution of `edge-tts` through env override and known Python install locations
- explicit failure if `ZAOBAO_TTS_ENGINE` is not `edge-tts`
- keep `windows-tts.js` available only for diagnostics or legacy compatibility, not for the production path

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for runtime-path and strict TTS tests.

- [ ] **Step 5: Commit**

```bash
git add src/audio/runtime-paths.js src/audio/synthesize-segments.js src/audio/windows-tts.js test/audio-runtime.test.js
git commit -m "feat: require edge-tts for production audio"
```

### Task 4: Replace Manual/Fixture-Like Inputs with Real Source Collection

**Files:**
- Modify: `E:\zaobao\src\collectors\index.js`
- Modify: `E:\zaobao\src\collectors\opencli.js`
- Modify: `E:\zaobao\src\collectors\rsshub.js`
- Modify: `E:\zaobao\src\config\default-sources.js`
- Modify: `E:\zaobao\README.md`
- Test: `E:\zaobao\test\opencli.test.js`
- Test: `E:\zaobao\test\source-and-timeline.test.js`

- [ ] **Step 1: Write the failing test**

Add tests that prove:
- production collection succeeds only with real source types
- OpenCLI cannot silently degrade into non-source pages
- RSSHub sources resolve through local RSSHub and produce candidate items

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL until real-source assumptions are enforced end to end.

- [ ] **Step 3: Write minimal implementation**

Implement:
- stricter real-source-only source configs
- OpenCLI command validation and account-oriented source configs
- RSSHub-backed sources for local collection where applicable
- documentation showing how to run a real-source build without `fixture`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for source collection tests.

- [ ] **Step 5: Commit**

```bash
git add src/collectors/index.js src/collectors/opencli.js src/collectors/rsshub.js src/config/default-sources.js README.md test/opencli.test.js test/source-and-timeline.test.js
git commit -m "feat: require real-source collection for v2 builds"
```

### Task 5: Regenerate the 2026-04-10 Digest Through the Strict V2 Path

**Files:**
- Modify: `E:\zaobao\docs\superpowers\specs\2026-04-10-zaobao-v2-upgrade-design.md`
- Create/Modify: `E:\zaobao\output-real-2026-04-10-v2\2026-04-10\...`
- Optional cleanup target: `E:\zaobao\data\fixtures\2026-04-10-real-ai-news.json`
- Optional cleanup target: `E:\zaobao\sources.real-2026-04-10.json`

- [ ] **Step 1: Build the real-source input for April 10, 2026**

Use only real-source collection or manually verified source configs that do not depend on `fixture`. Confirm the input set contains enough quality items to produce `5-6` shortlisted stories where possible.

- [ ] **Step 2: Run the strict production build**

Run:

```powershell
node src/cli/build-digest.js --date 2026-04-10 --sources <real-source-config> --output E:\zaobao\output-real-2026-04-10-v2
```

Expected:
- no source failures
- no skip-render
- Remotion-only render succeeds
- edge-tts synthesis succeeds
- Xiaohongshu cards are real rendered PNGs

- [ ] **Step 3: Verify the outputs manually**

Check:
- `bilibili-video.mp4` is a real non-placeholder file
- `douyin-video-01.mp4` ... clips are real non-placeholder files
- `wechat.html` matches the intended editorial layout
- `xiaohongshu-card-01.png` ... are real images, not placeholders
- `review-report.md` shows `采集失败源：0`

- [ ] **Step 4: Update docs to reflect the finished v2 path**

Document the final strict-mode rules and the successful April 10 acceptance run in:
- `README.md`
- `docs/superpowers/specs/2026-04-10-zaobao-v2-upgrade-design.md`

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/specs/2026-04-10-zaobao-v2-upgrade-design.md output-real-2026-04-10-v2
git commit -m "feat: complete strict v2 pipeline and regenerate 2026-04-10 digest"
```

## Final Acceptance Checklist

- [ ] Production defaults contain no `fixture` sources
- [ ] Production builds reject partial collection failures
- [ ] Production builds reject `--skip-render`
- [ ] Production video rendering uses `Remotion` only
- [ ] Production TTS uses `edge-tts` only
- [ ] Xiaohongshu cards are rendered images, not placeholders
- [ ] `2026-04-10` digest regenerates successfully through the strict v2 path
- [ ] The resulting package contains real `mp4`, `png`, `html`, `md`, and `json` outputs
- [ ] README and v2 design docs describe the final strict behavior truthfully

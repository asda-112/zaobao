#!/usr/bin/env node
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {collectCandidatesSafely, loadSources} from '../collectors/index.js';
import {defaultSources} from '../config/default-sources.js';
import {buildDigestPlan} from '../core/build-digest.js';
import {createDailyPackage} from '../core/create-daily-package.js';
import {assertHighQualityCollection, assertHighQualitySources, ensureHighQualityRenderAllowed} from '../core/quality-mode.js';
import {applyReviewToIssues, loadReviewData} from '../core/review-workflow.js';
import {writeDailyPackage} from '../core/write-daily-package.js';
import {renderPackageVideos} from '../render/render-package.js';
import {renderXiaohongshuCards} from '../render/xiaohongshu-cards.js';

function parseArgs(argv) {
  const args = {
    date: new Date().toISOString().slice(0, 10),
    output: 'output',
    sources: null,
    reviewFile: null,
    skipRender: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--date') args.date = argv[index + 1];
    if (arg === '--output') args.output = argv[index + 1];
    if (arg === '--sources') args.sources = argv[index + 1];
    if (arg === '--review-file') args.reviewFile = argv[index + 1];
    if (arg === '--skip-render') args.skipRender = true;
    if (arg === '--help') args.help = true;
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node src/cli/build-digest.js [options]

Options:
  --date YYYY-MM-DD   Digest date, defaults to today
  --output DIR        Output directory, defaults to ./output
  --sources FILE      JSON sources file
  --review-file FILE  Optional issue review decision JSON file
  --skip-render       Skip video rendering and write placeholder buffers
  --help              Show this help text`);
}

function themeConfig() {
  return {
    style: 'light',
    primary: '#F59E0B',
    accent: '#F9A8D4',
    motion: 'light',
    voice: 'creator-like'
  };
}

async function main() {
  return buildDigestPackage();
}

export async function buildDigestPackage(options = {}) {
  const cwd = process.cwd();
  const args = {...parseArgs(process.argv.slice(2)), ...options};
  const allowFixtureSources = options.allowFixtureSources === true;
  const allowPartialCollection = options.allowPartialCollection === true;
  const allowSkipRender = options.allowSkipRender === true;
  if (args.help) {
    printHelp();
    return;
  }

  const sources = await loadSources({
    cwd,
    sourcesPath: args.sources,
    defaultSources
  });
  if (!allowFixtureSources) {
    assertHighQualitySources({sources});
  }
  const collection = await collectCandidatesSafely({cwd, sources});
  if (!allowPartialCollection) {
    assertHighQualityCollection({collection});
  }

  const digestPlan = buildDigestPlan({
    candidates: collection.items,
    archiveItems: [],
    now: new Date(`${args.date}T08:00:00.000Z`),
    config: {
      targetDurationSeconds: 210,
      minDurationSeconds: 180,
      maxDurationSeconds: 240,
      maxIssues: 6,
      theme: themeConfig()
    }
  });

  const reviewData = await loadReviewData({cwd, reviewPath: args.reviewFile});
  const reviewResult = applyReviewToIssues({issues: digestPlan.issues, reviewData});
  const reviewedDigestPlan = {
    ...digestPlan,
    issues: reviewResult.issues,
    reviewSummary: reviewResult.summary
  };

  const dailyPackage = createDailyPackage({
    date: args.date,
    digestPlan: reviewedDigestPlan,
    config: {
      theme: themeConfig(),
      targetPlatforms: ['wechat', 'bilibili', 'douyin', 'xiaohongshu']
    }
  });

  dailyPackage.reviewReport = `${dailyPackage.reviewReport}\n- 采集失败源：${collection.failures.length}`;

  if (reviewData) {
    dailyPackage.reviewReport = `${dailyPackage.reviewReport}\n- 审校统计：approved ${reviewResult.summary.approved} / edited ${reviewResult.summary.edited} / rejected ${reviewResult.summary.rejected} / pending ${reviewResult.summary.pending}`;
  }

  if (!allowSkipRender) {
    ensureHighQualityRenderAllowed({skipRender: args.skipRender});
  }
  if (args.skipRender) {
    dailyPackage.videoOutputs = {
      bilibili: Buffer.from('skip-render-bilibili'),
      douyin: Buffer.from('skip-render-douyin'),
      douyinClips: [Buffer.from('skip-render-douyin-1')]
    };
    dailyPackage.xiaohongshuCardImages = [];
  } else {
    await mkdir(path.resolve(cwd, args.output), {recursive: true});
    dailyPackage.videoOutputs = await renderPackageVideos({cwd, dailyPackage});
    dailyPackage.xiaohongshuCardImages = await renderXiaohongshuCards({issues: dailyPackage.issues});
  }

  const packageDir = await writeDailyPackage({
    outputDir: path.resolve(cwd, args.output),
    dailyPackage
  });

  if (reviewData) {
    await writeFile(
      path.join(packageDir, 'review-summary.json'),
      JSON.stringify(reviewResult.summary, null, 2)
    );
  }

  console.log(`Digest package written to ${packageDir}`);
  return packageDir;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

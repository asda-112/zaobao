#!/usr/bin/env node
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {collectCandidatesSafely, loadSources} from '../collectors/index.js';
import {defaultSources} from '../config/default-sources.js';
import {buildDigestPlan} from '../core/build-digest.js';
import {createDailyPackage} from '../core/create-daily-package.js';
import {writeDailyPackage} from '../core/write-daily-package.js';
import {renderPackageVideos} from '../render/render-package.js';

function parseArgs(argv) {
  const args = {
    date: new Date().toISOString().slice(0, 10),
    output: 'output',
    sources: null,
    skipRender: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--date') args.date = argv[index + 1];
    if (arg === '--output') args.output = argv[index + 1];
    if (arg === '--sources') args.sources = argv[index + 1];
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
  if (args.help) {
    printHelp();
    return;
  }

  const sources = await loadSources({
    cwd,
    sourcesPath: args.sources,
    defaultSources
  });
  const collection = await collectCandidatesSafely({cwd, sources});

  const digestPlan = buildDigestPlan({
    candidates: collection.items,
    archiveItems: [],
    now: new Date(`${args.date}T08:00:00.000Z`),
    config: {
      targetDurationSeconds: 210,
      minDurationSeconds: 180,
      maxDurationSeconds: 240,
      maxIssues: 8,
      theme: themeConfig()
    }
  });

  const dailyPackage = createDailyPackage({
    date: args.date,
    digestPlan,
    config: {
      theme: themeConfig(),
      targetPlatforms: ['wechat', 'bilibili', 'douyin', 'xiaohongshu']
    }
  });

  dailyPackage.reviewReport = `${dailyPackage.reviewReport}\n- 采集失败源：${collection.failures.length}`;

  if (args.skipRender) {
    dailyPackage.videoOutputs = {
      bilibili: Buffer.from('skip-render-bilibili'),
      douyin: Buffer.from('skip-render-douyin'),
      xiaohongshu: Buffer.from('skip-render-xiaohongshu')
    };
  } else {
    await mkdir(path.resolve(cwd, args.output), {recursive: true});
    dailyPackage.videoOutputs = await renderPackageVideos({cwd, dailyPackage});
  }

  const packageDir = await writeDailyPackage({
    outputDir: path.resolve(cwd, args.output),
    dailyPackage
  });

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

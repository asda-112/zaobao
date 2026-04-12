import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import ffmpegPath from 'ffmpeg-static';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

import {synthesizeSegments} from '../audio/synthesize-segments.js';
import {buildVoiceoverTimeline} from './build-voiceover-timeline.js';

function resolveBrowserExecutable({env = process.env, fileExists = existsSync} = {}) {
  const candidates = [
    env.REMOTION_BROWSER_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  return candidates.find((candidate) => fileExists(candidate)) || null;
}

export function resolveRemotionRuntimeConfig({env = process.env, fileExists = existsSync} = {}) {
  const browserExecutable = resolveBrowserExecutable({env, fileExists});
  const chromeMode = env.REMOTION_CHROME_MODE || 'chrome-for-testing';
  const logLevel = env.ZAOBAO_REMOTION_LOG_LEVEL || 'info';
  const chromiumOptions = {
    gl: env.REMOTION_GL || 'angle',
    disableWebSecurity: false,
    ignoreCertificateErrors: false
  };

  return {
    browserExecutable,
    chromeMode,
    logLevel,
    chromiumOptions,
    concurrency: 1,
    disallowParallelEncoding: true
  };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: 'ignore'});
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function concatAudio(audioPaths, outputPath) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-audio-'));
  const listPath = path.join(tempDir, 'concat.txt');
  const content = audioPaths.map((audioPath) => `file '${audioPath.replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(listPath, content);
  await runCommand(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, outputPath]);
  return outputPath;
}

export function buildMuxVideoAndAudioArgs({silentVideoPath, audioPath, outputPath}) {
  return [
    '-y',
    '-i',
    silentVideoPath,
    '-i',
    audioPath,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-shortest',
    outputPath
  ];
}

async function muxVideoAndAudio({silentVideoPath, audioPath, outputPath}) {
  await runCommand(
    ffmpegPath,
    buildMuxVideoAndAudioArgs({
      silentVideoPath,
      audioPath,
      outputPath
    })
  );
}

function msToSrt(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = String(ms % 1000).padStart(3, '0');
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

export function assertRenderedMediaBuffer({buffer, label}) {
  if (!buffer || buffer.length === 0) {
    throw new Error(`Rendered media is empty or zero-byte: ${label}`);
  }

  // Real mp4 buffers should be much larger than placeholder strings used by old fallback paths.
  if (buffer.length < 1024) {
    throw new Error(`Rendered media looks like a placeholder or is too small: ${label}`);
  }
}

export async function renderPackageVideosWithRemotion({cwd, dailyPackage}) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-render-'));
  const audioDir = path.join(tempDir, 'audio');
  await mkdir(audioDir, {recursive: true});
  const runtimeConfig = resolveRemotionRuntimeConfig();
  const serveUrl = await bundle(path.join(cwd, 'src/render/index.jsx'));
  const browser = await openBrowser('chrome', {
    browserExecutable: runtimeConfig.browserExecutable,
    chromeMode: runtimeConfig.chromeMode,
    chromiumOptions: runtimeConfig.chromiumOptions,
    logLevel: runtimeConfig.logLevel
  });

  const outputs = {};

  try {
    for (const job of dailyPackage.renderJobs) {
      const voicedSegments = await synthesizeSegments({
        segments: job.segments.map((segment) => ({
          ...segment,
          narration: segment.narration || segment.summary
        })),
        outputDir: path.join(audioDir, job.platform)
      });
      const timeline = buildVoiceoverTimeline({segments: voicedSegments});
      const inputProps = {job: {...job, segments: voicedSegments}, timeline};
      const composition = await selectComposition({
        serveUrl,
        id: 'digest-video',
        browserExecutable: runtimeConfig.browserExecutable,
        chromeMode: runtimeConfig.chromeMode,
        chromiumOptions: runtimeConfig.chromiumOptions,
        logLevel: runtimeConfig.logLevel,
        puppeteerInstance: browser,
        inputProps
      });
      const silentVideoPath = path.join(tempDir, `${job.platform}-silent.mp4`);
      const audioPath = path.join(tempDir, `${job.platform}.wav`);
      const outputPath = path.join(tempDir, `${job.platform}.mp4`);

      await renderMedia({
        serveUrl,
        composition,
        codec: 'h264',
        outputLocation: silentVideoPath,
        muted: true,
        browserExecutable: runtimeConfig.browserExecutable,
        chromeMode: runtimeConfig.chromeMode,
        chromiumOptions: runtimeConfig.chromiumOptions,
        logLevel: runtimeConfig.logLevel,
        concurrency: runtimeConfig.concurrency,
        disallowParallelEncoding: runtimeConfig.disallowParallelEncoding,
        puppeteerInstance: browser,
        inputProps
      });

      await concatAudio(voicedSegments.map((segment) => segment.audioPath), audioPath);
      await muxVideoAndAudio({silentVideoPath, audioPath, outputPath});
      const buffer = await readFile(outputPath);
      assertRenderedMediaBuffer({buffer, label: `${job.platform}.mp4`});
      const outputKey = job.outputKey || job.platform;
      outputs[outputKey] = buffer;

      if (job.platform === 'bilibili') {
        dailyPackage.bilibiliSrt = timeline.captions
          .map((caption, index) => `${index + 1}\n${msToSrt(caption.startMs)} --> ${msToSrt(caption.endMs)}\n${caption.text}\n`)
          .join('\n');
      }
    }
  } finally {
    await browser.close(true);
  }

  return outputs;
}

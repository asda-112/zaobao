import ffmpegPath from 'ffmpeg-static';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

import {synthesizeSegments} from '../audio/windows-tts.js';
import {buildVoiceoverTimeline} from './build-voiceover-timeline.js';

const BACKGROUND = 'FFF7ED';
const CARD = 'FFFFFF';
const PRIMARY = 'EA580C';
const TEXT = '7C2D12';
const SUBTEXT = '9A3412';
const FOOTER = 'C2410C';
const ACCENT = 'FDBA74';

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

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/\n/g, '\\n');
}

function visualWidth(character) {
  return /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE10-\uFE6F\uFF01-\uFF60\uFFE0-\uFFE6]/u.test(
    character
  )
    ? 2
    : 1;
}

function wrapText(text, maxUnitsPerLine, maxLines) {
  const units = Array.from(String(text || '').replace(/\s+/g, ' ').trim());
  const lines = [];
  let current = '';
  let currentWidth = 0;

  for (const unit of units) {
    const width = visualWidth(unit);
    if (currentWidth + width <= maxUnitsPerLine) {
      current += unit;
      currentWidth += width;
      continue;
    }

    if (current.trim()) lines.push(current.trim());
    current = unit.trimStart();
    currentWidth = Array.from(current).reduce((sum, character) => sum + visualWidth(character), 0);
    if (lines.length === maxLines - 1) break;
  }

  if (current.trim() && lines.length < maxLines) lines.push(current.trim());
  return lines.join('\n');
}

function countLines(text) {
  return String(text || '').split('\n').filter(Boolean).length || 1;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function fontPath() {
  return 'C\\:/Windows/Fonts/msyh.ttc';
}

export function createSlideSpec({job, segment, index}) {
  const isLandscape = job.orientation === 'landscape';
  const width = job.width;
  const height = job.height;
  const titleText = wrapText(segment.headline, isLandscape ? 32 : 18, isLandscape ? 3 : 4);
  const summaryText = wrapText(segment.summary, isLandscape ? 58 : 28, isLandscape ? 4 : 6);
  const title = escapeText(titleText);
  const summary = escapeText(summaryText);
  const footer = escapeText(`${segment.source || 'AI Source'} · #${index + 1}`);
  const resolution = `${width}x${height}`;
  const titleFont = isLandscape ? 52 : 38;
  const summaryFont = isLandscape ? 27 : 24;
  const footerFont = isLandscape ? 22 : 20;
  const titleLineHeight = titleFont + (isLandscape ? 18 : 16);
  const summaryLineHeight = summaryFont + 14;
  const titleLines = countLines(titleText);
  const summaryLines = countLines(summaryText);
  const cardX = isLandscape ? 120 : 60;
  const cardW = isLandscape ? width - 240 : width - 120;
  const sidePadding = isLandscape ? 44 : 36;
  const topPadding = isLandscape ? 68 : 78;
  const bottomPadding = isLandscape ? 76 : 92;
  const gap = isLandscape ? 34 : 42;
  const contentHeight =
    titleLines * titleLineHeight + gap + summaryLines * summaryLineHeight + footerFont + bottomPadding;
  const cardH = clamp(contentHeight + topPadding, isLandscape ? 470 : 720, isLandscape ? 760 : 1260);
  const cardY = Math.round(isLandscape ? (height - cardH) / 2 : Math.min(280, (height - cardH) / 2 + 80));
  const titleY = cardY + topPadding;
  const summaryY = titleY + titleLines * titleLineHeight + gap;
  const footerY = cardY + cardH - bottomPadding + 18;
  const filterGraph = [
    `drawbox=x=${cardX}:y=${cardY}:w=${cardW}:h=${cardH}:color=${CARD}@1:t=fill`,
    `drawbox=x=${cardX}:y=${cardY}:w=${cardW}:h=8:color=${ACCENT}@1:t=fill`,
    `drawbox=x=${cardX + sidePadding}:y=${cardY + 26}:w=${isLandscape ? 170 : 150}:h=${isLandscape ? 38 : 34}:color=${ACCENT}@0.24:t=fill`,
    `drawtext=fontfile='${fontPath()}':text='AI 早报':fontcolor=${PRIMARY}:fontsize=${isLandscape ? 34 : 28}:x=${cardX}:y=${isLandscape ? 72 : 96}`,
    `drawtext=fontfile='${fontPath()}':text='${title}':fontcolor=${TEXT}:fontsize=${titleFont}:line_spacing=12:x=${cardX + sidePadding}:y=${titleY}`,
    `drawtext=fontfile='${fontPath()}':text='${summary}':fontcolor=${SUBTEXT}:fontsize=${summaryFont}:line_spacing=12:x=${cardX + sidePadding}:y=${summaryY}`,
    `drawtext=fontfile='${fontPath()}':text='${footer}':fontcolor=${FOOTER}:fontsize=${footerFont}:x=${cardX + sidePadding}:y=${footerY}`
  ].join(',');

  return {
    backgroundColor: BACKGROUND,
    resolution,
    filterGraph
  };
}

async function createSlideImage({job, segment, index, outputPath}) {
  const spec = createSlideSpec({job, segment, index});
  await runCommand(ffmpegPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=#${spec.backgroundColor}:s=${spec.resolution}`,
    '-frames:v',
    '1',
    '-vf',
    spec.filterGraph,
    outputPath
  ]);
}

async function createSegmentVideo({imagePath, audioPath, outputPath}) {
  await runCommand(ffmpegPath, [
    '-y',
    '-loop',
    '1',
    '-i',
    imagePath,
    '-i',
    audioPath,
    '-c:v',
    'libx264',
    '-tune',
    'stillimage',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    outputPath
  ]);
}

async function concatVideos(videoPaths, outputPath) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-video-'));
  const listPath = path.join(tempDir, 'concat.txt');
  await writeFile(listPath, videoPaths.map((videoPath) => `file '${videoPath.replace(/'/g, "'\\''")}'`).join('\n'));
  await runCommand(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath]);
}

function msToSrt(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = String(ms % 1000).padStart(3, '0');
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

export async function renderPackageVideosWithFfmpeg({dailyPackage}) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-ffmpeg-'));
  const outputs = {};

  for (const job of dailyPackage.renderJobs) {
    const jobDir = path.join(tempDir, job.platform);
    await mkdir(jobDir, {recursive: true});

    const voicedSegments = await synthesizeSegments({
      segments: job.segments.map((segment) => ({
        ...segment,
        narration: segment.narration || segment.summary
      })),
      outputDir: path.join(jobDir, 'audio')
    });

    const timeline = buildVoiceoverTimeline({segments: voicedSegments});
    const segmentVideos = [];

    for (const [index, segment] of voicedSegments.entries()) {
      const imagePath = path.join(jobDir, `slide-${index + 1}.png`);
      const videoPath = path.join(jobDir, `segment-${index + 1}.mp4`);
      await createSlideImage({job, segment, index, outputPath: imagePath});
      await createSegmentVideo({imagePath, audioPath: segment.audioPath, outputPath: videoPath});
      segmentVideos.push(videoPath);
    }

    const outputPath = path.join(jobDir, `${job.platform}.mp4`);
    await concatVideos(segmentVideos, outputPath);
    outputs[job.platform] = await readFile(outputPath);

    if (job.platform === 'bilibili') {
      dailyPackage.bilibiliSrt = timeline.captions
        .map((caption, index) => `${index + 1}\n${msToSrt(caption.startMs)} --> ${msToSrt(caption.endMs)}\n${caption.text}\n`)
        .join('\n');
    }
  }

  return outputs;
}

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

function wrapText(text, maxCharsPerLine, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.join('\n');
}

function fontPath() {
  return 'C\\:/Windows/Fonts/msyh.ttc';
}

export function createSlideSpec({job, segment, index}) {
  const isLandscape = job.orientation === 'landscape';
  const width = job.width;
  const height = job.height;
  const title = escapeText(wrapText(segment.headline, isLandscape ? 22 : 16, 3));
  const summary = escapeText(wrapText(segment.summary, isLandscape ? 42 : 20, isLandscape ? 3 : 6));
  const footer = escapeText(`${segment.source || 'AI Source'} · #${index + 1}`);
  const resolution = `${width}x${height}`;
  const cardX = isLandscape ? 80 : 48;
  const cardY = isLandscape ? 160 : 200;
  const cardW = isLandscape ? width - 160 : width - 96;
  const cardH = isLandscape ? height - 380 : height - 520;
  const filterGraph = [
    `drawbox=x=${cardX}:y=${cardY}:w=${cardW}:h=${cardH}:color=${CARD}@1:t=fill`,
    `drawtext=fontfile='${fontPath()}':text='AI 早报':fontcolor=${PRIMARY}:fontsize=${isLandscape ? 34 : 28}:x=${cardX}:y=${isLandscape ? 72 : 96}`,
    `drawtext=fontfile='${fontPath()}':text='${title}':fontcolor=${TEXT}:fontsize=${isLandscape ? 54 : 40}:line_spacing=12:x=${cardX + 36}:y=${cardY + 48}`,
    `drawtext=fontfile='${fontPath()}':text='${summary}':fontcolor=${SUBTEXT}:fontsize=${isLandscape ? 28 : 24}:line_spacing=10:x=${cardX + 36}:y=${cardY + (isLandscape ? 220 : 260)}`,
    `drawtext=fontfile='${fontPath()}':text='${footer}':fontcolor=${FOOTER}:fontsize=${isLandscape ? 24 : 22}:x=${cardX + 36}:y=${cardY + cardH - 60}`
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

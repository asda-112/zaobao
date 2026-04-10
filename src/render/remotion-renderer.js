import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import ffmpegPath from 'ffmpeg-static';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

import {synthesizeSegments} from '../audio/windows-tts.js';
import {buildVoiceoverTimeline} from './build-voiceover-timeline.js';

function resolveBrowserExecutable() {
  const candidates = [
    process.env.REMOTION_BROWSER_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
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

async function muxVideoAndAudio({silentVideoPath, audioPath, outputPath}) {
  await runCommand(ffmpegPath, [
    '-y',
    '-i',
    silentVideoPath,
    '-i',
    audioPath,
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-shortest',
    outputPath
  ]);
}

function msToSrt(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = String(ms % 1000).padStart(3, '0');
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

export async function renderPackageVideosWithRemotion({cwd, dailyPackage}) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-render-'));
  const audioDir = path.join(tempDir, 'audio');
  await mkdir(audioDir, {recursive: true});
  const browserExecutable = resolveBrowserExecutable();
  const serveUrl = await bundle(path.join(cwd, 'src/render/index.jsx'));

  const outputs = {};

  for (const job of dailyPackage.renderJobs) {
    const voicedSegments = await synthesizeSegments({
      segments: job.segments.map((segment) => ({
        ...segment,
        narration: segment.narration || segment.summary
      })),
      outputDir: path.join(audioDir, job.platform)
    });
    const timeline = buildVoiceoverTimeline({segments: voicedSegments});
    const composition = await selectComposition({
      serveUrl,
      id: 'digest-video',
      browserExecutable,
      inputProps: {job: {...job, segments: voicedSegments}, timeline}
    });
    const silentVideoPath = path.join(tempDir, `${job.platform}-silent.mp4`);
    const audioPath = path.join(tempDir, `${job.platform}.wav`);
    const outputPath = path.join(tempDir, `${job.platform}.mp4`);

    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: silentVideoPath,
      browserExecutable,
      inputProps: {job: {...job, segments: voicedSegments}, timeline}
    });

    await concatAudio(voicedSegments.map((segment) => segment.audioPath), audioPath);
    await muxVideoAndAudio({silentVideoPath, audioPath, outputPath});
    outputs[job.platform] = await readFile(outputPath);

    if (job.platform === 'bilibili') {
      dailyPackage.bilibiliSrt = timeline.captions
        .map((caption, index) => `${index + 1}\n${msToSrt(caption.startMs)} --> ${msToSrt(caption.endMs)}\n${caption.text}\n`)
        .join('\n');
    }
  }

  return outputs;
}

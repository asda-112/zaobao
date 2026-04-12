import ffmpegPath from 'ffmpeg-static';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

import {getWavDurationSeconds} from './wav-duration.js';
import {resolveEdgeTtsExecutable} from './runtime-paths.js';

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

async function synthesizeSegmentWithEdgeTts({segment, outputDir, index, voice}) {
  const edgeTtsExecutable = resolveEdgeTtsExecutable();
  if (!edgeTtsExecutable) {
    throw new Error('Unable to locate edge-tts. Set ZAOBAO_EDGE_TTS_BIN or add edge-tts to PATH.');
  }

  const mp3Path = path.join(outputDir, `segment-${index + 1}.mp3`);
  const wavPath = path.join(outputDir, `segment-${index + 1}.wav`);

  await runCommand(edgeTtsExecutable, [
    '--voice',
    voice,
    '--text',
    segment.narration,
    '--write-media',
    mp3Path
  ]);
  await runCommand(ffmpegPath, ['-y', '-i', mp3Path, wavPath]);

  const durationSeconds = await getWavDurationSeconds(wavPath);
  return {
    ...segment,
    audioPath: wavPath,
    durationSeconds,
    ttsEngine: 'edge-tts'
  };
}

export async function synthesizeSegments({segments, outputDir}) {
  await mkdir(outputDir, {recursive: true});

  const requestedEngine = process.env.ZAOBAO_TTS_ENGINE || 'edge-tts';
  if (requestedEngine !== 'edge-tts') {
    throw new Error(`High-quality mode only supports edge-tts. Received: ${requestedEngine}`);
  }

  const voice = process.env.ZAOBAO_EDGE_TTS_VOICE || 'zh-CN-XiaoxiaoNeural';
  const synthesized = [];

  for (const [index, segment] of segments.entries()) {
    const voiced = await synthesizeSegmentWithEdgeTts({segment, outputDir, index, voice});
    synthesized.push(voiced);
  }

  return synthesized;
}

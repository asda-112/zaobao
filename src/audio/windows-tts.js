import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

import {getWavDurationSeconds} from './wav-duration.js';

function escapeForPowerShell(text) {
  return String(text).replace(/'/g, "''");
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell', ['-NoProfile', '-Command', command], {
      stdio: 'ignore'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`PowerShell exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

export async function synthesizeSegmentsWithWindowsTts({segments, outputDir}) {
  await mkdir(outputDir, {recursive: true});
  const synthesized = [];

  for (const [index, segment] of segments.entries()) {
    const filePath = path.join(outputDir, `segment-${index + 1}.wav`);
    const text = escapeForPowerShell(segment.narration);
    const command = [
      'Add-Type -AssemblyName System.Speech;',
      '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
      '$synth.Rate = 2;',
      `$synth.SetOutputToWaveFile('${filePath}');`,
      `$synth.Speak('${text}');`,
      '$synth.Dispose();'
    ].join(' ');

    await runPowerShell(command);
    const durationSeconds = await getWavDurationSeconds(filePath);
    synthesized.push({
      ...segment,
      audioPath: filePath,
      durationSeconds
    });
  }

  return synthesized;
}

export async function synthesizeSegments({segments, outputDir}) {
  return synthesizeSegmentsWithWindowsTts({segments, outputDir});
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {getWavDurationSeconds} from '../src/audio/wav-duration.js';

function makeChunk(id, dataBuffer) {
  const padding = dataBuffer.length % 2 === 1 ? 1 : 0;
  const chunk = Buffer.alloc(8 + dataBuffer.length + padding);
  chunk.write(id, 0, 4, 'ascii');
  chunk.writeUInt32LE(dataBuffer.length, 4);
  dataBuffer.copy(chunk, 8);
  return chunk;
}

function createWaveWithListChunk({sampleRate = 24000, channels = 1, bitsPerSample = 16, durationSeconds = 3.2}) {
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  const dataSize = Math.round(bytesPerSecond * durationSeconds);

  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(sampleRate, 4);
  fmt.writeUInt32LE(bytesPerSecond, 8);
  fmt.writeUInt16LE((channels * bitsPerSample) / 8, 12);
  fmt.writeUInt16LE(bitsPerSample, 14);

  const list = Buffer.from('INFOISFT\x04\x00\x00\x00test', 'ascii');
  const data = Buffer.alloc(dataSize, 0);

  const chunks = [makeChunk('fmt ', fmt), makeChunk('LIST', list), makeChunk('data', data)];
  const payload = Buffer.concat(chunks);
  const riff = Buffer.alloc(12);
  riff.write('RIFF', 0, 4, 'ascii');
  riff.writeUInt32LE(payload.length + 4, 4);
  riff.write('WAVE', 8, 4, 'ascii');
  return Buffer.concat([riff, payload]);
}

test('getWavDurationSeconds parses WAV files that contain LIST chunks before data', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-wav-test-'));
  const filePath = path.join(dir, 'sample.wav');
  await writeFile(filePath, createWaveWithListChunk({durationSeconds: 3.2}));

  const durationSeconds = await getWavDurationSeconds(filePath);
  assert.ok(Math.abs(durationSeconds - 3.2) < 0.02, `expected ~3.2s, got ${durationSeconds}`);
});

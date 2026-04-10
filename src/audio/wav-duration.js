import {readFile} from 'node:fs/promises';

export async function getWavDurationSeconds(filePath) {
  const buffer = await readFile(filePath);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataSize = buffer.readUInt32LE(40);
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  return dataSize / bytesPerSecond;
}

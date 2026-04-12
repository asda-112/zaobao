import {readFile} from 'node:fs/promises';

export async function getWavDurationSeconds(filePath) {
  const buffer = await readFile(filePath);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Unsupported WAV file: ${filePath}`);
  }

  let channels = null;
  let sampleRate = null;
  let bitsPerSample = null;
  let dataSize = null;
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    }

    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }

    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!channels || !sampleRate || !bitsPerSample || dataSize == null) {
    throw new Error(`Unable to parse WAV duration metadata: ${filePath}`);
  }

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  return dataSize / bytesPerSecond;
}

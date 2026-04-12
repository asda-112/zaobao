import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertRenderedMediaBuffer,
  buildMuxVideoAndAudioArgs,
  resolveRemotionRuntimeConfig
} from '../src/render/remotion-renderer.js';

test('assertRenderedMediaBuffer rejects empty rendered media', () => {
  assert.throws(
    () => assertRenderedMediaBuffer({buffer: Buffer.alloc(0), label: 'bilibili-video.mp4'}),
    /empty|zero-byte/i
  );
});

test('assertRenderedMediaBuffer rejects placeholder-like tiny media buffers', () => {
  assert.throws(
    () => assertRenderedMediaBuffer({buffer: Buffer.from('skip-render-bilibili'), label: 'bilibili-video.mp4'}),
    /placeholder|too small/i
  );
});

test('assertRenderedMediaBuffer accepts realistic media buffers', () => {
  const buffer = Buffer.alloc(4096, 7);
  assert.doesNotThrow(() => assertRenderedMediaBuffer({buffer, label: 'bilibili-video.mp4'}));
});

test('resolveRemotionRuntimeConfig prefers explicit browser path and stable rendering defaults', () => {
  const config = resolveRemotionRuntimeConfig({
    env: {
      REMOTION_BROWSER_EXECUTABLE: 'D:\\Browsers\\chrome.exe',
      REMOTION_CHROME_MODE: 'chrome-for-testing',
      REMOTION_GL: 'angle',
      ZAOBAO_REMOTION_LOG_LEVEL: 'verbose'
    },
    fileExists: (candidate) => candidate === 'D:\\Browsers\\chrome.exe'
  });

  assert.deepEqual(config, {
    browserExecutable: 'D:\\Browsers\\chrome.exe',
    chromeMode: 'chrome-for-testing',
    logLevel: 'verbose',
    chromiumOptions: {
      gl: 'angle',
      disableWebSecurity: false,
      ignoreCertificateErrors: false
    },
    concurrency: 1,
    disallowParallelEncoding: true
  });
});

test('buildMuxVideoAndAudioArgs explicitly maps video from render output and audio from synthesized wav', () => {
  const args = buildMuxVideoAndAudioArgs({
    silentVideoPath: 'C:\\temp\\silent.mp4',
    audioPath: 'C:\\temp\\voice.wav',
    outputPath: 'C:\\temp\\final.mp4'
  });

  assert.deepEqual(args, [
    '-y',
    '-i',
    'C:\\temp\\silent.mp4',
    '-i',
    'C:\\temp\\voice.wav',
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-shortest',
    'C:\\temp\\final.mp4'
  ]);
});

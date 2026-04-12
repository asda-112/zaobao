import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import os from 'node:os';

const cwd = process.cwd();
const entry = path.join(cwd, 'src/render/index.jsx');
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const chromeMode = process.env.REMOTION_CHROME_MODE || 'chrome-for-testing';

const chromiumOptions = {
  gl: process.env.REMOTION_GL || 'angle',
  disableWebSecurity: false,
  ignoreCertificateErrors: false
};

async function main() {
  console.log(
    JSON.stringify(
      {
        phase: 'start',
        entry,
        browserExecutable,
        chromeMode,
        chromiumOptions
      },
      null,
      2
    )
  );

  const serveUrl = await bundle(entry);
  console.log(JSON.stringify({phase: 'bundled', serveUrl}, null, 2));

  const browser = await openBrowser('chrome', {
    browserExecutable,
    chromeMode,
    chromiumOptions,
    logLevel: 'verbose'
  });

  console.log(JSON.stringify({phase: 'browser-opened'}, null, 2));

  try {
    const composition = await selectComposition({
      serveUrl,
      id: 'digest-video',
      browserExecutable,
      chromeMode,
      chromiumOptions,
      logLevel: 'verbose',
      puppeteerInstance: browser,
      inputProps: {
        job: {
          width: 1920,
          height: 1080,
          orientation: 'landscape',
          platform: 'bilibili',
          segments: [
            {
              headline: 'Diagnostic Headline',
              summary: 'Diagnostic summary',
              narration: 'Diagnostic summary',
              durationSeconds: 2
            }
          ]
        },
        timeline: {
          totalDurationSeconds: 2,
          captions: [{text: 'Diagnostic summary', startMs: 0, endMs: 2000}]
        }
      }
    });

    console.log(
      JSON.stringify(
        {
          phase: 'composition-selected',
          composition: {
            id: composition.id,
            width: composition.width,
            height: composition.height,
            fps: composition.fps,
            durationInFrames: composition.durationInFrames
          }
        },
        null,
        2
      )
    );

    const outputLocation = path.join(os.tmpdir(), 'zaobao-remotion-diagnose.mp4');
    const result = await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation,
      browserExecutable,
      chromeMode,
      chromiumOptions,
      logLevel: 'verbose',
      concurrency: 1,
      disallowParallelEncoding: true,
      puppeteerInstance: browser,
      inputProps: {
        job: {
          width: 1920,
          height: 1080,
          orientation: 'landscape',
          platform: 'bilibili',
          segments: [
            {
              headline: 'Diagnostic Headline',
              summary: 'Diagnostic summary',
              narration: 'Diagnostic summary',
              durationSeconds: 2
            }
          ]
        },
        timeline: {
          totalDurationSeconds: 2,
          captions: [{text: 'Diagnostic summary', startMs: 0, endMs: 2000}]
        }
      }
    });

    console.log(
      JSON.stringify(
        {
          phase: 'rendered',
          outputLocation,
          contentType: result.contentType,
          hasBuffer: Boolean(result.buffer),
          slowestFrames: result.slowestFrames.length
        },
        null,
        2
      )
    );
  } finally {
    await browser.close(true);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

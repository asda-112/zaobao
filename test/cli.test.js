import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {buildDigestPackage} from '../src/cli/build-digest.js';

test('build-digest CLI creates a daily package from a fixture-only source config', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-cli-'));
  const sourcesPath = path.join(tempDir, 'sources.json');
  const outputDir = path.join(tempDir, 'out');

  await writeFile(
    sourcesPath,
    JSON.stringify([
      {
        id: 'sample-fixture',
        type: 'fixture',
        name: 'Sample Fixture',
        path: 'data/fixtures/sample-ai-news.json',
        tags: ['ai', 'fixture']
      }
    ])
  );

  await buildDigestPackage({
    date: '2026-04-10',
    sources: sourcesPath,
    output: outputDir,
    skipRender: true
  });

  const digest = await readFile(path.join(outputDir, '2026-04-10', 'master-digest.md'), 'utf8');
  const review = await readFile(path.join(outputDir, '2026-04-10', 'review-report.md'), 'utf8');

  assert.match(digest, /AI 早报/);
  assert.match(review, /预计主片时长/);
});

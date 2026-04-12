import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat, writeFile} from 'node:fs/promises';
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
    skipRender: true,
    allowFixtureSources: true,
    allowSkipRender: true
  });

  const digest = await readFile(path.join(outputDir, '2026-04-10', 'master-digest.md'), 'utf8');
  const review = await readFile(path.join(outputDir, '2026-04-10', 'review-report.md'), 'utf8');

  assert.match(digest, /AI 早报/);
  assert.match(review, /预计主片时长/);
});

test('build-digest CLI supports review-file and emits review-summary', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-cli-review-'));
  const sourcesPath = path.join(tempDir, 'sources.json');
  const reviewPath = path.join(tempDir, 'review.json');
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

  await writeFile(
    reviewPath,
    JSON.stringify({
      issues: [
        {id: 'issue-1', status: 'approved'},
        {id: 'issue-2', status: 'rejected'}
      ]
    })
  );

  await buildDigestPackage({
    date: '2026-04-10',
    sources: sourcesPath,
    reviewFile: reviewPath,
    output: outputDir,
    skipRender: true,
    allowFixtureSources: true,
    allowSkipRender: true
  });

  const summaryPath = path.join(outputDir, '2026-04-10', 'review-summary.json');
  const summaryStat = await stat(summaryPath);
  assert.ok(summaryStat.isFile());

  const issueJson = await readFile(path.join(outputDir, '2026-04-10', 'issue.json'), 'utf8');
  assert.match(issueJson, /reviewStatus/);
});

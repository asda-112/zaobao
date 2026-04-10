import test from 'node:test';
import assert from 'node:assert/strict';

import {collectCandidatesSafely} from '../src/collectors/index.js';
import {parseRssItems} from '../src/collectors/rss.js';
import {buildVoiceoverTimeline} from '../src/render/build-voiceover-timeline.js';

test('parseRssItems normalizes RSS entries into candidate items', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>Example AI Feed</title>
      <item>
        <title>OpenAI updates ChatGPT memory</title>
        <link>https://example.com/openai-memory</link>
        <pubDate>Fri, 10 Apr 2026 07:00:00 GMT</pubDate>
        <description>OpenAI rolled out memory controls to more users.</description>
      </item>
      <item>
        <title>Google shows Gemini coding agent</title>
        <link>https://example.com/gemini-agent</link>
        <pubDate>Fri, 10 Apr 2026 06:30:00 GMT</pubDate>
        <description>Google previewed a coding-focused Gemini workflow.</description>
      </item>
    </channel>
  </rss>`;

  const items = parseRssItems({
    xml,
    source: {
      id: 'example-feed',
      name: 'Example AI Feed',
      tags: ['ai', 'rss']
    }
  });

  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    id: 'example-feed-0',
    title: 'OpenAI updates ChatGPT memory',
    source: 'Example AI Feed',
    url: 'https://example.com/openai-memory',
    publishedAt: '2026-04-10T07:00:00.000Z',
    content: 'OpenAI rolled out memory controls to more users.',
    lang: 'unknown',
    tags: ['ai', 'rss'],
    score: 60
  });
});

test('buildVoiceoverTimeline turns segment durations into captions and total duration', () => {
  const timeline = buildVoiceoverTimeline({
    segments: [
      {headline: 'OpenAI updates memory', narration: 'OpenAI expanded memory controls.', durationSeconds: 18},
      {headline: 'Google shows Gemini agent', narration: 'Google previewed a coding agent workflow.', durationSeconds: 21}
    ]
  });

  assert.equal(timeline.totalDurationSeconds, 39);
  assert.deepEqual(timeline.captions, [
    {
      text: 'OpenAI expanded memory controls.',
      startMs: 0,
      endMs: 18000,
      timestampMs: 0,
      confidence: 1
    },
    {
      text: 'Google previewed a coding agent workflow.',
      startMs: 18000,
      endMs: 39000,
      timestampMs: 18000,
      confidence: 1
    }
  ]);
});

test('collectCandidatesSafely keeps fixture results even when a remote source fails', async () => {
  const result = await collectCandidatesSafely({
    cwd: 'E:\\zaobao',
    sources: [
      {
        id: 'sample-fixture',
        type: 'fixture',
        name: 'Sample Fixture',
        path: 'data/fixtures/sample-ai-news.json',
        tags: ['ai', 'fixture']
      },
      {
        id: 'broken-rss',
        type: 'rss',
        name: 'Broken RSS',
        url: 'https://invalid.invalid/rss.xml',
        tags: ['broken']
      }
    ]
  });

  assert.ok(result.items.length > 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].sourceId, 'broken-rss');
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {collectCandidatesSafely} from '../src/collectors/index.js';
import {collectUrlItem} from '../src/collectors/url.js';
import {parseRssItems} from '../src/collectors/rss.js';
import {buildDefaultSources, defaultSources} from '../src/config/default-sources.js';
import {normalizeCandidate} from '../src/core/candidate-normalizer.js';
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

test('collectCandidatesSafely supports manual verified items as real first-party sources', async () => {
  const result = await collectCandidatesSafely({
    cwd: 'E:\\zaobao',
    sources: [
      {
        id: 'manual-openai-x',
        type: 'manual',
        name: 'OpenAI on X',
        sourceType: 'official',
        tier: 'A',
        isPrimarySource: true,
        tags: ['ai', 'x', 'openai', 'official'],
        items: [
          {
            title: 'OpenAI clarifies Pro tier Codex usage on X',
            url: 'https://x.com/OpenAI/status/2042296046009626989',
            publishedAt: '2026-04-09T17:38:16.000Z',
            content: 'OpenAI clarified the new Pro tier structure and said the existing $200 plan remains the highest usage option.',
            newsType: 'product'
          }
        ]
      }
    ]
  });

  assert.equal(result.failures.length, 0);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].sourceType, 'official');
  assert.equal(result.items[0].isPrimarySource, true);
});

test('collectCandidatesSafely supports official-rss alias and reports unsupported source types', async () => {
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
        id: 'unsupported-source',
        type: 'unknown-type',
        name: 'Unsupported',
        tags: ['broken']
      }
    ]
  });

  assert.ok(result.items.length > 0);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].sourceId, 'unsupported-source');
  assert.match(result.failures[0].message, /Unsupported source type/);
});

test('normalizeCandidate preserves explicit wechat metadata as a supplementary non-primary source', () => {
  const normalized = normalizeCandidate({
    item: {
      id: 'wechat-1',
      title: '智谱 AI 更新 GLM 模型能力',
      source: '智谱AI',
      url: 'https://mp.weixin.qq.com/s/example',
      publishedAt: '2026-04-10T05:00:00.000Z',
      content: '智谱发布了新的模型更新与开发者能力。',
      tags: ['ai', 'wechat', 'model'],
      score: 68
    },
    source: {
      id: 'opencli-weixin-zhipu',
      type: 'opencli',
      name: '智谱AI',
      sourceType: 'wechat',
      tier: 'C',
      isPrimarySource: false,
      tags: ['ai', 'wechat', 'zhipu', 'model']
    }
  });

  assert.equal(normalized.sourceType, 'wechat');
  assert.equal(normalized.isPrimarySource, false);
  assert.equal(normalized.tier, 'C');
  assert.equal(normalized.newsType, 'model');
});

test('defaultSources ship with local RSSHub defaults and expanded official + wechat seeds', () => {
  const officialSources = defaultSources.filter((source) => source.sourceType === 'official');
  const wechatSources = defaultSources.filter((source) => source.sourceType === 'wechat');
  const rsshubSources = defaultSources.filter((source) => source.type === 'rsshub');
  const fixtureSources = defaultSources.filter((source) => source.type === 'fixture');

  assert.ok(officialSources.length >= 8, 'expected at least 8 official sources');
  assert.ok(wechatSources.length >= 5, 'expected at least 5 wechat seed sources');
  assert.ok(rsshubSources.length >= 2, 'expected at least 2 rsshub sources');
  assert.equal(fixtureSources.length, 0, 'default sources should not include fixture data in high-quality mode');
  assert.ok(
    rsshubSources.every((source) => String(source.rsshubUrl || source.url || '').startsWith('http://127.0.0.1:1200')),
    'rsshub sources should default to the local localhost instance'
  );
});

test('buildDefaultSources can enable official X sources as tier-A primary feeds', () => {
  const sources = buildDefaultSources({enableXOfficialSources: true});
  const xOfficialSources = sources.filter((source) => source.platform === 'x');

  assert.ok(xOfficialSources.length >= 5, 'expected at least 5 official X sources');
  assert.ok(xOfficialSources.every((source) => source.type === 'rsshub'));
  assert.ok(xOfficialSources.every((source) => source.sourceType === 'official'));
  assert.ok(xOfficialSources.every((source) => source.isPrimarySource === true));
  assert.ok(xOfficialSources.every((source) => source.tier === 'A'));
  assert.ok(xOfficialSources.every((source) => String(source.rsshubUrl).includes('/twitter/user/')));
});

test('collectUrlItem respects manual metadata overrides for high-quality verified sources', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    text: async () =>
      '<html><head><title>Fallback title</title></head><body><p>Fallback body text from the remote page.</p></body></html>'
  });

  try {
    const item = await collectUrlItem({
      source: {
        id: 'verified-url-source',
        type: 'url',
        name: 'Verified Source',
        url: 'https://example.com/story',
        publishedAt: '2026-04-10T14:30:00.000Z',
        titleOverride: 'Verified title override',
        contentOverride: 'Verified content override from manual source review.',
        tags: ['ai', 'verified'],
        baseScore: 88
      }
    });

    assert.equal(item.title, 'Verified title override');
    assert.equal(item.content, 'Verified content override from manual source review.');
    assert.equal(item.publishedAt, '2026-04-10T14:30:00.000Z');
    assert.equal(item.score, 88);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

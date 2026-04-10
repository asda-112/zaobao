import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {buildDigestPlan} from '../src/core/build-digest.js';
import {createDailyPackage} from '../src/core/create-daily-package.js';
import {writeDailyPackage} from '../src/core/write-daily-package.js';

const theme = {
  style: 'light',
  primary: '#F59E0B',
  accent: '#F9A8D4',
  motion: 'light',
  voice: 'creator-like'
};

test('buildDigestPlan excludes 72-hour duplicates and stays near the target duration', () => {
  const now = new Date('2026-04-10T08:00:00.000Z');
  const candidates = [
    {
      id: 'c1',
      title: 'OpenAI ships faster voice mode',
      source: 'Example RSS',
      url: 'https://example.com/openai-voice',
      publishedAt: '2026-04-10T05:00:00.000Z',
      content: 'OpenAI released a faster voice mode with creator-style delivery and lower latency.',
      lang: 'en',
      tags: ['openai', 'voice'],
      score: 92
    },
    {
      id: 'c2',
      title: 'OpenAI ships faster voice mode',
      source: 'Mirror',
      url: 'https://mirror.example.com/openai-voice',
      publishedAt: '2026-04-10T04:50:00.000Z',
      content: 'A syndicated mirror of the OpenAI voice mode story.',
      lang: 'en',
      tags: ['openai'],
      score: 80
    },
    {
      id: 'c3',
      title: 'ByteDance launches a compact coding model',
      source: 'Example RSS',
      url: 'https://example.com/bytedance-coder',
      publishedAt: '2026-04-10T03:00:00.000Z',
      content: 'ByteDance published a compact coding model with strong multilingual results and better tool use.',
      lang: 'zh',
      tags: ['bytedance', 'coding'],
      score: 87
    },
    {
      id: 'c4',
      title: 'Anthropic updates Claude app workflow',
      source: 'Example RSS',
      url: 'https://example.com/anthropic-workflow',
      publishedAt: '2026-04-10T02:00:00.000Z',
      content: 'Anthropic improved task planning and workflow handoff inside the Claude app.',
      lang: 'en',
      tags: ['anthropic', 'workflow'],
      score: 83
    },
    {
      id: 'c5',
      title: 'Alibaba refreshes Qwen multimodal stack',
      source: 'Example RSS',
      url: 'https://example.com/qwen-refresh',
      publishedAt: '2026-04-10T01:30:00.000Z',
      content: 'Alibaba refreshed Qwen multimodal capabilities with faster video understanding and better image grounding.',
      lang: 'zh',
      tags: ['qwen', 'multimodal'],
      score: 86
    }
  ];
  const archiveItems = [
    {
      id: 'a1',
      title: 'Anthropic updates Claude app workflow',
      source: 'Yesterday Digest',
      url: 'https://old.example.com/anthropic-workflow',
      publishedAt: '2026-04-09T06:00:00.000Z',
      content: 'Yesterday version of the same Anthropc workflow update.',
      lang: 'en',
      tags: ['anthropic'],
      score: 70
    }
  ];

  const result = buildDigestPlan({
    candidates,
    archiveItems,
    now,
    config: {
      targetDurationSeconds: 210,
      minDurationSeconds: 180,
      maxDurationSeconds: 240,
      maxIssues: 4,
      theme
    }
  });

  assert.equal(result.issues.length, 3);
  assert.deepEqual(
    result.issues.map((issue) => issue.candidate.id),
    ['c1', 'c3', 'c5']
  );
  assert.ok(result.totalDurationSeconds >= 180);
  assert.ok(result.totalDurationSeconds <= 240);
  assert.match(result.reviewReport, /Removed 2 duplicate or stale candidate/);
});

test('writeDailyPackage emits the required package files for manual publishing', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-package-'));
  const dailyPackage = {
    date: '2026-04-10',
    masterDigest: '# AI 早报\n\n## 今日摘要\n\n- Story one\n',
    wechatMarkdown: '# AI 早报\n\n适合公众号排版的正文。',
    wechatHtml: '<article><h1>AI 早报</h1><p>适合公众号排版的正文。</p></article>',
    bilibiliCoverHtml: '<html><body><h1>AI 早报</h1></body></html>',
    bilibiliCoverPrompt: 'Render a 1920x1080 warm light card.',
    bilibiliMeta: '# B站发布信息\n\n- 标题: 今日 AI 早报\n',
    bilibiliSrt: '1\n00:00:00,000 --> 00:00:02,000\n大家早上好\n',
    xiaohongshuNote: '# 小红书笔记\n\n- 标签: #AI早报\n',
    douyinMeta: '# 抖音发布文案\n\n三分钟看懂今日 AI 新闻。',
    reviewReport: '# 审校报告\n\n- 画面素材充足\n',
    videoOutputs: {
      bilibili: Buffer.from('fake-bilibili-video'),
      douyin: Buffer.from('fake-douyin-video'),
      xiaohongshu: Buffer.from('fake-xiaohongshu-video')
    }
  };

  await writeDailyPackage({outputDir: outDir, dailyPackage});

  const requiredFiles = [
    'master-digest.md',
    'wechat.md',
    'wechat.html',
    'bilibili-cover.html',
    'bilibili-meta.md',
    'bilibili.srt',
    'bilibili-video.mp4',
    'douyin-meta.md',
    'douyin-video.mp4',
    'xiaohongshu-note.md',
    'xiaohongshu-video.mp4',
    'review-report.md'
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(outDir, '2026-04-10', file);
    const fileStat = await stat(fullPath);
    assert.ok(fileStat.isFile(), `${file} should exist`);
  }

  const html = await readFile(path.join(outDir, '2026-04-10', 'wechat.html'), 'utf8');
  assert.match(html, /<article>/);
  const cover = await readFile(path.join(outDir, '2026-04-10', 'bilibili-cover.html'), 'utf8');
  assert.match(cover, /AI 早报/);
});

test('createDailyPackage derives differentiated platform assets from one digest plan', () => {
  const digestPlan = buildDigestPlan({
    now: new Date('2026-04-10T08:00:00.000Z'),
    archiveItems: [],
    candidates: [
      {
        id: 'c1',
        title: 'OpenAI ships faster voice mode',
        source: 'Example RSS',
        url: 'https://example.com/openai-voice',
        publishedAt: '2026-04-10T05:00:00.000Z',
        content: 'OpenAI released a faster voice mode with creator-style delivery and lower latency.',
        lang: 'en',
        tags: ['openai', 'voice'],
        score: 92
      },
      {
        id: 'c2',
        title: 'Alibaba refreshes Qwen multimodal stack',
        source: 'Example RSS',
        url: 'https://example.com/qwen-refresh',
        publishedAt: '2026-04-10T01:30:00.000Z',
        content: 'Alibaba refreshed Qwen multimodal capabilities with faster video understanding and better image grounding.',
        lang: 'zh',
        tags: ['qwen', 'multimodal'],
        score: 86
      },
      {
        id: 'c3',
        title: 'ByteDance launches a compact coding model',
        source: 'Example RSS',
        url: 'https://example.com/bytedance-coder',
        publishedAt: '2026-04-10T03:00:00.000Z',
        content: 'ByteDance published a compact coding model with strong multilingual results and better tool use.',
        lang: 'zh',
        tags: ['bytedance', 'coding'],
        score: 87
      }
    ],
    config: {
      targetDurationSeconds: 210,
      minDurationSeconds: 180,
      maxDurationSeconds: 240,
      maxIssues: 4,
      theme
    }
  });

  const dailyPackage = createDailyPackage({
    date: '2026-04-10',
    digestPlan,
    config: {
      theme,
      targetPlatforms: ['wechat', 'bilibili', 'douyin', 'xiaohongshu']
    }
  });

  assert.match(dailyPackage.masterDigest, /OpenAI ships faster voice mode/);
  assert.match(dailyPackage.wechatHtml, /<article/);
  assert.match(dailyPackage.wechatHtml, /概览/);
  assert.match(dailyPackage.wechatHtml, /blockquote/);
  assert.match(dailyPackage.wechatHtml, /#1/);
  assert.match(dailyPackage.wechatHtml, /<strong>OpenAI ships faster voice mode<\/strong>/);
  assert.match(dailyPackage.bilibiliMeta, /3-4 分钟/);
  assert.match(dailyPackage.douyinMeta, /快一点/);
  assert.match(dailyPackage.xiaohongshuNote, /封面建议/);
  assert.match(dailyPackage.bilibiliCoverHtml, /AI 早报 2026-04-10/);
  assert.match(dailyPackage.bilibiliCoverHtml, /OpenAI ships faster voice mode/);
  assert.match(dailyPackage.bilibiliCoverPrompt, /1920x1080/);
  assert.equal(dailyPackage.renderJobs.length, 3);
  assert.deepEqual(
    dailyPackage.renderJobs.map((job) => ({platform: job.platform, width: job.width, height: job.height})),
    [
      {platform: 'bilibili', width: 1920, height: 1080},
      {platform: 'douyin', width: 1080, height: 1920},
      {platform: 'xiaohongshu', width: 1080, height: 1920}
    ]
  );
});

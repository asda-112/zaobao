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
  assert.ok(result.totalDurationSeconds >= 80);
  assert.ok(result.totalDurationSeconds <= 120);
  assert.match(result.reviewReport, /Removed 2 duplicate or stale candidate/);
});

test('writeDailyPackage emits the required package files for manual publishing', async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-package-'));
  const dailyPackage = {
    date: '2026-04-10',
    candidatePool: [
      {
        id: 'c1',
        title: 'Story one',
        source: 'Example RSS',
        url: 'https://example.com/story-one',
        publishedAt: '2026-04-10T06:00:00.000Z',
        content: 'Story one summary',
        lang: 'en',
        tags: ['ai'],
        sourceType: 'official',
        newsType: 'model',
        score: 90,
        clusterId: 'story one'
      }
    ],
    issueDocument: {
      date: '2026-04-10',
      issueCount: 1,
      items: [
        {
          id: 'issue-1',
          rank: 1,
          title: 'Story one',
          oneLineConclusion: 'Story one summary',
          whyImportant: 'Important',
          keyFacts: ['Fact A', 'Fact B'],
          sources: [{name: 'Example RSS', url: 'https://example.com/story-one'}],
          recommendedVisualType: 'summary-card',
          durationSeconds: 60,
          sourceType: 'official',
          newsType: 'model',
          score: 90,
          clusterId: 'story one'
        }
      ]
    },
    masterDigest: '# AI 早报\n\n## 今日摘要\n\n- Story one\n',
    wechatMarkdown: '# AI 早报\n\n适合公众号排版的正文。',
    wechatHtml: '<article><h1>AI 早报</h1><p>适合公众号排版的正文。</p></article>',
    bilibiliCoverHtml: '<html><body><h1>AI 早报</h1></body></html>',
    bilibiliCoverPrompt: 'Render a 1920x1080 warm light card.',
    bilibiliMeta: '# B站发布信息\n\n- 标题：今日 AI 早报\n',
    bilibiliSrt: '1\n00:00:00,000 --> 00:00:02,000\n大家早上好\n',
    xiaohongshuNote: '# 小红书笔记\n\n- 标签: #AI早报\n',
    douyinMeta: '# 抖音发布文案\n\n60 秒看完今日 AI 新闻。',
    reviewReport: '# 审校报告\n\n- 画面素材充足\n',
    videoOutputs: {
      bilibili: Buffer.from('fake-bilibili-video'),
      douyin: Buffer.from('fake-douyin-video'),
      douyinClips: [Buffer.from('fake-douyin-video-1'), Buffer.from('fake-douyin-video-2')]
    },
    xiaohongshuCardImages: [Buffer.from('fake-xiaohongshu-card')]
  };

  await writeDailyPackage({outputDir: outDir, dailyPackage});

  const requiredFiles = [
    'candidates.json',
    'issue.json',
    'master-digest.md',
    'wechat.md',
    'wechat.html',
    'bilibili-cover.html',
    'bilibili-meta.md',
    'bilibili.srt',
    'bilibili-video.mp4',
    'douyin-meta.md',
    'douyin-video.mp4',
    'douyin-video-01.mp4',
    'douyin-video-02.mp4',
    'xiaohongshu-note.md',
    'xiaohongshu-card-01.png',
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
  assert.match(dailyPackage.douyinMeta, /60 秒/);
  assert.doesNotMatch(dailyPackage.douyinMeta, /1-3 条竖版切片/);
  assert.match(dailyPackage.xiaohongshuNote, /图文卡片/);
  assert.match(dailyPackage.bilibiliCoverHtml, /AI 早报 2026-04-10/);
  assert.match(dailyPackage.bilibiliCoverHtml, /OpenAI ships faster voice mode/);
  assert.match(dailyPackage.bilibiliCoverPrompt, /1920x1080/);
  assert.ok(Array.isArray(dailyPackage.candidatePool));
  assert.ok(dailyPackage.issueDocument.items.length > 0);
  assert.equal(dailyPackage.issues.length, dailyPackage.issueDocument.items.length);
  assert.equal(dailyPackage.issues[0].candidate.title, digestPlan.issues[0].candidate.title);
  assert.equal(dailyPackage.renderJobs.length, 2);
  assert.equal(dailyPackage.renderJobs[0].segments.length, dailyPackage.issues.length + 2);
  assert.equal(dailyPackage.renderJobs[0].segments[0].visualHint, 'opening-card');
  assert.equal(
    dailyPackage.renderJobs[0].segments[dailyPackage.renderJobs[0].segments.length - 1].visualHint,
    'closing-card'
  );
  assert.equal(dailyPackage.renderJobs[1].platform, 'douyin');
  assert.equal(dailyPackage.renderJobs[1].segments.length, dailyPackage.issues.length + 2);
  assert.equal(dailyPackage.renderJobs[1].segments[0].visualHint, 'douyin-opening-card');
  assert.equal(
    dailyPackage.renderJobs[1].segments[dailyPackage.renderJobs[1].segments.length - 1].visualHint,
    'douyin-closing-card'
  );
  assert.deepEqual(
    dailyPackage.renderJobs.map((job) => ({platform: job.platform, width: job.width, height: job.height})),
    [
      {platform: 'bilibili', width: 1920, height: 1080},
      {platform: 'douyin', width: 1080, height: 1920}
    ]
  );
});

test('buildDigestPlan prefers wechat over generic platform sources for the same event cluster', () => {
  const result = buildDigestPlan({
    now: new Date('2026-04-10T08:00:00.000Z'),
    archiveItems: [],
    candidates: [
      {
        id: 'wechat-1',
        title: 'Qwen 发布新的多模态能力更新',
        source: '通义千问',
        sourceType: 'wechat',
        url: 'https://mp.weixin.qq.com/s/qwen-example',
        publishedAt: '2026-04-10T05:00:00.000Z',
        content: '通义千问公众号披露了新的多模态推理和图像理解能力。',
        lang: 'zh',
        tags: ['wechat', 'qwen', 'model'],
        score: 78
      },
      {
        id: 'platform-1',
        title: 'Qwen 发布新的多模态能力更新',
        source: 'Xiaohongshu 搬运',
        sourceType: 'platform',
        url: 'https://www.xiaohongshu.com/explore/qwen-example',
        publishedAt: '2026-04-10T05:10:00.000Z',
        content: '一篇来自平台搬运的相同事件摘要。',
        lang: 'zh',
        tags: ['platform', 'qwen'],
        score: 78
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

  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].candidate.id, 'wechat-1');
  assert.equal(result.issues[0].candidate.sourceType, 'wechat');
});

test('buildDigestPlan keeps more Chinese items when narration estimates are based on actual text density', () => {
  const makeCandidate = (index) => ({
    id: `zh-${index + 1}`,
    title: `模型厂商更新 ${index + 1}`,
    source: 'Official Blog',
    sourceType: 'official',
    isPrimarySource: true,
    url: `https://example.com/zh-${index + 1}`,
    publishedAt: `2026-04-10T0${index}:00:00.000Z`,
    content:
      '这是今天值得关注的一条 AI 新闻，包含模型能力变化、开发者影响和产品落地信息，适合在早报视频里用两三句话快速讲清楚。' +
      '这条新闻背后还牵涉到产品节奏、模型选型和企业部署策略，因此值得在日报里多讲一层。',
    lang: 'zh',
    newsType: index % 2 === 0 ? 'model' : 'product',
    tags: ['ai', 'model'],
    score: 90 - index
  });

  const result = buildDigestPlan({
    now: new Date('2026-04-10T08:00:00.000Z'),
    archiveItems: [],
    candidates: Array.from({length: 6}, (_, index) => makeCandidate(index)),
    config: {
      targetDurationSeconds: 210,
      minDurationSeconds: 180,
      maxDurationSeconds: 240,
      maxIssues: 6,
      theme
    }
  });

  assert.equal(result.issues.length, 6);
  assert.ok(result.totalDurationSeconds >= 180);
  assert.ok(result.totalDurationSeconds <= 240);
});

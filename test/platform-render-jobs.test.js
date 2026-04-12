import test from 'node:test';
import assert from 'node:assert/strict';

import {buildDigestPlan} from '../src/core/build-digest.js';
import {createDailyPackage} from '../src/core/create-daily-package.js';

const theme = {
  style: 'light',
  primary: '#F59E0B',
  accent: '#F9A8D4',
  motion: 'light',
  voice: 'creator-like'
};

function buildPackage() {
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

  return createDailyPackage({
    date: '2026-04-10',
    digestPlan,
    config: {
      theme,
      targetPlatforms: ['wechat', 'bilibili', 'douyin', 'xiaohongshu']
    }
  });
}

test('createDailyPackage builds a single aggregated douyin render job', () => {
  const dailyPackage = buildPackage();
  const douyinJobs = dailyPackage.renderJobs.filter((job) => job.platform === 'douyin');

  assert.equal(dailyPackage.renderJobs.length, 2);
  assert.equal(douyinJobs.length, 1);
  assert.equal(douyinJobs[0].width, 1080);
  assert.equal(douyinJobs[0].height, 1920);
  assert.equal(douyinJobs[0].segments.length, dailyPackage.issues.length + 2);
  assert.equal(douyinJobs[0].segments[0].visualHint, 'douyin-opening-card');
  assert.equal(douyinJobs[0].segments[douyinJobs[0].segments.length - 1].visualHint, 'douyin-closing-card');
});

test('createDailyPackage describes douyin as one dense 60-second digest instead of multiple clips', () => {
  const dailyPackage = buildPackage();

  assert.match(dailyPackage.douyinMeta, /60/);
  assert.doesNotMatch(dailyPackage.douyinMeta, /1-3/);
  assert.doesNotMatch(dailyPackage.douyinMeta, /切片/);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {__testables} from '../src/render/xiaohongshu-cards.js';

const {
  wrapText,
  wrapTextDetailed,
  compactHeadline,
  fitTextBlock,
  drawWrappedText,
  buildQuickPoints,
  buildIssueSpec,
  buildCoverSpec,
  buildSummarySpec
} = __testables();

function makeIssue() {
  return {
    candidate: {
      title: 'Mistral 发布 Mistral 3，主打更高性价比的开源级模型能力',
      source: 'Mistral',
      newsType: 'model'
    },
    story: {
      oneLineConclusion: 'Mistral 推出 Mistral 3，强调在推理、速度和部署成本之间取得更均衡的取舍。',
      whyImportant: '模型能力变化会直接影响开发与产品路线。',
      keyFacts: [
        '继续强化其在企业与开发者场景中的模型竞争力。',
        '对开发团队来说，这类更新会直接影响模型选型、私有化部署和成本控制。'
      ],
      recommendedVisualType: 'title-card+benchmark'
    }
  };
}

test('wrapText inserts line breaks for long Chinese text', () => {
  const wrapped = wrapText('这是一个非常长的中文标题需要被换行避免超出卡片宽度', 10, 3);
  assert.ok(Array.isArray(wrapped));
  assert.ok(wrapped.length >= 2);
});

test('wrapTextDetailed reports whether text was truncated', () => {
  const detailed = wrapTextDetailed('这是一段很长很长的内容，需要验证它会被截断', 8, 2);
  assert.equal(typeof detailed.truncated, 'boolean');
  assert.ok(Array.isArray(detailed.lines));
});

test('compactHeadline keeps the primary clause instead of blunt ellipsis', () => {
  const compact = compactHeadline('Google 将 Notebooks 引入 Gemini，继续打通 NotebookLM 工作流', 18);
  assert.match(compact, /Google 将 Notebooks 引入 Gemini/);
  assert.doesNotMatch(compact, /\.\.\.$/);
});

test('fitTextBlock prefers a non-truncated smaller variant', () => {
  const fitted = fitTextBlock('Google 将 Notebooks 引入 Gemini，继续打通 NotebookLM 工作流', [
    {size: 68, lineGap: 18, maxUnitsPerLine: 12, maxLines: 2},
    {size: 56, lineGap: 14, maxUnitsPerLine: 20, maxLines: 4}
  ]);

  assert.equal(fitted.size, 56);
  assert.equal(fitted.truncated, false);
});

test('drawWrappedText expands wrapped title into multiple drawtext lines', () => {
  const filters = drawWrappedText({
    text: 'Mistral 发布 Mistral 3，主打更高性价比的开源级模型能力',
    x: 100,
    y: 200,
    size: 68,
    maxUnitsPerLine: 18,
    maxLines: 3
  });

  assert.ok(filters.length >= 2);
  assert.ok(filters.every((filter) => filter.startsWith('drawtext=')));
});

test('buildQuickPoints keeps concise semantic points', () => {
  const points = buildQuickPoints(makeIssue());
  assert.equal(points.length, 3);
  assert.ok(points.every((point) => !point.endsWith('...')));
});

test('buildIssueSpec prepares dense xiaohongshu card content', () => {
  const spec = buildIssueSpec(makeIssue(), 0, 6);
  assert.equal(spec.index, '01');
  assert.equal(spec.footer, '1/6 · model');
  assert.equal(spec.quickPoints.length, 3);
  assert.match(spec.tag, /title-card\+benchmark/);
});

test('buildCoverSpec aggregates top stories for the cover', () => {
  const issues = [makeIssue(), makeIssue(), makeIssue(), makeIssue()];
  const spec = buildCoverSpec({issues});
  assert.equal(spec.bullets.length, 3);
  assert.match(spec.footer, /向左滑动/);
  assert.ok(spec.bullets.every((bullet) => !bullet.endsWith('...')));
});

test('buildSummarySpec returns three action-oriented bullets', () => {
  const spec = buildSummarySpec({issues: [makeIssue()]});
  assert.equal(spec.bullets.length, 3);
  assert.match(spec.footer, /公众号和 B 站/);
});

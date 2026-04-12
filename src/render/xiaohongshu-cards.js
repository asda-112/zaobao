import ffmpegPath from 'ffmpeg-static';
import {mkdtemp, readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

const CARD_WIDTH = 1242;
const CARD_HEIGHT = 1660;
const CARD_X = 54;
const CARD_Y = 54;
const CARD_INNER_WIDTH = 1134;
const CARD_INNER_HEIGHT = 1552;
const ELLIPSIS = '...';

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'ignore', 'pipe']});
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}\n${stderr}`));
    });
    child.on('error', reject);
  });
}

function escapeText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

function visualWidth(unit) {
  if (unit === ' ') return 0.5;
  if (/^[A-Za-z0-9#.+/-]+$/u.test(unit)) return unit.length;
  return Array.from(unit).reduce((sum, character) => {
    const isWide = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE10-\uFE6F\uFF01-\uFF60\uFFE0-\uFFE6]/u.test(
      character
    );
    return sum + (isWide ? 2 : 1);
  }, 0);
}

function tokenizeText(text) {
  return (
    String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .match(/[A-Za-z0-9#.+/-]+| |./gu) || []
  );
}

function wrapTextDetailed(text, maxUnitsPerLine, maxLines) {
  const units = tokenizeText(text);
  const lines = [];
  let current = '';
  let currentWidth = 0;
  let consumed = 0;

  for (const unit of units) {
    const width = visualWidth(unit);
    if (unit === ' ' && !current) {
      consumed += 1;
      continue;
    }

    if (currentWidth + width <= maxUnitsPerLine) {
      current += unit;
      currentWidth += width;
      consumed += 1;
      continue;
    }

    if (current.trim()) lines.push(current.trim());
    current = unit === ' ' ? '' : unit;
    currentWidth = visualWidth(current);
    consumed += 1;
    if (lines.length === maxLines - 1) break;
  }

  if (current.trim() && lines.length < maxLines) {
    lines.push(current.trim());
  }

  return {
    lines,
    truncated: consumed < units.length
  };
}

function wrapText(text, maxUnitsPerLine, maxLines) {
  const {lines, truncated} = wrapTextDetailed(text, maxUnitsPerLine, maxLines);
  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.。…]+$/u, '')}${ELLIPSIS}`;
  }
  return lines;
}

function compactHeadline(text, maxUnits = 24) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const clauses = normalized
    .split(/[，,:：;；。！？!?]/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!clauses.length) return normalized;

  let compact = clauses[0];
  for (let index = 1; index < clauses.length; index += 1) {
    const next = `${compact}，${clauses[index]}`;
    const softLimit = Math.max(maxUnits, Math.floor(maxUnits * 1.6));
    if (visualWidth(next) > softLimit) break;
    compact = next;
  }
  return compact;
}

function fontPath() {
  return 'C\\:/Windows/Fonts/msyh.ttc';
}

function shortText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}${ELLIPSIS}`;
}

function fitTextBlock(text, variants) {
  let fallback = null;

  for (const variant of variants) {
    const result = wrapTextDetailed(text, variant.maxUnitsPerLine, variant.maxLines);
    const candidate = {
      ...variant,
      lines: result.lines,
      truncated: result.truncated
    };

    if (!fallback) fallback = candidate;
    if (!candidate.truncated) return candidate;
    fallback = candidate;
  }

  if (!fallback) {
    return {
      size: 32,
      lineGap: 10,
      lines: [],
      truncated: false
    };
  }

  const lines = [...fallback.lines];
  if (fallback.truncated && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.。…]+$/u, '')}${ELLIPSIS}`;
  }

  return {
    ...fallback,
    lines
  };
}

function buildQuickPoints(issue) {
  const points = [];
  if (issue.story.oneLineConclusion) points.push(issue.story.oneLineConclusion);
  if (issue.story.whyImportant) points.push(issue.story.whyImportant);
  for (const fact of issue.story.keyFacts || []) {
    if (fact && !points.includes(fact)) points.push(fact);
  }

  return points
    .slice(0, 3)
    .map((point) => compactHeadline(point, 30))
    .filter(Boolean);
}

function drawText({text, x, y, size, color = '7C2D12', font = fontPath()}) {
  return [
    `drawtext=fontfile='${font}'`,
    `text='${escapeText(text)}'`,
    `fontcolor=${color}`,
    `fontsize=${size}`,
    `x=${x}`,
    `y=${y}`
  ].join(':');
}

function drawLines({lines, x, y, size, color = '7C2D12', lineGap = 12, font = fontPath()}) {
  return lines.map((line, index) =>
    drawText({
      text: line,
      x,
      y: y + index * (size + lineGap),
      size,
      color,
      font
    })
  );
}

function drawWrappedText({text, x, y, size, color = '7C2D12', lineGap = 12, maxUnitsPerLine, maxLines, font = fontPath()}) {
  return drawLines({
    lines: wrapText(text, maxUnitsPerLine, maxLines),
    x,
    y,
    size,
    color,
    lineGap,
    font
  });
}

function drawAdaptiveText({text, x, y, color = '7C2D12', font = fontPath(), variants}) {
  const fitted = fitTextBlock(text, variants);
  return {
    fitted,
    filters: drawLines({
      lines: fitted.lines,
      x,
      y,
      size: fitted.size,
      color,
      lineGap: fitted.lineGap,
      font
    })
  };
}

function drawBox({x, y, w, h, color, radius = 0}) {
  if (!radius) {
    return `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill`;
  }

  return [
    `drawbox=x=${x + radius}:y=${y}:w=${w - radius * 2}:h=${h}:color=${color}:t=fill`,
    `drawbox=x=${x}:y=${y + radius}:w=${w}:h=${h - radius * 2}:color=${color}:t=fill`,
    `drawbox=x=${x + radius}:y=${y + radius}:w=${w - radius * 2}:h=${h - radius * 2}:color=${color}:t=fill`
  ].join(',');
}

function buildBaseLayers() {
  return [
    drawBox({x: CARD_X, y: CARD_Y, w: CARD_INNER_WIDTH, h: CARD_INNER_HEIGHT, color: 'FFFFFF', radius: 32}),
    drawBox({x: CARD_X, y: CARD_Y, w: CARD_INNER_WIDTH, h: 18, color: 'FF7A1A'}),
    drawBox({x: CARD_X + 40, y: CARD_Y + 54, w: 160, h: 56, color: 'FFF1E5', radius: 24})
  ];
}

function buildCoverSpec({issues}) {
  const bullets = issues.slice(0, 3).map((issue, index) => `${index + 1}. ${compactHeadline(issue.candidate.title, 20)}`);
  return {
    title: `AI 早报 | 今日 ${issues.length} 条全球 AI 动态`,
    kicker: 'AI 快报',
    summary: '模型发布、产品能力、代理进展，一次看完。',
    bullets,
    footer: '向左滑动，逐条看重点'
  };
}

function buildIssueSpec(issue, index, total) {
  return {
    index: String(index + 1).padStart(2, '0'),
    title: issue.candidate.title,
    summary: issue.story.oneLineConclusion,
    source: shortText(issue.candidate.source || 'AI Source', 18),
    tag: shortText(issue.story.recommendedVisualType || issue.candidate.newsType || 'summary', 20),
    quickPoints: buildQuickPoints(issue),
    footer: `${index + 1}/${total} · ${issue.candidate.newsType || 'ai'}`
  };
}

function buildSummarySpec() {
  return {
    title: '今天这期怎么读',
    bullets: [
      '先看模型：Mistral 3、Muse Spark',
      '再看产品：Gemini Notebooks、交互式模拟',
      '最后看 agent：Anthropic Managed Agents'
    ],
    footer: '完整解读看公众号和 B 站'
  };
}

function buildCoverFilter({issues}) {
  const spec = buildCoverSpec({issues});
  const titleBlock = drawAdaptiveText({
    text: spec.title,
    x: 110,
    y: 220,
    color: '7C2D12',
    variants: [
      {size: 72, lineGap: 18, maxUnitsPerLine: 18, maxLines: 3},
      {size: 66, lineGap: 16, maxUnitsPerLine: 20, maxLines: 3},
      {size: 60, lineGap: 14, maxUnitsPerLine: 22, maxLines: 4}
    ]
  });
  const summaryBlock = drawAdaptiveText({
    text: spec.summary,
    x: 112,
    y: 500,
    color: '9A3412',
    variants: [
      {size: 34, lineGap: 12, maxUnitsPerLine: 24, maxLines: 2},
      {size: 32, lineGap: 10, maxUnitsPerLine: 26, maxLines: 3}
    ]
  });

  const layers = [
    ...buildBaseLayers(),
    drawText({text: spec.kicker, x: 112, y: 118, size: 28, color: 'EA580C'}),
    ...titleBlock.filters,
    ...summaryBlock.filters
  ];

  spec.bullets.forEach((bullet, index) => {
    const y = 690 + index * 180;
    const bulletBlock = drawAdaptiveText({
      text: bullet,
      x: 132,
      y: y + 56,
      color: '7C2D12',
      variants: [
        {size: 40, lineGap: 10, maxUnitsPerLine: 24, maxLines: 2},
        {size: 36, lineGap: 8, maxUnitsPerLine: 26, maxLines: 3},
        {size: 34, lineGap: 8, maxUnitsPerLine: 28, maxLines: 3}
      ]
    });
    layers.push(drawBox({x: 96, y, w: 1050, h: 148, color: 'FFF7ED', radius: 28}));
    layers.push(drawText({text: `重点 ${index + 1}`, x: 132, y: y + 24, size: 24, color: 'EA580C'}));
    layers.push(...bulletBlock.filters);
  });

  layers.push(drawBox({x: 96, y: 1450, w: 1050, h: 78, color: '8F3F1E', radius: 24}));
  layers.push(drawText({text: spec.footer, x: 140, y: 1473, size: 28, color: 'FFF7ED'}));
  return layers.join(',');
}

function buildIssueFilter({issue, index, total}) {
  const spec = buildIssueSpec(issue, index, total);
  const titleBlock = drawAdaptiveText({
    text: spec.title,
    x: 104,
    y: 224,
    color: '7C2D12',
    variants: [
      {size: 68, lineGap: 18, maxUnitsPerLine: 18, maxLines: 3},
      {size: 62, lineGap: 16, maxUnitsPerLine: 20, maxLines: 4},
      {size: 56, lineGap: 14, maxUnitsPerLine: 22, maxLines: 4},
      {size: 52, lineGap: 12, maxUnitsPerLine: 24, maxLines: 5}
    ]
  });
  const summaryBlock = drawAdaptiveText({
    text: spec.summary,
    x: 108,
    y: 540,
    color: '9A3412',
    variants: [
      {size: 38, lineGap: 12, maxUnitsPerLine: 24, maxLines: 3},
      {size: 34, lineGap: 10, maxUnitsPerLine: 26, maxLines: 4},
      {size: 30, lineGap: 10, maxUnitsPerLine: 28, maxLines: 4}
    ]
  });

  const layers = [
    ...buildBaseLayers(),
    drawText({text: 'AI 早报卡片', x: 112, y: 118, size: 28, color: 'EA580C'}),
    drawText({text: `#${spec.index}`, x: 1036, y: 118, size: 28, color: 'C2410C'}),
    ...titleBlock.filters,
    ...summaryBlock.filters,
    drawBox({x: 96, y: 780, w: 1050, h: 64, color: 'FFF1E5', radius: 20}),
    drawText({text: `来源 ${spec.source}`, x: 126, y: 800, size: 26, color: 'C2410C'}),
    drawText({text: spec.tag, x: 860, y: 800, size: 24, color: 'EA580C'})
  ];

  spec.quickPoints.forEach((point, pointIndex) => {
    const y = 910 + pointIndex * 180;
    const quickPointBlock = drawAdaptiveText({
      text: point,
      x: 126,
      y: y + 60,
      color: '7C2D12',
      variants: [
        {size: 34, lineGap: 12, maxUnitsPerLine: 26, maxLines: 3},
        {size: 32, lineGap: 10, maxUnitsPerLine: 28, maxLines: 3},
        {size: 30, lineGap: 8, maxUnitsPerLine: 30, maxLines: 4}
      ]
    });

    layers.push(drawBox({x: 96, y, w: 1050, h: 160, color: pointIndex === 1 ? 'FFF9F2' : 'FFF7ED', radius: 28}));
    layers.push(drawText({text: `快要点 ${pointIndex + 1}`, x: 126, y: y + 24, size: 24, color: 'EA580C'}));
    layers.push(...quickPointBlock.filters);
  });

  layers.push(drawBox({x: 96, y: 1470, w: 1050, h: 62, color: '8F3F1E', radius: 20}));
  layers.push(drawText({text: spec.footer, x: 132, y: 1488, size: 24, color: 'FFF7ED'}));
  return layers.join(',');
}

function buildSummaryFilter() {
  const spec = buildSummarySpec();
  const titleBlock = drawAdaptiveText({
    text: spec.title,
    x: 110,
    y: 226,
    color: '7C2D12',
    variants: [
      {size: 72, lineGap: 18, maxUnitsPerLine: 18, maxLines: 2},
      {size: 64, lineGap: 16, maxUnitsPerLine: 20, maxLines: 2}
    ]
  });

  const layers = [
    ...buildBaseLayers(),
    drawText({text: 'AI 早报总结', x: 112, y: 118, size: 28, color: 'EA580C'}),
    ...titleBlock.filters
  ];

  spec.bullets.forEach((bullet, index) => {
    const y = 470 + index * 220;
    layers.push(drawBox({x: 96, y, w: 1050, h: 170, color: 'FFF7ED', radius: 28}));
    layers.push(drawText({text: `建议 ${index + 1}`, x: 128, y: y + 24, size: 24, color: 'EA580C'}));
    layers.push(...drawWrappedText({text: bullet, x: 128, y: y + 62, size: 38, color: '7C2D12', lineGap: 12, maxUnitsPerLine: 24, maxLines: 3}));
  });

  layers.push(drawBox({x: 96, y: 1450, w: 1050, h: 78, color: '8F3F1E', radius: 24}));
  layers.push(drawText({text: spec.footer, x: 136, y: 1473, size: 28, color: 'FFF7ED'}));
  return layers.join(',');
}

async function renderCard({filterGraph, outputPath}) {
  await runCommand(ffmpegPath, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `color=c=#FFF5EB:s=${CARD_WIDTH}x${CARD_HEIGHT}`,
    '-frames:v',
    '1',
    '-vf',
    filterGraph,
    outputPath
  ]);

  return readFile(outputPath);
}

export async function renderXiaohongshuCards({issues}) {
  const cardIssues = issues.slice(0, 6);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zaobao-xhs-cards-'));
  const images = [];

  images.push(
    await renderCard({
      filterGraph: buildCoverFilter({issues: cardIssues}),
      outputPath: path.join(tempDir, 'xiaohongshu-card-01.png')
    })
  );

  for (const [index, issue] of cardIssues.entries()) {
    images.push(
      await renderCard({
        filterGraph: buildIssueFilter({issue, index, total: cardIssues.length}),
        outputPath: path.join(tempDir, `xiaohongshu-card-${String(index + 2).padStart(2, '0')}.png`)
      })
    );
  }

  images.push(
    await renderCard({
      filterGraph: buildSummaryFilter(),
      outputPath: path.join(tempDir, `xiaohongshu-card-${String(images.length + 1).padStart(2, '0')}.png`)
    })
  );

  return Promise.all(images);
}

export function buildPlaceholderCardPng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9zF6wAAAAASUVORK5CYII=',
    'base64'
  );
}

export function __testables() {
  return {
    wrapText,
    wrapTextDetailed,
    compactHeadline,
    fitTextBlock,
    drawWrappedText,
    buildQuickPoints,
    buildIssueSpec,
    buildCoverSpec,
    buildSummarySpec
  };
}

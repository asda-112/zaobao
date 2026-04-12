import {createJuyaStyleCard} from '../cards/juya-style-card.js';

const CATEGORY_LABELS = {
  top: '重点',
  model: '模型发布',
  dev: '开发者动态',
  product: '产品应用',
  insight: '技术观察',
  industry: '行业动态'
};

const CATEGORY_ORDER = ['top', 'model', 'dev', 'product', 'insight', 'industry'];

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?。！？])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function classifyIssue(issue, index) {
  const tags = (issue.candidate.tags || []).map((tag) => String(tag).toLowerCase());
  if (issue.candidate.score >= 90 || index === 0) return 'top';
  if (tags.some((tag) => ['coding', 'model', 'voice', 'multimodal', 'qwen'].includes(tag))) return 'model';
  if (tags.some((tag) => ['workflow', 'agent', 'devtools', 'developer'].includes(tag))) return 'dev';
  if (tags.some((tag) => ['product', 'app', 'consumer', 'image'].includes(tag))) return 'product';
  if (tags.some((tag) => ['research', 'rag', 'insight'].includes(tag))) return 'insight';
  return 'industry';
}

function groupIssues(issues) {
  const groups = new Map();
  for (const category of CATEGORY_ORDER) {
    groups.set(category, []);
  }

  issues.forEach((issue, index) => {
    groups.get(classifyIssue(issue, index)).push({...issue, number: index + 1});
  });

  return groups;
}

function issueSummary(issue) {
  return splitSentences(issue.candidate.content)[0] || issue.candidate.content;
}

function overviewList(groups) {
  const blocks = [];
  for (const category of CATEGORY_ORDER) {
    const issues = groups.get(category);
    if (!issues?.length) continue;

    blocks.push(`### ${CATEGORY_LABELS[category]}`);
    blocks.push('');
    for (const issue of issues) {
      blocks.push(`- ${issue.candidate.title} \`#${issue.number}\``);
    }
    blocks.push('');
  }

  return blocks;
}

function bodySections(issues) {
  const sections = [];

  for (const [index, issue] of issues.entries()) {
    const number = index + 1;
    const sentences = splitSentences(issue.candidate.content);
    const quote = issueSummary(issue);
    sections.push(`## ${issue.candidate.title} #${number}`);
    sections.push('');
    sections.push(`> ${quote}`);
    sections.push('');

    if (sentences.length <= 1) {
      sections.push(issue.candidate.content);
      sections.push('');
    } else {
      for (const sentence of sentences) {
        sections.push(sentence);
        sections.push('');
      }
    }

    sections.push(`来源：${issue.candidate.source}`);
    sections.push(issue.candidate.url);
    sections.push('');
  }

  return sections;
}

function createWechatMarkdown({date, issues}) {
  const groups = groupIssues(issues);
  return [
    `# AI 早报 ${date}`,
    '',
    '## 概览',
    '',
    ...overviewList(groups),
    '---',
    '',
    ...bodySections(issues),
    '> 提示：内容由 AI 辅助整理，发布前请人工复核。',
    ''
  ].join('\n');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function overviewHtml(groups) {
  const sections = [];
  for (const category of CATEGORY_ORDER) {
    const issues = groups.get(category);
    if (!issues?.length) continue;

    const items = issues
      .map((issue) => `<li><strong>${escapeHtml(issue.candidate.title)}</strong> <code>#${issue.number}</code></li>`)
      .join('');

    sections.push(
      `<section class="overview-group"><h3>${CATEGORY_LABELS[category]}</h3><ul>${items}</ul></section>`
    );
  }

  return sections.join('');
}

function articleSectionsHtml(issues) {
  return issues
    .map((issue, index) => {
      const number = index + 1;
      const quote = escapeHtml(issueSummary(issue));
      const paragraphs = splitSentences(issue.candidate.content)
        .map((sentence) => `<p>${escapeHtml(sentence)}</p>`)
        .join('');
      return [
        `<section class="news-item" id="item-${number}">`,
        `<h2>${escapeHtml(issue.candidate.title)} <code>#${number}</code></h2>`,
        `<blockquote>${quote}</blockquote>`,
        paragraphs,
        `<p class="source-line"><strong>来源</strong> ${escapeHtml(issue.candidate.source)}</p>`,
        `<p class="source-link">${escapeHtml(issue.candidate.url)}</p>`,
        '</section>'
      ].join('');
    })
    .join('');
}

function createWechatHtml({date, issues}) {
  const groups = groupIssues(issues);
  const lead = issues[0] ? escapeHtml(issueSummary(issues[0])) : '今日 AI 资讯精选。';

  return [
    '<article class="juya-daily">',
    '<style>',
    '.juya-daily{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#fffaf4;color:#4a2b1a;line-height:1.75;padding:0 0 32px;}',
    '.hero{padding:28px 24px 16px;border-bottom:1px solid #f3ddcb;}',
    '.eyebrow{display:inline-block;padding:4px 10px;border-radius:999px;background:#fff0df;color:#d97706;font-size:12px;font-weight:700;letter-spacing:.04em;}',
    '.hero h1{margin:14px 0 8px;font-size:30px;line-height:1.35;color:#7c2d12;}',
    '.hero p{margin:0;color:#9a3412;font-size:15px;}',
    '.section{padding:20px 24px;}',
    '.section h2{margin:0 0 14px;font-size:24px;color:#7c2d12;}',
    '.overview-group{margin-bottom:16px;padding:14px 16px;border-radius:20px;background:#fff;}',
    '.overview-group h3{margin:0 0 8px;font-size:18px;color:#b45309;}',
    '.overview-group ul{margin:0;padding-left:20px;}',
    '.overview-group li{margin:6px 0;}',
    '.overview-group code,.news-item code{padding:1px 8px;border-radius:999px;background:#fff0df;color:#c2410c;font-family:monospace;}',
    '.news-item{margin:0 24px 22px;padding:20px 22px;border-radius:24px;background:#fff;box-shadow:0 18px 45px rgba(244,114,24,.08);}',
    '.news-item h2{margin:0 0 14px;font-size:24px;line-height:1.45;}',
    '.news-item blockquote{margin:0 0 16px;padding:14px 16px;border-left:4px solid #f59e0b;background:#fff7ed;border-radius:14px;color:#7c2d12;}',
    '.news-item p{margin:0 0 12px;}',
    '.source-line,.source-link{font-size:14px;color:#9a3412;}',
    '.footer-note{margin:12px 24px 0;color:#9a3412;font-size:13px;}',
    '</style>',
    '<header class="hero">',
    '<span class="eyebrow">橘鸦风格 AI 早报</span>',
    `<h1>AI 早报 ${escapeHtml(date)}</h1>`,
    `<p>${lead}</p>`,
    '</header>',
    '<section class="section">',
    '<h2>概览</h2>',
    overviewHtml(groups),
    '</section>',
    articleSectionsHtml(issues),
    '<p class="footer-note">提示：内容由 AI 辅助整理，发布前请人工复核。</p>',
    '</article>'
  ].join('');
}

function buildSrt(issues) {
  let current = 0;
  const lines = [];
  for (const [index, issue] of issues.entries()) {
    const end = current + issue.durationSeconds;
    lines.push(`${index + 1}`, `${toTimestamp(current)} --> ${toTimestamp(end)}`, `${issue.candidate.title}。${issue.candidate.content}`, '');
    current = end;
  }
  return lines.join('\n');
}

function toTimestamp(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
  return `${hours}:${minutes}:${seconds},000`;
}

function buildDouyinHook(issue) {
  const conclusion = issue.story.oneLineConclusion || issue.candidate.title;
  if (issue.candidate.newsType === 'model') {
    return `3 秒看懂：${conclusion}`;
  }
  if (issue.candidate.newsType === 'research') {
    return `研究突破来了：${conclusion}`;
  }
  if (issue.candidate.newsType === 'tooling') {
    return `开发者注意：${conclusion}`;
  }
  return `今天最值得看的一条：${conclusion}`;
}

function shortText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function createBilibiliIntroSegment({date, issues}) {
  const issueCount = issues.length;
  return {
    headline: `AI 早报 ${date}`,
    summary: `今天精选 ${issueCount} 条 AI 动态`,
    narration: `这里是 ${date} 的 AI 早报。今天我们精选了 ${issueCount} 条最值得关注的人工智能动态，重点看模型发布、产品能力和企业级代理进展。`,
    source: 'Zaobao',
    visualHint: 'opening-card'
  };
}

function createBilibiliOutroSegment() {
  return {
    headline: '以上就是今天的 AI 早报',
    summary: '继续关注模型、技术和产品更新',
    narration: '以上就是今天的 AI 早报。如果你想继续追踪模型、技术和产品更新，我们下期继续见。',
    source: 'Zaobao',
    visualHint: 'closing-card'
  };
}

function createDouyinOpeningSegment({date, issues}) {
  return {
    headline: `1 分钟看完 ${issues.length} 条 AI 动态`,
    summary: `${date} 快报，只看模型、产品能力和 agent 进展`,
    narration: `这里是 ${date} 的 AI 快报。接下来用 1 分钟带你看完 ${issues.length} 条最值得关注的人工智能动态。`,
    source: 'Zaobao',
    visualHint: 'douyin-opening-card',
    density: 'high'
  };
}

function createDouyinIssueSegment(issue, index, total) {
  return {
    headline: shortText(issue.candidate.title, 24),
    summary: shortText(issue.story.oneLineConclusion, 42),
    narration: [
      `第 ${index + 1} 条，${issue.candidate.title}。`,
      shortText(issue.story.oneLineConclusion, 60),
      issue.story.whyImportant
    ].join(''),
    source: issue.candidate.source,
    visualHint: issue.story.recommendedVisualType || issue.scriptSegment.visualHint,
    density: 'high',
    ranking: index + 1,
    totalItems: total
  };
}

function createDouyinClosingSegment({issues}) {
  return {
    headline: '完整解读看 B 站和公众号',
    summary: `今天一共 ${issues.length} 条，收藏这条快报，稍后回看`,
    narration: '以上就是今天的 AI 快报。完整解读可以看 B 站主片和公众号长文。',
    source: 'Zaobao',
    visualHint: 'douyin-closing-card',
    density: 'high'
  };
}

function createDouyinJob({date, issues, theme}) {
  const segments = [
    createDouyinOpeningSegment({date, issues}),
    ...issues.map((issue, index) => createDouyinIssueSegment(issue, index, issues.length)),
    createDouyinClosingSegment({issues})
  ];

  return {
    id: `${date}-douyin`,
    platform: 'douyin',
    outputKey: 'douyin',
    width: 1080,
    height: 1920,
    title: `AI 快报 ${date}`,
    orientation: 'portrait',
    theme,
    segments
  };
}

function createRenderJobs({date, issues, theme}) {
  return [
    {
      id: `${date}-bilibili`,
      platform: 'bilibili',
      outputKey: 'bilibili',
      width: 1920,
      height: 1080,
      title: `AI 早报 ${date}`,
      orientation: 'landscape',
      theme,
      segments: [
        createBilibiliIntroSegment({date, issues}),
        ...issues.map((issue) => issue.scriptSegment),
        createBilibiliOutroSegment()
      ]
    },
    createDouyinJob({date, issues, theme})
  ];
}

export function createDailyPackage({date, digestPlan, config}) {
  const issues = digestPlan.issues;
  const masterDigest = createWechatMarkdown({date, issues});
  const wechatMarkdown = masterDigest;
  const wechatHtml = createWechatHtml({date, issues});
  const renderJobs = createRenderJobs({date, issues, theme: config.theme});
  const card = createJuyaStyleCard({date, issues, theme: config.theme});
  const issueDocument = {
    date,
    issueCount: issues.length,
    reviewSummary: digestPlan.reviewSummary || null,
    items: issues.map((issue) => ({
      id: issue.id,
      rank: issue.rank,
      title: issue.story.title,
      oneLineConclusion: issue.story.oneLineConclusion,
      whyImportant: issue.story.whyImportant,
      keyFacts: issue.story.keyFacts,
      sources: issue.story.sources,
      recommendedVisualType: issue.story.recommendedVisualType,
      durationSeconds: issue.durationSeconds,
      sourceType: issue.candidate.sourceType,
      newsType: issue.candidate.newsType,
      score: issue.candidate.score,
      clusterId: issue.candidate.clusterId,
      reviewStatus: issue.review?.status || 'pending',
      reviewNotes: issue.review?.notes || ''
    }))
  };

  return {
    date,
    issues,
    candidatePool: digestPlan.candidatePool,
    issueDocument,
    masterDigest,
    wechatMarkdown,
    wechatHtml,
    bilibiliCoverHtml: card.html,
    bilibiliCoverPrompt: card.prompt,
    bilibiliMeta: [
      '# B站发布信息',
      '',
      `- 标题：${date} AI 早报｜3-4 分钟看完全球 AI 关键动态`,
      '- 简介：轻快资讯博主口播风格，适合晨间快速补课。',
      `- 片长：约 ${Math.round(digestPlan.totalDurationSeconds / 60)} 分钟`
    ].join('\n'),
    bilibiliSrt: buildSrt(issues),
    douyinMeta: [
      '# 抖音发布文案',
      '',
      '今日输出 1 条 60 秒左右的高密度快报，前 3 秒直接给结论。',
      '',
      '## 覆盖新闻',
      ...issues.map((issue, index) => `- 第 ${index + 1} 条：${issue.candidate.title}`),
      '',
      '## 前 3 秒钩子',
      ...issues.slice(0, 2).map((issue, index) => `- 钩子 ${index + 1}：${buildDouyinHook(issue)}`),
      '',
      '- 节奏要求：一镜一结论，整条视频约 60 秒，保持高密度连续快报。'
    ].join('\n'),
    xiaohongshuNote: [
      '# 小红书笔记',
      '',
      '今日改为图文卡片，不做视频。每张卡片只讲一条新闻，建议按顺序滑动浏览。',
      '',
      '## 标题建议',
      '',
      `- ${date} AI 早报｜${issues.length} 条全球 AI 要点速读`,
      '',
      '## 标签建议',
      '',
      '- #AI早报 #人工智能 #大模型 #科技资讯',
      '',
      '## 卡片顺序',
      ...issues.slice(0, 6).map((issue, index) => `- 第 ${index + 1} 张：${issue.candidate.title}`)
    ].join('\n'),
    reviewReport: [
      '# 审校报告',
      '',
      `- 本期条目数：${issues.length}`,
      `- 预计主片时长：${digestPlan.totalDurationSeconds} 秒`,
      `- 候选池规模：${digestPlan.candidatePool.length}`,
      `- 去重说明：${digestPlan.reviewReport}`
    ].join('\n'),
    renderJobs
  };
}

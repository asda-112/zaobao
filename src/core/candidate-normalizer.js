function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferSourceType({item, source}) {
  const text = normalizeText(`${source?.name || ''} ${(item.tags || []).join(' ')}`);
  if (source?.sourceType) return source.sourceType;
  if (source?.type === 'opencli' && includesAny(text, ['wechat', 'weixin', '公众号'])) {
    return 'wechat';
  }
  if (includesAny(text, ['openai', 'anthropic', 'google', 'deepmind', 'meta', 'mistral', 'xai', 'microsoft', 'nvidia', 'hugging face', 'cohere', '通义', '豆包', '百度', '月之暗面'])) {
    return 'official';
  }
  if (source?.type === 'rss' || includesAny(text, ['techcrunch', 'verge', 'reuters', 'venturebeat', 'ars technica', 'techmeme'])) {
    return 'media';
  }
  if (source?.type === 'browser' || source?.type === 'url') {
    return 'platform';
  }
  return 'media';
}

function inferNewsType({item}) {
  const text = normalizeText(`${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')}`);
  if (includesAny(text, ['model', '模型', 'llm', '多模态', 'multimodal', '发布'])) return 'model';
  if (includesAny(text, ['research', 'paper', '论文', 'benchmark', '突破'])) return 'research';
  if (includesAny(text, ['tool', 'agent', 'workflow', 'sdk', 'api', '开发者'])) return 'tooling';
  if (includesAny(text, ['policy', '监管', 'compliance', '法案'])) return 'policy';
  if (includesAny(text, ['product', '应用', 'feature', '功能'])) return 'product';
  if (item.newsType) return item.newsType;
  return 'industry';
}

function scoreByNewsType(newsType) {
  if (newsType === 'model') return 25;
  if (newsType === 'research') return 20;
  if (newsType === 'tooling') return 16;
  return 0;
}

function hasCrossSourceEvidence(item) {
  return Array.isArray(item.relatedSources)
    ? item.relatedSources.length >= 2
    : (item.tags || []).some((tag) => ['multi-source', 'cross-check', 'cross-source'].includes(String(tag).toLowerCase()));
}

function isSecondaryRetell(item) {
  const text = normalizeText(`${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')}`);
  return includesAny(text, ['转载', '转述', 'mirror', 'syndicated', '二手']);
}

function isMarketingHeavy(item) {
  const text = normalizeText(`${item.title || ''} ${item.content || ''}`);
  return includesAny(text, ['限时', '优惠', '促销', 'marketing', 'sponsored', '广告']);
}

function computeScore({item, sourceType, newsType, isPrimarySource}) {
  const base = Number.isFinite(item.score) ? item.score : 55;
  const sourceBonus = sourceType === 'official' || isPrimarySource ? 20 : 0;
  const crossSourceBonus = hasCrossSourceEvidence(item) ? 15 : 0;
  const secondaryPenalty = isSecondaryRetell(item) ? -15 : 0;
  const marketingPenalty = isMarketingHeavy(item) ? -10 : 0;

  return clamp(base + scoreByNewsType(newsType) + sourceBonus + crossSourceBonus + secondaryPenalty + marketingPenalty, 0, 100);
}

export function normalizeCandidate({item, source}) {
  const sourceType = inferSourceType({item, source});
  const newsType = inferNewsType({item});
  const isPrimarySource = item.isPrimarySource ?? source?.isPrimarySource ?? sourceType === 'official';
  const tier = item.tier || source?.tier || (sourceType === 'official' ? 'A' : sourceType === 'media' ? 'B' : 'C');

  return {
    id: item.id,
    title: item.title,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt || new Date().toISOString(),
    content: item.content || '',
    lang: item.lang || 'unknown',
    tags: Array.isArray(item.tags) ? item.tags : [],
    sourceType,
    newsType,
    isPrimarySource,
    tier,
    score: computeScore({item, sourceType, newsType, isPrimarySource}),
    clusterId: null
  };
}

export function normalizeCandidatesBatch({items, source}) {
  return items.map((item) => normalizeCandidate({item, source}));
}

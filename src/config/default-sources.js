const RSSHUB_BASE_URL = (process.env.RSSHUB_BASE_URL || 'http://127.0.0.1:1200').replace(/\/$/, '');
const ENABLE_X_OFFICIAL_SOURCES = /^(1|true|yes)$/i.test(process.env.ZAOBAO_ENABLE_X_OFFICIAL_SOURCES || '');

function officialRssSource(id, name, url, tags, extra = {}) {
  return {
    id,
    type: 'official-rss',
    name,
    url,
    tier: 'A',
    sourceType: 'official',
    isPrimarySource: true,
    baseScore: 70,
    tags,
    ...extra
  };
}

function mediaRssSource(id, name, url, tags, extra = {}) {
  return {
    id,
    type: 'rss',
    name,
    url,
    tier: 'B',
    sourceType: 'media',
    isPrimarySource: false,
    baseScore: 63,
    tags,
    ...extra
  };
}

function rsshubSource(id, name, rsshubPath, tags, extra = {}) {
  return {
    id,
    type: 'rsshub',
    name,
    rsshubUrl: `${RSSHUB_BASE_URL}${rsshubPath}`,
    tier: extra.tier || 'C',
    sourceType: extra.sourceType || 'platform',
    isPrimarySource: extra.isPrimarySource ?? false,
    baseScore: extra.baseScore ?? 60,
    tags,
    ...extra
  };
}

function xOfficialSource(id, name, account, tags, extra = {}) {
  return rsshubSource(id, name, `/twitter/user/${account}`, tags, {
    tier: 'A',
    sourceType: 'official',
    isPrimarySource: true,
    baseScore: 70,
    platform: 'x',
    account,
    ...extra
  });
}

function wechatSeedSource(id, name, account, tags, extra = {}) {
  return {
    id,
    type: 'opencli',
    name,
    platform: 'weixin',
    account,
    url: 'https://mp.weixin.qq.com/',
    tier: 'C',
    sourceType: 'wechat',
    isPrimarySource: false,
    baseScore: 58,
    retry: 2,
    tags,
    ...extra
  };
}

function platformOpenCliSource(id, name, platform, account, url, tags, extra = {}) {
  return {
    id,
    type: 'opencli',
    name,
    platform,
    account,
    url,
    maxPages: 2,
    retry: 2,
    tier: 'C',
    sourceType: 'platform',
    isPrimarySource: false,
    baseScore: 57,
    tags,
    ...extra
  };
}

export function buildDefaultSources({enableXOfficialSources = ENABLE_X_OFFICIAL_SOURCES} = {}) {
  const sources = [
    officialRssSource('openai-blog', 'OpenAI Blog', 'https://openai.com/news/rss.xml', ['ai', 'openai', 'model', 'research']),
    officialRssSource('anthropic-news', 'Anthropic News', 'https://www.anthropic.com/news/rss.xml', ['ai', 'anthropic', 'model', 'agent']),
    officialRssSource('google-ai-blog', 'Google AI Blog', 'https://blog.google/technology/ai/rss/', ['ai', 'google', 'research', 'product']),
    officialRssSource('huggingface-blog', 'Hugging Face Blog', 'https://huggingface.co/blog/feed.xml', ['ai', 'huggingface', 'tooling', 'open-source']),
    officialRssSource('mistral-news', 'Mistral News', 'https://mistral.ai/news/rss.xml', ['ai', 'mistral', 'model']),
    officialRssSource('cohere-blog', 'Cohere Blog', 'https://cohere.com/blog/rss.xml', ['ai', 'cohere', 'enterprise', 'model']),
    officialRssSource('nvidia-ai-blog', 'NVIDIA AI Blog', 'https://blogs.nvidia.com/blog/category/ai/feed/', ['ai', 'nvidia', 'infrastructure', 'research']),
    officialRssSource('microsoft-ai-blog', 'Microsoft AI Blog', 'https://blogs.microsoft.com/ai/feed/', ['ai', 'microsoft', 'product', 'copilot']),
    mediaRssSource('techcrunch-ai', 'TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/feed/', ['ai', 'media', 'product']),
    mediaRssSource('venturebeat-ai', 'VentureBeat AI', 'https://venturebeat.com/category/ai/feed/', ['ai', 'media', 'industry']),
    mediaRssSource('theverge-ai', 'The Verge AI', 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', ['ai', 'media', 'consumer']),
    mediaRssSource('reuters-ai', 'Reuters AI', 'https://www.reutersagency.com/feed/?best-topics=artificial-intelligence', ['ai', 'media', 'industry']),
    rsshubSource('rsshub-bilibili-juya-videos', 'RSSHub Bilibili Juya Videos', '/bilibili/user/video/946974', ['ai', 'bilibili', 'video', 'juya']),
    rsshubSource('rsshub-bilibili-juya-dynamic', 'RSSHub Bilibili Juya Dynamic', '/bilibili/user/dynamic/946974', ['ai', 'bilibili', 'dynamic', 'juya']),
    wechatSeedSource('opencli-weixin-juya', '橘鸦Juya', '橘鸦Juya', ['ai', 'wechat', 'juya', 'analysis']),
    wechatSeedSource('opencli-weixin-zhipu', '智谱AI', '智谱AI', ['ai', 'wechat', 'zhipu', 'model']),
    wechatSeedSource('opencli-weixin-tongyi', '通义千问', '通义千问', ['ai', 'wechat', 'tongyi', 'model']),
    wechatSeedSource('opencli-weixin-baidu', '百度智能云', '百度智能云', ['ai', 'wechat', 'baidu', 'model']),
    wechatSeedSource('opencli-weixin-volcengine', '火山引擎', '火山引擎', ['ai', 'wechat', 'volcengine', 'tooling']),
    wechatSeedSource('opencli-weixin-moonshot', '月之暗面', '月之暗面', ['ai', 'wechat', 'moonshot', 'model']),
    wechatSeedSource('opencli-weixin-minimax', 'MiniMax', 'MiniMax', ['ai', 'wechat', 'minimax', 'model']),
    wechatSeedSource('opencli-weixin-stepfun', '阶跃星辰', '阶跃星辰', ['ai', 'wechat', 'stepfun', 'model']),
    platformOpenCliSource('opencli-bilibili-ai', 'OpenCLI Bilibili AI', 'bilibili', 'AI', 'https://www.bilibili.com/', ['ai', 'bilibili', 'platform']),
    platformOpenCliSource('opencli-xiaohongshu-ai', 'OpenCLI Xiaohongshu AI', 'xiaohongshu', 'AI', 'https://www.xiaohongshu.com/', ['ai', 'xiaohongshu', 'platform'])
  ];

  if (enableXOfficialSources) {
    sources.unshift(
      xOfficialSource('rsshub-x-openai', 'OpenAI on X', 'OpenAI', ['ai', 'x', 'openai', 'official', 'model']),
      xOfficialSource('rsshub-x-anthropic', 'Anthropic on X', 'AnthropicAI', ['ai', 'x', 'anthropic', 'official', 'agent']),
      xOfficialSource('rsshub-x-google-deepmind', 'Google DeepMind on X', 'GoogleDeepMind', ['ai', 'x', 'google', 'deepmind', 'official', 'research']),
      xOfficialSource('rsshub-x-huggingface', 'Hugging Face on X', 'huggingface', ['ai', 'x', 'huggingface', 'official', 'open-source']),
      xOfficialSource('rsshub-x-mistral', 'Mistral AI on X', 'MistralAI', ['ai', 'x', 'mistral', 'official', 'model']),
      xOfficialSource('rsshub-x-xai', 'xAI on X', 'xai', ['ai', 'x', 'xai', 'official', 'model'])
    );
  }

  return sources;
}

export const defaultSources = buildDefaultSources();

export const defaultSources = [
  {
    id: 'sample-fixture',
    type: 'fixture',
    name: 'Sample Fixture',
    path: 'data/fixtures/sample-ai-news.json',
    tags: ['ai', 'fixture']
  },
  {
    id: 'openai-blog',
    type: 'rss',
    name: 'OpenAI Blog',
    url: 'https://openai.com/news/rss.xml',
    tags: ['ai', 'openai']
  },
  {
    id: 'anthropic-news',
    type: 'rss',
    name: 'Anthropic News',
    url: 'https://www.anthropic.com/news/rss.xml',
    tags: ['ai', 'anthropic']
  }
];

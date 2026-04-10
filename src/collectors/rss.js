import {XMLParser} from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true
});

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseRssItems({xml, source}) {
  const parsed = parser.parse(xml);
  const items = asArray(parsed?.rss?.channel?.item);

  return items.map((item, index) => ({
    id: `${source.id}-${index}`,
    title: item.title,
    source: source.name,
    url: item.link,
    publishedAt: new Date(item.pubDate).toISOString(),
    content: item.description || item['content:encoded'] || '',
    lang: source.lang || 'unknown',
    tags: source.tags || [],
    score: source.baseScore || 60
  }));
}

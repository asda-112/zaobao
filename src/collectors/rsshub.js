import {parseRssItems} from './rss.js';

export async function collectRsshubItems({source}) {
  const url = source.rsshubUrl || source.url;
  if (!url) {
    throw new Error('RSSHub source requires "rsshubUrl" or "url".');
  }

  const response = await fetch(url);
  const xml = await response.text();
  return parseRssItems({xml, source});
}

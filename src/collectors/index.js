import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {collectBrowserItem} from './browser.js';
import {collectFixtureItems} from './fixture.js';
import {parseRssItems} from './rss.js';
import {collectUrlItem} from './url.js';

async function collectRssItems({source}) {
  const response = await fetch(source.url);
  const xml = await response.text();
  return parseRssItems({xml, source});
}

export async function loadSources({cwd, sourcesPath, defaultSources}) {
  if (!sourcesPath) return defaultSources;
  const raw = await readFile(path.resolve(cwd, sourcesPath), 'utf8');
  return JSON.parse(raw);
}

export async function collectCandidates({cwd, sources}) {
  const allItems = [];

  for (const source of sources) {
    if (source.type === 'fixture') {
      allItems.push(...(await collectFixtureItems({source, cwd})));
      continue;
    }

    if (source.type === 'rss') {
      allItems.push(...(await collectRssItems({source})));
      continue;
    }

    if (source.type === 'url') {
      allItems.push(await collectUrlItem({source}));
      continue;
    }

    if (source.type === 'browser') {
      allItems.push(await collectBrowserItem({source}));
    }
  }

  return allItems;
}

export async function collectCandidatesSafely({cwd, sources}) {
  const items = [];
  const failures = [];

  for (const source of sources) {
    try {
      const collected = await collectCandidates({cwd, sources: [source]});
      items.push(...collected);
    } catch (error) {
      failures.push({
        sourceId: source.id,
        sourceName: source.name,
        message: error.message
      });
    }
  }

  return {items, failures};
}

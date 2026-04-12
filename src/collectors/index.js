import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {collectBrowserItem} from './browser.js';
import {collectFixtureItems} from './fixture.js';
import {collectOpenCliItems} from './opencli.js';
import {parseRssItems} from './rss.js';
import {collectRsshubItems} from './rsshub.js';
import {collectUrlItem} from './url.js';
import {normalizeCandidatesBatch} from '../core/candidate-normalizer.js';

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
      const items = await collectFixtureItems({source, cwd});
      allItems.push(...normalizeCandidatesBatch({items, source}));
      continue;
    }

    if (source.type === 'rss' || source.type === 'official-rss') {
      const items = await collectRssItems({source});
      allItems.push(...normalizeCandidatesBatch({items, source}));
      continue;
    }

    if (source.type === 'rsshub') {
      const items = await collectRsshubItems({source});
      allItems.push(...normalizeCandidatesBatch({items, source}));
      continue;
    }

    if (source.type === 'opencli') {
      const items = await collectOpenCliItems({source});
      allItems.push(...normalizeCandidatesBatch({items, source}));
      continue;
    }

    if (source.type === 'url') {
      const item = await collectUrlItem({source});
      allItems.push(...normalizeCandidatesBatch({items: [item], source}));
      continue;
    }

    if (source.type === 'browser') {
      const item = await collectBrowserItem({source});
      allItems.push(...normalizeCandidatesBatch({items: [item], source}));
      continue;
    }

    throw new Error(`Unsupported source type: ${source.type}`);
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

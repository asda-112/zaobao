import {readFile} from 'node:fs/promises';
import path from 'node:path';

export async function collectFixtureItems({source, cwd}) {
  const filePath = path.resolve(cwd, source.path);
  const raw = await readFile(filePath, 'utf8');
  const items = JSON.parse(raw);
  return items.map((item, index) => ({
    ...item,
    id: item.id || `${source.id}-${index}`,
    source: item.source || source.name,
    tags: item.tags?.length ? item.tags : source.tags || [],
    score: item.score ?? source.baseScore ?? 70
  }));
}

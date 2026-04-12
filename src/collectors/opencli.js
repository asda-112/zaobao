import {spawn} from 'node:child_process';

import {collectUrlItem} from './url.js';

const DEFAULT_RETRY = 2;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runOpenCli(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`OpenCLI command failed: ${stderr || `exit ${code}`}`));
    });
    child.on('error', reject);
  });
}

export function parseCommand(command) {
  const chunks = [];
  const pattern = /"([^"]*)"|'([^']*)'|[^\s]+/g;
  for (const match of String(command || '').trim().matchAll(pattern)) {
    chunks.push(match[1] || match[2] || match[0]);
  }
  return {
    executable: chunks[0],
    fixedArgs: chunks.slice(1)
  };
}

export function parseOpenCliOutput(rawOutput) {
  const text = String(rawOutput || '').trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
    return [parsed];
  } catch (error) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const items = [];
    for (const line of lines) {
      try {
        items.push(JSON.parse(line));
      } catch (innerError) {
        throw new Error('OpenCLI output must be valid JSON or JSON Lines.');
      }
    }
    return items;
  }
}

function normalizeOpenCliItem(raw, source, index) {
  return {
    id: raw.id || `${source.id}-${index}`,
    title: raw.title || source.name,
    source: raw.source || source.name,
    url: raw.url || source.url || '',
    publishedAt: raw.publishedAt || new Date().toISOString(),
    content: raw.content || raw.summary || '',
    lang: raw.lang || source.lang || 'unknown',
    tags: Array.isArray(raw.tags) ? raw.tags : source.tags || [],
    score: Number.isFinite(raw.score) ? raw.score : source.baseScore ?? 65
  };
}

export async function collectOpenCliItems({source}) {
  const command = process.env.OPENCLI_FETCH_CMD;
  const fallbackUrl = source.fallbackUrl || null;

  if (!command) {
    if (fallbackUrl) {
      return [await collectUrlItem({source: {...source, url: fallbackUrl}})];
    }
    throw new Error('OpenCLI source requires OPENCLI_FETCH_CMD or an explicit "fallbackUrl".');
  }

  const {executable, fixedArgs} = parseCommand(command);
  const retry = Number.isFinite(source.retry) ? source.retry : DEFAULT_RETRY;
  const maxPages = Number.isFinite(source.maxPages) ? Math.max(1, source.maxPages) : 1;
  const dedupe = new Set();
  const collected = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const pageArgs = [
      ...fixedArgs,
      source.platform || '',
      source.account || '',
      source.url || '',
      '--page',
      String(page)
    ].filter(Boolean);

    let output = null;
    let lastError = null;
    for (let attempt = 0; attempt <= retry; attempt += 1) {
      try {
        output = await runOpenCli(executable, pageArgs);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < retry) {
          await sleep(300 * (attempt + 1));
        }
      }
    }

    if (!output) {
      throw lastError || new Error('OpenCLI failed with empty output.');
    }

    const parsedItems = parseOpenCliOutput(output);
    if (!parsedItems.length) break;

    for (const item of parsedItems) {
      const key = `${item.url || ''}::${item.title || ''}`;
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      collected.push(item);
    }
  }

  return collected.map((item, index) => normalizeOpenCliItem(item, source, index));
}

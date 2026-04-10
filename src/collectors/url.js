function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickTitle(html, fallbackUrl) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  return titleMatch?.[1]?.trim() || fallbackUrl;
}

export async function collectUrlItem({source}) {
  const response = await fetch(source.url);
  const html = await response.text();
  return {
    id: `${source.id}-0`,
    title: pickTitle(html, source.url),
    source: source.name,
    url: source.url,
    publishedAt: new Date().toISOString(),
    content: stripHtml(html).slice(0, 900),
    lang: source.lang || 'unknown',
    tags: source.tags || [],
    score: source.baseScore ?? 62
  };
}

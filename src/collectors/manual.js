export async function collectManualItems({source}) {
  const items = Array.isArray(source.items) ? source.items : [source.item || source];

  return items
    .filter(Boolean)
    .map((item, index) => ({
      ...item,
      id: item.id || `${source.id}-${index}`,
      source: item.source || source.name,
      tags: item.tags?.length ? item.tags : source.tags || [],
      score: item.score ?? source.baseScore ?? 70
    }));
}

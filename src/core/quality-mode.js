export function assertHighQualitySources({sources}) {
  const fixtureSources = (sources || []).filter((source) => source.type === 'fixture');
  if (fixtureSources.length > 0) {
    const names = fixtureSources.map((source) => source.name || source.id).join(', ');
    throw new Error(`High-quality mode does not allow fixture sources: ${names}`);
  }
}

export function assertHighQualityCollection({collection}) {
  const failures = collection?.failures || [];
  if (failures.length > 0) {
    const summary = failures.map((failure) => `${failure.sourceName || failure.sourceId}: ${failure.message}`).join('; ');
    throw new Error(`High-quality mode does not allow source failures. 采集失败源：${summary}`);
  }

  const items = collection?.items || [];
  if (items.length === 0) {
    throw new Error('High-quality mode requires real collected items, but no candidates were produced.');
  }
}

export function ensureHighQualityRenderAllowed({skipRender}) {
  if (skipRender) {
    throw new Error('High-quality mode does not allow --skip-render because placeholder outputs are disabled.');
  }
}

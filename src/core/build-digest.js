const DEFAULTS = {
  targetDurationSeconds: 210,
  minDurationSeconds: 180,
  maxDurationSeconds: 240,
  maxIssues: 6,
  candidatePoolSize: 20
};

const SOURCE_PRIORITY = {
  official: 4,
  media: 3,
  wechat: 2,
  platform: 1
};

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFingerprint(title) {
  return normalizeTitle(title)
    .split(' ')
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}

function clusterFingerprint(candidate) {
  return normalizeTitle(candidate.title)
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .join(' ');
}

function hoursBetween(left, right) {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 36e5;
}

function buildRecentFingerprints(archiveItems, now) {
  return new Set(
    archiveItems
      .filter((item) => hoursBetween(item.publishedAt, now) <= 72)
      .map((item) => titleFingerprint(item.title))
      .filter(Boolean)
  );
}

function estimateIssueDurationSeconds(candidate) {
  const text = String(candidate.content || '').trim();
  const hanCount = (text.match(/\p{Script=Han}/gu) || []).length;
  const latinWordCount = (text.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || []).length;
  const punctuationCount = (text.match(/[,.!?;:，。！？；：]/g) || []).length;
  const speechUnits = hanCount + latinWordCount * 1.6 + punctuationCount * 0.3;
  const speechSeconds = Math.max(12, Math.ceil(speechUnits / 4.4));
  const bridgeSeconds = 8;
  const newsTypeBonus =
    candidate.newsType === 'model' || candidate.newsType === 'research'
      ? 3
      : candidate.newsType === 'tooling'
        ? 2
        : 1;
  const scoreBonus = candidate.score >= 90 ? 2 : candidate.score >= 84 ? 1 : 0;
  return Math.min(42, speechSeconds + bridgeSeconds + newsTypeBonus + scoreBonus);
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?。！？])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstSentence(text) {
  return splitSentences(text)[0] || String(text || '').trim();
}

function ensureSentence(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  return /[。！？.!?]$/u.test(trimmed) ? trimmed : `${trimmed}。`;
}

function whyImportant(candidate) {
  if (candidate.newsType === 'model') return '模型能力变化会直接影响开发与产品路线。';
  if (candidate.newsType === 'research') return '研究突破通常会在后续 1-2 个季度传导到产品能力。';
  if (candidate.newsType === 'tooling') return '工具链更新会改变团队效率与 agent 工作流上限。';
  return '该动态对行业节奏和落地策略有直接参考价值。';
}

function recommendedVisualType(candidate) {
  if (candidate.newsType === 'model') return 'title-card+benchmark';
  if (candidate.newsType === 'research') return 'paper-snapshot';
  if (candidate.newsType === 'tooling') return 'workflow-diagram';
  return 'summary-card';
}

function makeIssue(candidate, index) {
  const durationSeconds = estimateIssueDurationSeconds(candidate);
  const facts = splitSentences(candidate.content).slice(0, 2);
  const oneLineConclusion = firstSentence(candidate.content);
  const important = whyImportant(candidate);
  const supportingFact = facts.find((fact) => fact !== oneLineConclusion) || facts[0] || '';
  const narration = [
    ensureSentence(candidate.title),
    ensureSentence(oneLineConclusion),
    ensureSentence(important),
    ensureSentence(supportingFact)
  ]
    .filter(Boolean)
    .filter((line, index, array) => array.indexOf(line) === index)
    .join('');

  return {
    id: `issue-${index + 1}`,
    rank: index + 1,
    durationSeconds,
    candidate,
    story: {
      title: candidate.title,
      oneLineConclusion,
      whyImportant: important,
      keyFacts: facts.length ? facts : [String(candidate.content || '').trim()],
      sources: [{name: candidate.source, url: candidate.url}],
      recommendedVisualType: recommendedVisualType(candidate)
    },
    scriptSegment: {
      headline: candidate.title,
      summary: oneLineConclusion,
      narration,
      source: candidate.source,
      visualHint: recommendedVisualType(candidate)
    }
  };
}

function preferCandidate(left, right) {
  const leftPrimary = left.isPrimarySource ? 1 : 0;
  const rightPrimary = right.isPrimarySource ? 1 : 0;
  if (leftPrimary !== rightPrimary) return rightPrimary - leftPrimary;
  const leftPriority = SOURCE_PRIORITY[left.sourceType] || 0;
  const rightPriority = SOURCE_PRIORITY[right.sourceType] || 0;
  if (leftPriority !== rightPriority) return rightPriority - leftPriority;
  if (left.score !== right.score) return right.score - left.score;
  return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
}

function buildClusteredCandidates({candidates, recentFingerprints}) {
  const clusters = new Map();
  let staleRemovedCount = 0;

  const sorted = [...candidates].sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  );

  for (const candidate of sorted) {
    const fingerprint = titleFingerprint(candidate.title);
    if (!fingerprint || recentFingerprints.has(fingerprint)) {
      staleRemovedCount += 1;
      continue;
    }

    const clusterKey = clusterFingerprint(candidate) || fingerprint;
    const current = clusters.get(clusterKey) || [];
    clusters.set(clusterKey, [...current, candidate]);
  }

  const selected = Array.from(clusters.entries()).map(([clusterId, entries]) => {
    const [chosen] = [...entries].sort(preferCandidate);
    return {
      ...chosen,
      clusterId
    };
  });
  const duplicateRemovedCount = Array.from(clusters.values()).reduce(
    (sum, entries) => sum + Math.max(0, entries.length - 1),
    0
  );

  return {
    selected: selected.sort((left, right) => right.score - left.score),
    clusters,
    removedCount: staleRemovedCount + duplicateRemovedCount
  };
}

function pruneToDuration(issues, config) {
  const introSeconds = 20;
  const outroSeconds = 5;
  let selected = [...issues];

  const totalFor = (list) =>
    introSeconds + outroSeconds + list.reduce((sum, issue) => sum + issue.durationSeconds, 0);

  while (selected.length > 1 && totalFor(selected) > config.maxDurationSeconds) {
    selected.pop();
  }

  return {
    selected,
    totalDurationSeconds: totalFor(selected)
  };
}

export function buildDigestPlan({candidates, archiveItems = [], now = new Date(), config = {}}) {
  const mergedConfig = {...DEFAULTS, ...config};
  const recentFingerprints = buildRecentFingerprints(archiveItems, now);
  const {selected: clusteredCandidates, clusters, removedCount} = buildClusteredCandidates({
    candidates,
    recentFingerprints
  });

  const candidatePool = clusteredCandidates.slice(0, mergedConfig.candidatePoolSize);
  const uniqueCandidates = candidatePool.slice(0, mergedConfig.maxIssues);

  const provisionalIssues = uniqueCandidates.map(makeIssue);
  const {selected: plannedIssues, totalDurationSeconds} = pruneToDuration(provisionalIssues, mergedConfig);

  return {
    config: mergedConfig,
    totalDurationSeconds,
    candidatePool,
    issues: plannedIssues,
    reviewReport: `Removed ${removedCount} duplicate or stale candidate(s), clustered into ${clusters.size} event(s), selected ${plannedIssues.length} issue(s).`,
    clusters: Array.from(clusters.entries()).map(([clusterId, entries]) => ({
      id: clusterId,
      candidateIds: entries.map((item) => item.id),
      topic: entries[0]?.title || ''
    }))
  };
}

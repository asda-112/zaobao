const DEFAULTS = {
  targetDurationSeconds: 210,
  minDurationSeconds: 180,
  maxDurationSeconds: 240,
  maxIssues: 8
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
  const wordCount = String(candidate.content || '').split(/\s+/).filter(Boolean).length;
  const base = 47;
  const contentBonus = Math.min(18, Math.max(6, Math.round(wordCount / 12)));
  const scoreBonus = candidate.score >= 88 ? 3 : 0;
  return base + contentBonus + scoreBonus;
}

function makeIssue(candidate, index) {
  const durationSeconds = estimateIssueDurationSeconds(candidate);
  return {
    id: `issue-${index + 1}`,
    rank: index + 1,
    durationSeconds,
    candidate,
    scriptSegment: {
      headline: candidate.title,
      summary: candidate.content,
      narration: candidate.content,
      source: candidate.source,
      visualHint: candidate.tags?.[0] || 'ai-news-card'
    }
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
  const seenFingerprints = new Set();
  let removedCount = 0;

  const uniqueCandidates = [...candidates]
    .sort((left, right) => right.score - left.score)
    .filter((candidate) => {
      const fingerprint = titleFingerprint(candidate.title);
      const duplicate =
        !fingerprint ||
        recentFingerprints.has(fingerprint) ||
        seenFingerprints.has(fingerprint);

      if (duplicate) {
        removedCount += 1;
        return false;
      }

      seenFingerprints.add(fingerprint);
      return true;
    })
    .slice(0, mergedConfig.maxIssues);

  const provisionalIssues = uniqueCandidates.map(makeIssue);
  const {selected, totalDurationSeconds} = pruneToDuration(provisionalIssues, mergedConfig);

  return {
    config: mergedConfig,
    totalDurationSeconds,
    issues: selected,
    reviewReport: `Removed ${removedCount} duplicate or stale candidate(s) before selecting ${selected.length} issue(s).`,
    clusters: selected.map((issue) => ({
      id: `cluster-${issue.rank}`,
      candidateIds: [issue.candidate.id],
      topic: issue.candidate.title
    }))
  };
}

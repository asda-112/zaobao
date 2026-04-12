import {readFile} from 'node:fs/promises';
import path from 'node:path';

function mapReviewsById(reviewData) {
  const items = Array.isArray(reviewData?.issues) ? reviewData.issues : [];
  const mapped = new Map();

  for (const item of items) {
    if (!item?.id) continue;
    mapped.set(item.id, item);
  }

  return mapped;
}

function applyOverride(issue, override = {}) {
  const nextStory = {
    ...issue.story,
    title: override.title || issue.story.title,
    oneLineConclusion: override.oneLineConclusion || issue.story.oneLineConclusion,
    whyImportant: override.whyImportant || issue.story.whyImportant,
    keyFacts: Array.isArray(override.keyFacts) && override.keyFacts.length ? override.keyFacts : issue.story.keyFacts
  };

  return {
    ...issue,
    candidate: {
      ...issue.candidate,
      title: nextStory.title,
      content: nextStory.oneLineConclusion
    },
    story: nextStory,
    scriptSegment: {
      ...issue.scriptSegment,
      headline: nextStory.title,
      summary: nextStory.oneLineConclusion,
      narration: nextStory.oneLineConclusion
    }
  };
}

export function applyReviewToIssues({issues, reviewData}) {
  const reviewById = mapReviewsById(reviewData);
  const reviewedIssues = [];
  let approved = 0;
  let rejected = 0;
  let edited = 0;
  let pending = 0;

  for (const issue of issues) {
    const review = reviewById.get(issue.id);
    if (!review) {
      reviewedIssues.push({...issue, review: {status: 'pending', notes: ''}});
      pending += 1;
      continue;
    }

    const status = review.status || 'pending';
    if (status === 'rejected') {
      rejected += 1;
      continue;
    }

    if (status === 'edited') {
      edited += 1;
      reviewedIssues.push({...applyOverride(issue, review.override), review: {status, notes: review.notes || ''}});
      continue;
    }

    approved += 1;
    reviewedIssues.push({...issue, review: {status: 'approved', notes: review.notes || ''}});
  }

  const effectiveIssues = reviewedIssues.length ? reviewedIssues : issues;
  return {
    issues: effectiveIssues,
    summary: {
      approved,
      rejected,
      edited,
      pending,
      total: issues.length,
      effectiveCount: effectiveIssues.length
    }
  };
}

export async function loadReviewData({cwd, reviewPath}) {
  if (!reviewPath) return null;
  const raw = await readFile(path.resolve(cwd, reviewPath), 'utf8');
  return JSON.parse(raw);
}

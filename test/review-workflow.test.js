import test from 'node:test';
import assert from 'node:assert/strict';

import {applyReviewToIssues} from '../src/core/review-workflow.js';

test('applyReviewToIssues handles approved, edited and rejected statuses', () => {
  const issues = [
    {
      id: 'issue-1',
      story: {title: 'A', oneLineConclusion: 'A1', whyImportant: 'A2', keyFacts: ['A3']},
      candidate: {title: 'A', content: 'A1'},
      scriptSegment: {headline: 'A', summary: 'A1', narration: 'A1'}
    },
    {
      id: 'issue-2',
      story: {title: 'B', oneLineConclusion: 'B1', whyImportant: 'B2', keyFacts: ['B3']},
      candidate: {title: 'B', content: 'B1'},
      scriptSegment: {headline: 'B', summary: 'B1', narration: 'B1'}
    },
    {
      id: 'issue-3',
      story: {title: 'C', oneLineConclusion: 'C1', whyImportant: 'C2', keyFacts: ['C3']},
      candidate: {title: 'C', content: 'C1'},
      scriptSegment: {headline: 'C', summary: 'C1', narration: 'C1'}
    }
  ];

  const reviewData = {
    issues: [
      {id: 'issue-1', status: 'approved'},
      {
        id: 'issue-2',
        status: 'edited',
        override: {
          title: 'B-edit',
          oneLineConclusion: 'B1-edit'
        }
      },
      {id: 'issue-3', status: 'rejected'}
    ]
  };

  const result = applyReviewToIssues({issues, reviewData});
  assert.equal(result.issues.length, 2);
  assert.equal(result.issues[1].story.title, 'B-edit');
  assert.equal(result.summary.approved, 1);
  assert.equal(result.summary.edited, 1);
  assert.equal(result.summary.rejected, 1);
});

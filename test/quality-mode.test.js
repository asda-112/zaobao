import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertHighQualityCollection,
  assertHighQualitySources,
  ensureHighQualityRenderAllowed
} from '../src/core/quality-mode.js';

test('assertHighQualitySources rejects fixture sources by default', () => {
  assert.throws(
    () =>
      assertHighQualitySources({
        sources: [{id: 'sample-fixture', type: 'fixture', name: 'Sample Fixture'}]
      }),
    /fixture/i
  );
});

test('assertHighQualityCollection rejects partial source failures', () => {
  assert.throws(
    () =>
      assertHighQualityCollection({
        collection: {
          items: [{id: 'a'}],
          failures: [{sourceId: 'broken', sourceName: 'Broken Feed', message: 'network failed'}]
        }
      }),
    /采集失败源|source failures/i
  );
});

test('ensureHighQualityRenderAllowed rejects skip-render in strict mode', () => {
  assert.throws(
    () => ensureHighQualityRenderAllowed({skipRender: true}),
    /skip-render/i
  );
});

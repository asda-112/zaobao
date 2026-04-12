import test from 'node:test';
import assert from 'node:assert/strict';

import {collectOpenCliItems, parseCommand, parseOpenCliOutput} from '../src/collectors/opencli.js';
import {defaultSources} from '../src/config/default-sources.js';

test('parseCommand splits executable and fixed args', () => {
  const parsed = parseCommand('opencli fetch --json');
  assert.equal(parsed.executable, 'opencli');
  assert.deepEqual(parsed.fixedArgs, ['fetch', '--json']);
});

test('parseCommand keeps quoted Windows executable paths intact', () => {
  const parsed = parseCommand('"C:\\Program Files\\OpenCLI\\opencli.cmd" fetch --json');
  assert.equal(parsed.executable, 'C:\\Program Files\\OpenCLI\\opencli.cmd');
  assert.deepEqual(parsed.fixedArgs, ['fetch', '--json']);
});

test('parseOpenCliOutput supports object, array and json lines', () => {
  const fromObject = parseOpenCliOutput('{"items":[{"title":"A"}]}');
  assert.equal(fromObject.length, 1);

  const fromArray = parseOpenCliOutput('[{"title":"A"},{"title":"B"}]');
  assert.equal(fromArray.length, 2);

  const fromLines = parseOpenCliOutput('{"title":"A"}\n{"title":"B"}');
  assert.equal(fromLines.length, 2);
});

test('collectOpenCliItems fails cleanly when command is missing and no explicit fallback is configured', async () => {
  const previous = process.env.OPENCLI_FETCH_CMD;
  delete process.env.OPENCLI_FETCH_CMD;

  await assert.rejects(
    () =>
      collectOpenCliItems({
        source: {
          id: 'opencli-weixin-juya',
          type: 'opencli',
          name: 'OpenCLI Weixin Juya',
          platform: 'weixin',
          url: 'https://mp.weixin.qq.com/'
        }
      }),
    /OPENCLI_FETCH_CMD/
  );

  if (previous) {
    process.env.OPENCLI_FETCH_CMD = previous;
  }
});

test('default rsshub sources do not point to the public demo instance', () => {
  const rsshubSources = defaultSources.filter((source) => source.type === 'rsshub');
  assert.ok(rsshubSources.length > 0);
  for (const source of rsshubSources) {
    assert.doesNotMatch(source.rsshubUrl || source.url || '', /rsshub\.app/);
  }
});

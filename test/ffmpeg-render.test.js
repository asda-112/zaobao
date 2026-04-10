import test from 'node:test';
import assert from 'node:assert/strict';

import {createSlideSpec} from '../src/render/ffmpeg-renderer.js';

test('createSlideSpec builds warm light slide metadata for both orientations', () => {
  const landscape = createSlideSpec({
    job: {platform: 'bilibili', width: 1920, height: 1080, orientation: 'landscape'},
    segment: {
      headline: 'OpenAI updates voice mode',
      summary: 'Lower latency and a lighter creator-like delivery.',
      source: 'Example RSS'
    },
    index: 0
  });

  const portrait = createSlideSpec({
    job: {platform: 'douyin', width: 1080, height: 1920, orientation: 'portrait'},
    segment: {
      headline: 'Qwen refreshes multimodal reasoning',
      summary: 'Better video understanding and grounded image reasoning.',
      source: 'Example RSS'
    },
    index: 1
  });

  assert.equal(landscape.resolution, '1920x1080');
  assert.equal(portrait.resolution, '1080x1920');
  assert.equal(landscape.backgroundColor, 'FFF7ED');
  assert.match(portrait.filterGraph, /暖橘|AI 早报|Example RSS/);
});

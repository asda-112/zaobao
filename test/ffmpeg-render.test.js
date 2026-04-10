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

test('createSlideSpec wraps long Chinese text into multiple lines to avoid overflow', () => {
  const portrait = createSlideSpec({
    job: {platform: 'douyin', width: 1080, height: 1920, orientation: 'portrait'},
    segment: {
      headline: 'OpenAI正在准备面向受信任伙伴的网络安全产品并计划通过受限计划发布',
      summary: 'Axios披露OpenAI正在为少数合作方准备一款更强的网络安全产品，这说明前沿模型在攻防两端的能力已经强到需要以身份和用途为前提分发。',
      source: 'Axios / OpenAI'
    },
    index: 0
  });

  assert.match(portrait.filterGraph, /\\n/);
});

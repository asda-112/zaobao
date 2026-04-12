import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveEdgeTtsExecutable,
  resolveWindowsPowerShellExecutable
} from '../src/audio/runtime-paths.js';

test('resolveEdgeTtsExecutable prefers explicit env override', () => {
  const resolved = resolveEdgeTtsExecutable({
    env: {
      ZAOBAO_EDGE_TTS_BIN: 'D:\\tools\\edge-tts.exe',
      PATH: ''
    },
    fileExists: (candidate) => candidate === 'D:\\tools\\edge-tts.exe'
  });

  assert.equal(resolved, 'D:\\tools\\edge-tts.exe');
});

test('resolveEdgeTtsExecutable finds edge-tts in LocalAppData Python Scripts', () => {
  const resolved = resolveEdgeTtsExecutable({
    env: {
      LOCALAPPDATA: 'C:\\Users\\wenpengw\\AppData\\Local',
      PATH: ''
    },
    fileExists: (candidate) =>
      candidate === 'C:\\Users\\wenpengw\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\edge-tts.exe'
  });

  assert.equal(
    resolved,
    'C:\\Users\\wenpengw\\AppData\\Local\\Programs\\Python\\Python310\\Scripts\\edge-tts.exe'
  );
});

test('resolveWindowsPowerShellExecutable returns the classic Windows PowerShell path', () => {
  const resolved = resolveWindowsPowerShellExecutable({
    env: {
      SystemRoot: 'C:\\Windows'
    },
    fileExists: (candidate) => candidate === 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
  });

  assert.equal(resolved, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
});

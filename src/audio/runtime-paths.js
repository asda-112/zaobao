import path from 'node:path';
import {existsSync} from 'node:fs';

function splitPathEntries(pathValue) {
  return String(pathValue || '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findFirstExisting(candidates, fileExists) {
  return unique(candidates).find((candidate) => fileExists(candidate)) || null;
}

export function resolveEdgeTtsExecutable({env = process.env, fileExists = existsSync} = {}) {
  const pathEntries = splitPathEntries(env.PATH);
  const localAppData = env.LOCALAPPDATA || path.join(env.USERPROFILE || '', 'AppData', 'Local');
  const pythonVersions = ['Python313', 'Python312', 'Python311', 'Python310', 'Python39'];

  const candidates = [
    env.ZAOBAO_EDGE_TTS_BIN,
    ...pathEntries.flatMap((entry) => [path.join(entry, 'edge-tts.exe'), path.join(entry, 'edge-tts.cmd')]),
    ...pythonVersions.map((version) => path.join(localAppData, 'Programs', 'Python', version, 'Scripts', 'edge-tts.exe'))
  ];

  return findFirstExisting(candidates, fileExists);
}

export function resolveWindowsPowerShellExecutable({env = process.env, fileExists = existsSync} = {}) {
  const systemRoot = env.SystemRoot || 'C:\\Windows';
  const candidates = [
    env.ZAOBAO_POWERSHELL_BIN,
    path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    path.join(systemRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  ];

  return findFirstExisting(candidates, fileExists);
}

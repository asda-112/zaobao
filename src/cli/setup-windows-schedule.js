#!/usr/bin/env node
import {spawn} from 'node:child_process';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    taskName: 'ZaobaoDailyDigestV2',
    time: '07:30',
    output: 'output',
    sources: '',
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--task-name') args.taskName = argv[index + 1];
    if (arg === '--time') args.time = argv[index + 1];
    if (arg === '--output') args.output = argv[index + 1];
    if (arg === '--sources') args.sources = argv[index + 1];
    if (arg === '--dry-run') args.dryRun = true;
  }

  return args;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({stdout, stderr});
        return;
      }
      reject(new Error(stderr || stdout || `Command failed with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();
  const buildScript = path.join(projectRoot, 'src', 'cli', 'build-digest.js');
  const outputArg = `--output \"${path.resolve(projectRoot, args.output)}\"`;
  const sourceArg = args.sources ? ` --sources \"${path.resolve(projectRoot, args.sources)}\"` : '';
  const taskRun = `node \"${buildScript}\" ${outputArg}${sourceArg}`;

  const schtasksArgs = [
    '/Create',
    '/F',
    '/SC',
    'DAILY',
    '/TN',
    args.taskName,
    '/TR',
    taskRun,
    '/ST',
    args.time
  ];

  if (args.dryRun) {
    console.log(['schtasks', ...schtasksArgs].join(' '));
    return;
  }

  await run('schtasks', schtasksArgs);
  console.log(`Scheduled task created: ${args.taskName} at ${args.time}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

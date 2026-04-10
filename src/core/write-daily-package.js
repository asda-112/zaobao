import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

async function ensureFile(filePath, content) {
  await writeFile(filePath, content);
}

export async function writeDailyPackage({outputDir, dailyPackage}) {
  const baseDir = path.join(outputDir, dailyPackage.date);
  await mkdir(baseDir, {recursive: true});

  const textOutputs = new Map([
    ['master-digest.md', dailyPackage.masterDigest],
    ['wechat.md', dailyPackage.wechatMarkdown],
    ['wechat.html', dailyPackage.wechatHtml],
    ['bilibili-cover.html', dailyPackage.bilibiliCoverHtml],
    ['bilibili-cover-prompt.md', dailyPackage.bilibiliCoverPrompt],
    ['bilibili-meta.md', dailyPackage.bilibiliMeta],
    ['bilibili.srt', dailyPackage.bilibiliSrt],
    ['douyin-meta.md', dailyPackage.douyinMeta],
    ['xiaohongshu-note.md', dailyPackage.xiaohongshuNote],
    ['review-report.md', dailyPackage.reviewReport]
  ]);

  for (const [name, content] of textOutputs.entries()) {
    await ensureFile(path.join(baseDir, name), content);
  }

  await ensureFile(path.join(baseDir, 'bilibili-video.mp4'), dailyPackage.videoOutputs.bilibili);
  await ensureFile(path.join(baseDir, 'douyin-video.mp4'), dailyPackage.videoOutputs.douyin);
  await ensureFile(path.join(baseDir, 'xiaohongshu-video.mp4'), dailyPackage.videoOutputs.xiaohongshu);

  return baseDir;
}

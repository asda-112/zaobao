import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

async function ensureFile(filePath, content) {
  await writeFile(filePath, content);
}

export async function writeDailyPackage({outputDir, dailyPackage}) {
  const baseDir = path.join(outputDir, dailyPackage.date);
  await mkdir(baseDir, {recursive: true});

  const textOutputs = new Map([
    ['candidates.json', JSON.stringify(dailyPackage.candidatePool || [], null, 2)],
    ['issue.json', JSON.stringify(dailyPackage.issueDocument || {}, null, 2)],
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

  const douyinClips = dailyPackage.videoOutputs.douyinClips || [];
  if (douyinClips.length) {
    await ensureFile(path.join(baseDir, 'douyin-video.mp4'), douyinClips[0]);
    for (const [index, clip] of douyinClips.entries()) {
      const clipName = `douyin-video-${String(index + 1).padStart(2, '0')}.mp4`;
      await ensureFile(path.join(baseDir, clipName), clip);
    }
  } else if (dailyPackage.videoOutputs.douyin) {
    await ensureFile(path.join(baseDir, 'douyin-video.mp4'), dailyPackage.videoOutputs.douyin);
  }

  const xiaohongshuCardImages = dailyPackage.xiaohongshuCardImages || [];
  for (const [index, image] of xiaohongshuCardImages.entries()) {
    const fileName = `xiaohongshu-card-${String(index + 1).padStart(2, '0')}.png`;
    await ensureFile(path.join(baseDir, fileName), image);
  }

  return baseDir;
}

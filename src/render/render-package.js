import {renderPackageVideosWithFfmpeg} from './ffmpeg-renderer.js';
import {renderPackageVideosWithRemotion} from './remotion-renderer.js';

export async function renderPackageVideos({cwd, dailyPackage}) {
  const engine = process.env.ZAOBAO_RENDER_ENGINE || 'ffmpeg';
  if (engine === 'remotion') {
    return renderPackageVideosWithRemotion({cwd, dailyPackage});
  }

  return renderPackageVideosWithFfmpeg({dailyPackage});
}

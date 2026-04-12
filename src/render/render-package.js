import {renderPackageVideosWithRemotion} from './remotion-renderer.js';

export async function renderPackageVideos({cwd, dailyPackage}) {
  const engine = process.env.ZAOBAO_RENDER_ENGINE || 'remotion';
  if (engine !== 'remotion') {
    throw new Error(`High-quality mode only supports Remotion rendering. Received: ${engine}`);
  }

  return renderPackageVideosWithRemotion({cwd, dailyPackage});
}

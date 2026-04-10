import React from 'react';
import {Composition} from 'remotion';

import {DigestVideo} from './DigestVideo.jsx';

export const RemotionRoot = () => {
  return (
    <Composition
      id="digest-video"
      component={DigestVideo}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={30}
      defaultProps={{
        job: {
          width: 1920,
          height: 1080,
          orientation: 'landscape',
          segments: []
        },
        timeline: {
          captions: []
        }
      }}
      calculateMetadata={({props, defaultProps}) => {
        const totalDurationSeconds =
          props.timeline?.totalDurationSeconds || defaultProps.timeline?.totalDurationSeconds || 1;
        return {
          durationInFrames: Math.max(30, Math.ceil(totalDurationSeconds * 30)),
          width: props.job?.width || defaultProps.job.width,
          height: props.job?.height || defaultProps.job.height,
          fps: 30
        };
      }}
    />
  );
};

export default RemotionRoot;

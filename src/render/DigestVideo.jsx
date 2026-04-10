import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

function captionForFrame(captions, frame, fps) {
  const currentMs = (frame / fps) * 1000;
  return captions.find((caption) => currentMs >= caption.startMs && currentMs < caption.endMs) || null;
}

function segmentForFrame(segments, frame, fps) {
  const second = frame / fps;
  let cursor = 0;
  for (const segment of segments) {
    const end = cursor + segment.durationSeconds;
    if (second >= cursor && second < end) {
      return segment;
    }
    cursor = end;
  }
  return segments[segments.length - 1] || null;
}

export const DigestVideo = ({job, timeline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const activeSegment = segmentForFrame(job.segments, frame, fps);
  const caption = captionForFrame(timeline.captions, frame, fps);
  const enter = spring({frame, fps, config: {damping: 14}});
  const y = interpolate(enter, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#FFF7ED',
        color: '#7C2D12',
        fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif'
      }}
    >
      <AbsoluteFill
        style={{
          padding: job.orientation === 'landscape' ? 96 : 64,
          justifyContent: 'space-between'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            transform: `translateY(${y}px)`
          }}
        >
          <div style={{fontSize: job.orientation === 'landscape' ? 32 : 26, color: '#EA580C'}}>AI 早报</div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 32,
              padding: job.orientation === 'landscape' ? 48 : 36,
              boxShadow: '0 30px 80px rgba(234,88,12,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            <div style={{fontSize: job.orientation === 'landscape' ? 54 : 42, fontWeight: 700, lineHeight: 1.2}}>
              {activeSegment?.headline}
            </div>
            <div style={{fontSize: job.orientation === 'landscape' ? 28 : 24, lineHeight: 1.55, color: '#9A3412'}}>
              {activeSegment?.summary}
            </div>
          </div>
        </div>

        <div
          style={{
            alignSelf: 'stretch',
            backgroundColor: 'rgba(124,45,18,0.92)',
            color: '#FFF7ED',
            borderRadius: 24,
            padding: job.orientation === 'landscape' ? '24px 28px' : '22px 24px',
            fontSize: job.orientation === 'landscape' ? 30 : 28,
            lineHeight: 1.45,
            minHeight: job.orientation === 'landscape' ? 120 : 168
          }}
        >
          {caption?.text || activeSegment?.summary}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

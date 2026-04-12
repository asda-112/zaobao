import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

function captionForFrame(captions, frame, fps) {
  const currentMs = (frame / fps) * 1000;
  return captions.find((caption) => currentMs >= caption.startMs && currentMs < caption.endMs) || null;
}

function getSegmentPlaybackState(segments, frame, fps) {
  let cursorSeconds = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const startSeconds = cursorSeconds;
    const endSeconds = startSeconds + segment.durationSeconds;
    const currentSeconds = frame / fps;

    if (currentSeconds >= startSeconds && currentSeconds < endSeconds) {
      const localFrame = frame - Math.floor(startSeconds * fps);
      const durationInFrames = Math.max(1, Math.round(segment.durationSeconds * fps));
      return {
        segment,
        index,
        startSeconds,
        endSeconds,
        localFrame,
        durationInFrames,
        progress: durationInFrames <= 1 ? 1 : localFrame / durationInFrames
      };
    }

    cursorSeconds = endSeconds;
  }

  const lastSegment = segments[segments.length - 1] || null;
  return {
    segment: lastSegment,
    index: Math.max(segments.length - 1, 0),
    startSeconds: cursorSeconds,
    endSeconds: cursorSeconds,
    localFrame: 0,
    durationInFrames: Math.max(1, Math.round((lastSegment?.durationSeconds || 1) * fps)),
    progress: 1
  };
}

function formatSource(source) {
  return String(source || '').trim() || 'Source';
}

function shortText(text, maxLength) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function extractNarrationPoints(segment, maxItems = 3) {
  const sentences = String(segment?.narration || '')
    .split(/(?<=[.!?。！？])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const filtered = sentences.filter((line) => line !== segment?.headline && line !== `${segment?.headline}。`);
  return filtered.slice(0, maxItems).map((line) => shortText(line, 54));
}

function fitHeadline(text, orientation) {
  const value = String(text || '').trim();
  const length = Array.from(value).length;
  if (orientation === 'portrait') {
    if (length <= 18) return 76;
    if (length <= 28) return 66;
    return 58;
  }
  if (length <= 20) return 72;
  if (length <= 34) return 60;
  return 52;
}

function buildThemeBackground(progress, orientation) {
  const offset = interpolate(progress, [0, 1], [-60, 60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at 15% 18%, rgba(249,168,212,0.24), transparent 28%), radial-gradient(circle at 82% 12%, rgba(251,146,60,0.22), transparent 24%), radial-gradient(circle at 70% 82%, rgba(253,230,138,0.26), transparent 24%)',
    transform: `translateX(${orientation === 'portrait' ? offset * 0.8 : offset}px)`,
    opacity: 0.95
  };
}

function buildMotion(playback, fps) {
  const revealFrames = Math.max(10, Math.round(fps * 0.42));
  const exitFrames = Math.max(10, Math.round(fps * 0.28));
  const enterProgress = spring({
    frame: Math.min(playback.localFrame, revealFrames),
    fps,
    config: {damping: 18, stiffness: 120}
  });
  const exitProgress = interpolate(
    playback.localFrame,
    [Math.max(playback.durationInFrames - exitFrames, 0), playback.durationInFrames],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  return {
    enterProgress,
    exitProgress,
    cardOpacity: interpolate(enterProgress - exitProgress * 0.88, [0, 1], [0.28, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }),
    cardTranslateY:
      interpolate(enterProgress, [0, 1], [32, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      }) +
      interpolate(exitProgress, [0, 1], [0, -18], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      }),
    cardScale: interpolate(enterProgress, [0, 1], [0.975, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }),
    captionOpacity: interpolate(enterProgress, [0, 1], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }),
    progressWidth: interpolate(playback.progress, [0, 1], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    })
  };
}

function LandscapeScene({job, playback, activeSegment, caption, motion}) {
  const isOpening = activeSegment?.visualHint === 'opening-card';
  const isClosing = activeSegment?.visualHint === 'closing-card';
  const headlineSize = fitHeadline(activeSegment?.headline, 'landscape');
  const summary = shortText(activeSegment?.summary, 120);
  const subtitle = shortText(caption?.text || activeSegment?.summary, 110);
  const points = extractNarrationPoints(activeSegment, 3);
  const kicker = isOpening
    ? '今日总览'
    : isClosing
      ? '收尾总结'
      : `第 ${playback.index} 条 / 共 ${job.segments.length - 2} 条`;

  return (
    <AbsoluteFill style={{padding: 56, justifyContent: 'space-between'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div
          style={{
            display: 'inline-flex',
            padding: '10px 18px',
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.86)',
            color: '#EA580C',
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 1
          }}
        >
          AI 早报
        </div>
        <div style={{fontSize: 20, color: '#9A3412', fontWeight: 600}}>{formatSource(activeSegment?.source)}</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.75fr',
          gap: 28,
          alignItems: 'stretch',
          transform: `translateY(${motion.cardTranslateY}px) scale(${motion.cardScale})`,
          opacity: motion.cardOpacity
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderRadius: 36,
            padding: '38px 42px',
            minHeight: 610,
            boxShadow: '0 28px 90px rgba(124,45,18,0.10)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{fontSize: 24, color: '#C2410C', fontWeight: 800}}>{kicker}</div>
            <div style={{fontSize: headlineSize, lineHeight: 1.12, fontWeight: 800, color: '#7C2D12'}}>{activeSegment?.headline}</div>
            <div style={{fontSize: 28, lineHeight: 1.46, color: '#9A3412'}}>{summary}</div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
            {points.map((point, index) => (
              <div
                key={`${point}-${index}`}
                style={{
                  minHeight: 108,
                  borderRadius: 24,
                  padding: '18px 20px',
                  backgroundColor: '#FFF7ED',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div style={{fontSize: 16, color: '#EA580C', fontWeight: 800}}>要点 {index + 1}</div>
                <div style={{fontSize: 20, lineHeight: 1.4, color: '#7C2D12', fontWeight: 700}}>{point}</div>
              </div>
            ))}
            <div
              style={{
                minHeight: 108,
                borderRadius: 24,
                padding: '18px 20px',
                backgroundColor: '#FFF7ED',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    backgroundColor: '#FFF1E5',
                    color: '#C2410C',
                    fontSize: 18,
                    fontWeight: 700
                  }}
                >
                  {activeSegment?.visualHint || 'summary-card'}
                </div>
                <div style={{fontSize: 18, color: '#9A3412'}}>轻快资讯博主风格</div>
              </div>
              <div style={{height: 12, borderRadius: 999, backgroundColor: '#FDE7D0', overflow: 'hidden'}}>
                <div
                  style={{
                    width: `${motion.progressWidth}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #FB923C 0%, #F9A8D4 100%)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(124,45,18,0.92)',
            color: '#FFF7ED',
            borderRadius: 34,
            padding: '34px 30px',
            minHeight: 610,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 24px 80px rgba(124,45,18,0.18)'
          }}
        >
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{fontSize: 22, fontWeight: 700, color: '#FED7AA'}}>这条为什么重要</div>
            <div style={{fontSize: 36, lineHeight: 1.45, fontWeight: 700}}>
              {isOpening
                ? '3 到 4 分钟看完今天最值得关注的 AI 动态。'
                : isClosing
                  ? '今天的模型、产品能力和代理进展就更新到这里。'
                  : shortText(activeSegment?.narration, 96)}
            </div>
          </div>
          <div style={{display: 'grid', gap: 14}}>
            <div style={{fontSize: 18, color: '#FED7AA'}}>当前来源</div>
            <div style={{fontSize: 28, lineHeight: 1.35, fontWeight: 700}}>{formatSource(activeSegment?.source)}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'rgba(124,45,18,0.94)',
          color: '#FFF7ED',
          borderRadius: 24,
          padding: '20px 26px',
          fontSize: 28,
          lineHeight: 1.42,
          minHeight: 110,
          opacity: motion.captionOpacity
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
}

function PortraitScene({job, playback, activeSegment, caption, motion}) {
  const isOpening = activeSegment?.visualHint === 'douyin-opening-card';
  const isClosing = activeSegment?.visualHint === 'douyin-closing-card';
  const headlineSize = fitHeadline(activeSegment?.headline, 'portrait');
  const summary = shortText(activeSegment?.summary, 64);
  const subtitle = shortText(caption?.text || activeSegment?.summary, 78);
  const points = extractNarrationPoints(activeSegment, 3);
  const totalItems = activeSegment?.totalItems || Math.max(job.segments.length - 2, 1);
  const rank = activeSegment?.ranking || Math.max(playback.index, 1);

  return (
    <AbsoluteFill style={{padding: 42, justifyContent: 'space-between'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div
            style={{
              display: 'inline-flex',
              padding: '10px 18px',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#EA580C',
              fontSize: 24,
              fontWeight: 800
            }}
          >
            AI 快报
          </div>
          <div style={{fontSize: 18, color: '#9A3412', fontWeight: 700}}>{formatSource(activeSegment?.source)}</div>
        </div>

        <div style={{height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)', overflow: 'hidden'}}>
          <div
            style={{
              width: `${interpolate(playback.index, [0, Math.max(job.segments.length - 1, 1)], [10, 100], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp'
              })}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #FB923C 0%, #F9A8D4 100%)'
            }}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          gap: 22,
          transform: `translateY(${motion.cardTranslateY}px) scale(${motion.cardScale})`,
          opacity: motion.cardOpacity
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.94)',
            borderRadius: 34,
            padding: '28px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 20px 70px rgba(124,45,18,0.10)'
          }}
        >
          <div style={{fontSize: 26, color: '#C2410C', fontWeight: 800}}>
            {isOpening ? '今日总览' : isClosing ? '收尾' : `第 ${rank} 条 / 共 ${totalItems} 条`}
          </div>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              backgroundColor: '#FFF1E5',
              color: '#C2410C',
              fontSize: 18,
              fontWeight: 700
            }}
          >
            {activeSegment?.visualHint || 'summary-card'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.97)',
            borderRadius: 40,
            padding: '34px 32px',
            boxShadow: '0 26px 84px rgba(124,45,18,0.12)',
            display: 'grid',
            gridTemplateRows: 'auto auto auto auto',
            gap: 22
          }}
        >
          <div style={{fontSize: headlineSize, fontWeight: 800, lineHeight: 1.08, color: '#7C2D12'}}>{activeSegment?.headline}</div>
          <div style={{fontSize: 34, lineHeight: 1.4, color: '#9A3412', fontWeight: 600}}>{summary}</div>
          <div style={{display: 'grid', gap: 14}}>
            {points.map((point, index) => (
              <div
                key={`${point}-${index}`}
                style={{
                  backgroundColor: '#FFF7ED',
                  borderRadius: 24,
                  padding: '20px 22px',
                  display: 'grid',
                  gap: 8
                }}
              >
                <div style={{fontSize: 20, color: '#EA580C', fontWeight: 800}}>快要点 {index + 1}</div>
                <div style={{fontSize: 26, lineHeight: 1.42, color: '#7C2D12', fontWeight: 700}}>{point}</div>
              </div>
            ))}
            <div
              style={{
                backgroundColor: '#FFF7ED',
                borderRadius: 24,
                padding: '20px 22px',
                display: 'grid',
                gap: 8
              }}
            >
              <div style={{fontSize: 20, color: '#EA580C', fontWeight: 800}}>为什么值得看</div>
              <div style={{fontSize: 26, lineHeight: 1.42, color: '#7C2D12', fontWeight: 700}}>
                {isOpening
                  ? '接下来 60 秒，只看今天最重要的 AI 更新。'
                  : isClosing
                    ? '完整解读看 B 站主片和公众号长文。'
                    : shortText(activeSegment?.narration, 88)}
              </div>
            </div>
          </div>
          <div style={{display: 'grid', gap: 12}}>
            <div style={{height: 12, borderRadius: 999, backgroundColor: '#FDE7D0', overflow: 'hidden'}}>
              <div
                style={{
                  width: `${motion.progressWidth}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #FB923C 0%, #F9A8D4 100%)'
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(124,45,18,0.94)',
            color: '#FFF7ED',
            borderRadius: 28,
            padding: '18px 22px',
            fontSize: 24,
            lineHeight: 1.38,
            minHeight: 122,
            opacity: motion.captionOpacity
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const DigestVideo = ({job, timeline}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const playback = getSegmentPlaybackState(job.segments, frame, fps);
  const activeSegment = playback.segment;
  const caption = captionForFrame(timeline.captions, frame, fps);
  const motion = buildMotion(playback, fps);

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(180deg, #FFF8EF 0%, #FFF1E5 100%)',
        color: '#7C2D12',
        fontFamily: 'Microsoft YaHei, Segoe UI, sans-serif',
        overflow: 'hidden'
      }}
    >
      <div style={buildThemeBackground(playback.progress, job.orientation)} />
      {job.orientation === 'portrait' ? (
        <PortraitScene
          job={job}
          playback={playback}
          activeSegment={activeSegment}
          caption={caption}
          motion={motion}
        />
      ) : (
        <LandscapeScene
          job={job}
          playback={playback}
          activeSegment={activeSegment}
          caption={caption}
          motion={motion}
        />
      )}
    </AbsoluteFill>
  );
};

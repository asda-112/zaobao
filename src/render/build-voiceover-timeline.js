export function buildVoiceoverTimeline({segments}) {
  let cursorMs = 0;

  const captions = segments.map((segment) => {
    const startMs = cursorMs;
    const durationMs = Math.round(segment.durationSeconds * 1000);
    const endMs = startMs + durationMs;
    cursorMs = endMs;

    return {
      text: segment.narration,
      startMs,
      endMs,
      timestampMs: startMs,
      confidence: 1
    };
  });

  return {
    totalDurationSeconds: cursorMs / 1000,
    captions
  };
}

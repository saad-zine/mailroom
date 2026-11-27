import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const INK = '#0a0a0a';
const PAPER = '#ffffff';

const PHRASES = [
  'New mail arrives.',
  'Mailroom drafts in your voice.',
  'Sources shown. You approve.',
];

const fontCss = `
@font-face{font-family:Inter;src:url('${staticFile('fonts/inter-normal-300-800.woff2')}') format('woff2');font-weight:300 800}
`;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Words land one after another, then the line settles. */
const WordByWord: React.FC<{ text: string; start: number; frame: number }> = ({
  text,
  start,
  frame,
}) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.28em' }}>
    {text.split(' ').map((word, index) => {
      const t = frame - start - index * 5;
      const opacity = interpolate(t, [0, 7], [0, 1], clamp);
      const y = interpolate(t, [0, 9], [22, 0], {
        ...clamp,
        easing: Easing.out(Easing.cubic),
      });
      const blur = interpolate(t, [0, 8], [9, 0], clamp);
      return (
        <span
          key={`${word}-${index}`}
          style={{
            display: 'inline-block',
            opacity,
            transform: `translateY(${y}px)`,
            filter: `blur(${blur}px)`,
          }}
        >
          {word}
        </span>
      );
    })}
  </div>
);

export const MailroomDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const phraseIndex = Math.min(PHRASES.length - 1, Math.floor(frame / 120));
  const phraseStart = phraseIndex * 120 + 8;
  const phraseOpacity = interpolate(
    frame,
    [phraseStart - 8, phraseStart, 338, 352],
    [0, 1, 1, 0],
    clamp,
  );
  const reset = interpolate(frame, [352, 360], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        background: PAPER,
        color: INK,
        fontFamily: 'Inter, sans-serif',
        opacity: reset,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style>{fontCss}</style>
      <div
        style={{
          width: '100%',
          padding: '0 80px',
          textAlign: 'center',
          fontSize: 72,
          fontWeight: 500,
          letterSpacing: -2.6,
          lineHeight: 1.06,
          opacity: phraseOpacity,
        }}
      >
        <WordByWord
          key={phraseIndex}
          text={PHRASES[phraseIndex]}
          start={phraseStart}
          frame={frame}
        />
      </div>
    </AbsoluteFill>
  );
};

import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const INK = '#0a0a0a';
const PAPER = '#ffffff';
const PALETTE = ['#FFFFFF', '#EA4045', '#3C82F6', '#F6C945'];

const PHRASES = [
  'New mail arrives.',
  'Mailroom drafts in your voice.',
  'Sources shown. You approve.',
];

const fontCss = `
@font-face{font-family:Inter;src:url('${staticFile('fonts/inter-normal-300-800.woff2')}') format('woff2');font-weight:300 800}
@font-face{font-family:'Geist Mono';src:url('${staticFile('fonts/geist-mono-normal-300-600.woff2')}') format('woff2');font-weight:300 600}
`;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Words land one after another, then the whole line settles. */
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

/** One quarter of the bot head, used for the spread. */
const Wedge: React.FC<{
  color: string;
  index: number;
  progress: number;
}> = ({ color, index, progress }) => {
  const a = (index * Math.PI) / 2 - Math.PI / 2;
  const b = a + Math.PI / 2;
  const x1 = Math.cos(a) * 100;
  const y1 = Math.sin(a) * 100;
  const x2 = Math.cos(b) * 100;
  const y2 = Math.sin(b) * 100;
  const d = `M0 0 L${x1} ${y1} A100 100 0 0 1 ${x2} ${y2} Z`;
  const spread = interpolate(progress, [0, 0.9], [1, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const dx = Math.cos(a + Math.PI / 4) * 260 * spread;
  const dy = (300 + index * 30) * spread;

  return (
    <g
      transform={`translate(${dx} ${dy}) scale(${0.5 + progress * 0.5})`}
      opacity={progress}
    >
      <path d={d} fill={color} />
    </g>
  );
};

const SpreadingBot: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90, mass: 0.8 },
  });
  const grow = spring({
    frame: frame - 12,
    fps,
    config: { damping: 16, stiffness: 110 },
  });
  const eyes = interpolate(frame, [26, 42], [0, 1], clamp);
  const wiggle = Math.sin(frame / 9) * 3;

  return (
    <svg
      width="460"
      height="460"
      viewBox="-140 -140 280 280"
      style={{ transform: `scale(${0.7 + grow * 1.2}) rotate(${wiggle}deg)` }}
    >
      <circle cx="0" cy="0" r="112" fill="#00000010" />
      <g>
        {PALETTE.map((color, index) => (
          <Wedge key={color} color={color} index={index} progress={progress} />
        ))}
      </g>
      <g opacity={eyes}>
        <ellipse cx="-30" cy="-8" rx="8" ry="20" fill={INK} transform="rotate(-10 -30 -8)" />
        <ellipse cx="32" cy="-14" rx="8" ry="20" fill={INK} transform="rotate(-10 32 -14)" />
      </g>
    </svg>
  );
};

export const MailroomDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phraseIndex = Math.min(2, Math.floor(frame / 100));
  const phraseStart = phraseIndex * 100 + 8;
  const phraseOpacity = interpolate(
    frame,
    [phraseStart - 8, phraseStart, 290, 306],
    [0, 1, 1, 0],
    clamp,
  );
  const botFrame = frame - 300;
  const botVisible = botFrame >= 0;
  const reset = interpolate(frame, [350, 360], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        background: PAPER,
        color: INK,
        fontFamily: 'Inter, sans-serif',
        opacity: reset,
        overflow: 'hidden',
      }}
    >
      <style>{fontCss}</style>

      {/* thin frame */}
      <div
        style={{
          position: 'absolute',
          inset: 42,
          border: '1px solid rgba(10,10,10,0.1)',
          borderRadius: 18,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 84,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 13,
          letterSpacing: 2.4,
          color: 'rgba(10,10,10,0.45)',
        }}
      >
        MAILROOM / THE PROCESS
      </div>
      <div
        style={{
          position: 'absolute',
          top: 76,
          right: 84,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 13,
          letterSpacing: 2.4,
          color: 'rgba(10,10,10,0.45)',
        }}
      >
        {String(phraseIndex + 1).padStart(2, '0')} / 03
      </div>

      {/* word-by-word copy */}
      <div
        style={{
          position: 'absolute',
          top: 238,
          left: 0,
          width: '100%',
          padding: '0 90px',
          textAlign: 'center',
          fontSize: 66,
          fontWeight: 500,
          letterSpacing: -2.4,
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

      {/* the bot spreads up from the bottom and grows */}
      {botVisible ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <SpreadingBot frame={botFrame} fps={fps} />
        </div>
      ) : null}

      {/* progress rule */}
      <div
        style={{
          position: 'absolute',
          bottom: 88,
          left: 84,
          right: 84,
          display: 'flex',
          gap: 10,
        }}
      >
        {PHRASES.map((p, index) => (
          <div
            key={p}
            style={{
              height: 3,
              flex: 1,
              background: index <= phraseIndex ? INK : 'rgba(10,10,10,0.12)',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

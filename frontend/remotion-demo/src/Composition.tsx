import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const C = {
  bg: '#0a0a0a',
  ink: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  line: 'rgba(255,255,255,0.14)',
};

const PALETTE = ['#EA4045', '#F6C945', '#3C82F6', '#5BC67A', '#885CF5', '#FFFFFF'];

const STEPS = [
  { line: 'New mail arrives.', note: 'INCOMING · 09:41' },
  { line: 'Mailroom reads it.', note: 'READING THE THREAD' },
  { line: 'A reply is drafted.', note: 'IN YOUR VOICE' },
  { line: 'Sources shown.', note: 'EVERY CLAIM CITED' },
  { line: 'You approve.', note: 'ONE HUMAN DECISION' },
  { line: 'Nothing sends itself.', note: 'DRAFT SAVED TO GMAIL' },
];

const fontCss = `
@font-face{font-family:Inter;src:url('${staticFile('fonts/inter-normal-300-800.woff2')}') format('woff2');font-weight:300 800}
@font-face{font-family:'Geist Mono';src:url('${staticFile('fonts/geist-mono-normal-300-600.woff2')}') format('woff2');font-weight:300 600}
`;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Tiny bot head, used as a accent in the last beat. */
const BotDot: React.FC<{ color: string }> = ({ color }) => (
  <svg width="30" height="30" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill={color} />
    <ellipse cx="35" cy="44" rx="5" ry="11" fill={C.bg} transform="rotate(-10 35 44)" />
    <ellipse cx="60" cy="41" rx="5" ry="11" fill={C.bg} transform="rotate(-10 60 41)" />
  </svg>
);

export const MailroomDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const step = Math.min(STEPS.length - 1, Math.floor(frame / 60));
  const local = frame - step * 60;
  const stepOpacity = interpolate(local, [0, 6, 54, 60], [0, 1, 1, 0], clamp);
  const stepY = interpolate(local, [0, 10, 52, 60], [22, 0, 0, -14], clamp);
  const stepBlur = interpolate(local, [0, 7, 54, 60], [10, 0, 0, 8], clamp);
  const draw = interpolate(local, [4, 34], [0, 1], clamp);
  const dotY = interpolate(frame, [0, 58], [-70, 104], clamp);
  const checkDraw = interpolate(frame, [240, 280], [0, 1], clamp);
  const pulse = 1 + Math.sin(frame / 6) * 0.012;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 42%, #161616 0%, ${C.bg} 62%)`,
        color: C.ink,
        fontFamily: 'Inter, sans-serif',
        opacity: interpolate(frame, [352, 360], [1, 0], clamp),
      }}
    >
      <style>{fontCss}</style>

      {/* frame */}
      <div
        style={{
          position: 'absolute',
          inset: 46,
          border: `1px solid ${C.line}`,
          borderRadius: 20,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 78,
          left: 88,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 13,
          letterSpacing: 2.4,
          color: C.muted,
        }}
      >
        Mailroom / the process
      </div>
      <div
        style={{
          position: 'absolute',
          top: 78,
          right: 88,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 13,
          letterSpacing: 2.4,
          color: C.muted,
        }}
      >
        {String(step + 1).padStart(2, '0')} / 06
      </div>

      {/* icon */}
      <div
        style={{
          position: 'absolute',
          top: 132,
          left: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          opacity: enter,
          transform: `scale(${pulse})`,
        }}
      >
        <svg width="280" height="210" viewBox="0 0 280 210">
          {/* the letter */}
          <circle cx={140} cy={dotY} r="7" fill={PALETTE[step]} opacity={step === 0 ? 1 : 0} />
          <rect
            x="18"
            y="52"
            width="244"
            height="132"
            rx="16"
            fill="none"
            stroke={C.ink}
            strokeWidth="3"
            opacity="0.9"
          />
          {/* flap, drawn on with a dash */}
          <path
            d="M18 68 L140 138 L262 68"
            fill="none"
            stroke={C.ink}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="270"
            strokeDashoffset={270 * (1 - draw)}
            opacity="0.9"
          />
          {/* approval check */}
          <path
            d="M112 118 L132 136 L170 100"
            fill="none"
            stroke="#5BC67A"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="90"
            strokeDashoffset={90 * (1 - checkDraw)}
          />
        </svg>
      </div>

      {/* changing copy */}
      <div
        style={{
          position: 'absolute',
          top: 372,
          left: 0,
          width: '100%',
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        <div
          key={step}
          style={{
            fontSize: 62,
            fontWeight: 500,
            letterSpacing: -2.4,
            lineHeight: 1.05,
            opacity: stepOpacity,
            transform: `translateY(${stepY}px)`,
            filter: `blur(${stepBlur}px)`,
          }}
        >
          {STEPS[step].line}
        </div>
        <div
          key={`${step}-note`}
          style={{
            marginTop: 18,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 14,
            letterSpacing: 2.6,
            textTransform: 'uppercase',
            color: C.muted,
            opacity: stepOpacity,
          }}
        >
          {STEPS[step].note}
        </div>
      </div>

      {/* progress */}
      <div
        style={{
          position: 'absolute',
          bottom: 96,
          left: 88,
          right: 88,
          display: 'flex',
          gap: 10,
        }}
      >
        {STEPS.map((s, index) => (
          <div
            key={s.line}
            style={{
              height: 3,
              flex: 1,
              background: index <= step ? PALETTE[index] : C.line,
              opacity: index <= step ? 1 : 0.7,
            }}
          />
        ))}
      </div>

      {/* bot accents on the final beat */}
      <div
        style={{
          position: 'absolute',
          bottom: 126,
          left: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          opacity: interpolate(frame, [300, 322], [0, 1], clamp),
        }}
      >
        {PALETTE.slice(0, 3).map((color) => (
          <BotDot key={color} color={color} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

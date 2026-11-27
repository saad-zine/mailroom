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
  card: '#1a1a1a',
  card2: '#202020',
  line: 'rgba(255,255,255,0.1)',
  ink: '#ffffff',
  muted: 'rgba(255,255,255,0.6)',
  faint: 'rgba(255,255,255,0.4)',
};

const fontCss = `
@font-face{font-family:Inter;src:url('${staticFile('fonts/inter-normal-300-800.woff2')}') format('woff2');font-weight:300 800}
@font-face{font-family:'Geist Mono';src:url('${staticFile('fonts/geist-mono-normal-300-600.woff2')}') format('woff2');font-weight:300 600}
`;

const fade = (frame: number, start: number, end: number, edge = 14) =>
  interpolate(
    frame,
    [start, start + edge, end - edge, end],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

const slide = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, start + 18, end - 12, end], [16, 0, 0, -12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Small version of the hero bot: a hue-cycling head with two cut-out eyes. */
const Bot: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const hue = (frame * 1.6) % 360;
  const a = `hsl(${hue} 82% 62%)`;
  const b = `hsl(${(hue + 70) % 360} 82% 62%)`;
  const id = `g${Math.round(hue)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id})`} />
      <ellipse cx="34" cy="44" rx="4.2" ry="11" fill={C.bg} transform="rotate(-9 34 44)" />
      <ellipse cx="59" cy="41" rx="4.2" ry="11" fill={C.bg} transform="rotate(-9 59 41)" />
    </svg>
  );
};

const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: "'Geist Mono', monospace",
      fontSize: 13,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: C.faint,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <span style={{ width: 6, height: 6, background: C.ink, borderRadius: 1 }} />
    {children}
  </div>
);

const MessageCard: React.FC<{
  title: string;
  meta: string;
  tag: string;
  tagColor: string;
  frame: number;
  start: number;
  end: number;
  progress?: number;
}> = ({ title, meta, tag, tagColor, frame, start, end, progress }) => (
  <div
    style={{
      position: 'absolute',
      inset: 18,
      background: C.card2,
      border: `1px solid ${C.line}`,
      borderRadius: 18,
      padding: 24,
      opacity: fade(frame, start, end),
      transform: `translateY(${slide(frame, start, end)}px)`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: C.faint }}>
        {meta}
      </span>
      <span
        style={{
          fontSize: 12,
          color: tagColor,
          background: `${tagColor}22`,
          borderRadius: 999,
          padding: '4px 10px',
        }}
      >
        {tag}
      </span>
    </div>
    <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.15 }}>
      {title}
    </div>
    {progress !== undefined ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 4, background: C.line, borderRadius: 4, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: C.ink,
              borderRadius: 4,
            }}
          />
        </div>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: C.faint }}>
          Reading thread · matching sources · writing in your voice
        </span>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 8 }}>
        {['KB / rollout.md', 'KB / pricing.md', 'Thread / 4 msgs'].map((s) => (
          <span
            key={s}
            style={{
              fontSize: 12,
              color: C.muted,
              border: `1px solid ${C.line}`,
              borderRadius: 999,
              padding: '5px 10px',
            }}
          >
            {s}
          </span>
        ))}
      </div>
    )}
  </div>
);

export const MailroomDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const progress = interpolate(frame, [120, 205], [0.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        color: C.ink,
        fontFamily: 'Inter, sans-serif',
        padding: 64,
        flexDirection: 'row',
        gap: 64,
        opacity: interpolate(frame, [350, 360], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      }}
    >
      <style>{fontCss}</style>

      {/* left: the promise */}
      <div
        style={{
          width: 470,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 22,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
        }}
      >
        <Kicker>Mailroom / live demo</Kicker>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 68, fontWeight: 500, letterSpacing: -2.5, lineHeight: 1 }}>
            Your inbox,
          </div>
          <Bot size={62} />
        </div>
        <div style={{ fontSize: 68, fontWeight: 500, letterSpacing: -2.5, lineHeight: 1 }}>
          handled.
        </div>
        <div style={{ fontSize: 21, lineHeight: 1.5, color: C.muted, maxWidth: 430 }}>
          Mailroom reads each new email, drafts the reply in your voice with the
          sources shown, and waits for your approval.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {['Read & draft only', 'Source-backed', 'You approve'].map((t) => (
            <span
              key={t}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: C.muted,
                border: `1px solid ${C.line}`,
                borderRadius: 999,
                padding: '7px 12px',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* right: the workspace */}
      <div
        style={{
          flex: 1,
          background: C.card,
          border: `1px solid ${C.line}`,
          borderRadius: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          opacity: enter,
        }}
      >
        <div
          style={{
            height: 56,
            borderBottom: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 20px',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EA4045' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F19D38' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#5BC67A' }} />
          <span
            style={{
              marginLeft: 14,
              fontFamily: "'Geist Mono', monospace",
              fontSize: 12,
              color: C.faint,
            }}
          >
            Mailroom / Approval queue
          </span>
        </div>

        <div style={{ flex: 1, padding: 18, position: 'relative' }}>
          <MessageCard
            title="Re: Q3 rollout — can you send the revised dates?"
            meta="INCOMING · 09:41"
            tag="New"
            tagColor="#3C82F6"
            frame={frame}
            start={24}
            end={130}
          />
          <MessageCard
            title="Drafting a reply in your voice…"
            meta="MAILROOM · WORKING"
            tag="Drafting"
            tagColor="#F19D38"
            frame={frame}
            start={116}
            end={214}
            progress={progress}
          />
          <MessageCard
            title="Here are the revised dates, with the source docs attached."
            meta="DRAFT · READY FOR REVIEW"
            tag="3 sources"
            tagColor="#885CF5"
            frame={frame}
            start={200}
            end={296}
          />
          <MessageCard
            title="Draft saved to Gmail. Nothing was sent."
            meta="APPROVED · 09:43"
            tag="Your call"
            tagColor="#5BC67A"
            frame={frame}
            start={282}
            end={360}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

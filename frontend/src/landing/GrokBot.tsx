import { useEffect, useId, useRef, type CSSProperties } from 'react';

/**
 * A static round mascot with cursor-tracking eyes and bright line accents.
 */

const HEAD =
  'M96 50L95.98 51.51L95.9 53.01L95.78 54.51L95.61 56L95.39 57.49L95.12 58.97L94.8 60.45L94.43 61.91L94.02 63.35L93.56 64.79L93.05 66.2L92.5 67.6L91.9 68.98L91.26 70.35L90.57 71.68L89.84 73L89.06 74.29L88.25 75.56L87.39 76.79L86.49 78L85.56 79.18L84.58 80.33L83.57 81.45L82.53 82.53L81.45 83.57L80.33 84.58L79.18 85.56L78 86.49L76.79 87.39L75.56 88.25L74.29 89.06L73 89.84L71.68 90.57L70.35 91.26L68.98 91.9L67.6 92.5L66.2 93.05L64.79 93.56L63.35 94.02L61.91 94.43L60.45 94.8L58.97 95.12L57.49 95.39L56 95.61L54.51 95.78L53.01 95.9L51.51 95.98L50 96L48.49 95.98L46.99 95.9L45.49 95.78L44 95.61L42.51 95.39L41.03 95.12L39.55 94.8L38.09 94.43L36.65 94.02L35.21 93.56L33.8 93.05L32.4 92.5L31.02 91.9L29.65 91.26L28.32 90.57L27 89.84L25.71 89.06L24.44 88.25L23.21 87.39L22 86.49L20.82 85.56L19.67 84.58L18.55 83.57L17.47 82.53L16.43 81.45L15.42 80.33L14.44 79.18L13.51 78L12.61 76.79L11.75 75.56L10.94 74.29L10.16 73L9.43 71.68L8.74 70.35L8.1 68.98L7.5 67.6L6.95 66.2L6.44 64.79L5.98 63.35L5.57 61.91L5.2 60.45L4.88 58.97L4.61 57.49L4.39 56L4.22 54.51L4.1 53.01L4.02 51.51L4 50L4.02 48.49L4.1 46.99L4.22 45.49L4.39 44L4.61 42.51L4.88 41.03L5.2 39.55L5.57 38.09L5.98 36.65L6.44 35.21L6.95 33.8L7.5 32.4L8.1 31.02L8.74 29.65L9.43 28.32L10.16 27L10.94 25.71L11.75 24.44L12.61 23.21L13.51 22L14.44 20.82L15.42 19.67L16.43 18.55L17.47 17.47L18.55 16.43L19.67 15.42L20.82 14.44L22 13.51L23.21 12.61L24.44 11.75L25.71 10.94L27 10.16L28.32 9.43L29.65 8.74L31.02 8.1L32.4 7.5L33.8 6.95L35.21 6.44L36.65 5.98L38.09 5.57L39.55 5.2L41.03 4.88L42.51 4.61L44 4.39L45.49 4.22L46.99 4.1L48.49 4.02L50 4L51.51 4.02L53.01 4.1L54.51 4.22L56 4.39L57.49 4.61L58.97 4.88L60.45 5.2L61.91 5.57L63.35 5.98L64.79 6.44L66.2 6.95L67.6 7.5L68.98 8.1L70.35 8.74L71.68 9.43L73 10.16L74.29 10.94L75.56 11.75L76.79 12.61L78 13.51L79.18 14.44L80.33 15.42L81.45 16.43L82.53 17.47L83.57 18.55L84.58 19.67L85.56 20.82L86.49 22L87.39 23.21L88.25 24.44L89.06 25.71L89.84 27L90.57 28.32L91.26 29.65L91.9 31.02L92.5 32.4L93.05 33.8L93.56 35.21L94.02 36.65L94.43 38.09L94.8 39.55L95.12 41.03L95.39 42.51L95.61 44L95.78 45.49L95.9 46.99L95.98 48.49Z';

// The two eye poses, in the 92×92 coordinate space of x.ai's animated bot.
const EYE_LEFT =
  'M34.12 49.73L34.48 49.48L34.72 49.25L34.82 49.14L35.08 48.82L35.16 48.7L35.34 48.4L35.53 47.97L35.66 47.55L35.74 47.13L35.78 46.72L35.78 46.3L35.74 45.05L35.72 43.8L35.72 42.56L35.73 41.74L35.78 40.5L35.82 39.69L35.91 38.47L35.98 37.67L35.99 37.28L35.97 36.88L35.9 36.49L35.77 36.05L35.61 35.72L35.46 35.46L35.37 35.33L35.14 35.07L35.02 34.96L34.81 34.78L34.5 34.59L34.12 34.43L33.77 34.34L33.41 34.29L33.05 34.29L32.69 34.33L32.32 34.42L31.94 34.56L31.58 34.74L31.18 35L30.98 35.16L30.78 35.34L30.55 35.57L30.37 35.79L30.22 35.98L29.97 36.39L29.77 36.79L29.63 37.2L29.52 37.6L29.46 38L29.35 39.2L29.26 40.42L29.2 41.65L29.18 42.47L29.17 43.71L29.18 44.54L29.22 45.79L29.27 46.62L29.31 47.04L29.39 47.45L29.52 47.86L29.69 48.26L29.93 48.66L30.08 48.87L30.23 49.06L30.47 49.31L30.63 49.46L30.85 49.62L31.21 49.84L31.6 50.01L31.96 50.11L32.33 50.17L32.69 50.18L33.06 50.14L33.41 50.05L33.77 49.92L34.12 49.73Z';

const EYE_RIGHT =
  'M47.35 49.5L47.75 49.76L48.15 49.95L48.55 50.08L48.96 50.17L49.36 50.2L49.77 50.19L50.18 50.14L50.59 50.03L51.02 49.87L51.43 49.65L51.67 49.48L51.85 49.33L52.12 49.09L52.29 48.9L52.45 48.69L52.71 48.29L52.9 47.88L53.04 47.48L53.13 47.06L53.17 46.65L53.21 45.82L53.27 44.57L53.3 43.74L53.34 42.5L53.36 41.68L53.38 40.45L53.39 39.23L53.38 38.02L53.36 37.62L53.29 37.22L53.17 36.82L52.99 36.42L52.75 36.01L52.61 35.81L52.43 35.6L52.2 35.36L52 35.19L51.79 35.03L51.36 34.76L50.98 34.58L50.57 34.45L50.16 34.36L49.76 34.32L49.35 34.32L48.94 34.36L48.53 34.46L48.09 34.62L47.72 34.81L47.45 34.98L47.31 35.09L47.02 35.36L46.9 35.49L46.7 35.74L46.49 36.07L46.28 36.51L46.16 36.91L46.09 37.3L46.07 37.7L46.06 38.5L46.04 39.71L46.03 40.53L46 41.76L45.98 42.59L45.94 43.83L45.9 45.08L45.85 46.33L45.85 46.74L45.9 47.16L46 47.58L46.16 48L46.37 48.42L46.57 48.72L46.67 48.85L46.96 49.17L47.08 49.28L47.35 49.5Z';

/** Map the 92-space eye poses onto our 100-space head. */
const EYE_TRANSFORM = 'translate(-45.08 -48.82) scale(2.1354)';

type BotMarkProps = {
  size?: number | string;
  fg?: string;
  bg?: string;
  animated?: boolean;
  /** Fill the head with a slow, colour-changing gradient. */
  gradient?: boolean;
  /** Palette for that gradient. */
  gradientColors?: string[];
  title?: string;
  className?: string;
  style?: CSSProperties;
};

export function BotMark({
  size = '1em',
  fg = 'currentColor',
  bg = '#0a0a0a',
  animated = false,
  gradient = false,
  gradientColors = ['#F19D38', '#EA4045', '#885CF5', '#3C82F6'],
  title,
  className,
  style,
}: BotMarkProps) {
  const eyeLeft = useRef<SVGGElement>(null);
  const eyeRight = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = `bot-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (!animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const leftEye = eyeLeft.current;
    const rightEye = eyeRight.current;
    const svg = svgRef.current;
    if (!leftEye || !rightEye || !svg) return;

    let pointerX = 0;
    let pointerY = 0;
    let gazeX = 0;
    let gazeY = 0;
    let previous = performance.now();
    let frame = 0;

    const onPointerMove = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
      pointerY = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
    };

    const followPointer = (now: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (now - previous) / 1000));
      previous = now;
      const easing = 1 - Math.exp(-10 * delta);
      gazeX += (pointerX - gazeX) * easing;
      gazeY += (pointerY - gazeY) * easing;

      const dx = gazeX * 7;
      const dy = gazeY * 5.5;
      leftEye.style.transform = `translate(${dx}px, ${dy}px)`;
      rightEye.style.transform = `translate(${dx}px, ${dy}px)`;
      frame = requestAnimationFrame(followPointer);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    frame = requestAnimationFrame(followPointer);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [animated]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {gradient ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {gradientColors.map((color, index) => (
              <stop
                key={`${color}-${index}`}
                offset={`${(index / (gradientColors.length - 1)) * 100}%`}
                stopColor={color}
                className={`grok-grad-${'abcd'[index] ?? 'a'}`}
              />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path d={HEAD} fill={gradient ? `url(#${gradientId})` : fg} />
      <g transform={EYE_TRANSFORM}>
        <g ref={eyeLeft} className="grok-eye">
          <path d={EYE_LEFT} fill={bg} />
        </g>
        <g ref={eyeRight} className="grok-eye">
          <path d={EYE_RIGHT} fill={bg} />
        </g>
      </g>
    </svg>
  );
}

export default BotMark;

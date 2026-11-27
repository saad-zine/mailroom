import type { CSSProperties } from 'react';

/**
 * BrandMark — the Mailroom monogram.
 *
 * An envelope drawn as one continuous line: the two sides and the pointed
 * flap make a M, and the last stroke sweeps out of the right stem like a
 * letter leaving the post (the same trick SpaceX uses on the X). Monoline,
 * so it holds up from 16px to a billboard.
 */
export function BrandMark({
  size = 22,
  strokeWidth = 4,
  title,
  className,
  style,
}: {
  size?: number | string;
  strokeWidth?: number;
  title?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="6 4 42 42"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d="M10 40V12l14 26 14-26v18c0 5 2.5 8 6 8" />
    </svg>
  );
}

export default BrandMark;

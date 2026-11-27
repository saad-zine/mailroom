import { useEffect, useRef } from 'react';

/**
 * A dot-matrix sculpture of a wax seal, drawn on canvas.
 *
 * The reference is a halftone classical bust on a saturated field; the
 * technique is the same, the object is ours: a thick pool of sealing wax
 * with an embossed monogram, sampled as a grid of points, lit and
 * depth-sorted. Drag to rotate it 360°. No image assets — the geometry is
 * generated in code.
 */

type Dot = {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  /** Extra brightness multiplier, used for creases and folds. */
  k?: number;
};

type Surface = {
  dots: Dot[];
  px: Float32Array;
  py: Float32Array;
  size: Float32Array;
  visible: number;
  depth: number;
  /** Relative dot weight, so the seal reads denser than the paper. */
  weight: number;
  /** Overall brightness multiplier, used to push surfaces back. */
  tone: number;
  /** World-space dot spacing, so dot size matches the grid. */
  spacing: number;
  /** Fill colour for this surface. */
  color: string;
  /** Painted in layer order, then depth order. */
  layer: number;
};

const STEP = 0.021;
const OBJ_H = 2.1;
const CREAM = '#f1ead9';
const WAX = '#c39a45';

type V3 = [number, number, number];

function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Distance from p to the segment ab, in 2D. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(wx - vx * t, wy - vy * t);
}

/** An embossed M, in seal-local coordinates (−1…1). */
function monogram(x: number, y: number): number {
  const stroke = 0.1;
  const pts: Array<[number, number, number, number]> = [
    [-0.4, -0.36, -0.4, 0.34],
    [-0.4, 0.34, 0, -0.2],
    [0, -0.2, 0.4, 0.34],
    [0.4, 0.34, 0.4, -0.36],
  ];
  let d = Infinity;
  for (const [ax, ay, bx, by] of pts) {
    d = Math.min(d, segDist(x, y, ax, ay, bx, by));
  }
  const t = Math.max(0, Math.min(1, 1 - (d - stroke * 0.5) / stroke));
  return t * t * (3 - 2 * t);
}

function makeSurface(
  dots: Dot[],
  layer = 0,
  weight = 1,
  color = CREAM,
  tone = 1,
  spacing = STEP,
): Surface {
  return {
    dots,
    px: new Float32Array(dots.length),
    py: new Float32Array(dots.length),
    size: new Float32Array(dots.length),
    visible: 0,
    depth: 0,
    weight,
    tone,
    spacing,
    color,
    layer,
  };
}

function buildLetter(): Surface[] {
  // A thick wax seal, floating on the field: a hand-pressed pool of wax with
  // a die-cut ring and an engraved monogram. This is the whole sculpture.
  const R = 1.05;
  const BOTTOM = -0.21;
  const dots: Dot[] = [];
  const step = 0.0135;
  const span = Math.ceil((R * 1.09) / step);

  const edgeAt = (theta: number) =>
    R * (1 + 0.035 * Math.sin(5 * theta + 1.1) + 0.02 * Math.sin(9 * theta + 2.4));

  const smooth = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
  };

  // Height as a function of the flat sheet coordinates, so the normals can
  // be sampled smoothly (a discontinuity here shows up as contour banding).
  const heightAt = (px: number, py: number) => {
    const theta = Math.atan2(py, px);
    const t = Math.min(1, Math.hypot(px, py) / edgeAt(theta));
    // A pressed seal has a broad, nearly flat face and a rounded shoulder.
    const dome = 0.3 * Math.pow(Math.max(0, 1 - t * t), 1.15);
    const dieRing = -0.02 * Math.exp(-(((t - 0.86) / 0.055) ** 2));
    const face = 1 - smooth((t - 0.52) / 0.14);
    const monogramGroove = -monogram(px / R, py / R) * 0.06 * face;
    return dome + dieRing + monogramGroove;
  };

  // Top surface, on a brick-offset grid so the shading does not band into
  // concentric moiré rings.
  const eps = 0.012;
  for (let j = -span; j <= span; j += 1) {
    const rowOffset = j % 2 === 0 ? 0 : 0.5;
    for (let i = -span; i <= span; i += 1) {
      const px = (i + rowOffset) * step;
      const py = j * step;
      const theta = Math.atan2(py, px);
      if (Math.hypot(px, py) > edgeAt(theta)) continue;
      const h = heightAt(px, py);
      const dhdx = (heightAt(px + eps, py) - heightAt(px - eps, py)) / (2 * eps);
      const dhdy = (heightAt(px, py + eps) - heightAt(px, py - eps)) / (2 * eps);
      const nrm = norm([-dhdx, -dhdy, 1]);
      dots.push({ x: px, y: py, z: h, nx: nrm[0], ny: nrm[1], nz: nrm[2] });
    }
  }

  // Side wall: the wax's thickness.
  const wallCount = Math.ceil((2 * Math.PI * R) / step);
  const wallSteps = 6;
  for (let i = 0; i < wallCount; i += 1) {
    const theta = (i / wallCount) * Math.PI * 2;
    const edge = edgeAt(theta);
    const cx = Math.cos(theta);
    const cy = Math.sin(theta);
    const top = heightAt(cx * edge * 0.999, cy * edge * 0.999);
    for (let j = 0; j <= wallSteps; j += 1) {
      const z = BOTTOM + ((top - BOTTOM) * j) / wallSteps;
      dots.push({ x: cx * edge, y: cy * edge, z, nx: cx, ny: cy, nz: 0 });
    }
  }

  // Flat underside (coarser: it is only visible at the silhouette).
  const underStep = step * 2.2;
  for (let i = -span; i <= span; i += 1) {
    for (let j = -span; j <= span; j += 1) {
      const px = i * underStep;
      const py = j * underStep;
      const theta = Math.atan2(py, px);
      if (Math.hypot(px, py) > edgeAt(theta)) continue;
      dots.push({ x: px, y: py, z: BOTTOM, nx: 0, ny: 0, nz: -1 });
    }
  }

  return [makeSurface(dots, 0, 1.02, WAX, 1, step)];
}

const SURFACES = buildLetter();

export function LetterScene({
  className,
  onFirstDrag,
}: {
  className?: string;
  onFirstDrag?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interacted = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CAM = 5;
    // A point light near the camera, upper left: the bowed faces pick up a
    // real gradient, which is what makes the halftone read as a sculpture.
    const LX = -2.2;
    const LY = 2.5;
    const LZ = 3.2;

    let width = 0;
    let height = 0;
    let unit = 1;
    let cx = 0;
    let cy = 0;

    let yaw = -0.5;
    let pitch = 0.42;
    let vyaw = 0;
    let vpitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let active = true;
    let raf = 0;
    let last = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      unit = Math.min((width * 0.34) / OBJ_H, (height * 0.62) / OBJ_H);
      cx = width * 0.55;
      cy = height * 0.5;
    };

    const render = (now: number) => {
      const dt = last ? Math.min(now - last, 48) : 16;
      last = now;
      const k = dt / 16.667;

      if (!reduced) {
        if (!dragging) {
          yaw += vyaw * k;
          pitch += vpitch * k;
          vyaw *= Math.pow(0.93, k);
          vpitch *= Math.pow(0.9, k);
          if (Math.abs(vyaw) < 0.0012) yaw += 0.00095 * k;
        }
        pitch = Math.max(-0.62, Math.min(0.62, pitch));
      }

      const wobble = reduced ? 0 : Math.sin(now * 0.00022) * 0.035;
      const p = pitch + wobble;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const cp = Math.cos(p);
      const sp = Math.sin(p);

      ctx.clearRect(0, 0, width, height);

      for (const surface of SURFACES) {
        let count = 0;
        let zsum = 0;
        const dots = surface.dots;
        for (let i = 0; i < dots.length; i += 1) {
          const d = dots[i];
          const x1 = d.x * cyw + d.z * syw;
          const z1 = -d.x * syw + d.z * cyw;
          const y1 = d.y * cp - z1 * sp;
          const z2 = d.y * sp + z1 * cp;

          const nx1 = d.nx * cyw + d.nz * syw;
          const nz1 = -d.nx * syw + d.nz * cyw;
          const ny1 = d.ny * cp - nz1 * sp;
          const nz2 = d.ny * sp + nz1 * cp;

          // Perspective culling against the camera at (0, 0, CAM).
          const vx = -x1;
          const vy = -y1;
          const vz = CAM - z2;
          const vl = Math.hypot(vx, vy, vz) || 1;
          if ((nx1 * vx + ny1 * vy + nz2 * vz) / vl <= 0.015) continue;

          const persp = CAM / (CAM - z2);
          const sx = cx + x1 * unit * persp;
          const sy = cy - y1 * unit * persp;
          if (sx < -24 || sx > width + 24 || sy < -24 || sy > height + 24) continue;

          // Point-light diffuse plus a grazing-angle rim.
          const lx = LX - x1;
          const ly = LY - y1;
          const lz = LZ - z2;
          const ll = Math.hypot(lx, ly, lz) || 1;
          const diff = Math.max(0, (nx1 * lx + ny1 * ly + nz2 * lz) / ll);
          const ndv = Math.min(1, Math.max(0, (nx1 * vx + ny1 * vy + nz2 * vz) / vl));
          const rim = (1 - ndv) ** 3 * 0.14;
          const shade =
            Math.min(0.96, 0.3 + 0.64 * diff + rim) * (d.k ?? 1) * surface.tone;

          const spacing = surface.spacing * unit * persp;
          const size = spacing * (0.35 + 0.6 * shade) * surface.weight;

          surface.px[count] = sx;
          surface.py[count] = sy;
          surface.size[count] = size;
          zsum += z2;
          count += 1;
        }
        surface.visible = count;
        surface.depth = count ? zsum / count : -Infinity;
      }

      const ordered = [...SURFACES].sort(
        (a, b) => a.layer - b.layer || a.depth - b.depth,
      );
      for (const surface of ordered) {
        const px = surface.px;
        const py = surface.py;
        const size = surface.size;
        ctx.fillStyle = surface.color;
        for (let i = 0; i < surface.visible; i += 1) {
          const s = size[i];
          ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
        }
      }
    };

    const loop = (now: number) => {
      render(now);
      if (active && !reduced) raf = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = 0;
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      resize();
      if (reduced) render(performance.now());
    };

    const onDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      vyaw = 0;
      vpitch = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      if (!interacted.current) {
        interacted.current = true;
        onFirstDrag?.();
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yaw += dx * 0.0062;
      pitch = Math.max(-0.62, Math.min(0.62, pitch + dy * 0.0042));
      vyaw = dx * 0.0062;
      vpitch = dy * 0.0042;
    };

    const onUp = (event: PointerEvent) => {
      dragging = false;
      canvas.classList.remove('is-dragging');
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        active = entries.some((entry) => entry.isIntersecting);
        if (active) start();
        else cancelAnimationFrame(raf);
      },
      { threshold: 0.01 },
    );

    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);
    observer.observe(wrap);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    resize();
    render(performance.now());
    if (!reduced) start();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [onFirstDrag]);

  return (
    <div ref={wrapRef} className={className}>
      <canvas
        ref={canvasRef}
        className="lp-letter"
        role="img"
        aria-label="A sealed letter rendered as a rotating field of dots. Drag to turn it."
      />
    </div>
  );
}

// ============================================================
// roughDraw - Hand-drawn rendering utilities using roughjs
// ============================================================

import rough from 'roughjs/bundled/rough.esm.js';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { Drawable, Op, Options } from 'roughjs/bin/core';

const roughCanvasByCanvas = new WeakMap<HTMLCanvasElement, RoughCanvas>();

function getRoughCanvas(ctx: CanvasRenderingContext2D): RoughCanvas {
  const canvas = ctx.canvas;
  const existing = roughCanvasByCanvas.get(canvas);
  if (existing) return existing;

  const created = rough.canvas(canvas);
  roughCanvasByCanvas.set(canvas, created);
  return created;
}

export function seedFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Adjust roughness for small elements (ported from Excalidraw).
 * Reduces roughness for small shapes to maintain visual clarity.
 */
function adjustRoughness(roughness: number, width: number, height: number): number {
  const maxSize = Math.max(width, height);
  const minSize = Math.min(width, height);

  // Don't reduce roughness if both sides are relatively big
  if (minSize >= 20 && maxSize >= 50) {
    return roughness;
  }

  // Reduce roughness for small shapes
  if (maxSize < 10) {
    return Math.min(roughness / 3, 2.5);
  }
  return Math.min(roughness / 2, 2.5);
}

/**
 * Build roughjs options from shape style properties.
 * Matches Excalidraw's generateRoughOptions approach:
 * - fillWeight relative to strokeWidth
 * - hachureGap relative to strokeWidth
 * - preserveVertices for low roughness
 * - bowing for natural wobble
 * - disableMultiStroke false for solid strokes (authentic hand-drawn look)
 */
function buildRoughOptions(
  fill: string | undefined,
  stroke: string | undefined,
  strokeWidth: number,
  roughness: number,
  seed: number,
  shapeWidth: number = 100,
  shapeHeight: number = 100,
  isEllipse: boolean = false,
): Options {
  const isTransparent = !fill || fill === 'transparent';
  const adjusted = adjustRoughness(roughness, shapeWidth, shapeHeight);

  return {
    roughness: adjusted,
    seed,
    stroke: stroke ?? '#00d4ff',
    strokeWidth,
    fill: isTransparent ? undefined : fill,
    fillStyle: 'hachure',
    fillWeight: strokeWidth / 2,
    hachureGap: strokeWidth * 4,
    hachureAngle: -41,
    bowing: 1,
    disableMultiStroke: false,
    disableMultiStrokeFill: false,
    preserveVertices: adjusted < 2,
    ...(isEllipse ? { curveFitting: 1 } : {}),
  };
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function cubicBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t2 * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

function opsToPolylinePoints(ops: Op[], sampleSteps: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  let current: { x: number; y: number } | null = null;

  for (const op of ops) {
    if (op.op === 'move') {
      const [x, y] = op.data;
      current = { x, y };
      points.push(current);
      continue;
    }

    if (op.op === 'lineTo') {
      const [x, y] = op.data;
      current = { x, y };
      points.push(current);
      continue;
    }

    if (op.op === 'bcurveTo') {
      if (!current) continue;
      const [cp1x, cp1y, cp2x, cp2y, x, y] = op.data;
      const p0 = current;
      const p1 = { x: cp1x, y: cp1y };
      const p2 = { x: cp2x, y: cp2y };
      const p3 = { x, y };
      const steps = Math.max(4, Math.min(24, sampleSteps));
      for (let i = 1; i <= steps; i += 1) {
        points.push(cubicBezierPoint(p0, p1, p2, p3, i / steps));
      }
      current = p3;
    }
  }

  return points;
}

function drawVariableWidthStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  stroke: string,
  baseWidth: number,
  roughness: number,
  seed: number,
): void {
  if (points.length < 2 || baseWidth <= 0) return;

  const normalized = Math.max(1, roughness);
  const rand = mulberry32(seed);

  // Keep it subtle: a single stroke with tiny thickness drift
  const amplitude = Math.min(0.22, 0.06 + normalized * 0.03);
  let currentWidth = baseWidth;

  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;
  const prevLineCap = ctx.lineCap;
  const prevLineJoin = ctx.lineJoin;

  ctx.strokeStyle = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const target = baseWidth * (1 + (rand() * 2 - 1) * amplitude);
    currentWidth = currentWidth * 0.7 + target * 0.3;
    const width = Math.max(0.5, currentWidth);

    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
  ctx.lineCap = prevLineCap;
  ctx.lineJoin = prevLineJoin;
}

function drawDrawableFillOnly(rc: RoughCanvas, drawable: Drawable): void {
  const fillSets = drawable.sets.filter((s) => s.type !== 'path');
  if (fillSets.length === 0) return;
  rc.draw({ ...drawable, sets: fillSets });
}

function drawDrawableVariableStroke(
  ctx: CanvasRenderingContext2D,
  drawable: Drawable,
  roughness: number,
  seed: number,
): void {
  const strokeSets = drawable.sets.filter((s) => s.type === 'path');
  if (strokeSets.length === 0) return;

  const strokeColor = drawable.options.stroke;
  const baseWidth = drawable.options.strokeWidth;
  const sampleSteps = drawable.options.curveStepCount;

  for (let i = 0; i < strokeSets.length; i += 1) {
    const pts = opsToPolylinePoints(strokeSets[i].ops, sampleSteps);
    drawVariableWidthStroke(ctx, pts, strokeColor, baseWidth, roughness, seed + i);
  }
}

/**
 * Draw a hand-drawn rectangle using roughjs directly on a canvas context.
 * Designed to be used inside Konva's sceneFunc.
 */
export function drawRoughRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string | undefined,
  stroke: string | undefined,
  strokeWidth: number,
  roughness: number,
  seed: number,
): void {
  const rc = getRoughCanvas(ctx);
  const opts = buildRoughOptions(fill, stroke, strokeWidth, roughness, seed, width, height);
  const drawable = rc.generator.rectangle(x, y, width, height, opts);
  drawDrawableFillOnly(rc, drawable);
  drawDrawableVariableStroke(ctx, drawable, roughness, seed);
}

/**
 * Draw a hand-drawn ellipse using roughjs directly on a canvas context.
 */
export function drawRoughEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  fill: string | undefined,
  stroke: string | undefined,
  strokeWidth: number,
  roughness: number,
  seed: number,
): void {
  const rc = getRoughCanvas(ctx);
  const opts = buildRoughOptions(fill, stroke, strokeWidth, roughness, seed, width, height, true);
  const drawable = rc.generator.ellipse(cx, cy, width, height, opts);
  drawDrawableFillOnly(rc, drawable);
  drawDrawableVariableStroke(ctx, drawable, roughness, seed);
}

/**
 * Draw a hand-drawn line using roughjs directly on a canvas context.
 */
export function drawRoughLine(
  ctx: CanvasRenderingContext2D,
  points: readonly number[],
  stroke: string | undefined,
  strokeWidth: number,
  roughness: number,
  seed: number,
): void {
  const rc = getRoughCanvas(ctx);

  const pts: Array<[number, number]> = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const px = points[i], py = points[i + 1];
    pts.push([px, py]);
    minX = Math.min(minX, px); minY = Math.min(minY, py);
    maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
  }

  if (pts.length < 2) return;
  const lineW = maxX - minX || 1;
  const lineH = maxY - minY || 1;
  const opts = buildRoughOptions(undefined, stroke, strokeWidth, roughness, seed, lineW, lineH);
  const drawable = rc.generator.linearPath(pts, opts);
  drawDrawableVariableStroke(ctx, drawable, roughness, seed);
}

/**
 * Draw a hand-drawn arrow using roughjs directly on a canvas context.
 * Draws a roughjs line plus a hand-drawn arrowhead.
 */
export function drawRoughArrow(
  ctx: CanvasRenderingContext2D,
  points: readonly number[],
  stroke: string | undefined,
  strokeWidth: number,
  roughness: number,
  pointerLength: number,
  pointerWidth: number,
  seed: number,
): void {
  const rc = getRoughCanvas(ctx);

  const pts: Array<[number, number]> = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const px = points[i], py = points[i + 1];
    pts.push([px, py]);
    minX = Math.min(minX, px); minY = Math.min(minY, py);
    maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
  }
  const lineW = maxX - minX || 1;
  const lineH = maxY - minY || 1;
  const opts = buildRoughOptions(undefined, stroke, strokeWidth, roughness, seed, lineW, lineH);

  if (pts.length >= 2) {
    const drawable = rc.generator.linearPath(pts, opts);
    drawDrawableVariableStroke(ctx, drawable, roughness, seed);
  }

  // Draw arrowhead at the last segment
  if (points.length >= 4) {
    const endX = points[points.length - 2];
    const endY = points[points.length - 1];
    const prevX = points[points.length - 4];
    const prevY = points[points.length - 3];

    const angle = Math.atan2(endY - prevY, endX - prevX);
    const halfWidth = pointerWidth / 2;

    const tip1X = endX - pointerLength * Math.cos(angle - Math.atan2(halfWidth, pointerLength));
    const tip1Y = endY - pointerLength * Math.sin(angle - Math.atan2(halfWidth, pointerLength));
    const tip2X = endX - pointerLength * Math.cos(angle + Math.atan2(halfWidth, pointerLength));
    const tip2Y = endY - pointerLength * Math.sin(angle + Math.atan2(halfWidth, pointerLength));

    // Draw arrowhead as two lines from tip to end
    const arrowOpts = { ...opts, fill: stroke ?? '#00d4ff', fillStyle: 'solid' as const };
    const arrowDrawable = rc.generator.polygon(
      [
        [endX, endY],
        [tip1X, tip1Y],
        [tip2X, tip2Y],
      ],
      arrowOpts,
    );
    drawDrawableFillOnly(rc, arrowDrawable);
    drawDrawableVariableStroke(ctx, arrowDrawable, roughness, seed + 101);
  }
}

/**
 * Check if a shape should use hand-drawn rendering
 */
export function isHandDrawn(roughness: number | undefined): boolean {
  return (roughness ?? 0) > 0;
}

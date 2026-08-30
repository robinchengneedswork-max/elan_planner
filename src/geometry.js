// geometry.js — pure math. No DOM, no state. Everything in inches.

// --- formatting -------------------------------------------------------------

// 141 -> `11'9"`.  Rounds to the nearest inch; that is the resolution anyone
// can actually measure with a tape.
function fmtIn(inches) {
  const neg = inches < 0;
  const n = Math.round(Math.abs(inches));
  const ft = Math.floor(n / 12);
  const rem = n % 12;
  return (neg ? '-' : '') + (ft ? `${ft}'${rem}"` : `${rem}"`);
}

// `11'9"`, `11 9`, `141` -> 141.  Used by the calibration inputs.
function parseIn(text) {
  if (text == null) return NaN;
  const s = String(text).trim();
  if (!s) return NaN;
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:'|ft|f)\s*(\d+(?:\.\d+)?)?\s*(?:"|in)?$/i);
  if (m) return parseFloat(m[1]) * 12 + (m[2] ? parseFloat(m[2]) : 0);
  const m2 = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:"|in)?$/i);
  if (m2) return parseFloat(m2[1]);
  return NaN;
}

const DEG = Math.PI / 180;

// --- polygons ---------------------------------------------------------------

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

function polygonBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Closed polygon -> list of wall segments.
function polygonEdges(poly) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    out.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
  }
  return out;
}

function rectPoly(x, y, w, d) {
  return [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
}

// --- oriented boxes ---------------------------------------------------------
// A placed item is { x, y, w, d, rot } where (x, y) is its CENTER and rot is
// degrees clockwise. Corners come back in order.

function boxCorners(b) {
  const c = Math.cos(b.rot * DEG), s = Math.sin(b.rot * DEG);
  const hw = b.w / 2, hd = b.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([ox, oy]) => [
    b.x + ox * c - oy * s,
    b.y + ox * s + oy * c
  ]);
}

function projectPoly(poly, ax, ay) {
  let min = Infinity, max = -Infinity;
  for (const [x, y] of poly) {
    const p = x * ax + y * ay;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}

// Separating-axis test between two convex polygons. `slack` shrinks the
// overlap threshold so two things merely touching are not a clash.
function convexOverlap(pa, pb, slack = 0.5) {
  for (const poly of [pa, pb]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ax = -(b[1] - a[1]), ay = b[0] - a[0];
      const len = Math.hypot(ax, ay) || 1;
      const nx = ax / len, ny = ay / len;
      const [amin, amax] = projectPoly(pa, nx, ny);
      const [bmin, bmax] = projectPoly(pb, nx, ny);
      if (amin >= bmax - slack || bmin >= amax - slack) return false;
    }
  }
  return true;
}

function boxesOverlap(a, b, slack) {
  return convexOverlap(boxCorners(a), boxCorners(b), slack);
}

// True when any corner of the box falls outside the floor polygon.
function boxOutsidePolygon(b, poly) {
  return boxCorners(b).some(([x, y]) => !pointInPolygon(x, y, poly));
}

// --- distance probes --------------------------------------------------------

// Distance from `(px,py)` along unit direction `(dx,dy)` to segment `seg`.
// Returns Infinity when the ray misses.
function raySegment(px, py, dx, dy, seg) {
  const ex = seg.bx - seg.ax, ey = seg.by - seg.ay;
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-9) return Infinity;
  const t = ((seg.ax - px) * ey - (seg.ay - py) * ex) / denom;
  const u = ((seg.ax - px) * dy - (seg.ay - py) * dx) / denom;
  if (t < 0 || u < -1e-6 || u > 1 + 1e-6) return Infinity;
  return t;
}

// Shortest ray hit against a list of segments.
function rayCast(px, py, dx, dy, segs) {
  let best = Infinity;
  for (const s of segs) {
    const t = raySegment(px, py, dx, dy, s);
    if (t < best) best = t;
  }
  return best;
}

// Clearance from each side of a box out to the nearest obstacle, measured from
// the midpoint of that side along its outward normal. Sides are ordered
// [front(-d), right(+w), back(+d), left(-w)] in the box's own frame.
function boxClearances(b, segs) {
  const c = Math.cos(b.rot * DEG), s = Math.sin(b.rot * DEG);
  const local = [
    { mx: 0, my: -b.d / 2, nx: 0, ny: -1 },
    { mx: b.w / 2, my: 0, nx: 1, ny: 0 },
    { mx: 0, my: b.d / 2, nx: 0, ny: 1 },
    { mx: -b.w / 2, my: 0, nx: -1, ny: 0 }
  ];
  return local.map(({ mx, my, nx, ny }) => {
    const px = b.x + mx * c - my * s;
    const py = b.y + mx * s + my * c;
    const dx = nx * c - ny * s;
    const dy = nx * s + ny * c;
    const dist = rayCast(px + dx * 0.05, py + dy * 0.05, dx, dy, segs);
    return { px, py, dx, dy, dist };
  });
}

// --- snapping ---------------------------------------------------------------

function snapTo(value, step) {
  return Math.round(value / step) * step;
}

// Given a candidate box, nudge it so an axis-aligned face lands flush against
// the nearest wall/fixture face within `tol`. Only applies on axis-aligned
// rotations, which is where flush placement actually matters.
function snapBoxToEdges(box, edges, tol) {
  const rot = ((box.rot % 360) + 360) % 360;
  if (Math.abs(rot % 90) > 0.01) return box;
  const cs = boxCorners(box);
  const bx = polygonBounds(cs);
  let dx = 0, dy = 0, bestX = tol, bestY = tol;
  for (const e of edges) {
    const vertical = Math.abs(e.ax - e.bx) < 0.01;
    const horizontal = Math.abs(e.ay - e.by) < 0.01;
    if (vertical) {
      const spanLo = Math.min(e.ay, e.by), spanHi = Math.max(e.ay, e.by);
      if (bx.maxY < spanLo - tol || bx.minY > spanHi + tol) continue;
      for (const d of [e.ax - bx.minX, e.ax - bx.maxX]) {
        if (Math.abs(d) < bestX) { bestX = Math.abs(d); dx = d; }
      }
    } else if (horizontal) {
      const spanLo = Math.min(e.ax, e.bx), spanHi = Math.max(e.ax, e.bx);
      if (bx.maxX < spanLo - tol || bx.minX > spanHi + tol) continue;
      for (const d of [e.ay - bx.minY, e.ay - bx.maxY]) {
        if (Math.abs(d) < bestY) { bestY = Math.abs(d); dy = d; }
      }
    }
  }
  return { ...box, x: box.x + dx, y: box.y + dy };
}

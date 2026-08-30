// render.js — reads State, draws the plan. Everything is drawn in SCREEN space
// (world points are pushed through w2s) so line weights and type stay crisp at
// any zoom, the way a drafting view should behave.

let canvas, ctx, dpr = 1;

function initRender(el) {
  canvas = el;
  ctx = canvas.getContext('2d');
  resizeCanvas();
}

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
}

function viewW() { return canvas.width / dpr; }
function viewH() { return canvas.height / dpr; }

function w2s(x, y) {
  const v = State.view;
  return [x * v.z + v.ox, y * v.z + v.oy];
}
function s2w(sx, sy) {
  const v = State.view;
  return [(sx - v.ox) / v.z, (sy - v.oy) / v.z];
}

function fitView() {
  const b = State.geo.bounds;
  const z = Math.min(
    (viewW() - FIT_PADDING_PX * 2) / b.w,
    (viewH() - FIT_PADDING_PX * 2) / b.h
  );
  State.view.z = Math.max(PX_PER_IN_MIN, Math.min(PX_PER_IN_MAX, z));
  State.view.ox = (viewW() - b.w * State.view.z) / 2 - b.minX * State.view.z;
  State.view.oy = (viewH() - b.h * State.view.z) / 2 - b.minY * State.view.z;
}

function zoomAt(sx, sy, factor) {
  const v = State.view;
  const [wx, wy] = s2w(sx, sy);
  v.z = Math.max(PX_PER_IN_MIN, Math.min(PX_PER_IN_MAX, v.z * factor));
  v.ox = sx - wx * v.z;
  v.oy = sy - wy * v.z;
}

// --- path helpers -----------------------------------------------------------

function pathPoly(poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    const [sx, sy] = w2s(x, y);
    i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
  });
  ctx.closePath();
}

function pathRect(r) {
  pathPoly(rectPoly(r.x, r.y, r.w, r.d));
}

function label(text, x, y, opts) {
  opts = opts || {};
  const [sx, sy] = w2s(x, y);
  ctx.font = opts.font || '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.bg) {
    const m = ctx.measureText(text);
    const pad = 4;
    ctx.fillStyle = opts.bg;
    ctx.fillRect(sx - m.width / 2 - pad, sy - 8, m.width + pad * 2, 16);
  }
  ctx.fillStyle = opts.color || COLORS.roomLabel;
  ctx.fillText(text, sx, sy);
}

// --- layers -----------------------------------------------------------------

function drawGrid() {
  if (!State.showGrid) return;
  const b = State.geo.bounds;
  ctx.save();
  pathPoly(State.geo.outline);
  ctx.clip();
  ctx.lineWidth = 1;
  const fine = State.view.z > 1.6;
  for (let x = Math.floor(b.minX / GRID_IN) * GRID_IN; x <= b.maxX; x += GRID_IN) {
    const major = Math.abs(x % 60) < 0.001;
    if (!fine && !major) continue;
    ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
    const [sx, sy0] = w2s(x, b.minY);
    const [, sy1] = w2s(x, b.maxY);
    ctx.beginPath();
    ctx.moveTo(Math.round(sx) + 0.5, sy0);
    ctx.lineTo(Math.round(sx) + 0.5, sy1);
    ctx.stroke();
  }
  for (let y = Math.floor(b.minY / GRID_IN) * GRID_IN; y <= b.maxY; y += GRID_IN) {
    const major = Math.abs(y % 60) < 0.001;
    if (!fine && !major) continue;
    ctx.strokeStyle = major ? COLORS.gridMajor : COLORS.grid;
    const [sx0, sy] = w2s(b.minX, y);
    const [sx1] = w2s(b.maxX, y);
    ctx.beginPath();
    ctx.moveTo(sx0, Math.round(sy) + 0.5);
    ctx.lineTo(sx1, Math.round(sy) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShell() {
  const geo = State.geo;

  if (geo.balcony) {
    ctx.fillStyle = COLORS.balcony;
    pathPoly(geo.balcony);
    ctx.fill();
    ctx.strokeStyle = COLORS.fixtureLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.shadowColor = 'rgba(35,32,28,0.16)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = COLORS.floor;
  pathPoly(geo.outline);
  ctx.fill();
  ctx.restore();

  drawGrid();

  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = Math.max(2.5, EXT_T * State.view.z);
  ctx.lineJoin = 'miter';
  pathPoly(geo.outline);
  ctx.stroke();

  ctx.fillStyle = COLORS.wall;
  for (const w of geo.walls) {
    pathRect(w);
    ctx.fill();
  }
}

function drawWindows() {
  const t = Math.max(3, EXT_T * State.view.z);
  ctx.lineCap = 'butt';
  for (const w of State.geo.windows) {
    const [ax, ay] = w2s(w.ax, w.ay);
    const [bx, by] = w2s(w.bx, w.by);
    ctx.strokeStyle = COLORS.floor;
    ctx.lineWidth = t;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = COLORS.window;
    ctx.lineWidth = Math.max(1.5, t * 0.34);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
}

function drawDoors() {
  for (const d of State.geo.doors) {
    if (d.open) {
      const [ax, ay] = w2s(d.ax, d.ay);
      const [bx, by] = w2s(d.bx, d.by);
      ctx.strokeStyle = COLORS.floor;
      ctx.lineWidth = Math.max(3, EXT_T * State.view.z);
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = COLORS.doorArc;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const [hx, hy] = w2s(d.hx, d.hy);
    const r = d.w * State.view.z;
    const a0 = d.a0 * DEG;
    const a1 = (d.a0 + d.sweep) * DEG;

    ctx.strokeStyle = COLORS.floor;
    ctx.lineWidth = Math.max(3, EXT_T * State.view.z + 1);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(a0) * r, hy + Math.sin(a0) * r);
    ctx.stroke();

    ctx.strokeStyle = COLORS.doorArc;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(hx, hy, r, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();

    ctx.strokeStyle = COLORS.wallLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(a1) * r, hy + Math.sin(a1) * r);
    ctx.stroke();
  }
}

const ROUND_TYPES = { toilet: 1, heater: 1 };

function drawFixture(f) {
  const cx = f.x + f.w / 2, cy = f.y + f.d / 2;
  const z = State.view.z;
  ctx.fillStyle = COLORS.fixture;
  ctx.strokeStyle = COLORS.fixtureLine;
  ctx.lineWidth = 1;

  if (ROUND_TYPES[f.type]) {
    const [sx, sy] = w2s(cx, cy);
    ctx.beginPath();
    ctx.ellipse(sx, sy, (f.w / 2) * z, (f.d / 2) * z, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (f.type === 'rod' || f.type === 'shelf') {
    ctx.lineWidth = f.type === 'rod' ? 2 : 1;
    pathRect(f);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else {
    pathRect(f);
    ctx.fill(); ctx.stroke();
  }

  if (f.type === 'tub') {
    pathRect({ x: f.x + 4, y: f.y + 4, w: f.w - 8, d: f.d - 8 });
    ctx.stroke();
  }
  if (f.type === 'shower') {
    const [ax, ay] = w2s(f.x, f.y), [bx, by] = w2s(f.x + f.w, f.y + f.d);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  if (f.type === 'range') {
    for (const p of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) {
      const [sx, sy] = w2s(f.x + f.w * p[0], f.y + f.d * p[1]);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.5, 2.2 * z / 2.2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (f.type === 'sink' || f.type === 'island') {
    const bw = Math.min(f.w, f.d) * 0.5;
    const [sx, sy] = w2s(cx, f.type === 'island' ? f.y + f.d * 0.28 : cy);
    ctx.beginPath();
    ctx.ellipse(sx, sy, (bw / 2) * z, (bw / 2) * z * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (f.type === 'washer' || f.type === 'dryer') {
    const [sx, sy] = w2s(cx, cy);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.min(f.w, f.d) * 0.32 * z, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (f.type === 'fridge' || f.type === 'dishwasher') {
    ctx.beginPath();
    if (f.d > f.w) {
      const [ax, ay] = w2s(f.x, cy), [bx, by] = w2s(f.x + f.w, cy);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    } else {
      const [ax, ay] = w2s(cx, f.y), [bx, by] = w2s(cx, f.y + f.d);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }
  if (f.label && z > 1.3) {
    label(f.label, cx, cy, {
      color: COLORS.fixtureLine,
      font: '10px ui-sans-serif, system-ui, sans-serif'
    });
  }
}

function drawRooms() {
  const z = State.view.z;
  for (const r of State.geo.rooms) {
    const b = polygonBounds(r.poly);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    if (b.w * z < 70 || b.h * z < 34) {
      if (b.w * z > 32 && b.h * z > 16) {
        label(r.name, cx, cy, { font: '9px ui-sans-serif, system-ui, sans-serif' });
      }
      continue;
    }
    label(r.name.toUpperCase(), cx, r.label ? cy - 9 : cy, {
      font: '600 11px ui-sans-serif, system-ui, sans-serif',
      color: COLORS.roomLabel
    });
    if (r.label) {
      // Measured off the polygon rather than reprinted from the leasing plan,
      // so a corrected wall shows its corrected number.
      label(`${fmtIn(b.w)} x ${fmtIn(b.h)}`, cx, cy + 9, {
        font: '11px ui-monospace, SFMono-Regular, Menlo, monospace',
        color: COLORS.dimLine
      });
    }
  }
}

function drawItem(it, clash) {
  const corners = boxCorners(it);
  const z = State.view.z;
  const rug = it.category === 'rugs';

  ctx.save();
  if (it.shape === 'round') {
    const [sx, sy] = w2s(it.x, it.y);
    ctx.beginPath();
    ctx.ellipse(sx, sy, (it.w / 2) * z, (it.d / 2) * z, it.rot * DEG, 0, Math.PI * 2);
  } else {
    pathPoly(corners);
  }
  ctx.fillStyle = CATEGORY_COLORS[it.category] || '#cccccc';
  ctx.globalAlpha = rug ? 0.5 : 0.95;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = clash ? 2.5 : 1.4;
  ctx.strokeStyle = clash ? COLORS.clash : COLORS.wall;
  if (rug) ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.restore();

  if (!rug && it.shape !== 'round') {
    const [ax, ay] = w2s(corners[0][0], corners[0][1]);
    const [bx, by] = w2s(corners[1][0], corners[1][1]);
    ctx.strokeStyle = 'rgba(35,32,28,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }

  if (Math.min(it.w, it.d) * z > 24 && it.w * z > 52) {
    const [sx, sy] = w2s(it.x, it.y);
    ctx.save();
    ctx.translate(sx, sy);
    let a = it.rot;
    if (a > 90 && a < 270) a -= 180;
    ctx.rotate(a * DEG);
    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(35,32,28,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.name, 0, 0);
    ctx.restore();
  }
}

function rotateHandlePos(it) {
  const a = (it.rot - 90) * DEG;
  const [sx, sy] = w2s(it.x, it.y);
  const r = (it.d / 2) * State.view.z + HANDLE_OFFSET_PX;
  return [sx + Math.cos(a) * r, sy + Math.sin(a) * r];
}

function drawSelection(it) {
  const corners = boxCorners(it);
  pathPoly(corners);
  ctx.strokeStyle = COLORS.select;
  ctx.lineWidth = 2;
  ctx.stroke();

  const [hx, hy] = rotateHandlePos(it);
  const [mx, my] = w2s((corners[0][0] + corners[1][0]) / 2, (corners[0][1] + corners[1][1]) / 2);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(hx, hy, HANDLE_PX * 0.62, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
}

// Live gaps from each face of the selected item out to whatever is nearest.
// This is the "will it fit / can we walk past it" readout.
function drawClearances(it) {
  if (!State.showClearance) return;
  const segs = obstacleSegs(it.uid);
  for (const c of boxClearances(it, segs)) {
    if (!isFinite(c.dist) || c.dist < 0.6 || c.dist > 240) continue;
    const [ax, ay] = w2s(c.px, c.py);
    const [bx, by] = w2s(c.px + c.dx * c.dist, c.py + c.dy * c.dist);
    ctx.strokeStyle = COLORS.measure;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.measure;
    for (const p of [[ax, ay], [bx, by]]) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, Math.PI * 2); ctx.fill();
    }
    label(fmtIn(c.dist), c.px + c.dx * c.dist / 2, c.py + c.dy * c.dist / 2, {
      font: '600 10px ui-monospace, SFMono-Regular, Menlo, monospace',
      color: COLORS.measure,
      bg: COLORS.measureBg
    });
  }
}

function drawOverallDims() {
  const b = State.geo.bounds;
  const off = 22;
  const [x0, y0] = w2s(b.minX, b.minY);
  const [x1, y1] = w2s(b.maxX, b.maxY);
  ctx.strokeStyle = COLORS.dimLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - off); ctx.lineTo(x1, y0 - off);
  ctx.moveTo(x0, y0 - off - 4); ctx.lineTo(x0, y0 - off + 4);
  ctx.moveTo(x1, y0 - off - 4); ctx.lineTo(x1, y0 - off + 4);
  ctx.moveTo(x0 - off, y0); ctx.lineTo(x0 - off, y1);
  ctx.moveTo(x0 - off - 4, y0); ctx.lineTo(x0 - off + 4, y0);
  ctx.moveTo(x0 - off - 4, y1); ctx.lineTo(x0 - off + 4, y1);
  ctx.stroke();
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.dimLine;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(fmtIn(b.w), (x0 + x1) / 2, y0 - off - 6);
  ctx.save();
  ctx.translate(x0 - off - 6, (y0 + y1) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(fmtIn(b.h), 0, 0);
  ctx.restore();
}

// --- entry point ------------------------------------------------------------

function render() {
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewW(), viewH());
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, viewW(), viewH());
  if (!State.geo) return;

  drawShell();
  for (const f of State.geo.fixtures) drawFixture(f);
  drawWindows();
  drawDoors();
  drawRooms();

  for (const it of State.items) if (it.category === 'rugs') drawItem(it, itemClashes(it));
  for (const it of State.items) if (it.category !== 'rugs') drawItem(it, itemClashes(it));

  const sel = selectedItem();
  if (sel) {
    drawSelection(sel);
    drawClearances(sel);
  }
  drawOverallDims();
}

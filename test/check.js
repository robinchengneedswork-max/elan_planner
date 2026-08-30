// test/check.js — headless geometry check for the floor plans.
// Loads src/*.js into a vm context the same way index.html loads them.
// Top-level `const` is not a property of a vm context object, so the last
// script is an explicit export snippet that hoists what the assertions need.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PLAN_FILES = ['a1', 'a2', 'a2h', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8']
  .map((n) => `src/data/plans/${n}.js`)
  .filter((f) => fs.existsSync(path.join(ROOT, f)));

const FILES = [
  'src/config.js',
  'src/geometry.js',
  'src/data/plans/index.js',
  ...PLAN_FILES,
  'src/data/ikea.js'
].filter((f) => fs.existsSync(path.join(ROOT, f)));

const EXPORT_SNIPPET = `
  globalThis.API = {
    PLANS, PLAN_ORDER, buildPlan, obstacleAsBox,
    polygonArea, polygonBounds, pointInPolygon, polygonEdges, rectPoly,
    boxCorners, boxesOverlap, boxOutsidePolygon, boxClearances,
    fmtIn, parseIn, WALL_T,
    IKEA: (typeof IKEA !== 'undefined' ? IKEA : null)
  };
`;

const ctx = vm.createContext({ console, Math, JSON });
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
vm.runInContext(EXPORT_SNIPPET, ctx, { filename: 'exports' });
const API = ctx.API;

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

function boxInside(o, outline) {
  const c = API.rectPoly(o.x, o.y, o.w, o.d);
  // inset a hair so a fixture flush against a wall is not "outside"
  const cx = o.x + o.w / 2, cy = o.y + o.d / 2;
  return c.every(([x, y]) => {
    const ix = x + Math.sign(cx - x) * 0.5;
    const iy = y + Math.sign(cy - y) * 0.5;
    return API.pointInPolygon(ix, iy, outline);
  });
}

function onAWall(pt, segs) {
  const [px, py] = pt;
  return segs.some((s) => {
    const ex = s.bx - s.ax, ey = s.by - s.ay;
    const len2 = ex * ex + ey * ey;
    if (!len2) return false;
    let t = ((px - s.ax) * ex + (py - s.ay) * ey) / len2;
    t = Math.max(0, Math.min(1, t));
    const dx = px - (s.ax + ex * t), dy = py - (s.ay + ey * t);
    return Math.hypot(dx, dy) <= WALL_T_TOL;
  });
}
const WALL_T_TOL = 6.5;

console.log(`\nElan Planner — plan geometry (${API.PLAN_ORDER.length} plans)\n`);

for (const id of API.PLAN_ORDER) {
  const geo = API.buildPlan(id);
  const def = API.PLANS[id];
  const drift = Math.abs(geo.areaSqft - def.sqft) / def.sqft;
  console.log(
    `${id.padEnd(4)} ${String(def.sqft).padStart(5)} sqft published · ` +
    `${geo.areaSqft.toFixed(1).padStart(6)} drawn · ${(drift * 100).toFixed(1)}% drift · ` +
    `${geo.walls.length} walls · ${geo.fixtures.length} fixtures`
  );

  check(`${id} area within 3% of published`, drift <= 0.03, `${(drift * 100).toFixed(1)}%`);
  check(`${id} outline is a simple closed polygon`, geo.outline.length >= 4);

  for (const w of geo.walls) {
    check(`${id} wall inside outline`, boxInside(w, geo.outline), JSON.stringify(w));
  }
  for (const f of geo.fixtures) {
    check(`${id} fixture ${f.type} inside outline`, boxInside(f, geo.outline), JSON.stringify(f));
  }

  // Fixtures may touch walls but must not be buried in them.
  const wallBoxes = geo.walls.map(API.obstacleAsBox);
  for (const f of geo.fixtures) {
    const fb = API.obstacleAsBox(f);
    const buried = wallBoxes.some((w) => API.boxesOverlap(fb, w, 1.5));
    check(`${id} fixture ${f.type} not inside a wall`, !buried, JSON.stringify(f));
  }

  // Rooms must be real and land inside the shell.
  for (const r of geo.rooms) {
    check(`${id} room ${r.name} has area`, API.polygonArea(r.poly) > 100, r.name);
  }

  // Doors and windows have to sit on something solid.
  for (const w of geo.windows) {
    check(`${id} window on a wall`, onAWall([(w.ax + w.bx) / 2, (w.ay + w.by) / 2], geo.segs));
  }
  for (const d of geo.doors) {
    const pt = d.open ? [(d.ax + d.bx) / 2, (d.ay + d.by) / 2] : [d.hx, d.hy];
    check(`${id} door on a wall`, onAWall(pt, geo.segs), JSON.stringify(pt));
  }

  // The printed room callouts are the whole point — they must survive the build.
  for (const r of geo.rooms) {
    if (!r.label) continue;
    const b = API.polygonBounds(r.poly);
    const m = r.label.match(/(\d+)'(\d+)"\s*x\s*(\d+)'(\d+)"/);
    if (!m) continue;
    const a = +m[1] * 12 + +m[2], c = +m[3] * 12 + +m[4];
    const got = [b.w, b.h].sort((p, q) => p - q);
    const want = [a, c].sort((p, q) => p - q);
    check(
      `${id} ${r.name} matches its printed callout ${r.label}`,
      Math.abs(got[0] - want[0]) < 1 && Math.abs(got[1] - want[1]) < 1,
      `drawn ${API.fmtIn(b.w)} x ${API.fmtIn(b.h)}`
    );
  }
}

// --- catalog ----------------------------------------------------------------
if (API.IKEA) {
  console.log(`\nIKEA catalog — ${API.IKEA.length} items\n`);
  const ids = new Set();
  for (const it of API.IKEA) {
    check(`catalog ${it.id} unique`, !ids.has(it.id), it.id);
    ids.add(it.id);
    check(`catalog ${it.id} has sane dims`, it.w > 4 && it.w < 200 && it.d > 4 && it.d < 200,
      `${it.w} x ${it.d}`);
    check(`catalog ${it.id} has a category colour`, !!CATEGORY_COLORS_LOOKUP(it.category), it.category);
    check(`catalog ${it.id} has a product url`, /^https:\/\/www\.ikea\.com\//.test(it.url || ''), it.url);
  }
  const unverified = API.IKEA.filter((i) => !i.verified);
  console.log(`  ${API.IKEA.length - unverified.length} verified against ikea.com, ${unverified.length} flagged`);
}
function CATEGORY_COLORS_LOOKUP(c) {
  return vm.runInContext(`CATEGORY_COLORS[${JSON.stringify(c)}]`, ctx);
}

// --- geometry primitives ----------------------------------------------------
console.log('\nGeometry primitives\n');
check('polygonArea of a 12x12 square is 144', API.polygonArea(API.rectPoly(0, 0, 12, 12)) === 144);
check('fmtIn(141) is 11\'9"', API.fmtIn(141) === `11'9"`);
check('parseIn round-trips 11\'9"', API.parseIn(`11'9"`) === 141);
check('parseIn accepts bare inches', API.parseIn('141') === 141);
check('boxesOverlap catches an overlap',
  API.boxesOverlap({ x: 0, y: 0, w: 20, d: 20, rot: 0 }, { x: 10, y: 10, w: 20, d: 20, rot: 0 }));
check('boxesOverlap ignores a flush touch',
  !API.boxesOverlap({ x: 0, y: 0, w: 20, d: 20, rot: 0 }, { x: 20, y: 0, w: 20, d: 20, rot: 0 }));
check('rotation is honest: 45deg box clips its neighbour',
  API.boxesOverlap({ x: 0, y: 0, w: 20, d: 20, rot: 45 }, { x: 22, y: 0, w: 20, d: 20, rot: 0 }));
check('boxOutsidePolygon flags an item through the wall',
  API.boxOutsidePolygon({ x: 5, y: 5, w: 20, d: 20, rot: 0 }, API.rectPoly(0, 0, 100, 100)));
check('boxClearances measures to the shell', (() => {
  const segs = API.polygonEdges(API.rectPoly(0, 0, 100, 100));
  const c = API.boxClearances({ x: 50, y: 50, w: 20, d: 20, rot: 0 }, segs);
  return c.every((s) => Math.abs(s.dist - 40) < 0.2);
})());

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

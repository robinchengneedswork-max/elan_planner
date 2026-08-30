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
  'src/data/ikea.js',
  // The custom-furniture side is logic, not DOM, so it loads here too. Its UI
  // lives in src/custom-ui.js and is deliberately not part of this harness.
  'src/state.js',
  'src/layouts.js',
  'src/custom.js'
].filter((f) => fs.existsSync(path.join(ROOT, f)));

const EXPORT_SNIPPET = `
  globalThis.API = {
    PLANS, PLAN_ORDER, buildPlan, obstacleAsBox,
    polygonArea, polygonBounds, pointInPolygon, polygonEdges, rectPoly,
    boxCorners, boxesOverlap, boxOutsidePolygon, boxClearances,
    fmtIn, parseIn, WALL_T,
    IKEA: (typeof IKEA !== 'undefined' ? IKEA : null),
    custom: (typeof catalogAll !== 'function' ? null : {
      State, CATEGORY_LABELS,
      catalogAll, catalogById, loadCustom, saveCustomItem, deleteCustomItem,
      validateCustomDraft, safeHttpUrl, safeImgSrc, brandFromUrl, guessNameFromUrl,
      placedUsingCatalogId,
      list: () => CUSTOM
    })
  };
`;

// localStorage is the whole persistence layer for saved layouts and custom
// furniture, so the harness brings its own — including a switch that makes a
// write fail, which is the quota case the editor has to survive.
function fakeStorage() {
  const map = new Map();
  return {
    full: false,
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      if (this.full) throw new Error('QuotaExceededError');
      map.set(k, String(v));
    },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); }
  };
}
const storage = fakeStorage();

const ctx = vm.createContext({ console, Math, JSON, URL, localStorage: storage });
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
    check(`catalog ${it.id} has a price`, typeof it.price === 'number' && it.price > 0, String(it.price));

    // The photo is vendored, not hotlinked — so a missing file is a broken
    // image in the sidebar, and only this check would catch it.
    check(`catalog ${it.id} names a photo`, /^img\/[a-z0-9-]+\.jpg$/.test(it.img || ''), it.img);
    check(`catalog ${it.id} photo exists on disk`,
      !!it.img && fs.existsSync(path.join(ROOT, it.img)), it.img);

    // Optional fields, but wrong is worse than absent.
    if (it.h != null) {
      check(`catalog ${it.id} has a sane height`, it.h > 4 && it.h < 100, String(it.h));
    }
    if (it.color) {
      check(`catalog ${it.id} colour is a hex triple`, /^#[0-9a-f]{6}$/.test(it.color.hex), it.color.hex);
      check(`catalog ${it.id} colour is named`, !!it.color.name, JSON.stringify(it.color));
    }
    if (it.rating != null) {
      check(`catalog ${it.id} rating is 0..5`, it.rating >= 0 && it.rating <= 5, String(it.rating));
      check(`catalog ${it.id} rating has a review count`,
        typeof it.reviews === 'number' && it.reviews >= 0, String(it.reviews));
    }
  }
  const unverified = API.IKEA.filter((i) => !i.verified);
  console.log(`  ${API.IKEA.length - unverified.length} verified against ikea.com, ${unverified.length} flagged`);
  console.log(`  ${API.IKEA.filter((i) => i.img).length} photos, ` +
    `${API.IKEA.filter((i) => i.color).length} colours, ` +
    `${API.IKEA.filter((i) => i.rating != null).length} ratings, ` +
    `${API.IKEA.filter((i) => i.h != null).length} heights`);

  // Nothing outside img/ should be sitting in there unreferenced.
  const referenced = new Set(API.IKEA.map((i) => i.img && path.basename(i.img)).filter(Boolean));
  const onDisk = fs.existsSync(path.join(ROOT, 'img'))
    ? fs.readdirSync(path.join(ROOT, 'img')).filter((f) => f.endsWith('.jpg')) : [];
  const orphans = onDisk.filter((f) => !referenced.has(f));
  check('img/ has no orphaned photos', orphans.length === 0, orphans.join(', '));
}
function CATEGORY_COLORS_LOOKUP(c) {
  return vm.runInContext(`CATEGORY_COLORS[${JSON.stringify(c)}]`, ctx);
}

// --- your own furniture -----------------------------------------------------
//
// A custom piece has to be indistinguishable from a catalogue piece downstream,
// and it arrives from a form and from localStorage — both of which are user
// input. So the checks are of two kinds: does it come out the right shape, and
// does the wrong thing get rejected rather than drawn.
if (API.custom) {
  const C = API.custom;
  console.log('\nCustom furniture\n');

  const baseline = C.catalogAll().length;

  // Links: a product url ends up in an href and a photo in an img src.
  check('safeHttpUrl keeps an https link', C.safeHttpUrl('https://a.com/x') === 'https://a.com/x');
  check('safeHttpUrl rejects javascript:', C.safeHttpUrl('javascript:alert(1)') === '');
  check('safeHttpUrl rejects a bare word', C.safeHttpUrl('amazon') === '');
  check('safeImgSrc keeps an inline image',
    C.safeImgSrc('data:image/png;base64,iVBORw0KGgo=') !== '');
  check('safeImgSrc rejects a data: script',
    C.safeImgSrc('data:text/html;base64,PHNjcmlwdD4=') === '');
  check('safeImgSrc keeps a vendored catalogue photo', C.safeImgSrc('img/kivik-loveseat.jpg') !== '');

  check('brandFromUrl reads Amazon', C.brandFromUrl('https://www.amazon.com/dp/B01') === 'Amazon');
  check('brandFromUrl keeps IKEA capitalised', C.brandFromUrl('https://www.ikea.com/us/en/p/x') === 'IKEA');
  check('brandFromUrl handles a co.uk host', C.brandFromUrl('https://www.wayfair.co.uk/a/b') === 'Wayfair');
  check('guessNameFromUrl reads the Amazon slug',
    C.guessNameFromUrl('https://www.amazon.com/Zinus-Shalini-Platform-Bed/dp/B07XYZ') ===
      'Zinus Shalini Platform Bed', C.guessNameFromUrl('https://www.amazon.com/Zinus-Shalini-Platform-Bed/dp/B07XYZ'));
  check('guessNameFromUrl gives up on a bare SKU',
    C.guessNameFromUrl('https://www.amazon.com/dp/B07XYZ') === '');

  // Validation.
  const good = {
    name: 'Zinus Shalini', type: 'Platform bed', category: 'beds',
    w: `5'3"`, d: '83', h: '48', price: '$319.99',
    colorName: 'grey', colorHex: '#8a8a8a', rating: '4.5', reviews: '12,431',
    url: 'https://www.amazon.com/Zinus-Shalini/dp/B07XYZ'
  };
  const v = C.validateCustomDraft(good);
  check('a good draft validates', v.ok, (v.errors || []).join(' '));
  if (v.ok) {
    check('feet-and-inches width becomes inches', v.item.w === 63, String(v.item.w));
    check('bare inches stay inches', v.item.d === 83, String(v.item.d));
    check('a dollar sign does not defeat the price', v.item.price === 319.99, String(v.item.price));
    check('review commas are stripped', v.item.reviews === 12431, String(v.item.reviews));
    check('the brand is read off the link', v.item.brand === 'Amazon', v.item.brand);
    check('a custom entry is marked custom', v.item.custom === true);
    check('a custom id is namespaced', /^custom-\d+$/.test(v.item.id), v.item.id);
  }

  const bad = [
    ['no name', { ...good, name: '  ' }],
    ['no category', { ...good, category: '' }],
    ['a made-up category', { ...good, category: 'spaceships' }],
    ['a width that is not a measurement', { ...good, w: 'big' }],
    ['a width of zero', { ...good, w: '0' }],
    ['a width past 25 ft', { ...good, w: '400' }],
    ['a negative price', { ...good, price: '-20' }],
    ['a rating above 5', { ...good, rating: '9' }],
    ['a colour without a hex', { ...good, colorHex: 'greyish' }],
    ['a javascript: product link', { ...good, url: 'javascript:alert(1)' }],
  ];
  for (const [why, draft] of bad) {
    const r = C.validateCustomDraft(draft);
    check(`rejects ${why}`, !r.ok && r.errors.length > 0);
  }
  check('height is optional', C.validateCustomDraft({ ...good, h: '' }).ok);
  check('price is optional', C.validateCustomDraft({ ...good, price: '' }).ok);
  check('a link is optional', C.validateCustomDraft({ ...good, url: '' }).ok);

  // Saving, editing, deleting — through the real localStorage path.
  const saved = C.saveCustomItem(good);
  check('saving a piece succeeds', saved.ok, (saved.errors || []).join(' '));
  check('it joins the merged catalogue', C.catalogAll().length === baseline + 1);
  check('it is findable by id', !!C.catalogById(saved.item.id));
  check('the IKEA entries are still findable', !!C.catalogById('kivik-loveseat'));

  const second = C.saveCustomItem({ ...good, name: 'Another' });
  check('a second piece gets its own id', second.ok && second.item.id !== saved.item.id,
    second.ok ? second.item.id : '');
  check('two pieces, two rows', C.catalogAll().length === baseline + 2);

  const edited = C.saveCustomItem({ ...good, id: saved.item.id, price: '250' });
  check('an edit keeps the same id', edited.ok && edited.item.id === saved.item.id);
  check('an edit does not add a row', C.catalogAll().length === baseline + 2);
  check('an edit changes the price', C.catalogById(saved.item.id).price === 250);

  // A piece on the floor keeps its own size and name, so deleting the
  // catalogue entry under it must not be silent.
  C.State.items.push({ uid: 'i1', catId: saved.item.id, name: 'Zinus Shalini', category: 'beds', w: 63, d: 83, x: 0, y: 0, rot: 0 });
  check('placed pieces are counted before a delete', C.placedUsingCatalogId(saved.item.id) === 1);
  C.State.items.length = 0;

  // Survives a reload: same list, read back through the same validator.
  C.loadCustom();
  check('custom pieces survive a reload', C.catalogAll().length === baseline + 2);
  check('a reloaded piece keeps its id', !!C.catalogById(saved.item.id));
  check('a reloaded piece keeps its price', C.catalogById(saved.item.id).price === 250);

  const goneId = second.item.id;
  check('deleting removes it', C.deleteCustomItem(goneId) === true);
  check('deleting an unknown id is a no-op', C.deleteCustomItem('custom-9999') === false);
  C.loadCustom();
  check('the delete persisted', C.catalogAll().length === baseline + 1);

  // A placed piece keeps its catId after the entry under it is deleted, so
  // handing that id to a different product later would quietly give the orphan
  // somebody else's price.
  const afterDelete = C.saveCustomItem({ ...good, name: 'Replacement' });
  check('a deleted id is never handed out again', afterDelete.item.id !== goneId, afterDelete.item.id);
  C.deleteCustomItem(afterDelete.item.id);
  C.loadCustom();

  // localStorage is a text file the user can edit. Junk gets dropped, not drawn.
  const blob = JSON.parse(storage.getItem('elan-planner:v1'));
  blob.custom = [
    null,
    { id: 'custom-40', name: 'No dims', category: 'beds' },
    { id: 'custom-41', name: 'Bad category', category: 'nonsense', w: 20, d: 20 },
    { id: 'custom-42', name: 'Fine', category: 'beds', w: 60, d: 80 },
    { id: 'custom-42', name: 'Duplicate id', category: 'beds', w: 60, d: 80 },
  ];
  storage.setItem('elan-planner:v1', JSON.stringify(blob));
  C.loadCustom();
  check('a corrupt stored catalogue keeps only the good rows', C.list().length === 1,
    JSON.stringify(C.list().map((i) => i.name)));
  check('the survivor is the valid one', C.list()[0] && C.list()[0].name === 'Fine');
  check('an id is never reused after a corrupt load',
    !/^custom-42$/.test(C.validateCustomDraft(good).item.id));

  // Out of storage: the catalogue must be left exactly as it was, not holding
  // a piece that will vanish on the next reload.
  const before = C.catalogAll().length;
  storage.full = true;
  const failed = C.saveCustomItem({ ...good, name: 'Too big' });
  storage.full = false;
  check('a failed write is reported', !failed.ok && /storage/i.test(failed.errors[0]),
    JSON.stringify(failed.errors));
  check('a failed write is rolled back', C.catalogAll().length === before);
  check('a failed edit leaves the old values', (() => {
    const keep = C.list()[0];
    storage.full = true;
    C.saveCustomItem({ ...good, id: keep.id, name: 'Clobbered', price: '1' });
    storage.full = false;
    return C.catalogById(keep.id).name === keep.name && C.catalogById(keep.id).price === keep.price;
  })());

  // And the finished article has to clear the same bar as a catalogue row.
  storage.clear();
  C.loadCustom();
  const mine = C.saveCustomItem(good).item;
  check('a custom row has sane dims', mine.w > 4 && mine.w < 200 && mine.d > 4 && mine.d < 200);
  check('a custom row has a category colour', !!CATEGORY_COLORS_LOOKUP(mine.category), mine.category);
  check('a custom row has a type', !!mine.type);
  check('a custom row without a photo has an empty img, not a broken one', (() => {
    const noPhoto = C.validateCustomDraft({ ...good, img: '' });
    return noPhoto.ok && noPhoto.item.img === '';
  })());
  storage.clear();
  C.loadCustom();
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

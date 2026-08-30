// data/plans/index.js — plan registry + the shared vocabulary every A-plan
// builder draws from.
//
// The leasing renders (ref/*.jpg) print each unit's room dimensions but not
// its closet, hall or fixture sizes, so every plan is reconstructed: the two
// labelled rooms go in at their exact printed size, the service core is sized
// from real-world constants in config.js, and the envelope is solved so the
// floor area lands on the published square footage. Each builder takes a flat
// `params` object of inch values, which is what the calibration panel edits.

const PLANS = {};
const PLAN_ORDER = [];

function definePlan(def) {
  PLANS[def.id] = def;
  PLAN_ORDER.push(def.id);
}

// --- construction helpers ---------------------------------------------------

// Axis-aligned rect from top-left. Walls and fixtures both use this shape.
function box(x, y, w, d, extra) {
  return Object.assign({ x, y, w, d }, extra || {});
}

function fx(type, x, y, w, d, extra) {
  return Object.assign({ type, x, y, w, d }, extra || {});
}

function room(name, label, poly) {
  return { name, label, poly };
}

// A window is a run along a wall face.
function win(ax, ay, bx, by) {
  return { ax, ay, bx, by };
}

// A hinged door: leaf pivots at (hx,hy), points along `a0` degrees when shut,
// and sweeps `sweep` degrees (sign picks the swing side).
function door(hx, hy, w, a0, sweep) {
  return { hx, hy, w, a0, sweep };
}

// A cased opening or bifold — drawn as a gap, no swing arc.
function opening(ax, ay, bx, by) {
  return { ax, ay, bx, by, open: true };
}

// --- assembly ---------------------------------------------------------------

function rectEdges(r) {
  return polygonEdges(rectPoly(r.x, r.y, r.w, r.d));
}

// Runs a plan's builder and derives everything the rest of the app needs:
// collision segments, obstacle boxes, bounds and the actual drawn area.
function buildPlan(id, overrides) {
  const def = PLANS[id];
  if (!def) throw new Error('unknown plan ' + id);
  const params = Object.assign({}, def.params, overrides || {});
  const geo = def.build(params);

  geo.id = def.id;
  geo.sqft = def.sqft;
  geo.ref = def.ref;
  geo.params = params;
  geo.walls = geo.walls || [];
  geo.fixtures = geo.fixtures || [];
  geo.rooms = geo.rooms || [];
  geo.doors = geo.doors || [];
  geo.windows = geo.windows || [];
  geo.balcony = geo.balcony || null;

  // Everything a piece of furniture can bump into.
  geo.obstacles = []
    .concat(geo.walls.map((w) => ({ ...w, kind: 'wall' })))
    .concat(geo.fixtures.map((f) => ({ ...f, kind: 'fixture' })));

  // Segments used for clearance rays: the outer shell plus every obstacle face.
  geo.segs = polygonEdges(geo.outline);
  for (const o of geo.obstacles) geo.segs = geo.segs.concat(rectEdges(o));

  // Faces furniture snaps flush against.
  geo.snapEdges = geo.segs;

  // Bounds include the balcony so "fit to window" does not crop it, but
  // containment tests keep using `outline` — furniture belongs indoors.
  geo.bounds = polygonBounds(geo.balcony ? geo.outline.concat(geo.balcony) : geo.outline);
  geo.areaSqft = polygonArea(geo.outline) / 144;
  return geo;
}

// --- the shared A-plan skeleton --------------------------------------------
//
// Six of the nine one-bedrooms are the same rectangle read two ways: the
// living zone and the bedroom sit along the window wall, and a service band
// runs down the far side of the bedroom — hall, then the W/D and mechanical
// closets, then the bath. A1 is drawn separately because its bath is on the
// opposite side; these five share this builder and differ only in numbers.
//
//   |<-- LIV_W -->|  |<- HALL ->|<- SVC ->|<- BATH ->|
//   +-------------+--+----------+---------+----------+  0
//   | living zone |  |          bedroom              |
//   |             |  +----------+---------+----------+  BED_D
//   |             |  |  hall    |     walk-in        |
//   |  kitchen    |  |          +---------+----------+
//   |  dining     |  |          |  W/D    |          |
//   |  entry      |  |          +---------+   bath   |
//   |             |  |          |  mech   |          |
//   +-------------+--+----------+---------+----------+  DEPTH

function standardA(p, opts) {
  opts = opts || {};
  const W = WALL_T;
  const width = p.LIV_W + W + p.BED_W;
  const depth = p.DEPTH;

  const livX1 = p.LIV_W;
  const hallX0 = livX1 + W;
  const hallX1 = hallX0 + p.HALL_W;
  const svcX0 = hallX1 + W;
  const svcX1 = svcX0 + p.SVC_W;
  const bathX0 = svcX1 + W;
  const bathW = width - bathX0;

  const bedY1 = p.BED_D;
  const coreY0 = bedY1 + W;
  const cloY1 = coreY0 + p.CLO_D;
  const wdY0 = cloY1 + W;
  const wdY1 = wdY0 + p.WD_D;
  const mechY0 = wdY1 + W;
  const mechY1 = mechY0 + p.MECH_D;
  const bathY0 = wdY0;

  const outline = rectPoly(0, 0, width, depth);

  const walls = [
    box(livX1, 0, W, coreY0),                    // living | bedroom, open below
    box(hallX0, bedY1, p.BED_W, W),              // bedroom south
    box(svcX0, cloY1, width - svcX0, W),         // walk-in south
    box(hallX1, coreY0, W, mechY1 - coreY0),     // hall | service
    box(svcX1, wdY0, W, mechY1 - wdY0),          // service | bath, below the walk-in
    box(svcX0, wdY1, p.SVC_W, W)                 // W/D | mech
  ];

  // Kitchen runs down the outside wall of the living column, with an island.
  const kitY0 = p.LIV_D;
  const isW = p.ISLAND_W, isL = p.ISLAND_L;
  const fixtures = [
    fx('fridge', 0, kitY0 + 8, FRIDGE.d, FRIDGE.w),
    fx('counter', 0, kitY0 + 44, COUNTER_D, 30),
    fx('range', 0, kitY0 + 74, RANGE.d, RANGE.w),
    fx('counter', 0, kitY0 + 104, COUNTER_D, 34),
    fx('dishwasher', 0, kitY0 + 138, COUNTER_D, DISHWASHER.w),
    fx('island', p.LIV_W - isW - 26, kitY0 + 30, isW, isL, { label: 'Island' }),
    // bath, stacked down the far column
    fx('vanity', width - VANITY_D, bathY0 + 6, VANITY_D, 44, { label: '' }),
    fx('toilet', width - TOILET.d, bathY0 + 60, TOILET.d, TOILET.w),
    opts.shower
      ? fx('shower', bathX0 + 2, depth - SHOWER.d, bathW - 4, SHOWER.d)
      : fx('tub', bathX0 + 2, depth - TUB.d, Math.min(TUB.w, bathW - 4), TUB.d),
    // laundry + mechanical
    fx('washer', svcX0 + 2, wdY0 + 3, (p.SVC_W - 6) / 2, 30),
    fx('dryer', svcX0 + 2 + (p.SVC_W - 6) / 2, wdY0 + 3, (p.SVC_W - 6) / 2, 30),
    fx('heater', svcX0 + (p.SVC_W - 24) / 2, mechY0 + 8, 24, 24),
    // closet rod down the length of the walk-in
    fx('rod', svcX0 + 4, coreY0 + 5, width - svcX0 - 8, 3)
  ];

  const rooms = [
    room('Living / Dining', opts.livLabel, rectPoly(0, 0, p.LIV_W, p.LIV_D)),
    room('Bedroom', opts.bedLabel, rectPoly(hallX0, 0, p.BED_W, p.BED_D)),
    room('Kitchen', '', rectPoly(0, kitY0, p.LIV_W, depth - kitY0)),
    room('Hall', '', rectPoly(hallX0, coreY0, p.HALL_W, mechY1 - coreY0)),
    room('Closet', '', rectPoly(svcX0, coreY0, width - svcX0, p.CLO_D)),
    room('W/D', '', rectPoly(svcX0, wdY0, p.SVC_W, p.WD_D)),
    room('Mech.', '', rectPoly(svcX0, mechY0, p.SVC_W, p.MECH_D)),
    room('Bath', '', rectPoly(bathX0, bathY0, bathW, depth - bathY0))
  ];

  const winLiv = Math.min(p.LIV_W - 40, 140);
  const winBed = Math.min(p.BED_W - 46, 84);
  const windows = [
    win((p.LIV_W - winLiv) / 2, 0, (p.LIV_W + winLiv) / 2, 0),
    win(hallX0 + (p.BED_W - winBed) / 2, 0, hallX0 + (p.BED_W + winBed) / 2, 0)
  ];

  const doors = [
    door(p.LIV_W * 0.42, depth, ENTRY_DOOR_W, 0, -90),          // entry
    door(hallX0 + 8, bedY1 + W / 2, DOOR_W, 0, -90),            // bedroom, off the hall
    door(svcX0 + 10, bedY1 + W / 2, DOOR_W, 0, 90),             // walk-in, off the bedroom
    door(svcX1 + W / 2, mechY1 + 6, DOOR_W, 0, 90),             // bath, off the hall's south end
    opening(svcX0, wdY0 - W, svcX1, wdY0 - W),                  // W/D bifold
    opening(svcX0, mechY0 - W, svcX1, mechY0 - W)               // mech
  ];

  const geo = { outline, walls, fixtures, rooms, windows, doors };
  if (opts.balconyD) {
    geo.balcony = rectPoly(0, -opts.balconyD, p.LIV_W, opts.balconyD);
  }
  return geo;
}

// The parameters standardA exposes to the calibration panel, named for humans.
const STANDARD_A_LABELS = {
  LIV_W: 'Living width', LIV_D: 'Living depth',
  BED_W: 'Bedroom width', BED_D: 'Bedroom depth',
  DEPTH: 'Overall depth',
  HALL_W: 'Hall width', SVC_W: 'W/D closet width',
  CLO_D: 'Walk-in depth', WD_D: 'W/D closet depth', MECH_D: 'Mech closet depth',
  ISLAND_W: 'Island width', ISLAND_L: 'Island length'
};

// Obstacles are stored top-left; furniture is stored centre + rotation. This
// converts so both can go through the same oriented-box tests.
function obstacleAsBox(o) {
  return { x: o.x + o.w / 2, y: o.y + o.d / 2, w: o.w, d: o.d, rot: o.rot || 0 };
}

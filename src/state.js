// state.js — the single game-state object plus pure mutators. No DOM in here.

const State = {
  planId: 'A1',
  geo: null,                 // result of buildPlan()
  overrides: {},             // { [planId]: { PARAM: inches } }
  items: [],                 // placed furniture
  selectedUid: null,
  view: { z: 2, ox: 0, oy: 0 },
  drag: null,                // { uid, mode:'move'|'rotate', ... } while pointer is down
  layoutName: null,
  showGrid: true,
  showClearance: true
};

let uidSeq = 1;
function nextUid() {
  return 'i' + (uidSeq++);
}

function currentOverrides() {
  return State.overrides[State.planId] || {};
}

function setPlan(planId) {
  State.planId = planId;
  State.geo = buildPlan(planId, currentOverrides());
  State.selectedUid = null;
}

function rebuildPlan() {
  State.geo = buildPlan(State.planId, currentOverrides());
}

function setParam(key, inches) {
  const o = State.overrides[State.planId] || (State.overrides[State.planId] = {});
  o[key] = inches;
  rebuildPlan();
}

function resetParams() {
  delete State.overrides[State.planId];
  rebuildPlan();
}

// --- items ------------------------------------------------------------------

function addItem(cat, x, y) {
  const item = {
    uid: nextUid(),
    catId: cat.id,
    name: cat.name,
    category: cat.category,
    w: cat.w,
    d: cat.d,
    h: cat.h,
    x, y,
    rot: 0
  };
  State.items.push(item);
  State.selectedUid = item.uid;
  return item;
}

function getItem(uid) {
  return State.items.find((i) => i.uid === uid) || null;
}

function selectedItem() {
  return getItem(State.selectedUid);
}

function removeItem(uid) {
  const i = State.items.findIndex((it) => it.uid === uid);
  if (i >= 0) State.items.splice(i, 1);
  if (State.selectedUid === uid) State.selectedUid = null;
}

function duplicateItem(uid) {
  const src = getItem(uid);
  if (!src) return null;
  const copy = { ...src, uid: nextUid(), x: src.x + 12, y: src.y + 12 };
  State.items.push(copy);
  State.selectedUid = copy.uid;
  return copy;
}

function rotateItem(uid, deltaDeg) {
  const it = getItem(uid);
  if (!it) return;
  it.rot = ((it.rot + deltaDeg) % 360 + 360) % 360;
}

function nudgeItem(uid, dx, dy) {
  const it = getItem(uid);
  if (!it) return;
  it.x += dx;
  it.y += dy;
}

// --- derived ----------------------------------------------------------------

// An item is "clashing" if it overlaps another item, a wall, a fixture, or
// pokes outside the floor. Purely advisory — placement is never blocked.
function itemClashes(item) {
  const box = item;
  if (boxOutsidePolygon(box, State.geo.outline)) return true;
  for (const o of State.geo.obstacles) {
    if (o.type === 'rod' || o.type === 'shelf') continue;
    if (boxesOverlap(box, obstacleAsBox(o), 1.5)) return true;
  }
  for (const other of State.items) {
    if (other.uid === item.uid) continue;
    if (other.category === 'rugs' || item.category === 'rugs') continue; // rugs live under things
    if (boxesOverlap(box, other, 1.5)) return true;
  }
  return false;
}

// Segments an item measures its clearances against: the shell, the fixtures,
// and every other placed item.
function obstacleSegs(exceptUid) {
  let segs = State.geo.segs;
  for (const it of State.items) {
    if (it.uid === exceptUid || it.category === 'rugs') continue;
    segs = segs.concat(polygonEdges(boxCorners(it)));
  }
  return segs;
}

function totalPlacedArea() {
  return State.items
    .filter((i) => i.category !== 'rugs')
    .reduce((a, i) => a + i.w * i.d, 0) / 144;
}

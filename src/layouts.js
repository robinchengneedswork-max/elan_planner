// layouts.js — named arrangements in localStorage, plus an autosaved working
// state so a refresh never costs you an evening of furniture shuffling.
//
// Shape:
//   { layouts: { A1: { "sofa under window": { overrides, items } } },
//     work:    { planId, overrides, items, layoutName },
//     order:   ["A1", ...] }

function storeRead() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function storeWrite(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

function snapshot() {
  return {
    overrides: JSON.parse(JSON.stringify(currentOverrides())),
    items: State.items.map((i) => ({
      uid: i.uid, catId: i.catId, name: i.name, category: i.category,
      w: i.w, d: i.d, h: i.h, x: i.x, y: i.y, rot: i.rot, shape: i.shape || null
    }))
  };
}

function applySnapshot(snap) {
  State.overrides[State.planId] = JSON.parse(JSON.stringify(snap.overrides || {}));
  State.items = (snap.items || []).map((i) => ({ ...i, uid: i.uid || nextUid() }));
  State.selectedUid = null;
  rebuildPlan();
}

// --- named layouts ----------------------------------------------------------

function layoutNames(planId) {
  const d = storeRead();
  return Object.keys((d.layouts || {})[planId || State.planId] || {}).sort();
}

function saveLayout(name) {
  const d = storeRead();
  d.layouts = d.layouts || {};
  d.layouts[State.planId] = d.layouts[State.planId] || {};
  d.layouts[State.planId][name] = snapshot();
  State.layoutName = name;
  d.work = { planId: State.planId, layoutName: name, ...snapshot() };
  return storeWrite(d);
}

function loadLayout(name) {
  const d = storeRead();
  const snap = ((d.layouts || {})[State.planId] || {})[name];
  if (!snap) return false;
  applySnapshot(snap);
  State.layoutName = name;
  saveWork();
  return true;
}

function deleteLayout(name) {
  const d = storeRead();
  if (d.layouts && d.layouts[State.planId]) delete d.layouts[State.planId][name];
  if (State.layoutName === name) State.layoutName = null;
  return storeWrite(d);
}

function renameLayout(from, to) {
  const d = storeRead();
  const set = (d.layouts || {})[State.planId];
  if (!set || !set[from]) return false;
  set[to] = set[from];
  delete set[from];
  if (State.layoutName === from) State.layoutName = to;
  return storeWrite(d);
}

// True when the working state has drifted from the saved layout of that name.
function layoutIsDirty() {
  if (!State.layoutName) return State.items.length > 0;
  const d = storeRead();
  const saved = ((d.layouts || {})[State.planId] || {})[State.layoutName];
  if (!saved) return true;
  return JSON.stringify(saved) !== JSON.stringify(snapshot());
}

// --- autosaved working state ------------------------------------------------

function saveWork() {
  const d = storeRead();
  d.work = { planId: State.planId, layoutName: State.layoutName, ...snapshot() };
  storeWrite(d);
}

function restoreWork() {
  const d = storeRead();
  if (!d.work || !PLANS[d.work.planId]) return false;
  State.planId = d.work.planId;
  State.layoutName = d.work.layoutName || null;
  applySnapshot(d.work);
  // Keep uid generation ahead of anything restored.
  for (const it of State.items) {
    const n = parseInt(String(it.uid).slice(1), 10);
    if (n >= uidSeq) uidSeq = n + 1;
  }
  return true;
}

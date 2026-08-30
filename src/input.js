// input.js — pointer and keyboard on the canvas.
// Physical key positions via e.code, per SharedPatterns.

let spaceDown = false;

function beginItemDrag(item, wx, wy) {
  State.selectedUid = item.uid;
  State.drag = { mode: 'move', uid: item.uid, gx: item.x - wx, gy: item.y - wy, moved: true };
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

// Topmost item under the cursor. Rugs lose to everything above them.
function hitItem(wx, wy) {
  for (let i = State.items.length - 1; i >= 0; i--) {
    const it = State.items[i];
    if (it.category === 'rugs') continue;
    if (pointInPolygon(wx, wy, boxCorners(it))) return it;
  }
  for (let i = State.items.length - 1; i >= 0; i--) {
    const it = State.items[i];
    if (it.category !== 'rugs') continue;
    if (pointInPolygon(wx, wy, boxCorners(it))) return it;
  }
  return null;
}

function overRotateHandle(sx, sy) {
  const sel = selectedItem();
  if (!sel) return false;
  const [hx, hy] = rotateHandlePos(sel);
  return Math.hypot(sx - hx, sy - hy) <= HANDLE_PX + 3;
}

function onCanvasDown(e) {
  const [sx, sy] = canvasPoint(e);
  const [wx, wy] = s2w(sx, sy);

  if (e.button === 1 || spaceDown) {
    State.drag = { mode: 'pan', sx, sy, ox: State.view.ox, oy: State.view.oy };
    canvas.classList.add('grabbing');
    e.preventDefault();
    return;
  }
  if (e.button !== 0) return;

  if (overRotateHandle(sx, sy)) {
    const sel = selectedItem();
    State.drag = { mode: 'rotate', uid: sel.uid, start: sel.rot, a0: Math.atan2(wy - sel.y, wx - sel.x) / DEG };
    return;
  }

  const hit = hitItem(wx, wy);
  if (hit) {
    State.selectedUid = hit.uid;
    State.drag = { mode: 'move', uid: hit.uid, gx: hit.x - wx, gy: hit.y - wy, moved: false };
  } else {
    State.selectedUid = null;
    State.drag = { mode: 'pan', sx, sy, ox: State.view.ox, oy: State.view.oy };
    canvas.classList.add('grabbing');
  }
  refreshAll();
}

function onCanvasMove(e) {
  const [sx, sy] = canvasPoint(e);
  const [wx, wy] = s2w(sx, sy);
  updateCursorHud(wx, wy);

  const d = State.drag;
  if (!d) {
    canvas.style.cursor = overRotateHandle(sx, sy) ? 'grab'
      : hitItem(wx, wy) ? 'move'
      : 'default';
    return;
  }

  if (d.mode === 'pan') {
    State.view.ox = d.ox + (sx - d.sx);
    State.view.oy = d.oy + (sy - d.sy);
    render();
    return;
  }

  const it = getItem(d.uid);
  if (!it) return;

  if (d.mode === 'rotate') {
    const a = Math.atan2(wy - it.y, wx - it.x) / DEG;
    let rot = d.start + (a - d.a0);
    // Free while Alt is held; otherwise settle onto the 15-degree steps.
    if (!e.altKey) rot = Math.round(rot / ROT_STEP_DEG) * ROT_STEP_DEG;
    it.rot = ((rot % 360) + 360) % 360;
    render();
    updateInspector();
    return;
  }

  d.moved = true;
  let box = { ...it, x: snapTo(wx + d.gx, SNAP_GRID_IN), y: snapTo(wy + d.gy, SNAP_GRID_IN) };
  if (!e.altKey) {
    box = snapBoxToEdges(box, State.geo.snapEdges, SNAP_WALL_IN);
    box = snapBoxToEdges(box, itemSnapEdges(it.uid), SNAP_ITEM_IN);
  }
  it.x = box.x;
  it.y = box.y;
  render();
  updateInspector();
}

// Faces of the other placed pieces, so furniture lines up with furniture.
function itemSnapEdges(exceptUid) {
  let segs = [];
  for (const o of State.items) {
    if (o.uid === exceptUid) continue;
    segs = segs.concat(polygonEdges(boxCorners(o)));
  }
  return segs;
}

function onCanvasUp() {
  const d = State.drag;
  State.drag = null;
  canvas.classList.remove('grabbing');
  if (d && d.mode !== 'pan') {
    saveWork();
    refreshAll();
  }
}

function onWheel(e) {
  e.preventDefault();
  const [sx, sy] = canvasPoint(e);
  zoomAt(sx, sy, e.deltaY < 0 ? 1.12 : 1 / 1.12);
  render();
  updateHud();
}

function onKeyDown(e) {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  // A modal is open — Delete belongs to the form, not to the selected piece.
  if (document.querySelector('dialog[open]')) return;

  if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }

  if (e.code === 'KeyF') { fitView(); render(); updateHud(); return; }
  if (e.code === 'KeyG') { document.getElementById('btn-grid').click(); return; }

  const sel = selectedItem();
  if (!sel) return;

  if (e.code === 'KeyR') {
    rotateItem(sel.uid, e.shiftKey ? -ROT_STEP_DEG : ROT_STEP_DEG);
  } else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    duplicateItem(sel.uid);
  } else if (e.code === 'Delete' || e.code === 'Backspace') {
    e.preventDefault();
    removeItem(sel.uid);
  } else if (e.code.startsWith('Arrow')) {
    e.preventDefault();
    const n = e.shiftKey ? NUDGE_BIG_IN : NUDGE_IN;
    const dx = e.code === 'ArrowLeft' ? -n : e.code === 'ArrowRight' ? n : 0;
    const dy = e.code === 'ArrowUp' ? -n : e.code === 'ArrowDown' ? n : 0;
    nudgeItem(sel.uid, dx, dy);
  } else if (e.code === 'Escape') {
    State.selectedUid = null;
  } else {
    return;
  }
  saveWork();
  refreshAll();
}

function onKeyUp(e) {
  if (e.code === 'Space') spaceDown = false;
}

function initInput() {
  canvas.addEventListener('mousedown', onCanvasDown);
  window.addEventListener('mousemove', onCanvasMove);
  window.addEventListener('mouseup', onCanvasUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

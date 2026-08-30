// catalog.js — the IKEA sidebar. Click a piece to drop it in the middle of the
// view, or drag it straight onto the plan; both routes end up in the same
// pointer-drag the canvas already knows how to run.

let catalogFilter = '';
let pendingPlace = null;   // { cat } between mousedown in the list and the drop

function catalogMatches(item, q) {
  if (!q) return true;
  const hay = (item.name + ' ' + item.type + ' ' + CATEGORY_LABELS[item.category]).toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

function swatchStyle(item) {
  // Footprint proportions at a glance, capped so a rug does not eat the row.
  const long = Math.max(item.w, item.d);
  const scale = 22 / long;
  const w = Math.max(6, Math.round(item.w * scale));
  const h = Math.max(6, Math.round(item.d * scale));
  const round = item.shape === 'round' ? 'border-radius:50%;' : '';
  return `width:${w}px;height:${h}px;background:${CATEGORY_COLORS[item.category]};${round}`;
}

function renderCatalog() {
  const host = document.getElementById('catalog-list');
  const q = catalogFilter.trim().toLowerCase();
  let html = '';
  let shown = 0;

  for (const cat of Object.keys(CATEGORY_LABELS)) {
    const items = IKEA.filter((i) => i.category === cat && catalogMatches(i, q));
    if (!items.length) continue;
    html += `<h2 class="group">${CATEGORY_LABELS[cat]}</h2>`;
    for (const it of items) {
      shown++;
      const price = it.price == null ? '' : ` &middot; $${it.price}`;
      html += `<button class="cat-item" data-id="${it.id}" title="${it.name} ${it.type}">
        <span class="swatch" style="${swatchStyle(it)}"></span>
        <span class="cat-text">
          <span class="cat-name">${it.name}${it.verified ? '' : ' <span title="dimension not verified">&#9888;</span>'}</span>
          <span class="cat-sub">${it.type}${price}</span>
        </span>
        <span class="cat-dims">${fmtIn(it.w)}&times;${fmtIn(it.d)}</span>
      </button>`;
    }
  }

  if (!shown) {
    html = `<div class="empty">Nothing matches &ldquo;${catalogFilter}&rdquo;.</div>`;
  }
  host.innerHTML = html;

  for (const el of host.querySelectorAll('.cat-item')) {
    el.addEventListener('mousedown', onCatalogDown);
  }
}

function catalogItem(id) {
  return IKEA.find((i) => i.id === id) || null;
}

function onCatalogDown(e) {
  e.preventDefault();
  const cat = catalogItem(e.currentTarget.dataset.id);
  if (!cat) return;
  pendingPlace = { cat, entered: false };
  window.addEventListener('mousemove', onPendingMove);
  window.addEventListener('mouseup', onPendingUp);
}

// Once the cursor crosses onto the canvas the item becomes real and the normal
// canvas drag takes over, so dropping and repositioning feel identical.
function onPendingMove(e) {
  if (!pendingPlace) return;
  const r = canvas.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) return;
  const [wx, wy] = s2w(e.clientX - r.left, e.clientY - r.top);
  const item = addItem(pendingPlace.cat, snapTo(wx, SNAP_GRID_IN), snapTo(wy, SNAP_GRID_IN));
  if (pendingPlace.cat.shape) item.shape = pendingPlace.cat.shape;
  endPending();
  beginItemDrag(item, wx, wy);
  refreshAll();
}

function onPendingUp() {
  if (!pendingPlace) return;
  // Released without reaching the canvas: treat it as a click and drop the
  // piece in the middle of the view.
  const [cx, cy] = s2w(viewW() / 2, viewH() / 2);
  const item = addItem(pendingPlace.cat, snapTo(cx, SNAP_GRID_IN), snapTo(cy, SNAP_GRID_IN));
  if (pendingPlace.cat.shape) item.shape = pendingPlace.cat.shape;
  endPending();
  refreshAll();
  toast(`${item.name} placed &mdash; drag it where you want it`);
}

function endPending() {
  pendingPlace = null;
  window.removeEventListener('mousemove', onPendingMove);
  window.removeEventListener('mouseup', onPendingUp);
}

function initCatalog() {
  const search = document.getElementById('catalog-search');
  search.placeholder = `Search ${IKEA.length} IKEA pieces…`;
  search.addEventListener('input', () => {
    catalogFilter = search.value;
    renderCatalog();
  });
  renderCatalog();
}

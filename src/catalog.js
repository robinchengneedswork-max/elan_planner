// catalog.js — the IKEA sidebar. Click a piece to drop it in the middle of the
// view, or drag it straight onto the plan; both routes end up in the same
// pointer-drag the canvas already knows how to run.
//
// A row carries two different pictures of the same thing, and both earn their
// place: the photo says what it looks like, the outlined chip says what shape
// its footprint is. Only the second one tells you whether it fits.

let catalogFilter = '';
let catalogSort = 'category';
let catalogMaxPrice = 0;   // 0 = no ceiling
let pendingPlace = null;   // { cat } between mousedown in the list and the drop

const CATALOG_SORTS = {
  category: 'Category',
  'price-asc': 'Price, low first',
  'price-desc': 'Price, high first',
  footprint: 'Smallest footprint',
  rating: 'Best rated',
};

function catalogMatches(item, q) {
  if (catalogMaxPrice && item.price != null && item.price > catalogMaxPrice) return false;
  if (!q) return true;
  const hay = (item.name + ' ' + item.type + ' ' + CATEGORY_LABELS[item.category] +
    ' ' + (item.color ? item.color.name : '')).toLowerCase();
  return q.split(/\s+/).every((t) => hay.includes(t));
}

// Footprint proportions at a glance, capped so a rug does not eat the row.
function chipStyle(item) {
  const long = Math.max(item.w, item.d);
  const scale = 20 / long;
  const w = Math.max(5, Math.round(item.w * scale));
  const h = Math.max(5, Math.round(item.d * scale));
  const round = item.shape === 'round' ? 'border-radius:50%;' : '';
  return `width:${w}px;height:${h}px;background:${CATEGORY_COLORS[item.category]};${round}`;
}

// Five boxes, filled to the nearest half. Cheaper to read than a number and it
// does not pretend 4.35 is meaningfully different from 4.4.
function stars(rating) {
  if (rating == null) return '';
  const full = Math.round(rating * 2) / 2;
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += i <= full ? '&#9733;' : (i - 0.5 === full ? '&#9733;' : '&#9734;');
  }
  return `<span class="stars" title="${rating} out of 5">${out}</span>`;
}

function money(n) {
  if (n == null) return '';
  return '$' + (n % 1 === 0 ? n.toLocaleString('en-US')
                            : n.toLocaleString('en-US', { minimumFractionDigits: 2 }));
}

function catalogRow(it) {
  const bits = [it.type];
  if (it.price != null) bits.push(money(it.price));
  return `<button class="cat-item" data-id="${it.id}" title="${attr(it.name + ' ' + it.type)}">
    <img class="cat-photo" src="${attr(it.img || '')}" alt="" loading="lazy" draggable="false">
    <span class="cat-text">
      <span class="cat-name">${it.name}${it.verified ? '' : ' <span title="dimension not verified">&#9888;</span>'}</span>
      <span class="cat-sub">${bits.join(' &middot; ')}</span>
      <span class="cat-meta">${stars(it.rating)}${it.rating != null ? `<span class="rc">${it.reviews}</span>` : ''}</span>
    </span>
    <span class="cat-right">
      <span class="cat-dims">${fmtIn(it.w)}&times;${fmtIn(it.d)}</span>
      <span class="chip" style="${chipStyle(it)}"></span>
    </span>
  </button>`;
}

// A flat 5.0 from one review is not better than a 4.7 from three thousand, and
// sorting on the raw number says it is. So rank on the rating pulled toward the
// catalogue average in proportion to how little evidence there is behind it:
// one review barely moves off the mean, a few hundred sit at their own score.
const RATING_PRIOR = 60;

function ratingScore(item) {
  if (item.rating == null) return -1;
  const n = item.reviews || 0;
  return (n * item.rating + RATING_PRIOR * catalogMeanRating()) / (n + RATING_PRIOR);
}

let _meanRating = null;
function catalogMeanRating() {
  if (_meanRating == null) {
    const rated = IKEA.filter((i) => i.rating != null);
    _meanRating = rated.length
      ? rated.reduce((a, i) => a + i.rating, 0) / rated.length : 4;
  }
  return _meanRating;
}

function sortedItems(items) {
  const by = {
    'price-asc': (a, b) => (a.price ?? 1e9) - (b.price ?? 1e9),
    'price-desc': (a, b) => (b.price ?? -1) - (a.price ?? -1),
    footprint: (a, b) => (a.w * a.d) - (b.w * b.d),
    // Unrated last rather than first — an absent rating is not a bad one, but
    // it is not evidence either.
    rating: (a, b) => ratingScore(b) - ratingScore(a),
  }[catalogSort];
  return by ? [...items].sort(by) : items;
}

function renderCatalog() {
  const host = document.getElementById('catalog-list');
  const q = catalogFilter.trim().toLowerCase();
  const hits = IKEA.filter((i) => catalogMatches(i, q));
  let html = '';

  if (catalogSort === 'category') {
    for (const cat of Object.keys(CATEGORY_LABELS)) {
      const items = hits.filter((i) => i.category === cat);
      if (!items.length) continue;
      html += `<h2 class="group">${CATEGORY_LABELS[cat]}</h2>`;
      html += items.map(catalogRow).join('');
    }
  } else {
    html += `<h2 class="group">${CATALOG_SORTS[catalogSort]} &middot; ${hits.length} pieces</h2>`;
    html += sortedItems(hits).map(catalogRow).join('');
  }

  if (!hits.length) {
    html = `<div class="empty">Nothing matches${catalogFilter ? ` &ldquo;${attr(catalogFilter)}&rdquo;` : ''}` +
      `${catalogMaxPrice ? ` under ${money(catalogMaxPrice)}` : ''}.</div>`;
  }
  host.innerHTML = html;

  for (const el of host.querySelectorAll('.cat-item')) {
    el.addEventListener('mousedown', onCatalogDown);
  }
  updateCatalogCount(hits.length);
}

function updateCatalogCount(n) {
  const el = document.getElementById('cat-count');
  if (el) el.textContent = `${n} of ${IKEA.length}`;
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

  const sort = document.getElementById('catalog-sort');
  sort.innerHTML = Object.entries(CATALOG_SORTS)
    .map(([k, label]) => `<option value="${k}">${label}</option>`).join('');
  sort.addEventListener('change', () => { catalogSort = sort.value; renderCatalog(); });

  // The ceiling steps through the prices that actually exist in the catalogue,
  // so every stop changes what you see.
  const cap = document.getElementById('catalog-cap');
  const stops = [0, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000];
  cap.innerHTML = stops
    .map((v) => `<option value="${v}">${v ? 'Under ' + money(v) : 'Any price'}</option>`).join('');
  cap.addEventListener('change', () => { catalogMaxPrice = +cap.value; renderCatalog(); });

  renderCatalog();
}

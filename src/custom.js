// custom.js — your own furniture, sitting alongside the 65 IKEA entries.
//
// data/ikea.js is a file: it ships with the app and the page cannot edit it.
// Anything you add here lives in localStorage next to the saved layouts, and
// is merged into the same list — so a bed you found on Amazon drags onto the
// plan, counts toward the total and lands in the shopping list with its link,
// exactly like a catalogue piece.
//
// A custom entry is deliberately the SAME SHAPE as an IKEA entry (id, name,
// type, category, w, d, h, price, shape, img, color, rating, reviews, url) so
// nothing downstream has to know the difference. `custom: true` is the only
// extra field, and only the sidebar badge and the editor read it.
//
// No DOM in here. The form that fills these in is custom-ui.js.

let CUSTOM = [];
let customSeq = 1;

// 25 ft. Past this you typed feet into the inches box, which is the one
// mistake that silently produces a sofa the size of the apartment.
const CUSTOM_MAX_IN = 300;

// --- the merged catalogue ---------------------------------------------------
//
// Rebuilt on mutation rather than on read: itemFill() looks a piece up once per
// item per frame while you drag, and that is no place to concatenate an array.
// Callers that cache derived numbers can watch the identity of catalogAll()
// and recompute when it changes — see catalogMeanRating().

let _catalogAll = null;
let _catalogById = null;

function catalogAll() {
  if (!_catalogAll) _catalogAll = CUSTOM.length ? IKEA.concat(CUSTOM) : IKEA;
  return _catalogAll;
}

function catalogById(id) {
  if (!_catalogById) _catalogById = new Map(catalogAll().map((i) => [i.id, i]));
  return _catalogById.get(id) || null;
}

function invalidateCatalog() {
  _catalogAll = null;
  _catalogById = null;
}

// --- links ------------------------------------------------------------------
//
// A product URL ends up in an href and a photo URL in an img src, and both are
// typed by hand into the page that also runs the plan. So each is parsed and
// re-emitted rather than trusted: anything that is not plain http(s) — or, for
// a photo, an inline data: image — does not come back out.

function safeHttpUrl(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch (e) {
    return '';
  }
}

function safeImgSrc(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s;
  // A vendored catalogue photo, named the way the IKEA entries name theirs.
  if (/^img\/[a-z0-9-]+\.(jpg|png|webp)$/i.test(s)) return s;
  return safeHttpUrl(s);
}

// ikea.com -> IKEA, www.amazon.com -> Amazon, wayfair.com -> Wayfair.
// The second-level label is the brand often enough to be worth filling in for
// you, and it stays a plain text field you can correct.
function brandFromUrl(raw) {
  const href = safeHttpUrl(raw);
  if (!href) return '';
  let host;
  try { host = new URL(href).hostname.toLowerCase(); } catch (e) { return ''; }
  const parts = host.replace(/^www\./, '').split('.');
  // co.uk, com.au: with a two-letter TLD the label before it is the country
  // suffix, not the brand.
  const twoLetterTld = parts.length > 2 &&
    parts[parts.length - 1].length === 2 && parts[parts.length - 2].length <= 3;
  const label = twoLetterTld ? parts[parts.length - 3] : (parts[parts.length - 2] || parts[0]);
  if (!label) return '';
  if (label === 'ikea') return 'IKEA';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Amazon — and most catalogue sites — put the product title in the path as a
// slug: /Zinus-Shalini-Upholstered-Platform-Bed/dp/B07XYZ. So pasting the link
// can fill in the name, which is the tedious half of adding a piece.
function guessNameFromUrl(raw) {
  const href = safeHttpUrl(raw);
  if (!href) return '';
  let segs;
  try { segs = new URL(href).pathname.split('/').filter(Boolean); } catch (e) { return ''; }
  const marker = segs.findIndex((s) => s === 'dp' || s === 'gp' || s === 'product' || s === 'p');
  let slug = marker > 0 ? segs[marker - 1] : null;
  if (!slug) slug = segs.filter((s) => s.includes('-')).pop();
  if (!slug) return '';
  const words = decodeURIComponent(slug).replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
  // A bare SKU is not a name.
  if (words.length < 3 || !/[a-z]{3}/i.test(words)) return '';
  return words.slice(0, 60);
}

// --- validation -------------------------------------------------------------
//
// One pure function over the raw strings the form collects, returning either
// the errors to show or the finished catalogue entry. Nothing else builds a
// custom piece — not the editor, and not the loader, so whatever localStorage
// hands back has to clear the same bar the form does.

function validateCustomDraft(d) {
  const errors = [];
  const name = String(d.name == null ? '' : d.name).trim().slice(0, 60);
  if (!name) errors.push('Give it a name.');

  const category = String(d.category || '');
  if (!CATEGORY_LABELS[category]) errors.push('Pick a category.');

  const dims = {};
  for (const [key, label] of [['w', 'Width'], ['d', 'Depth']]) {
    const v = parseIn(d[key]);
    if (!isFinite(v)) errors.push(`${label} is not a measurement — try 30, 30" or 2'6".`);
    else if (v <= 0 || v > CUSTOM_MAX_IN) errors.push(`${label} must be between 1" and ${CUSTOM_MAX_IN / 12}'.`);
    else dims[key] = Math.round(v * 100) / 100;
  }

  let h = null;
  if (String(d.h == null ? '' : d.h).trim()) {
    const v = parseIn(d.h);
    if (!isFinite(v) || v <= 0 || v > CUSTOM_MAX_IN) errors.push('Height is not a measurement.');
    else h = Math.round(v * 100) / 100;
  }

  let price = null;
  if (String(d.price == null ? '' : d.price).trim()) {
    // Strip the currency dressing but not the sign — "-20" is a mistake worth
    // reporting, and stripping everything non-numeric would turn it into 20.
    const v = parseFloat(String(d.price).replace(/[$,\s]/g, ''));
    if (!isFinite(v) || v < 0) errors.push('Price should be a number of dollars.');
    else price = Math.round(v * 100) / 100;
  }

  let color = null;
  const colorName = String(d.colorName == null ? '' : d.colorName).trim().slice(0, 32);
  if (colorName) {
    const hex = String(d.colorHex || '').trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(hex)) errors.push('Colour needs a hex value like #f4f3d7.');
    else color = { name: colorName, hex };
  }

  let rating = null;
  let reviews = 0;
  if (String(d.rating == null ? '' : d.rating).trim()) {
    const v = parseFloat(d.rating);
    if (!isFinite(v) || v < 0 || v > 5) errors.push('Rating is out of 5.');
    else rating = Math.round(v * 10) / 10;
  }
  if (rating != null && String(d.reviews == null ? '' : d.reviews).trim()) {
    const v = parseInt(String(d.reviews).replace(/[^0-9]/g, ''), 10);
    if (isFinite(v) && v >= 0) reviews = v;
  }

  const rawUrl = String(d.url == null ? '' : d.url).trim();
  const url = safeHttpUrl(rawUrl);
  if (rawUrl && !url) errors.push('That product link is not an http or https address.');

  const rawImg = String(d.img == null ? '' : d.img).trim();
  const img = safeImgSrc(rawImg);
  if (rawImg && !img) errors.push('That photo is not an http(s) or inline image.');

  if (errors.length) return { ok: false, errors };

  const item = {
    id: isCustomId(d.id) ? d.id : nextCustomId(),
    name,
    type: String(d.type == null ? '' : d.type).trim().slice(0, 40) || 'Custom piece',
    category,
    w: dims.w,
    d: dims.d,
    h,
    price,
    img,
    color,
    rating,
    brand: String(d.brand == null ? '' : d.brand).trim().slice(0, 24) || brandFromUrl(url),
    url,
    custom: true,
    added: typeof d.added === 'number' ? d.added : Date.now(),
  };
  if (d.shape === 'round') item.shape = 'round';
  if (rating != null) item.reviews = reviews;
  return { ok: true, errors: [], item };
}

function isCustomId(id) {
  return /^custom-\d+$/.test(String(id == null ? '' : id));
}

function nextCustomId() {
  let id;
  do { id = 'custom-' + customSeq++; } while (catalogById(id));
  return id;
}

// --- storage ----------------------------------------------------------------
//
// The same localStorage blob as the layouts, under `custom`. That blob is a
// text file the user can edit, so every entry read back is run through the
// validator and anything that fails is dropped rather than drawn.

function loadCustom() {
  const store = storeRead();
  const raw = store.custom;
  CUSTOM = [];
  // The counter is persisted, not derived from the surviving ids, so a deleted
  // piece never has its id handed to a different product: a placed item keeps
  // its catId after the entry under it goes, and re-using that id would
  // silently give the orphan somebody else's price and photo.
  customSeq = typeof store.customSeq === 'number' && store.customSeq > 0 ? store.customSeq : 1;
  invalidateCatalog();
  if (!Array.isArray(raw)) return;

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const res = validateCustomDraft({
      ...entry,
      colorName: entry.color && entry.color.name,
      colorHex: entry.color && entry.color.hex,
    });
    if (!res.ok) continue;
    if (CUSTOM.some((c) => c.id === res.item.id)) continue;
    CUSTOM.push(res.item);
    invalidateCatalog();
  }
  // And ahead of anything restored, in case the counter was lost.
  for (const c of CUSTOM) {
    const n = parseInt(c.id.slice(7), 10);
    if (isFinite(n) && n >= customSeq) customSeq = n + 1;
  }
}

function writeCustom() {
  const data = storeRead();
  data.custom = CUSTOM;
  data.customSeq = customSeq;
  return storeWrite(data);
}

// Returns { ok, errors, item }. On failure the editor shows the errors and
// stays open, and the catalogue is left exactly as it was.
function saveCustomItem(draft) {
  const res = validateCustomDraft(draft);
  if (!res.ok) return res;

  const at = CUSTOM.findIndex((c) => c.id === res.item.id);
  const previous = at >= 0 ? CUSTOM[at] : null;
  if (at >= 0) CUSTOM[at] = res.item;
  else CUSTOM.push(res.item);
  invalidateCatalog();

  if (!writeCustom()) {
    // Almost always the photo: localStorage is a few megabytes and a
    // full-resolution data: URL eats it in a handful of pieces.
    if (previous) CUSTOM[at] = previous;
    else CUSTOM.pop();
    invalidateCatalog();
    return { ok: false, errors: ['Out of browser storage — try a smaller photo, or none.'] };
  }
  return { ok: true, errors: [], item: res.item };
}

function deleteCustomItem(id) {
  const at = CUSTOM.findIndex((c) => c.id === id);
  if (at < 0) return false;
  CUSTOM.splice(at, 1);
  invalidateCatalog();
  writeCustom();
  return true;
}

// How many pieces on the floor came from this catalogue entry. A placed item
// copies its own name and size at drop time, so deleting the entry underneath
// leaves the furniture drawn where it was — it just stops having a price.
// Worth saying out loud before the delete rather than after.
function placedUsingCatalogId(id) {
  return State.items.filter((i) => i.catId === id).length;
}

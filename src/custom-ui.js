// custom-ui.js — the form behind "Add your own piece".
//
// Everything here is DOM; the rules, the validation and the storage are in
// custom.js. The dialog markup is static in index.html rather than built as a
// string, because a twelve-field form is easier to read as HTML than as a
// template literal.
//
// The one clever bit is the link field. You cannot fetch an Amazon page from a
// file:// document — no server, and CORS would stop it anyway — so nothing here
// scrapes. But the product title is sitting right there in the URL slug, so
// pasting the link fills in the name and the brand, and the rest is typing off
// the listing's own "Product Dimensions" line.

let customEditingId = null;

// A pasted photo URL is stored as a URL and costs nothing. A chosen file has
// to be inlined to survive a refresh, so it is re-encoded small first:
// localStorage is a few megabytes, and one untouched phone photo is most of it.
const PHOTO_MAX_PX = 240;
const PHOTO_QUALITY = 0.78;

const CUSTOM_FIELDS = ['url', 'name', 'type', 'category', 'w', 'd', 'h', 'price',
  'colorName', 'colorHex', 'rating', 'reviews', 'img'];

function cf(name) {
  return document.getElementById('cf-' + name);
}

function customDialog() {
  return document.getElementById('custom-modal');
}

// --- open / close -----------------------------------------------------------

function openCustomEditor(id) {
  const dlg = customDialog();
  const existing = id ? catalogById(id) : null;
  customEditingId = existing && existing.custom ? existing.id : null;

  const src = customEditingId ? existing : {};
  cf('url').value = src.url || '';
  cf('name').value = src.name || '';
  cf('type').value = src.type && src.type !== 'Custom piece' ? src.type : '';
  cf('category').value = src.category || '';
  cf('w').value = src.w != null ? fmtIn(src.w) : '';
  cf('d').value = src.d != null ? fmtIn(src.d) : '';
  cf('h').value = src.h != null ? fmtIn(src.h) : '';
  cf('price').value = src.price != null ? String(src.price) : '';
  cf('colorName').value = src.color ? src.color.name : '';
  cf('colorHex').value = src.color ? src.color.hex : '#c9c4bb';
  cf('rating').value = src.rating != null ? String(src.rating) : '';
  cf('reviews').value = src.reviews ? String(src.reviews) : '';
  cf('img').value = src.img || '';
  cf('round').checked = src.shape === 'round';
  cf('file').value = '';

  setPhotoPreview(src.img || '');
  showCustomErrors([]);

  document.getElementById('custom-title').textContent =
    customEditingId ? 'Edit ' + src.name : 'Add your own piece';
  cf('save').textContent = customEditingId ? 'Save changes' : 'Add to catalogue';
  cf('delete').hidden = !customEditingId;

  dlg.showModal();
  cf(customEditingId ? 'name' : 'url').focus();
}

function closeCustomEditor() {
  customEditingId = null;
  customDialog().close();
}

// --- the form ---------------------------------------------------------------

function readCustomForm() {
  const draft = { id: customEditingId, shape: cf('round').checked ? 'round' : null };
  for (const f of CUSTOM_FIELDS) draft[f] = cf(f).value;
  // Keep the original id and its added-date so an edit stays the same piece.
  const was = customEditingId ? catalogById(customEditingId) : null;
  if (was) draft.added = was.added;
  return draft;
}

function showCustomErrors(errors) {
  const box = document.getElementById('custom-errors');
  box.hidden = !errors.length;
  box.innerHTML = errors.map((e) => `<div>${attr(e)}</div>`).join('');
}

function submitCustomEditor() {
  const res = saveCustomItem(readCustomForm());
  if (!res.ok) {
    showCustomErrors(res.errors);
    return;
  }
  const editing = !!customEditingId;
  closeCustomEditor();
  renderCatalog();
  // An edit changes the price and photo of everything already placed from it,
  // so the plan, the inspector and the budget all have to be redrawn.
  refreshAll();
  toast(`${editing ? 'Updated' : 'Added'} &ldquo;${attr(res.item.name)}&rdquo;`);
}

function deleteFromCustomEditor() {
  const id = customEditingId;
  const item = id && catalogById(id);
  if (!item) return;
  const placed = placedUsingCatalogId(id);
  const warning = placed
    ? `\n\n${placed} placed piece${placed > 1 ? 's stay' : ' stays'} on the plan, but ` +
      `${placed > 1 ? 'they lose their' : 'it loses its'} price and link.`
    : '';
  if (!confirm(`Remove "${item.name}" from your catalogue?${warning}`)) return;
  deleteCustomItem(id);
  closeCustomEditor();
  renderCatalog();
  refreshAll();
  toast(`Removed &ldquo;${attr(item.name)}&rdquo;`);
}

// --- the link field ---------------------------------------------------------
//
// Fills the blanks only: anything you have already typed beats a guess made
// from a URL slug. The brand is not a field at all — validateCustomDraft reads
// it off the link, and it shows up as the "Amazon" line under the name.

function fillFromLink() {
  const guess = guessNameFromUrl(cf('url').value);
  if (guess && !cf('name').value.trim()) cf('name').value = guess;
}

// --- the photo --------------------------------------------------------------

function setPhotoPreview(src) {
  const img = document.getElementById('cf-preview');
  const safe = safeImgSrc(src);
  img.src = safe || '';
  img.classList.toggle('empty', !safe);
}

function onPhotoFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!/^image\//.test(file.type)) {
    showCustomErrors(['That file is not an image.']);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => shrinkPhoto(String(reader.result), (small) => {
    if (!small) return showCustomErrors(['Could not read that image.']);
    cf('img').value = small;
    setPhotoPreview(small);
    showCustomErrors([]);
  });
  reader.onerror = () => showCustomErrors(['Could not read that file.']);
  reader.readAsDataURL(file);
}

// Re-encode to a thumbnail. Deliberately no crossOrigin: a remote photo without
// CORS headers still loads and still previews, it just cannot be re-encoded —
// toDataURL throws on the tainted canvas and we keep the URL as a URL, which is
// the right answer for a remote image anyway.
function shrinkPhoto(src, cb) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, PHOTO_MAX_PX / Math.max(img.width, img.height, 1));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    try { cb(c.toDataURL('image/jpeg', PHOTO_QUALITY)); } catch (err) { cb(null); }
  };
  img.onerror = () => cb(null);
  img.src = src;
}

// --- wiring -----------------------------------------------------------------

function initCustomUI() {
  const sel = cf('category');
  sel.innerHTML = `<option value="">Choose one&hellip;</option>` +
    Object.entries(CATEGORY_LABELS)
      .map(([k, label]) => `<option value="${k}">${label}</option>`).join('');

  document.getElementById('btn-add-custom').addEventListener('click', () => openCustomEditor(null));
  cf('save').addEventListener('click', submitCustomEditor);
  cf('cancel').addEventListener('click', closeCustomEditor);
  cf('delete').addEventListener('click', deleteFromCustomEditor);
  cf('file').addEventListener('change', onPhotoFile);
  cf('img').addEventListener('change', () => setPhotoPreview(cf('img').value));
  cf('url').addEventListener('change', fillFromLink);
  cf('url').addEventListener('paste', () => setTimeout(fillFromLink, 0));

  // Enter anywhere in the form saves; Escape is the dialog's own.
  customDialog().addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      submitCustomEditor();
    }
  });
  // The backdrop and the Escape key both fire `close` — reset either way, so
  // the next open is not still holding the last piece's id.
  customDialog().addEventListener('close', () => { customEditingId = null; });
  customDialog().addEventListener('click', (e) => {
    if (e.target === customDialog()) closeCustomEditor();
  });
}

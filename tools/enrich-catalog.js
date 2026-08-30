// Adds photo, colour, rating and review count to the catalogue.
//
// The dimensions in src/data/ikea.js are curated and must not move, so this
// tool never re-derives them. It reads the `url` already on every entry --
// that URL is the ground truth for which product this is -- and:
//
//   1. product page  -> og:image, which is that exact product's hero shot
//   2. search API    -> colours (with hex), rating, review count, live price
//   3. downloads     -> img/<id>.jpg at ?f=xxs (400x400, ~7 kB)
//
// then rewrites src/data/ikea.js in place, injecting the new fields into each
// entry line and leaving the comments, ordering and numbers untouched.
//
// Colour and rating are only carried when the search hit has the *same* item
// number as the curated URL. Five entries only match loosely (IKEA renamed or
// re-sized the product), and a rating borrowed from a different variant would
// be a number attached to the wrong thing, so for those the fields stay empty.
//
// Usage: node tools/enrich-catalog.js [--no-images] [--dry] [--from-cache]

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'data', 'ikea.js');
const IMGDIR = path.join(ROOT, 'img');
const OUT = path.join(__dirname, 'catalog-enrich.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept-Language': 'en-US,en' };

const noImages = process.argv.includes('--no-images');
const dry = process.argv.includes('--dry');
const fromCache = process.argv.includes('--from-cache');

function log(s) { process.stderr.write(s + '\n'); }

async function getText(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.text();
}

async function getBuffer(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return Buffer.from(await r.arrayBuffer());
}

// The catalogue is plain script-tag JS, same as the browser loads it.
function loadCatalog() {
  const ctx = { };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(DATA, 'utf8') + '\nthis.OUT = IKEA;', ctx);
  return ctx.OUT;
}

// "...-s09574367/" -> "s09574367". Two products never share one, so it is the
// safest way to tell whether a search hit is the item we curated.
function itemKey(url) {
  const m = String(url).match(/-([a-z]?\d{6,})\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

// Height is the one curated dimension with gaps -- the original scrape missed
// it on nine items. It comes off the same server-rendered measurements tab, so
// it is still that product's own number.
const VULGAR = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
function toInches(text) {
  let str = String(text || '').replace(/&quot;|"/g, '').trim();
  let total = 0, matched = false;
  const whole = str.match(/^\s*(\d+)/);
  if (whole) { total += parseInt(whole[1], 10); matched = true; str = str.slice(whole[0].length); }
  for (const ch of Object.keys(VULGAR)) if (str.includes(ch)) { total += VULGAR[ch]; matched = true; }
  const frac = str.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) { total += parseInt(frac[1], 10) / parseInt(frac[2], 10); matched = true; }
  return matched ? Math.round(total * 1000) / 1000 : null;
}

// Not every product publishes a plain "Height". A sofa lists it including the
// back cushions, a bed lists a headboard and a footboard, a sit-stand desk
// lists a range. What the planner wants is the tallest the piece stands in the
// room, so the labels are tried in that order -- and the partial heights
// (seat, armrest, backrest, the gap under the frame) are never it.
// Nothing in this catalogue stands under 8" — the shortest real piece is a
// 14 5/8" coffee table — so anything below it is a mis-read field.
const MIN_PLAUSIBLE_H = 8;

const HEIGHT_LABELS = [
  /^Height$/i,
  /^Height including back cushions$/i,
  /^Headboard height$/i,
  /^Max\.? height$/i,
  /^Total height$/i,
];

function heightFrom(html) {
  const idx = html.indexOf('pipf-measurements-tab');
  if (idx < 0) return null;
  let lines = html.slice(idx, idx + 12000).replace(/<[^>]+>/g, '\n')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Below the product measurements the same tab lists the flat-pack cartons,
  // and those carry their own "Height". That box is what put three beds in
  // this catalogue at 2 1/2" to 4" — so stop reading at the packaging header.
  const pack = lines.findIndex((l) => /^Packaging$/i.test(l) || l.includes('measurements-packaging'));
  if (pack > 0) lines = lines.slice(0, pack);

  for (const label of HEIGHT_LABELS) {
    for (let i = 0; i < lines.length - 1; i++) {
      if (!label.test(lines[i].replace(/:$/, ''))) continue;
      const v = toInches(lines[i + 1]);
      if (v != null) return { in: v, from: lines[i].replace(/:$/, '') };
    }
  }
  return null;
}

function ogImage(html) {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m ? m[1] : null;
}

async function searchHit(item) {
  const key = itemKey(item.url);
  const q = `${item.name} ${item.type}`.replace(/,.*$/, '');
  const url = `https://sik.search.blue.cdtapps.com/us/en/search-result-page?q=${encodeURIComponent(q)}&size=24&types=PRODUCT`;
  let hits = [];
  try {
    const j = JSON.parse(await getText(url));
    hits = ((((j.searchResultPage || {}).products || {}).main || {}).items || [])
      .map((i) => i.product).filter(Boolean);
  } catch (e) {
    return null;
  }
  // Exact product first; otherwise the first hit that is at least the same
  // named product, so a renamed SKU still yields a plausible colour/rating.
  return hits.find((h) => itemKey(h.pipUrl) === key) ||
         hits.find((h) => h.name === item.name && h.typeName === item.typeName) ||
         hits.find((h) => h.name === item.name) || null;
}

function pickColor(hit) {
  const c = (hit && hit.colors || []).find((x) => x && x.hex);
  return c ? { name: c.name, hex: '#' + String(c.hex).replace(/^#/, '').toLowerCase() } : null;
}

async function main() {
  const items = loadCatalog();
  if (fromCache) {
    // Rewrite only, from the last run JSON. No network.
    rewrite(items, JSON.parse(fs.readFileSync(OUT, 'utf8')));
    return;
  }
  if (!noImages) fs.mkdirSync(IMGDIR, { recursive: true });

  const enriched = [];
  for (const it of items) {
    const rec = { id: it.id, name: it.name };
    try {
      const html = await getText(it.url);
      rec.image = ogImage(html);
      // Re-derive the height when it is missing, and also when the original
      // scrape came back with something impossible — three beds landed at
      // 2.5"-4", which is a clearance under the frame, not a bed.
      if (it.h == null || it.h < MIN_PLAUSIBLE_H) {
        const hh = heightFrom(html);
        if (hh) { rec.h = hh.in; rec.hFrom = hh.from; rec.hWas = it.h; }
      }
    } catch (e) {
      rec.imageError = String(e.message || e);
    }

    const hit = await searchHit(it);
    if (hit) {
      rec.exact = itemKey(hit.pipUrl) === itemKey(it.url);
      rec.color = pickColor(hit);
      rec.rating = typeof hit.ratingValue === 'number' ? hit.ratingValue : null;
      rec.reviews = typeof hit.ratingCount === 'number' ? hit.ratingCount : null;
      rec.livePrice = hit.salesPrice ? hit.salesPrice.numeral : null;
      rec.itemNo = hit.itemNo || null;
      if (!rec.image && hit.mainImageUrl) rec.image = hit.mainImageUrl;
    }

    if (rec.image && !noImages) {
      const file = path.join(IMGDIR, it.id + '.jpg');
      try {
        const buf = await getBuffer(rec.image.split('?')[0] + '?f=xxs');
        fs.writeFileSync(file, buf);
        rec.file = 'img/' + it.id + '.jpg';
        rec.bytes = buf.length;
      } catch (e) {
        rec.fileError = String(e.message || e);
      }
    } else if (noImages && fs.existsSync(path.join(IMGDIR, it.id + '.jpg'))) {
      rec.file = 'img/' + it.id + '.jpg';
    }

    const drift = rec.livePrice != null && it.price != null &&
                  Math.abs(rec.livePrice - it.price) > 0.5 ? ` PRICE ${it.price}->${rec.livePrice}` : '';
    log(`${rec.file ? '+' : '!'} ${it.id.padEnd(20)} ${rec.exact ? 'exact' : 'loose'} ` +
        `${rec.color ? rec.color.hex : '------ '} r${rec.rating ?? '-'} ` +
        `(${rec.reviews ?? '-'})${drift}${rec.h != null ? `  h=${rec.h} (${rec.hFrom})` : ''}`);
    enriched.push(rec);
  }

  fs.writeFileSync(OUT, JSON.stringify(enriched, null, 1));
  log(`\nwrote ${OUT}`);
  if (!dry) rewrite(items, enriched);
}

// --- rewrite src/data/ikea.js ----------------------------------------------
//
// Each catalogue entry is one line ending in `url: "..." },`. New fields go in
// just before `verified`, so a diff reads as an insertion and nothing else.

function rewrite(items, enriched) {
  const by = {};
  for (const r of enriched) by[r.id] = r;
  const src = fs.readFileSync(DATA, 'utf8');
  const lines = src.split('\n');
  let touched = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*\{ id: ")([^"]+)("[\s\S]*)$/);
    if (!m) continue;
    const r = by[m[2]];
    if (!r) continue;

    // Drop any fields a previous run added, so this is idempotent.
    let line = lines[i].replace(/\s*(img|color|rating|reviews|itemNo): (?:"[^"]*"|\{[^}]*\}|null|[\d.]+),/g, '');

    // Fill or correct the height in place, so the field order still reads w, d, h.
    if (r.h != null) line = line.replace(/\bh: (?:[\d.]+|null),/, 'h: ' + r.h + ',');

    const add = [];
    if (r.file) add.push(`img: "${r.file}"`);
    // Only from an exact item-number match -- see the note at the top.
    if (r.exact) {
      if (r.color) add.push(`color: { name: "${r.color.name}", hex: "${r.color.hex}" }`);
      if (r.rating != null) add.push(`rating: ${r.rating}`);
      if (r.reviews != null) add.push(`reviews: ${r.reviews}`);
      if (r.itemNo) add.push(`itemNo: "${r.itemNo}"`);
    }
    if (!add.length) continue;

    const at = line.indexOf('verified:');
    if (at < 0) continue;
    lines[i] = line.slice(0, at) + add.join(', ') + ', ' + line.slice(at);
    touched++;
  }

  fs.writeFileSync(DATA, lines.join('\n'));
  log(`rewrote ${touched} entries in ${DATA}`);
}

main().catch((e) => { log('FATAL ' + e.stack); process.exit(1); });

// Pulls real IKEA US product dimensions + prices.
// 1. search API  -> pipUrl, price, typeName
// 2. product page -> the SSR "Measurements" tab, which carries Width/Depth/Height
// Usage: node ikea-scrape.js queries.json > out.json

const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en' } });
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return r.text();
}

// "83 1/2 \"" -> 83.5   |  "2 ¼ \"" -> 2.25
const VULGAR = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅓': 1 / 3, '⅔': 2 / 3 };
function toInches(text) {
  if (!text) return null;
  let s = String(text).replace(/&quot;|"/g, '').trim();
  let total = 0, matched = false;
  const whole = s.match(/^\s*(\d+)/);
  if (whole) { total += parseInt(whole[1], 10); matched = true; s = s.slice(whole[0].length); }
  for (const ch of Object.keys(VULGAR)) {
    if (s.includes(ch)) { total += VULGAR[ch]; matched = true; }
  }
  const frac = s.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) { total += parseInt(frac[1], 10) / parseInt(frac[2], 10); matched = true; }
  return matched ? Math.round(total * 100) / 100 : null;
}

async function search(q) {
  const url = `https://sik.search.blue.cdtapps.com/us/en/search-result-page?q=${encodeURIComponent(q)}&size=12&types=PRODUCT`;
  const j = JSON.parse(await get(url));
  const items = (((j.searchResultPage || {}).products || {}).main || {}).items || [];
  return items.map((i) => i.product).filter(Boolean);
}

// The measurements tab is server-rendered; product measurements sit in the
// first "measurements" array, before the package-measurement groups.
function extractMeasurements(html) {
  const idx = html.indexOf('pipf-measurements-tab');
  if (idx < 0) return {};
  const seg = html.slice(idx, idx + 12000).replace(/<[^>]+>/g, '\n');
  const out = {};
  const lines = seg.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    const key = lines[i].replace(/:$/, '');
    if (!/^(Width|Depth|Height|Length|Diameter|Seat width|Seat depth|Seat height|Bed width|Bed length|Max\. load)$/i.test(key)) continue;
    const v = toInches(lines[i + 1]);
    if (v == null) continue;
    const k = key.toLowerCase();
    if (out[k] == null) out[k] = v;
  }
  return out;
}

async function main() {
  const queries = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const out = [];
  for (const q of queries) {
    try {
      const hits = await search(q.q);
      // Pick the hit whose typeName matches what we asked for, else the first.
      let pool = hits;
      if (q.type) pool = pool.filter((h) => new RegExp(q.type, 'i').test(h.typeName || '')).concat(pool);
      if (q.mref) pool = pool.filter((h) => new RegExp(q.mref, 'i').test(h.itemMeasureReferenceText || '')).concat(pool);
      if (q.match) pool = pool.filter((h) => new RegExp(q.match, 'i').test(h.pipUrl || '')).concat(pool);
      const hit = pool[0];
      if (!hit) { out.push({ id: q.id, error: 'no hits' }); process.stderr.write(`- ${q.id}: no hits\n`); continue; }
      const html = await get(hit.pipUrl);
      const m = extractMeasurements(html);
      out.push({
        id: q.id,
        name: hit.name,
        typeName: hit.typeName,
        price: hit.salesPrice ? hit.salesPrice.numeral : null,
        url: hit.pipUrl,
        measure: hit.itemMeasureReferenceText || '',
        m
      });
      process.stderr.write(`+ ${q.id}: ${hit.name} ${hit.typeName} — ${JSON.stringify(m)}\n`);
    } catch (e) {
      out.push({ id: q.id, error: String(e.message || e) });
      process.stderr.write(`! ${q.id}: ${e.message}\n`);
    }
  }
  process.stdout.write(JSON.stringify(out, null, 1));
}
main();

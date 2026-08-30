// Turns the scraped IKEA responses into src/data/ikea.js.
// SPEC says, per item, which scraped record to use, which category it belongs
// to, and which measurement fields are the plan-view footprint (a bed's
// footprint is width x length, a table's is length x width, a rug is in feet).

const fs = require('fs');
const path = require('path');

function loadLoose(file) {
  const s = fs.readFileSync(path.join(__dirname, file), 'utf8');
  return JSON.parse(s.slice(s.indexOf('[')));
}

const recs = {};
for (const f of ['catalog-raw.json', 'catalog-fix.json', 'catalog-fix3.json']) {
  for (const r of loadLoose(f)) if (!r.error) recs[f + ':' + r.id] = r;
}
function rec(id) {
  for (const f of ['catalog-fix3.json', 'catalog-fix.json', 'catalog-raw.json']) {
    if (recs[f + ':' + id]) return recs[f + ':' + id];
  }
  throw new Error('missing scrape record: ' + id);
}

// footprint modes
const WD = (m) => [m.width, m.depth];              // as listed
const WL = (m) => [m.width, m.length];             // beds: width across, length away
const LW = (m) => [m.length, m.width];             // tables/desks: length across
const DIA = (m) => [m.diameter, m.diameter];       // round
const FEET = (m) => [m.width * 12, m.length * 12]; // rugs list in feet

const SPEC = [
  // --- seating ---
  ['kivik-2',        'seating', WD],
  ['kivik-3',        'seating', WD],
  ['vimle-3',        'seating', WD],
  ['soderhamn',      'seating', WD],
  ['ektorp',         'seating', WD],
  ['landskrona',     'seating', WD],
  ['friheten',       'seating', WD],
  ['jattebo',        'seating', WD],
  ['poang',          'seating', WD],
  ['strandmon',      'seating', WD],
  // --- tables ---
  ['lisabo-table',   'tables',  LW],
  ['ekedalen',       'tables',  LW],
  ['norden-gateleg', 'tables',  LW],
  ['melltorp',       'tables',  LW],
  ['docksta',        'tables',  DIA, { shape: 'round' }],
  ['lack-coffee',    'tables',  LW],
  ['vittsjo-coffee', 'tables',  DIA, { shape: 'round' }],
  ['listerby',       'tables',  LW],
  // --- beds ---
  ['malm-bed',         'beds', WL],
  ['malm-storage-bed', 'beds', WL],
  ['hemnes-bed',       'beds', WL],
  ['brimnes-bed',      'beds', WL],
  ['songesand',        'beds', WL],
  ['tarva',            'beds', WL],
  ['slattum',          'beds', WL],
  ['neiden',           'beds', WL],
  ['idanas-bed',       'beds', WL],
  ['nesttun',          'beds', WL],
  // --- storage ---
  ['pax-39',          'storage', WD],
  ['pax-59',          'storage', WD],
  ['pax-98',          'storage', WD],
  ['pax-49',          'storage', WD],
  ['billy-31',        'storage', WD],
  ['billy-16',        'storage', WD],
  ['billy-oxberg',    'storage', WD],
  ['kallax-2x2',      'storage', WD],
  ['kallax-4x4',      'storage', WD],
  ['tv-stand-big',    'storage', WD],
  ['besta-tv',        'storage', WD],
  ['besta-burs',      'storage', WD],
  ['malm-6drawer',    'storage', WD],
  ['malm-3drawer',    'storage', WD],
  ['hemnes-8drawer',  'storage', WD],
  ['nordli-6',        'storage', WD],
  ['nordli-chest',    'storage', WD],
  ['hauga-wardrobe',  'storage', WD],
  ['brimnes-wardrobe','storage', WD],
  ['kleppstad',       'storage', WD],
  ['nordkisa',        'storage', WD],
  ['ivar-shelf',      'storage', WD],
  ['vihals-shelf',    'storage', WD],
  ['hemnes-shoe',     'storage', WD],
  // --- desks ---
  ['micke-desk',   'desks', WD],
  ['lagkapten',    'desks', LW],
  ['idasen-desk',  'desks', LW],
  ['trotten-desk', 'desks', WD],
  ['alex-drawer',  'desks', WD],
  // --- rugs ---
  ['rug-a',      'rugs', FEET],
  ['rug-b',      'rugs', FEET],
  ['rug-runner', 'rugs', FEET],
  // --- kitchen ---
  ['stenstorp-island', 'kitchen', LW],
  ['raskog-cart',      'kitchen', WL],
  ['ingolf-stool',     'kitchen', WD],
  ['ingolf-chair',     'kitchen', WD],
  ['odger-chair',      'kitchen', WD]
];


// Several classic names have been retired from the IKEA US range and the site
// now serves their replacements. The scrape ids were the old names; rename to
// what the file actually holds so a saved layout is not misleading.
const RENAME = {
  "kivik-2":"kivik-loveseat", "kivik-3":"kivik-sofa", "vimle-3":"finnala-sofa",
  "ektorp":"uppland-sofa", "landskrona":"morabo-sofa", "ekedalen":"nasinge-table",
  "melltorp":"vihals-table", "malm-6drawer":"storklinta-6", "malm-3drawer":"storklinta-3",
  "nordli-chest":"nordli-2", "tv-stand-big":"kallax-tv", "hemnes-shoe":"gullaberg-shoe",
  "stenstorp-island":"tornviken-island", "ingolf-stool":"rosentorp-stool",
  "ingolf-chair":"rosentorp-chair", "nesttun":"brimnes-daybed", "pax-49":"pax-19",
  "rug-a":"rug-5x7", "rug-b":"rug-6x9", "rug-runner":"rug-7x10"
};

const round8 = (n) => Math.round(n * 8) / 8;

const out = [];
const seen = new Set();
for (const [id, category, mode, extra] of SPEC) {
  const r = rec(id);
  const [w, d] = mode(r.m).map((v) => (v == null ? null : round8(v)));
  if (!w || !d) { console.error('! skipped (no footprint):', id, JSON.stringify(r.m)); continue; }
  const key = r.url;
  if (seen.has(key)) { console.error('! skipped (duplicate product):', id, r.name); continue; }
  seen.add(key);
  out.push(Object.assign({
    id: RENAME[id] || id,
    name: r.name,
    type: r.typeName,
    category,
    w, d,
    h: r.m.height ? round8(r.m.height) : null,
    price: r.price,
    size: r.measure || '',
    url: r.url,
    verified: true
  }, extra || {}));
}

const byCat = {};
for (const o of out) (byCat[o.category] = byCat[o.category] || []).push(o);

let js = `// data/ikea.js — curated IKEA US catalog.
//
// Every width, depth, height and price in this file was read off that
// product's own page on ikea.com (see \`url\`) — not from memory. Footprints
// are the plan-view bounding box in INCHES: for beds that is width x length,
// for tables length x width, for rugs the listed foot size converted.
//
// A note on names: IKEA US has retired several classics, and the site now
// returns their replacements. Where that happened this file carries the
// product that actually exists today under its real name, so nothing here is
// a number attached to a thing you cannot buy.
//
// Regenerate with scratchpad/ikea-scrape.js + build-catalog.js.

const IKEA = [
`;
for (const cat of ['seating', 'tables', 'beds', 'storage', 'desks', 'rugs', 'kitchen']) {
  js += `\n  // ${cat}\n`;
  for (const o of byCat[cat] || []) {
    const bits = [
      `id: ${JSON.stringify(o.id)}`,
      `name: ${JSON.stringify(o.name)}`,
      `type: ${JSON.stringify(o.type)}`,
      `category: ${JSON.stringify(o.category)}`,
      `w: ${o.w}`, `d: ${o.d}`, `h: ${o.h === null ? 'null' : o.h}`,
      `price: ${o.price === null ? 'null' : o.price}`
    ];
    if (o.shape) bits.push(`shape: ${JSON.stringify(o.shape)}`);
    bits.push(`verified: true`);
    bits.push(`url: ${JSON.stringify(o.url)}`);
    js += `  { ${bits.join(', ')} },\n`;
  }
}
js += `];\n`;

fs.writeFileSync(process.argv[2], js);
console.error(`wrote ${out.length} items to ${process.argv[2]}`);
for (const cat of Object.keys(byCat)) console.error(`  ${cat}: ${byCat[cat].length}`);

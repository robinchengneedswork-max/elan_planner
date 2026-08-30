// budget.js — what the arrangement on screen costs. Pure arithmetic over the
// placed items plus the catalogue; no DOM.
//
// Shape is only the first filter. Two arrangements can both fit and only one
// of them be affordable, and the cheaper one is not always the one that looks
// cheaper — so the number that decides is a total, per layout, side by side.

// A placed item carries its own w/d (they are editable), but never a price:
// price belongs to the product, not to the copy of it on the floor.
function catalogFor(item) {
  return IKEA.find((c) => c.id === item.catId) || null;
}

function unitPrice(item) {
  const c = catalogFor(item);
  return c && c.price != null ? c.price : null;
}

// One line per product, not per placed piece — four dining chairs are one line
// with a quantity, which is how you would actually write the shopping list.
function budgetLines(items) {
  const by = new Map();
  for (const it of items || State.items) {
    const key = it.catId || it.name;
    const cur = by.get(key);
    if (cur) { cur.qty++; continue; }
    const cat = catalogFor(it);
    by.set(key, {
      catId: it.catId,
      name: it.name,
      type: cat ? cat.type : '',
      category: it.category,
      price: cat && cat.price != null ? cat.price : null,
      url: cat ? cat.url : null,
      img: cat ? cat.img : null,
      qty: 1,
    });
  }
  return [...by.values()].sort((a, b) =>
    (b.price ?? 0) * b.qty - (a.price ?? 0) * a.qty);
}

function budgetTotals(items) {
  const lines = budgetLines(items);
  let subtotal = 0, unpriced = 0, pieces = 0;
  for (const l of lines) {
    pieces += l.qty;
    if (l.price == null) unpriced += l.qty;
    else subtotal += l.price * l.qty;
  }
  const tax = subtotal * SALES_TAX_RATE;
  return { lines, pieces, subtotal, tax, total: subtotal + tax, unpriced };
}

// Spend per category, biggest first — usually one line explains the whole bill.
function budgetByCategory(items) {
  const sums = {};
  for (const l of budgetLines(items)) {
    if (l.price == null) continue;
    sums[l.category] = (sums[l.category] || 0) + l.price * l.qty;
  }
  return Object.entries(sums).sort((a, b) => b[1] - a[1]);
}

// --- comparing saved layouts ------------------------------------------------
//
// The arrangements are already in localStorage, so the comparison costs one
// read. This is the whole point of the panel: A fits and so does B, now which
// one do you want to pay for.

function layoutCosts(planId) {
  const pid = planId || State.planId;
  const d = storeRead();
  const set = (d.layouts || {})[pid] || {};
  const rows = Object.keys(set).sort().map((name) => {
    const t = budgetTotals(set[name].items || []);
    return { name, pieces: t.pieces, total: t.total, saved: true };
  });
  // The working draft only earns a row when it is not just a saved layout
  // under another name.
  if (State.items.length && (!State.layoutName || layoutIsDirty())) {
    const t = budgetTotals(State.items);
    rows.push({
      name: State.layoutName ? State.layoutName + ' *' : 'Working draft',
      pieces: t.pieces, total: t.total, saved: false, current: true,
    });
  } else if (State.layoutName) {
    const row = rows.find((r) => r.name === State.layoutName);
    if (row) row.current = true;
  }
  return rows;
}

// --- the shopping list ------------------------------------------------------

function shoppingListText(items) {
  const t = budgetTotals(items);
  const head = `${APP_NAME} — ${State.planId}` +
    (State.layoutName ? ` — ${State.layoutName}` : '') + '\n\n';
  const body = t.lines.map((l) =>
    `${String(l.qty).padStart(2)} x  ${l.name} ${l.type}` +
    `  ${l.price == null ? '(no price)' : '$' + (l.price * l.qty).toFixed(2)}` +
    (l.url ? `\n       ${l.url}` : '')).join('\n');
  const foot = `\n\nSubtotal  $${t.subtotal.toFixed(2)}` +
    `\nSales tax (${(SALES_TAX_RATE * 100).toFixed(0)}%, Gwinnett Co.)  $${t.tax.toFixed(2)}` +
    `\nTotal     $${t.total.toFixed(2)}` +
    (t.unpriced ? `\n\n${t.unpriced} piece(s) have no catalogue price.` : '');
  return head + body + foot;
}

// navigator.clipboard needs a secure context, and this app is meant to run off
// a double-clicked file. The textarea fallback is the one that will actually
// fire there, so it is not dead code.
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true, () => execCopy(text));
  }
  return Promise.resolve(execCopy(text));
}

function execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

// --- the target -------------------------------------------------------------

function setBudget(n) {
  State.budget = n && n > 0 ? n : null;
  const d = storeRead();
  d.budget = State.budget;
  storeWrite(d);
}

function restoreBudget() {
  const d = storeRead();
  State.budget = typeof d.budget === 'number' ? d.budget : null;
}

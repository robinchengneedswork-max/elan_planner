// ui.js — panels, menus, screen transitions. Everything that touches the DOM
// outside the canvas lives here.

let toastTimer = null;

function toast(html) {
  const el = document.getElementById('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('active');
  document.getElementById(id).classList.add('active');
}

function initTabs() {
  for (const bar of document.querySelectorAll('.tabs')) {
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-pane]');
      if (!btn) return;
      const side = bar.parentElement;
      for (const b of bar.querySelectorAll('button')) b.classList.toggle('on', b === btn);
      for (const p of side.querySelectorAll('.pane')) {
        p.classList.toggle('on', p.id === btn.dataset.pane);
      }
    });
  }
}

// --- plan picker ------------------------------------------------------------

function renderPlanCards() {
  const host = document.getElementById('plan-cards');
  host.innerHTML = PLAN_ORDER.map((id) => {
    const p = PLANS[id];
    return `<button class="plan-card ${id === State.planId ? 'on' : ''}" data-plan="${id}">
      <img src="${p.ref}" alt="${id} floor plan" loading="lazy">
      <span class="row"><b>${id}</b><span class="sq">${p.sqft} sq ft &middot; ${p.beds}</span></span>
      <span class="note">${p.note}</span>
    </button>`;
  }).join('');
  for (const el of host.querySelectorAll('.plan-card')) {
    el.addEventListener('click', () => switchPlan(el.dataset.plan));
  }
}

function renderPlanSelect() {
  const sel = document.getElementById('plan-select');
  sel.innerHTML = PLAN_ORDER
    .map((id) => `<option value="${id}">${id} &middot; ${PLANS[id].sqft} sq ft</option>`)
    .join('');
  sel.value = State.planId;
}

function switchPlan(id) {
  if (id === State.planId) return;
  if (State.items.length && layoutIsDirty() &&
      !confirm('Switch plans? Anything unsaved in this arrangement is dropped.')) {
    renderPlanSelect();
    return;
  }
  setPlan(id);
  State.items = [];
  State.layoutName = null;
  saveWork();
  fitView();
  renderPlanSelect();
  renderPlanCards();
  renderCalibration();
  renderLayoutSelect();
  refreshAll();
}

// --- layouts ----------------------------------------------------------------

function renderLayoutSelect() {
  const sel = document.getElementById('layout-select');
  const names = layoutNames();
  sel.innerHTML = `<option value="">Working draft</option>` +
    names.map((n) => `<option value="${attr(n)}">${attr(n)}</option>`).join('');
  sel.value = State.layoutName && names.includes(State.layoutName) ? State.layoutName : '';
}

function initLayoutControls() {
  document.getElementById('layout-select').addEventListener('change', (e) => {
    const name = e.target.value;
    if (!name) { State.layoutName = null; saveWork(); refreshAll(); return; }
    if (loadLayout(name)) {
      fitView();
      renderCalibration();
      refreshAll();
      toast(`Loaded &ldquo;${name}&rdquo;`);
    }
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    if (!State.layoutName) return document.getElementById('btn-saveas').click();
    saveLayout(State.layoutName);
    renderLayoutSelect();
    refreshAll();
    toast(`Saved &ldquo;${State.layoutName}&rdquo;`);
  });

  document.getElementById('btn-saveas').addEventListener('click', () => {
    const name = (prompt('Name this arrangement', suggestLayoutName()) || '').trim();
    if (!name) return;
    saveLayout(name);
    renderLayoutSelect();
    refreshAll();
    toast(`Saved &ldquo;${name}&rdquo;`);
  });

  document.getElementById('btn-rename').addEventListener('click', () => {
    if (!State.layoutName) return toast('Save this arrangement first');
    const name = (prompt('Rename to', State.layoutName) || '').trim();
    if (!name || name === State.layoutName) return;
    renameLayout(State.layoutName, name);
    renderLayoutSelect();
    refreshAll();
  });

  document.getElementById('btn-delete').addEventListener('click', () => {
    if (!State.layoutName) return toast('Nothing saved to delete');
    if (!confirm(`Delete "${State.layoutName}"? The furniture stays on screen.`)) return;
    const gone = State.layoutName;
    deleteLayout(gone);
    renderLayoutSelect();
    refreshAll();
    toast(`Deleted &ldquo;${gone}&rdquo;`);
  });
}

function suggestLayoutName() {
  const n = layoutNames().length + 1;
  return `${State.planId} option ${n}`;
}

// --- inspector --------------------------------------------------------------

function updateInspector() {
  const host = document.getElementById('pane-insp');
  const it = selectedItem();
  if (!it) {
    host.innerHTML = `<div class="empty">
      Nothing selected.<br><br>
      Click a piece in the catalogue to drop it in, or drag it straight onto the plan.
      Select something here to see its size and how much room is left around it.
    </div>`;
    return;
  }
  const cat = catalogById(it.catId);
  const clash = itemClashes(it);
  const gaps = boxClearances(it, obstacleSegs(it.uid));
  const names = ['Front', 'Right', 'Back', 'Left'];

  host.innerHTML = `<div class="pane-pad">
    ${cat && cat.img ? `<img class="insp-photo" src="${attr(cat.img)}" alt="${attr(it.name)}">` : ''}
    <div class="insp-title">${attr(it.name)}${cat && cat.custom ? ' <span class="mine">yours</span>' : ''}</div>
    <div class="insp-sub">${cat ? attr(cat.type) : ''}${cat && cat.price != null ? ' &middot; ' + money(cat.price) : ''}</div>
    ${cat ? inspFacts(cat) : ''}
    ${clash ? `<div class="calib-note" style="margin-top:12px;border-color:#e8bcbd;background:#fdf3f3;color:#a02a2c">
        This overlaps a wall, a fixture or another piece.</div>` : ''}
    <div class="rows">
      <label for="in-w">Width</label><input id="in-w" type="text" value="${attr(fmtIn(it.w))}">
      <label for="in-d">Depth</label><input id="in-d" type="text" value="${attr(fmtIn(it.d))}">
      <label for="in-rot">Rotation</label><input id="in-rot" type="text" value="${Math.round(it.rot)}&deg;">
    </div>
    <div class="btn-row">
      <button id="in-rot-l">&#8630; 15&deg;</button>
      <button id="in-rot-r">15&deg; &#8631;</button>
      <button id="in-dupe">Duplicate</button>
    </div>
    <div class="btn-row">
      <button id="in-del" class="danger">Remove</button>
      ${cat && cat.custom ? `<button id="in-edit">Edit this piece</button>` : ''}
    </div>
    ${cat && cat.url ? `<div class="btn-row" style="margin-top:8px">
      <a class="link" href="${attr(cat.url)}" target="_blank" rel="noopener noreferrer">View
        on ${attr(cat.brand || 'IKEA')} &rarr;</a>
    </div>` : ''}
    <h2 class="group" style="margin-left:0">Room around it</h2>
    <div class="rows">
      ${gaps.map((g, i) => `<label>${names[i]}</label>
        <input readonly value="${attr(isFinite(g.dist) ? fmtIn(g.dist) : '—')}">`).join('')}
    </div>
    <div class="insp-sub" style="margin-top:10px;line-height:1.55">
      Gaps are measured from the middle of each face to the first thing in the way.
      A walkway wants about 3&prime;0&Prime;; a side of the bed wants 2&prime;0&Prime;.
    </div>
  </div>`;

  document.getElementById('in-rot-l').onclick = () => { rotateItem(it.uid, -ROT_STEP_DEG); saveWork(); refreshAll(); };
  document.getElementById('in-rot-r').onclick = () => { rotateItem(it.uid, ROT_STEP_DEG); saveWork(); refreshAll(); };
  document.getElementById('in-dupe').onclick = () => { duplicateItem(it.uid); saveWork(); refreshAll(); };
  document.getElementById('in-del').onclick = () => { removeItem(it.uid); saveWork(); refreshAll(); };
  const edit = document.getElementById('in-edit');
  if (edit) edit.onclick = () => openCustomEditor(it.catId);

  bindDim('in-w', (v) => { it.w = v; });
  bindDim('in-d', (v) => { it.d = v; });
  document.getElementById('in-rot').addEventListener('change', (e) => {
    const deg = parseFloat(e.target.value);
    if (isFinite(deg)) { it.rot = ((deg % 360) + 360) % 360; saveWork(); refreshAll(); }
    else updateInspector();
  });
}

// What the plan view cannot show. Height is the tallest the piece stands, so
// it is the number that decides whether a dresser blocks a window; colour is
// what the room will actually read as; the rating is everyone else's warning.
// Any of the three can be absent — nine entries have no colour because IKEA
// has since renamed or re-sized that SKU, and a rug has no height.
function inspFacts(cat) {
  const bits = [];
  if (cat.h != null) {
    bits.push(`<span class="fact"><b>Height</b> ${fmtIn(cat.h)}</span>`);
  }
  if (cat.color) {
    bits.push(`<span class="fact"><i class="dot" style="background:${attr(cat.color.hex)}"></i>${attr(cat.color.name)}</span>`);
  }
  if (cat.rating != null) {
    bits.push(`<span class="fact">${stars(cat.rating)} <span class="rc">${cat.rating} &middot; ${cat.reviews || 0}</span></span>`);
  }
  return bits.length ? `<div class="insp-facts">${bits.join('')}</div>` : '';
}

// Catalogue numbers came off ikea.com, but a product page can go stale and a
// floor model can differ. Let the measured truth win.
function bindDim(id, apply) {
  document.getElementById(id).addEventListener('change', (e) => {
    const v = parseIn(e.target.value);
    if (isFinite(v) && v > 0) { apply(v); saveWork(); refreshAll(); }
    else updateInspector();
  });
}

// --- placed list ------------------------------------------------------------

function updatePlacedList() {
  const host = document.getElementById('pane-placed');
  if (!State.items.length) {
    host.innerHTML = `<div class="empty">No furniture placed yet.<br><br>
      Once there is something on the floor this pane totals what it costs,
      and compares it against the other arrangements you have saved.</div>`;
    return;
  }
  const rows = State.items.map((it) => {
    const p = unitPrice(it);
    return `<div class="placed ${it.uid === State.selectedUid ? 'on' : ''} ${itemClashes(it) ? 'clash' : ''}" data-uid="${it.uid}">
      <span class="swatch" style="width:11px;height:11px;background:${CATEGORY_COLORS[it.category]}"></span>
      <span class="nm">${attr(it.name)}</span>
      <span class="pr">${p == null ? '&mdash;' : money(p)}</span>
      <span class="dm">${fmtIn(it.w)}&times;${fmtIn(it.d)}</span>
      <button class="x" data-del="${it.uid}" title="Remove">&times;</button>
    </div>`;
  }).join('');

  host.innerHTML = rows + budgetPanel();

  for (const el of host.querySelectorAll('.placed')) {
    el.addEventListener('click', (e) => {
      if (e.target.dataset.del) { removeItem(e.target.dataset.del); saveWork(); refreshAll(); return; }
      State.selectedUid = el.dataset.uid;
      refreshAll();
    });
  }
  bindBudgetPanel();
}

// --- budget -----------------------------------------------------------------

function budgetPanel() {
  const t = budgetTotals();
  const cats = budgetByCategory();
  const over = State.budget != null && t.total > State.budget;
  const pct = State.budget ? Math.min(100, (t.total / State.budget) * 100) : 0;

  return `<div class="pane-pad budget">
    <h2 class="group" style="margin:0 0 8px">What it costs</h2>

    <div class="money-rows">
      <span>Subtotal</span><b>${money(round2(t.subtotal))}</b>
      <span>Sales tax &middot; ${(SALES_TAX_RATE * 100).toFixed(0)}%</span><b>${money(round2(t.tax))}</b>
      <span class="tot">Total</span><b class="tot ${over ? 'over' : ''}">${money(round2(t.total))}</b>
    </div>
    ${t.unpriced ? `<div class="insp-sub" style="margin-top:6px">${t.unpriced} piece${t.unpriced > 1 ? 's have' : ' has'} no catalogue price, so the total is a floor.</div>` : ''}

    <div class="rows" style="margin-top:12px">
      <label for="in-budget">Budget</label>
      <input id="in-budget" type="text" placeholder="none"
             value="${State.budget == null ? '' : attr(money(State.budget))}">
    </div>
    ${State.budget ? `<div class="bar ${over ? 'over' : ''}"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="insp-sub" style="margin-top:5px">${over
        ? `${money(round2(t.total - State.budget))} over.`
        : `${money(round2(State.budget - t.total))} left.`}</div>` : ''}

    ${cats.length ? `<h2 class="group" style="margin:16px 0 7px">Where it goes</h2>
      <div class="spend">${cats.map(([c, sum]) => `<div class="spend-row">
          <span class="swatch" style="width:9px;height:9px;background:${CATEGORY_COLORS[c]}"></span>
          <span class="nm">${CATEGORY_LABELS[c]}</span>
          <span class="pr">${money(round2(sum))}</span>
        </div>`).join('')}</div>` : ''}

    ${layoutCompare()}

    <div class="btn-row">
      <button id="btn-copy-list">Copy shopping list</button>
    </div>
    <div class="insp-sub" style="margin-top:10px;line-height:1.55">
      ${State.items.length} pieces &middot;
      ${totalPlacedArea().toFixed(0)} sq ft of the ${State.geo.areaSqft.toFixed(0)} sq ft floor covered
    </div>
  </div>`;
}

// Only worth drawing once there is something to compare against.
function layoutCompare() {
  const rows = layoutCosts();
  if (rows.length < 2) return '';
  const max = Math.max(...rows.map((r) => r.total)) || 1;
  return `<h2 class="group" style="margin:16px 0 7px">This plan&rsquo;s arrangements</h2>
    <div class="compare">${rows.map((r) => `<div class="cmp-row ${r.current ? 'on' : ''}">
      <span class="nm" title="${attr(r.name)}">${r.name}</span>
      <span class="cmp-bar"><i style="width:${((r.total / max) * 100).toFixed(1)}%"></i></span>
      <span class="pr">${money(round2(r.total))}</span>
    </div>`).join('')}</div>
    <div class="insp-sub" style="margin-top:5px">Totals include tax. A starred name is the draft you are editing.</div>`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function bindBudgetPanel() {
  const input = document.getElementById('in-budget');
  if (input) {
    input.addEventListener('change', (e) => {
      const v = parseFloat(String(e.target.value).replace(/[^0-9.]/g, ''));
      setBudget(isFinite(v) ? v : null);
      updatePlacedList();
    });
  }
  const copy = document.getElementById('btn-copy-list');
  if (copy) {
    copy.addEventListener('click', () => {
      copyText(shoppingListText()).then((ok) => {
        toast(ok ? 'Shopping list copied' : 'Could not reach the clipboard');
      });
    });
  }
}

// --- hud --------------------------------------------------------------------

function updateHud() {
  const def = PLANS[State.planId];
  document.getElementById('hud-plan').textContent =
    `${def.id}  ${fmtIn(State.geo.bounds.w)}×${fmtIn(State.geo.bounds.h)}  ${State.geo.areaSqft.toFixed(0)} sq ft`;
  document.getElementById('hud-count').textContent =
    `${State.items.length} placed${State.layoutName ? '  ·  ' + State.layoutName + (layoutIsDirty() ? ' *' : '') : ''}`;
}

function updateCursorHud(wx, wy) {
  document.getElementById('hud-cursor').textContent = `${fmtIn(wx)}, ${fmtIn(wy)}`;
}

// --- toggles ----------------------------------------------------------------

function initToggles() {
  const grid = document.getElementById('btn-grid');
  grid.addEventListener('click', () => {
    State.showGrid = !State.showGrid;
    grid.classList.toggle('on', State.showGrid);
    render();
  });
  const clr = document.getElementById('btn-clear');
  clr.addEventListener('click', () => {
    State.showClearance = !State.showClearance;
    clr.classList.toggle('on', State.showClearance);
    render();
  });
  const col = document.getElementById('btn-color');
  col.addEventListener('click', () => {
    State.showRealColor = !State.showRealColor;
    col.classList.toggle('on', State.showRealColor);
    render();
    if (State.showRealColor) {
      const missing = new Set(State.items
        .filter((i) => { const c = catalogById(i.catId); return !c || !c.color; })
        .map((i) => i.name));
      toast(missing.size
        ? `Real colours &mdash; ${attr([...missing].join(', '))} ${missing.size > 1 ? 'have' : 'has'} none on file, shown grey`
        : 'Real colours');
    }
  });
  document.getElementById('btn-fit').addEventListener('click', () => {
    fitView(); render(); updateHud();
  });
  document.getElementById('plan-select').addEventListener('change', (e) => switchPlan(e.target.value));
}

// --- one call to repaint everything ----------------------------------------

function refreshAll() {
  render();
  updateInspector();
  updatePlacedList();
  updateHud();
  updateCalibArea();
}

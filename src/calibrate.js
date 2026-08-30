// calibrate.js — the dimension editor.
//
// Each plan is generated from a flat set of named inches, so correcting the
// reconstruction after a tape-measure visit is typing a number, not dragging
// walls. Overrides are per plan and travel with the saved layout.

function renderCalibration() {
  const def = PLANS[State.planId];
  const host = document.getElementById('calib-rows');
  const over = currentOverrides();
  let html = '';

  for (const key of Object.keys(def.params)) {
    const value = over[key] != null ? over[key] : def.params[key];
    const edited = over[key] != null && over[key] !== def.params[key];
    const name = (def.labels && def.labels[key]) || key;
    html += `<div class="calib-row">
      <label for="p-${key}">${name}</label>
      <input id="p-${key}" data-key="${key}" type="text"
             class="${edited ? 'edited' : ''}" value="${fmtIn(value)}">
    </div>`;
  }
  host.innerHTML = html;

  for (const input of host.querySelectorAll('input')) {
    input.addEventListener('change', onParamChange);
    input.addEventListener('blur', onParamChange);
  }
  updateCalibArea();
}

function onParamChange(e) {
  const key = e.target.dataset.key;
  const inches = parseIn(e.target.value);
  const published = PLANS[State.planId].params[key];
  if (!isFinite(inches) || inches <= 0) {
    e.target.value = fmtIn(currentOverrides()[key] != null ? currentOverrides()[key] : published);
    return;
  }
  setParam(key, inches);
  saveWork();
  renderCalibration();
  fitView();
  refreshAll();
}

function updateCalibArea() {
  const def = PLANS[State.planId];
  const drawn = State.geo.areaSqft;
  const drift = ((drawn - def.sqft) / def.sqft) * 100;
  const overall = `${fmtIn(State.geo.bounds.w)} &times; ${fmtIn(State.geo.bounds.h)}`;
  document.getElementById('calib-area').innerHTML =
    `<b>${def.sqft} sq ft</b> published &middot; <b>${drawn.toFixed(0)} sq ft</b> drawn` +
    ` (${drift >= 0 ? '+' : ''}${drift.toFixed(1)}%)<br>Envelope ${overall}`;
}

function initCalibrate() {
  document.getElementById('btn-reset-params').addEventListener('click', () => {
    resetParams();
    saveWork();
    renderCalibration();
    fitView();
    refreshAll();
    toast('Dimensions reset to the published plan');
  });
}

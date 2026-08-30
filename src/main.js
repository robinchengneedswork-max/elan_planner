// main.js — boot and wiring.

// Editing is still mouse-only: input.js binds mousedown/mousemove/mouseup, and
// a touch never produces those. So a phone gets a real, readable app -- the
// priced catalogue, the plans, a saved layout -- and one honest line saying the
// canvas will not respond to a finger yet. Pointer events and pinch-zoom are
// their own piece of work; pretending otherwise would just be a broken page.
function isTouchOnly() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function checkViewport() {
  document.body.classList.toggle('touch-only', isTouchOnly());
  if (canvas) {
    resizeCanvas();
    render();
  }
}

function init() {
  if (!restoreWork()) {
    setPlan(State.planId);
  }
  // The budget is the user's, not the layout's, so it outlives switching plans.
  restoreBudget();

  initRender(document.getElementById('plan'));
  initTabs();
  initToggles();
  initLayoutControls();
  initCatalog();
  initCalibrate();
  initInput();

  renderPlanSelect();
  renderPlanCards();
  renderCalibration();
  renderLayoutSelect();

  showScreen('screen-app');
  checkViewport();
  fitView();
  refreshAll();

  // checkViewport already resizes and repaints. Deliberately no fitView here:
  // a resize must not throw away the zoom and pan you were working at.
  window.addEventListener('resize', checkViewport);
}

document.addEventListener('DOMContentLoaded', init);

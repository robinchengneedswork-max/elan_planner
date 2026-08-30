// main.js — boot and wiring.

function isDesktop() {
  return window.innerWidth >= MIN_DESKTOP_PX && !window.matchMedia('(pointer: coarse)').matches;
}

function checkViewport() {
  showScreen(isDesktop() ? 'screen-app' : 'screen-small');
  if (isDesktop() && canvas) {
    resizeCanvas();
    render();
  }
}

function init() {
  if (!restoreWork()) {
    setPlan(State.planId);
  }

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

  checkViewport();
  fitView();
  refreshAll();

  window.addEventListener('resize', () => {
    checkViewport();
    if (!isDesktop()) return;
    resizeCanvas();
    render();
  });
}

document.addEventListener('DOMContentLoaded', init);

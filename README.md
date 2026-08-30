# Elan Planner

A furniture layout planner for **Elan Satellite Place, Duluth GA — unit 242**.
Pick the floor plan that matches the unit, drag IKEA pieces onto it, and check
clearances before anything gets bought.

It is a plain static site: HTML, CSS, and a handful of `<script>` tags. No
framework, no build step, no dependencies.

## Running it locally

Open `index.html` in any modern browser — `file://` works, no server needed.

The app is desktop-only by design; below 1100 px wide it shows a notice
instead of the planner.

## Layout

```
index.html          load order for the modules = dependency order
style.css
src/
  config.js         constants and real-world dimensions
  geometry.js       polygon / box math, clearance solving
  state.js          app state and mutators
  layouts.js        saved layouts (localStorage)
  render.js         canvas drawing
  catalog.js        furniture catalog panel
  calibrate.js      the dimension-correction panel
  input.js          pointer + keyboard handling
  ui.js             panels, tabs, toasts
  main.js           init and wiring
  data/
    ikea.js         65 IKEA pieces with verified dimensions
    plans/          one builder per floor plan (A1…A8) + shared vocabulary
ref/                leasing renders the plans were reconstructed from
test/check.js       headless geometry check
```

The plans are *reconstructed*: the leasing renders print each room's size but
not wall-by-wall dimensions, so each builder solves an envelope that lands on
the published square footage. The **Dimensions** panel exists so real tape-measure
numbers can replace the estimates after a tour.

## Tests

```bash
node test/check.js
```

Loads `src/*.js` into a `vm` context the same way `index.html` does, then checks
every plan's drawn area against its published square footage, validates the IKEA
catalog, and exercises the geometry primitives. No dependencies.

## Deploying

Vercel serves this repo as-is — no build command, no install step. Import the
repository and accept the defaults; `vercel.json` pins the framework to "Other",
serves the repo root, and sets caching (immutable for `ref/`, revalidate for
`src/` and `style.css`).

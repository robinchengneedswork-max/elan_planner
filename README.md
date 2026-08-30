# Elan Planner

Furniture mockups for **Elan Satellite Place**, 3100 Commerce Ave NW, Duluth GA — unit 242.

Open `index.html` in any modern browser. No build step, no server, no install; `file://` is fine.
Desktop only — below 1100 px it shows a "use a desktop" card instead of trying to reflow.

## What it is

Unit 242 is a one-bedroom, so it is one of Elan's nine A-plans. The app ships all nine, drawn to
scale, with the leasing renders in the picker so you can identify yours by sight. Drop real IKEA
furniture into the plan, drag and rotate it, and watch the gap to the nearest wall update as you go.

## Where the numbers come from

**Rooms.** Elan publishes 3D marketing renders, not dimensioned drawings — each render prints its
bedroom and living-room sizes and nothing else. Every plan here is reconstructed: the two labelled
rooms go in at their exact printed size, the service core (hall, closets, W/D, bath, kitchen) is
built from real-world constants — 32" doors, a 60"×30" tub, 25" counters, a 36" fridge — and the
envelope is solved so the floor area lands on the published square footage. All nine come in within
0.2%.

**So the labelled rooms are right and the core is a reasonable reconstruction.** That is what the
**Dimensions** tab is for: every plan is generated from a named set of inch values, so after you
tour with a tape measure you type the real numbers in and the plan redraws around them. Room labels
show what is actually drawn, not what was published, so a corrected wall shows its corrected number.

**Furniture.** All 65 catalogue dimensions and prices were read off that item's own page on
ikea.com — the URL is on every entry, and the inspector links straight to it. IKEA US has retired
several classics (EKTORP, MELLTORP, EKEDALEN, LANDSKRONA, the MALM dressers, INGOLF, STENSTORP),
and the catalogue carries their current replacements under the real names, so nothing here is a
number attached to something you cannot buy.

Two caveats worth knowing:

- **No chaise or corner sofas except FRIHETEN.** IKEA lists a chaise sofa's *body* depth, not the
  depth of the chaise leg, so those footprints would have been wrong. FRIHETEN is included because
  its listed 90½" × 59½" is the true sectional footprint.
- A selected piece's width and depth are editable in the inspector. Product pages go stale and
  floor models differ; measured truth should win over a catalogue number.

## Using it

| | |
|---|---|
| Place | Click a catalogue row, or drag it onto the plan |
| Move | Drag. Snaps to walls, fixtures and other furniture; hold `Alt` for free movement |
| Rotate | `R` / `Shift+R`, the round handle, or type an angle. Hold `Alt` while dragging the handle for free rotation |
| Nudge | Arrow keys 1", `Shift`+arrows 6" |
| Duplicate / remove | `Ctrl+D` / `Delete` |
| View | Wheel zooms at the cursor, space-drag or middle-drag pans, `F` fits, `G` toggles the grid |

A piece turns **red** when it overlaps a wall, a fixture or another piece. It never blocks you —
it just tells you the truth. Rugs are exempt, since things go on top of them.

The dashed blue lines around the selected piece are the gap from each face to the first thing in
the way. A walkway wants about 3'0"; a side of the bed wants 2'0".

**Layouts** are saved in this browser under a name and stay tied to the plan they were drawn in.
The working draft autosaves, so a refresh never costs you an evening.

## Layout

```
index.html            script tags in dependency order — modules share global scope
style.css
ref/                  the nine leasing renders (.svg as downloaded, .jpg extracted)
src/config.js         constants, construction sizes, palette
src/geometry.js       inches<->pixels, polygon area, rotated-rect SAT, clearance rays
src/data/ikea.js      the catalogue (generated — see below)
src/data/plans/       index.js holds the registry + the shared A-plan skeleton;
                      a1..a8 are one file each
src/state.js          state object + pure mutators, no DOM
src/layouts.js        localStorage
src/render.js         canvas, drawn in screen space so line weights stay crisp
src/catalog.js  src/calibrate.js  src/input.js  src/ui.js  src/main.js
test/check.js         headless geometry + catalogue checks
```

## Tests

```bash
node test/check.js
```

765 checks. Loads `src/*.js` into a `vm` context the same way `index.html` does, then asserts for
all nine plans: drawn area within 3% of the published sqft, every wall and fixture inside the
outline, no fixture buried in a wall, every door and window on a wall, and every room matching its
printed callout — plus catalogue sanity and the geometry primitives.

To regenerate the catalogue, re-run `ikea-scrape.js` and `build-catalog.js` (they hit IKEA's own
search API and product pages).

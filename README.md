# Elan Planner

Furniture mockups for **Elan Satellite Place**, 3100 Commerce Ave NW, Duluth GA — unit 242.

Open `index.html` in any modern browser. No build step, no server, no install; `file://` is fine.

It renders at any width — narrow screens stack the plan above the panels. **Editing is still
mouse-only**, because `input.js` listens for `mousedown`/`mousemove`/`mouseup` and a finger never
produces those. On a coarse pointer the app says so instead of quietly ignoring your taps: you can
browse the priced catalogue, switch plans and read a saved layout on a phone, but dragging
furniture needs a mouse until pointer events and pinch-zoom land.

## What it is

Unit 242 is a one-bedroom, so it is one of Elan's nine A-plans. The app ships all nine, drawn to
scale, with the leasing renders in the picker so you can identify yours by sight. Drop real IKEA
furniture into the plan — or a piece you added yourself from anywhere else — drag and rotate it, and
watch the gap to the nearest wall update as you go.

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

**Photos, colour, rating.** Every entry also carries that product's own hero shot, downloaded into
`img/` rather than hotlinked, so the planner still works offline and off a USB stick. 65 photos come
to about 800 kB. Colour (with its real hex), star rating and review count come from IKEA's search
API, and are only kept where the product still resolves to the *same item number* as the curated
URL — nine entries whose SKU has since been renamed or re-sized carry no colour rather than one
borrowed from a different variant.

**Height** is the tallest the piece stands in the room: a plain listed Height where there is one,
otherwise height including back cushions (sofas), headboard height (beds) or max height (sit-stand
desks). Rugs have none. Watch for this if you re-scrape: the measurements tab lists the flat-pack
cartons *below* the product, and their "Height" is what originally put three beds in this
catalogue at 2½″ to 4″.

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
| Find | Search, or sort the catalogue by price, footprint or rating, and cap the price |
| Add your own | **+ Add your own piece** above the catalogue, or the ✎ on one of your rows |

A piece turns **red** when it overlaps a wall, a fixture or another piece. It never blocks you —
it just tells you the truth. Rugs are exempt, since things go on top of them.

The dashed blue lines around the selected piece are the gap from each face to the first thing in
the way. A walkway wants about 3'0"; a side of the bed wants 2'0".

**Layouts** are saved in this browser under a name and stay tied to the plan they were drawn in.
The working draft autosaves, so a refresh never costs you an evening.

## Furniture that isn't IKEA

`src/data/ikea.js` is a file — it ships with the app and the page cannot edit it. **+ Add your own
piece** covers everything else: the Amazon alternative, the Wayfair sofa, the dresser you already
own. Fill in a name, a category and a footprint, and from that moment it is a catalogue entry like
any other — it drags onto the plan, clashes with walls, counts toward the total, fills with its own
colour under the **Colour** toggle, and lands in the shopping list with its link. Yours carry a
`yours` badge and a ✎ to edit or remove them; everything else about them is identical.

Paste the product link **first**: Amazon and most catalogue sites put the product title in the URL
slug, so the name and the vendor fill themselves in. Nothing is fetched — this app runs off a
double-clicked file, so there is no server to scrape with and CORS would stop it anyway. The
dimensions come off the listing's own "Product Dimensions" line, as **L×W×H in inches**; width and
depth here are the footprint looking down, so for a bed that is its width by its length.

A photo can be an image address, which is stored as an address, or a file, which is re-encoded down
to 240 px and inlined — one untouched phone photo would eat most of the few megabytes localStorage
gives you, and the editor tells you when a write does not fit.

Your pieces live in this browser, next to the saved layouts. Deleting one leaves any furniture
already placed from it sitting exactly where it was — a placed piece keeps its own name and size —
it just stops having a price, and the delete says so first. Their ids are never re-used, so an
orphan can never quietly inherit a different product's price.

## Shape is only the first filter

Two arrangements can both fit and only one of them be affordable, so **Pieces & cost** totals what
is on the floor: subtotal, 6% sales tax (4% Georgia + 2% Gwinnett, so the number is what you would
actually hand over), spend per category, and an optional budget the bar reddens past. Below that,
every saved arrangement for this plan sits in one table with its total — which is the comparison
that actually decides between them. **Copy shopping list** puts names, quantities, prices and
product links on the clipboard for the store trip.

Sorting by rating does not rank on the raw star count: a 5.0 from one review is not better than a
4.7 from ten thousand, so the score is pulled toward the catalogue average in proportion to how
little evidence stands behind it.

The **Colour** toggle fills each piece with its real colour instead of its category tint. The
category colours tell you what kind of thing something is, which is what you want while deciding
where it goes; the real colours tell you the room is about to be four-fifths white, or that the
browns have taken over. Pieces with no colour on file go grey rather than guessing.

## Layout

```
index.html            script tags in dependency order — modules share global scope
style.css
ref/                  the nine leasing renders (.svg as downloaded, .jpg extracted)
img/                  one product photo per catalogue entry, <id>.jpg
src/config.js         constants, construction sizes, sales-tax rate, palette
src/geometry.js       inches<->pixels, polygon area, rotated-rect SAT, clearance rays
src/data/ikea.js      the catalogue (generated — see below)
src/data/plans/       index.js holds the registry + the shared A-plan skeleton;
                      a1..a8 are one file each
src/state.js          state object + pure mutators, no DOM
src/layouts.js        localStorage
src/custom.js         your own furniture — merged catalogue, validation, storage; no DOM
src/budget.js         what the arrangement costs — pure arithmetic, no DOM
src/render.js         canvas, drawn in screen space so line weights stay crisp
src/catalog.js  src/calibrate.js  src/input.js  src/ui.js  src/main.js
src/custom-ui.js      the add-your-own form (its dialog is static in index.html)
tools/                the scrapers (dev-only, not deployed)
test/check.js         headless geometry, catalogue and custom-furniture checks
```

## Tests

```bash
node test/check.js
```

1314 checks. Loads `src/*.js` into a `vm` context the same way `index.html` does, then asserts for
all nine plans: drawn area within 3% of the published sqft, every wall and fixture inside the
outline, no fixture buried in a wall, every door and window on a wall, and every room matching its
printed callout — plus the geometry primitives, and for every catalogue entry a price, a plausible
height, a well-formed colour, and a photo **that exists on disk** (the photos are vendored, so a
missing file is a broken image nothing else would catch).

The custom-furniture side gets its own section, on a shimmed `localStorage`: what a hand-typed
draft turns into (feet-and-inches parsed, `$319.99` parsed, an Amazon slug read as a name), what is
refused (no name, a made-up category, a 33-foot sofa, a negative price, a `javascript:` link), that
a piece survives a reload, that a corrupt stored catalogue loses only its bad rows, that a deleted
id is never handed out again, and that a write which does not fit is rolled back rather than left
holding a piece that vanishes on the next refresh.

To regenerate the catalogue, re-run `tools/ikea-scrape.js` and `tools/build-catalog.js` for the
dimensions, then `tools/enrich-catalog.js` for the photo, colour, rating and height. All three hit
IKEA's own search API and product pages.

```bash
node tools/enrich-catalog.js               # full run: metadata + download photos
node tools/enrich-catalog.js --no-images   # skip the downloads, keep what is in img/
node tools/enrich-catalog.js --from-cache  # rewrite ikea.js from the last run, no network
```

It is idempotent — it strips the fields it added before adding them again — and it never touches
the curated width and depth.

// config.js — constants, tuning values, palette.
// Every length in this app is in INCHES unless a name ends in _PX.

const APP_NAME = 'Elan Planner';
const STORAGE_KEY = 'elan-planner:v1';

// --- view -------------------------------------------------------------------
const PX_PER_IN_MIN = 0.6;
const PX_PER_IN_MAX = 9;
const FIT_PADDING_PX = 56;
const MIN_DESKTOP_PX = 1100;

// --- editing ----------------------------------------------------------------
const GRID_IN = 12;          // major grid = 1 ft
const SNAP_GRID_IN = 1;      // free movement resolution
const SNAP_WALL_IN = 5;      // pull-to-wall / pull-to-fixture tolerance
const SNAP_ITEM_IN = 5;      // edge-align to another placed item
const ROT_STEP_DEG = 15;
const NUDGE_IN = 1;
const NUDGE_BIG_IN = 6;
const HANDLE_PX = 9;         // rotate handle hit radius, screen space
const HANDLE_OFFSET_PX = 26;

// --- construction constants used by the plan builders -----------------------
// Real-world sizes used to reconstruct the service core from the leasing
// renders, which print room dimensions but not closet or fixture sizes.
const WALL_T = 5;            // interior partition
const EXT_T = 6;             // exterior wall
const DOOR_W = 32;           // interior door leaf
const ENTRY_DOOR_W = 36;
const COUNTER_D = 25;        // kitchen base cabinet depth
const FRIDGE = { w: 36, d: 30 };
const RANGE = { w: 30, d: 25 };
const DISHWASHER = { w: 24, d: 25 };
const TUB = { w: 60, d: 30 };
const SHOWER = { w: 60, d: 36 };
const TOILET = { w: 20, d: 28 };
const VANITY_D = 21;

// --- palette ----------------------------------------------------------------
// Paper-and-ink drafting look: warm paper, near-black walls, muted fixtures,
// furniture tinted by category so a plan reads at a glance.
const COLORS = {
  paper:        '#f4f1ea',
  paperEdge:    '#e6e1d6',
  grid:         '#e0dacb',
  gridMajor:    '#d2cab6',
  floor:        '#fbf9f4',
  balcony:      '#eceadf',
  wall:         '#23201c',
  wallLight:    '#6d675d',
  window:       '#7fa6c4',
  doorArc:      '#c5bdac',
  fixture:      '#ded8cb',
  fixtureLine:  '#a89f8d',
  roomLabel:    '#8b8272',
  dimLine:      '#b0a692',
  select:       '#1d6fd6',
  clash:        '#d1373a',
  measure:      '#1d6fd6',
  measureBg:    'rgba(255,255,255,0.92)'
};

const CATEGORY_COLORS = {
  seating: '#b8cbb0',
  beds:    '#c9bcd8',
  tables:  '#e0c9a6',
  storage: '#a9c2d4',
  desks:   '#d9b9ae',
  rugs:    '#ded6c2',
  kitchen: '#cdd2b0'
};

const CATEGORY_LABELS = {
  seating: 'Sofas & seating',
  beds:    'Beds',
  tables:  'Tables & dining',
  storage: 'Storage & wardrobes',
  desks:   'Desks',
  rugs:    'Rugs',
  kitchen: 'Kitchen & extras'
};

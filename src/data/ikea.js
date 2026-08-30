// data/ikea.js — curated IKEA US catalog.
//
// Every width, depth, height and price in this file was read off that
// product's own page on ikea.com (see `url`) — not from memory. Footprints
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

  // seating
  { id: "kivik-loveseat", name: "KIVIK", type: "Loveseat", category: "seating", w: 74.75, d: 37.375, h: 32.625, price: 749, verified: true, url: "https://www.ikea.com/us/en/p/kivik-loveseat-tibbleby-beige-gray-s89440595/" },
  { id: "kivik-sofa", name: "KIVIK", type: "Sofa", category: "seating", w: 89.75, d: 37.375, h: 32.625, price: 799, verified: true, url: "https://www.ikea.com/us/en/p/kivik-sofa-tibbleby-beige-gray-s39440593/" },
  { id: "finnala-sofa", name: "FINNALA", type: "Sofa", category: "seating", w: 94.875, d: 38.625, h: null, price: 1019, verified: true, url: "https://www.ikea.com/us/en/p/finnala-sofa-gunnared-beige-s19319060/" },
  { id: "soderhamn", name: "SÖDERHAMN", type: "Sofa", category: "seating", w: 78, d: 39, h: null, price: 969, verified: true, url: "https://www.ikea.com/us/en/p/soederhamn-sofa-viarp-beige-brown-s59305706/" },
  { id: "uppland-sofa", name: "UPPLAND", type: "Sofa", category: "seating", w: 88.25, d: 36.25, h: null, price: 899, verified: true, url: "https://www.ikea.com/us/en/p/uppland-sofa-blekinge-white-s19384116/" },
  { id: "morabo-sofa", name: "MORABO", type: "Sofa", category: "seating", w: 81.125, d: 36.25, h: 31.875, price: 799, verified: true, url: "https://www.ikea.com/us/en/p/morabo-sofa-gunnared-dark-gray-wood-s89318321/" },
  { id: "friheten", name: "FRIHETEN", type: "Sleeper sectional,3 seat w/storage", category: "seating", w: 90.5, d: 59.5, h: null, price: 999, verified: true, url: "https://www.ikea.com/us/en/p/friheten-sleeper-sectional-3-seat-w-storage-skiftebo-dark-gray-s69216757/" },
  { id: "jattebo", name: "JÄTTEBO", type: "Sectional, 3-seat", category: "seating", w: 94.5, d: 37.375, h: 28, price: 1800, verified: true, url: "https://www.ikea.com/us/en/p/jaettebo-sectional-3-seat-samsala-dark-yellow-green-s89485131/" },
  { id: "poang", name: "POÄNG", type: "Armchair", category: "seating", w: 26.75, d: 32.25, h: 39.375, price: 299, verified: true, url: "https://www.ikea.com/us/en/p/poaeng-armchair-birch-veneer-grann-golden-brown-s99625254/" },
  { id: "strandmon", name: "STRANDMON", type: "Wing chair", category: "seating", w: 32.25, d: 37.75, h: 39.75, price: 299, verified: true, url: "https://www.ikea.com/us/en/p/strandmon-wing-chair-nordvalla-dark-gray-90359829/" },

  // tables
  { id: "lisabo-table", name: "LISABO", type: "Table", category: "tables", w: 55.125, d: 30.75, h: 29.125, price: 299.99, verified: true, url: "https://www.ikea.com/us/en/p/lisabo-table-ash-veneer-70294339/" },
  { id: "nasinge-table", name: "NÄSINGE", type: "Extendable table", category: "tables", w: 51.125, d: 31.5, h: 29.5, price: 279.99, verified: true, url: "https://www.ikea.com/us/en/p/naesinge-extendable-table-dark-brown-stained-beech-veneer-70587498/" },
  { id: "norden-gateleg", name: "NORDEN", type: "Gateleg table", category: "tables", w: 35, d: 31.5, h: 29.125, price: 359.99, verified: true, url: "https://www.ikea.com/us/en/p/norden-gateleg-table-birch-90423887/" },
  { id: "vihals-table", name: "VIHALS", type: "Table", category: "tables", w: 49.25, d: 29.125, h: 29.5, price: 129.99, verified: true, url: "https://www.ikea.com/us/en/p/vihals-table-white-white-s39578509/" },
  { id: "docksta", name: "DOCKSTA", type: "Table", category: "tables", w: 40.5, d: 40.5, h: 29.5, price: 279.99, shape: "round", verified: true, url: "https://www.ikea.com/us/en/p/docksta-table-white-white-s19324995/" },
  { id: "lack-coffee", name: "LACK", type: "Coffee table", category: "tables", w: 35.375, d: 21.625, h: 17.75, price: 29.99, verified: true, url: "https://www.ikea.com/us/en/p/lack-coffee-table-black-brown-40104294/" },
  { id: "vittsjo-coffee", name: "VITTSJÖ", type: "Coffee table", category: "tables", w: 29.5, d: 29.5, h: 17.75, price: 99.99, shape: "round", verified: true, url: "https://www.ikea.com/us/en/p/vittsjoe-coffee-table-black-brown-glass-80213309/" },
  { id: "listerby", name: "LISTERBY", type: "Coffee table", category: "tables", w: 55.125, d: 23.625, h: 14.625, price: 399.99, verified: true, url: "https://www.ikea.com/us/en/p/listerby-coffee-table-dark-brown-beech-veneer-90562246/" },

  // beds
  { id: "malm-bed", name: "MALM", type: "Bed frame", category: "beds", w: 66.125, d: 83.125, h: 39.375, price: 249, verified: true, url: "https://www.ikea.com/us/en/p/malm-bed-frame-dark-brown-veneer-s09574367/" },
  { id: "malm-storage-bed", name: "MALM", type: "Storage bed", category: "beds", w: 66.125, d: 83.5, h: 3.75, price: 599, verified: true, url: "https://www.ikea.com/us/en/p/malm-storage-bed-white-70404818/" },
  { id: "hemnes-bed", name: "HEMNES", type: "Bed frame", category: "beds", w: 65.75, d: 83.875, h: null, price: 599, verified: true, url: "https://www.ikea.com/us/en/p/hemnes-bed-frame-black-brown-lyngoer-dark-gray-s49567505/" },
  { id: "brimnes-bed", name: "BRIMNES", type: "Bed frame with storage & headboard", category: "beds", w: 62.25, d: 95.25, h: 43.75, price: 449, verified: true, url: "https://www.ikea.com/us/en/p/brimnes-bed-frame-with-storage-headboard-black-luroey-s79129608/" },
  { id: "songesand", name: "SONGESAND", type: "Bed frame", category: "beds", w: 65, d: 81.875, h: null, price: 299, verified: true, url: "https://www.ikea.com/us/en/p/songesand-bed-frame-brown-luroey-s59241069/" },
  { id: "tarva", name: "TARVA", type: "Bed frame", category: "beds", w: 63, d: 82.25, h: null, price: 199, verified: true, url: "https://www.ikea.com/us/en/p/tarva-bed-frame-pine-luroey-s29007794/" },
  { id: "slattum", name: "SLATTUM", type: "Upholstered bed frame", category: "beds", w: 61.375, d: 81.875, h: 4, price: 149, verified: true, url: "https://www.ikea.com/us/en/p/slattum-upholstered-bed-frame-vissle-dark-gray-70571256/" },
  { id: "neiden", name: "NEIDEN", type: "Bed frame", category: "beds", w: 54.75, d: 76.75, h: null, price: 109, verified: true, url: "https://www.ikea.com/us/en/p/neiden-bed-frame-pine-luroey-s79248606/" },
  { id: "idanas-bed", name: "IDANÄS", type: "Bed frame", category: "beds", w: 64.125, d: 82.25, h: 2.5, price: 279, verified: true, url: "https://www.ikea.com/us/en/p/idanaes-bed-frame-white-30458912/" },
  { id: "brimnes-daybed", name: "BRIMNES", type: "Daybed frame with 2 drawers", category: "beds", w: 41, d: 76.75, h: 22.875, price: 249, verified: true, url: "https://www.ikea.com/us/en/p/brimnes-daybed-frame-with-2-drawers-white-40228708/" },

  // storage
  { id: "pax-39", name: "PAX / GRIMO", type: "Wardrobe combination", category: "storage", w: 39.375, d: 23.625, h: 79.25, price: 435, verified: true, url: "https://www.ikea.com/us/en/p/pax-grimo-wardrobe-combination-white-white-s69560819/" },
  { id: "pax-59", name: "PAX", type: "2 wardrobe frames", category: "storage", w: 58.875, d: 22.875, h: 79.25, price: 340, verified: true, url: "https://www.ikea.com/us/en/p/pax-2-wardrobe-frames-white-s99556397/" },
  { id: "pax-98", name: "PAX", type: "3 wardrobe frames", category: "storage", w: 78.625, d: 22.875, h: 93.125, price: 540, verified: true, url: "https://www.ikea.com/us/en/p/pax-3-wardrobe-frames-gray-beige-s99562384/" },
  { id: "pax-19", name: "PAX", type: "Wall-mounted storage frame", category: "storage", w: 19.625, d: 22.875, h: 93.125, price: 170, verified: true, url: "https://www.ikea.com/us/en/p/pax-wall-mounted-storage-frame-white-40588159/" },
  { id: "billy-31", name: "BILLY", type: "Bookcase", category: "storage", w: 31.5, d: 11, h: 79.5, price: 69, verified: true, url: "https://www.ikea.com/us/en/p/billy-bookcase-brown-walnut-effect-50508652/" },
  { id: "billy-16", name: "BILLY", type: "Bookcase", category: "storage", w: 15.75, d: 11, h: 79.5, price: 69, verified: true, url: "https://www.ikea.com/us/en/p/billy-bookcase-blue-40594928/" },
  { id: "billy-oxberg", name: "BILLY / OXBERG", type: "Bookcase with doors", category: "storage", w: 31.5, d: 11.75, h: 79.5, price: 169, verified: true, url: "https://www.ikea.com/us/en/p/billy-oxberg-bookcase-with-doors-brown-walnut-effect-s19563132/" },
  { id: "kallax-2x2", name: "KALLAX", type: "Shelf unit", category: "storage", w: 30.125, d: 15.375, h: 57.625, price: 79.99, verified: true, url: "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-20631663/" },
  { id: "kallax-4x4", name: "KALLAX", type: "Shelf unit", category: "storage", w: 57.875, d: 15.375, h: 57.625, price: 179.99, verified: true, url: "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-30275861/" },
  { id: "kallax-tv", name: "KALLAX", type: "TV storage combination", category: "storage", w: 57.75, d: 15.375, h: 23.5, price: 169.99, verified: true, url: "https://www.ikea.com/us/en/p/kallax-tv-storage-combination-black-brown-s49569444/" },
  { id: "besta-tv", name: "BESTÅ", type: "TV unit", category: "storage", w: 70.875, d: 15.75, h: 15, price: 90, verified: true, url: "https://www.ikea.com/us/en/p/besta-tv-unit-black-brown-40565775/" },
  { id: "besta-burs", name: "BESTÅ", type: "TV bench with doors", category: "storage", w: 70.875, d: 16.5, h: 15, price: 225, verified: true, url: "https://www.ikea.com/us/en/p/besta-tv-bench-with-doors-black-brown-lappviken-brown-walnut-effect-s49612174/" },
  { id: "storklinta-6", name: "STORKLINTA", type: "6-drawer dresser", category: "storage", w: 55.125, d: 18.875, h: 29.5, price: 249.99, verified: true, url: "https://www.ikea.com/us/en/p/storklinta-6-drawer-dresser-white-anchor-unlock-function-60561248/" },
  { id: "storklinta-3", name: "STORKLINTA", type: "3-drawer dresser", category: "storage", w: 27.5, d: 18.875, h: 29.5, price: 129.99, verified: true, url: "https://www.ikea.com/us/en/p/storklinta-3-drawer-dresser-white-anchor-unlock-function-00559291/" },
  { id: "hemnes-8drawer", name: "HEMNES", type: "8-drawer dresser", category: "storage", w: 63, d: 19.625, h: 37.75, price: 449.99, verified: true, url: "https://www.ikea.com/us/en/p/hemnes-8-drawer-dresser-white-stain-10576191/" },
  { id: "nordli-6", name: "NORDLI", type: "6-drawer dresser", category: "storage", w: 47.25, d: 18.5, h: 29.875, price: 349.99, verified: true, url: "https://www.ikea.com/us/en/p/nordli-6-drawer-dresser-white-90622071/" },
  { id: "nordli-2", name: "NORDLI", type: "2-drawer chest", category: "storage", w: 15.75, d: 18.5, h: 21.25, price: 99.99, verified: true, url: "https://www.ikea.com/us/en/p/nordli-2-drawer-chest-white-30589079/" },
  { id: "hauga-wardrobe", name: "HAUGA", type: "Wardrobe with sliding doors", category: "storage", w: 46.5, d: 21.625, h: 78.375, price: 299.99, verified: true, url: "https://www.ikea.com/us/en/p/hauga-wardrobe-with-sliding-doors-white-60456916/" },
  { id: "brimnes-wardrobe", name: "BRIMNES", type: "Wardrobe with 3 doors", category: "storage", w: 46, d: 19.75, h: 74.75, price: 249.99, verified: true, url: "https://www.ikea.com/us/en/p/brimnes-wardrobe-with-3-doors-white-90574800/" },
  { id: "kleppstad", name: "KLEPPSTAD", type: "Wardrobe with 3 doors", category: "storage", w: 46.125, d: 21.625, h: 69.25, price: 199.99, verified: true, url: "https://www.ikea.com/us/en/p/kleppstad-wardrobe-with-3-doors-white-20441757/" },
  { id: "nordkisa", name: "NORDKISA", type: "Open wardrobe with sliding door", category: "storage", w: 47.25, d: 18.5, h: 73.25, price: 399.99, verified: true, url: "https://www.ikea.com/us/en/p/nordkisa-open-wardrobe-with-sliding-door-bamboo-00439468/" },
  { id: "ivar-shelf", name: "IVAR", type: "Shelf unit", category: "storage", w: 35, d: 19.625, h: 70.5, price: 120, verified: true, url: "https://www.ikea.com/us/en/p/ivar-shelf-unit-pine-s39407070/" },
  { id: "vihals-shelf", name: "VIHALS", type: "Shelving unit with 10 shelves", category: "storage", w: 37.375, d: 14.625, h: 78.75, price: 199, verified: true, url: "https://www.ikea.com/us/en/p/vihals-shelving-unit-with-10-shelves-white-70483274/" },
  { id: "gullaberg-shoe", name: "GULLABERG", type: "Shoe cabinet with 2 compartments", category: "storage", w: 34.625, d: 11.75, h: 48, price: 179.99, verified: true, url: "https://www.ikea.com/us/en/p/gullaberg-shoe-cabinet-with-2-compartments-white-50587692/" },

  // desks
  { id: "micke-desk", name: "MICKE", type: "Desk", category: "desks", w: 41.375, d: 19.625, h: 29.5, price: 99.99, verified: true, url: "https://www.ikea.com/us/en/p/micke-desk-white-80213074/" },
  { id: "lagkapten", name: "LAGKAPTEN / ADILS", type: "Desk", category: "desks", w: 55.125, d: 23.625, h: 28.75, price: 79.99, verified: true, url: "https://www.ikea.com/us/en/p/lagkapten-adils-desk-white-s59417153/" },
  { id: "idasen-desk", name: "IDÅSEN", type: "Desk", category: "desks", w: 63, d: 31.5, h: null, price: 449, verified: true, url: "https://www.ikea.com/us/en/p/idasen-desk-brown-dark-gray-s99281039/" },
  { id: "trotten-desk", name: "TROTTEN", type: "Desk", category: "desks", w: 63, d: 31.5, h: 29.5, price: 179.99, verified: true, url: "https://www.ikea.com/us/en/p/trotten-desk-white-s79621921/" },
  { id: "alex-drawer", name: "ALEX", type: "Drawer unit", category: "desks", w: 14.125, d: 22.875, h: 27.5, price: 79.99, verified: true, url: "https://www.ikea.com/us/en/p/alex-drawer-unit-white-00473546/" },

  // rugs
  { id: "rug-5x7", name: "STOENSE", type: "Rug, low pile", category: "rugs", w: 60, d: 84, h: null, price: 149.99, verified: true, url: "https://www.ikea.com/us/en/p/stoense-rug-low-pile-pale-pink-40629150/" },
  { id: "rug-6x9", name: "VOLLERSLEV", type: "Rug, high pile", category: "rugs", w: 72, d: 108, h: null, price: 299.99, verified: true, url: "https://www.ikea.com/us/en/p/vollerslev-rug-high-pile-white-60492542/" },
  { id: "rug-7x10", name: "STOENSE", type: "Rug, low pile", category: "rugs", w: 84, d: 120, h: null, price: 249.99, verified: true, url: "https://www.ikea.com/us/en/p/stoense-rug-low-pile-off-white-20635449/" },

  // kitchen
  { id: "tornviken-island", name: "TORNVIKEN", type: "Kitchen island", category: "kitchen", w: 49.625, d: 30.375, h: 35.375, price: 449.99, verified: true, url: "https://www.ikea.com/us/en/p/tornviken-kitchen-island-off-white-oak-40391657/" },
  { id: "raskog-cart", name: "RÅSKOG", type: "Utility cart", category: "kitchen", w: 17.75, d: 13.75, h: 30.375, price: 39.99, verified: true, url: "https://www.ikea.com/us/en/p/raskog-utility-cart-white-30586783/" },
  { id: "rosentorp-stool", name: "ROSENTORP", type: "Bar stool with backrest", category: "kitchen", w: 15.75, d: 17.75, h: 36.25, price: 85, verified: true, url: "https://www.ikea.com/us/en/p/rosentorp-bar-stool-with-backrest-counter-height-white-50618194/" },
  { id: "rosentorp-chair", name: "ROSENTORP", type: "Chair", category: "kitchen", w: 17.375, d: 20.875, h: 35.875, price: 75, verified: true, url: "https://www.ikea.com/us/en/p/rosentorp-chair-white-80569998/" },
  { id: "odger-chair", name: "ODGER", type: "Chair", category: "kitchen", w: 17.75, d: 20.125, h: 31.875, price: 125, verified: true, url: "https://www.ikea.com/us/en/p/odger-chair-white-beige-60359996/" },
];

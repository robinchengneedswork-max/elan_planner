// A5 — 759 sqft. A corner unit: one exterior wall runs at an angle, so the
// living/dining end is cut on the diagonal. Envelope 330 x 344 less a 90"
// chamfer = 760.2 sqft.
//
// The renders are perspective views, so the exact angle of that wall is the
// one thing here that is a reconstruction rather than a printed number — the
// chamfer length is a parameter for exactly that reason.

definePlan({
  id: 'A5',
  sqft: 759,
  ref: 'ref/a5.jpg',
  beds: '1 bed / 1 bath',
  note: 'Corner unit with an angled exterior wall at the living end. Smallest bedroom of the A plans, but the deepest living/dining run after A3.',
  params: {
    BED_W: 138, BED_D: 128,   // printed 11'6" x 10'8"
    LIV_W: 136, LIV_D: 194,   // printed 11'4" x 16'2"
    MID_W: 46,                // coat closet between bedroom and living
    DEPTH: 344,
    CHAMFER: 90,
    BATH_W: 96, BATH_D: 134,
    SVC_W: 48,
    ISLAND_W: 40, ISLAND_L: 72
  },
  labels: {
    BED_W: 'Bedroom width', BED_D: 'Bedroom depth',
    LIV_W: 'Living width', LIV_D: 'Living depth',
    MID_W: 'Hall closet width', DEPTH: 'Overall depth',
    CHAMFER: 'Angled wall run', BATH_W: 'Bath width', BATH_D: 'Bath depth',
    SVC_W: 'W/D closet width', ISLAND_W: 'Island width', ISLAND_L: 'Island length'
  },
  build(p) {
    const W = WALL_T;
    const width = p.BED_W + W + p.MID_W + W + p.LIV_W;
    const depth = p.DEPTH;
    const ch = p.CHAMFER;

    const midX0 = p.BED_W + W, midX1 = midX0 + p.MID_W;
    const livX0 = midX1 + W;
    const northD = p.BED_D, coreY0 = northD + W;

    const bathX1 = p.BATH_W, hallX0 = bathX1 + W;
    const bathY1 = coreY0 + p.BATH_D;
    const svcX1 = hallX0 + p.SVC_W;
    const wdY0 = coreY0 + 57, wdY1 = wdY0 + 48;
    const mechY0 = wdY1 + W, mechY1 = mechY0 + 48;
    const cloY0 = bathY1 + W;

    // Angled wall runs from (width, depth - ch) down to (width - ch, depth).
    const outline = [
      [0, 0], [width, 0], [width, depth - ch], [width - ch, depth], [0, depth]
    ];

    const walls = [
      box(p.BED_W, 0, W, northD),                // bedroom east
      box(midX1, 0, W, northD),                  // hall closet east
      box(0, northD, livX0, W),                  // north block south wall
      box(bathX1, coreY0, W, depth - coreY0),    // bath + closet east wall
      box(0, bathY1, hallX0, W),                 // bath south
      box(hallX0, wdY0 - W, p.SVC_W + W, W),     // service bank north
      box(svcX1, wdY0 - W, W, mechY1 - wdY0 + W),// service bank east
      box(hallX0, wdY1, p.SVC_W, W),             // W/D | mech
      box(hallX0, mechY1, p.SVC_W + W, W)        // service bank south
    ];

    const kitX0 = width - COUNTER_D;
    const fixtures = [
      // bath, top of the west column so its door faces the open hall
      fx('vanity', 0, coreY0 + 8, VANITY_D, 44),
      fx('toilet', 0, coreY0 + 62, TOILET.d, TOILET.w),
      fx('tub', bathX1 - TUB.d, bathY1 - TUB.w, TUB.d, TUB.w),
      // walk-in below it
      fx('rod', 6, cloY0 + 6, p.BATH_W - 14, 3),
      // laundry + mechanical
      fx('washer', hallX0 + 2, wdY0 + 4, (p.SVC_W - 6) / 2, 30),
      fx('dryer', hallX0 + 2 + (p.SVC_W - 6) / 2, wdY0 + 4, (p.SVC_W - 6) / 2, 30),
      fx('heater', hallX0 + (p.SVC_W - 24) / 2, mechY0 + 10, 24, 24),
      // The angled wall cuts the east run short, so the kitchen turns the
      // corner: fridge on the straight part, cooking wall along the south.
      fx('fridge', width - FRIDGE.d, p.LIV_D, FRIDGE.d, FRIDGE.w),
      fx('counter', kitX0, p.LIV_D + FRIDGE.w, COUNTER_D, depth - ch - p.LIV_D - FRIDGE.w),
      fx('dishwasher', svcX1 + 4, depth - COUNTER_D, DISHWASHER.w, COUNTER_D),
      fx('counter', svcX1 + 28, depth - COUNTER_D, 30, COUNTER_D),
      fx('range', svcX1 + 58, depth - COUNTER_D, RANGE.w, RANGE.d),
      fx('island', livX0 + 36, p.LIV_D + 26, p.ISLAND_W, p.ISLAND_L, { label: 'Island' })
    ];

    const rooms = [
      room('Bedroom', "11'6\" x 10'8\"", rectPoly(0, 0, p.BED_W, p.BED_D)),
      room('Living / Dining', "11'4\" x 16'2\"", rectPoly(livX0, 0, p.LIV_W, p.LIV_D)),
      room('Closet', '', rectPoly(midX0, 0, p.MID_W, p.BED_D)),
      room('Bath', '', rectPoly(0, coreY0, p.BATH_W, p.BATH_D)),
      room('Closet', '', rectPoly(0, cloY0, p.BATH_W, depth - cloY0)),
      room('W/D', '', rectPoly(hallX0, wdY0, p.SVC_W, 48)),
      room('Mech.', '', rectPoly(hallX0, mechY0, p.SVC_W, 48)),
      room('Hall', '', rectPoly(hallX0, coreY0, svcX1 - hallX0, 52)),
      room('Kitchen', '', rectPoly(livX0, p.LIV_D, p.LIV_W, depth - p.LIV_D - ch * 0.4))
    ];

    const windows = [
      win(32, 0, 32 + 76, 0),
      win(livX0 + 16, 0, livX0 + p.LIV_W - 16, 0),
      win(width, 60, width, 60 + 84)
    ];

    const doors = [
      door(hallX0 + 42, depth, ENTRY_DOOR_W, 180, 90),         // entry
      door(midX0 - W / 2, northD + W / 2, DOOR_W, 180, -90),   // bedroom
      door(midX0 + 7, northD + W / 2, DOOR_W, 0, 90),          // hall closet
      door(bathX1 + W / 2, coreY0 + 8, DOOR_W, 90, 90),        // bath
      door(bathX1 + W / 2, cloY0 + 16, DOOR_W, 90, 90),        // walk-in
      opening(svcX1 + W, wdY0, svcX1 + W, wdY0 + 44),          // W/D
      opening(svcX1 + W, mechY0, svcX1 + W, mechY0 + 44)       // mech
    ];

    return { outline, walls, fixtures, rooms, windows, doors };
  }
});

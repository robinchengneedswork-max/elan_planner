// A1 — 750 sqft, 1 bed / 1 bath. No balcony.
// Render: bedroom north-west, living/dining north-east open to the kitchen on
// the east wall, bath south-west, W/D + mech closets off the entry hall.
// Envelope solves exactly: (141+5+42+5+182) x (176+5+107) = 375 x 288 = 750 sqft.

definePlan({
  id: 'A1',
  sqft: 750,
  ref: 'ref/a1.jpg',
  beds: '1 bed / 1 bath',
  note: 'Bedroom and living both face the window wall. Kitchen runs down the east wall with an island. No balcony.',
  params: {
    BED_W: 141, BED_D: 176,   // printed 11'9" x 14'8"
    LIV_W: 182, LIV_D: 141,   // printed 15'2" x 11'9"
    CLO_W: 42, CLO_D: 104,    // bedroom walk-in
    BATH_W: 90, BATH_D: 107,
    HALL_D: 59,               // corridor depth in front of the W/D bank
    SVC_D: 48,                // W/D + mech closet depth
    MECH_W: 39,
    ISLAND_W: 40, ISLAND_L: 72
  },
  labels: {
    BED_W: 'Bedroom width', BED_D: 'Bedroom depth',
    LIV_W: 'Living width', LIV_D: 'Living depth',
    CLO_W: 'Walk-in width', CLO_D: 'Walk-in depth',
    BATH_W: 'Bath width', BATH_D: 'Bath depth',
    HALL_D: 'Hall depth', SVC_D: 'W/D closet depth', MECH_W: 'Mech closet width',
    ISLAND_W: 'Island width', ISLAND_L: 'Island length'
  },
  build(p) {
    const W = WALL_T;
    // west -> east
    const bedX0 = 0, bedX1 = p.BED_W;
    const cloX0 = bedX1 + W, cloX1 = cloX0 + p.CLO_W;
    const livX0 = cloX1 + W, livX1 = livX0 + p.LIV_W;
    const width = livX1;
    // north -> south
    const bedY1 = p.BED_D;
    const coreY0 = bedY1 + W;             // top of bath / hall band
    const depth = coreY0 + p.BATH_D;
    const svcY0 = depth - p.SVC_D;

    const bathX1 = p.BATH_W;
    const hallX0 = bathX1 + W;
    const mechX1 = hallX0 + p.MECH_W;
    const wdX0 = mechX1 + W;

    const outline = rectPoly(0, 0, width, depth);

    const walls = [
      box(bedX1, 0, W, bedY1),                       // bedroom east
      box(cloX1, 0, W, bedY1),                       // closet east / living west
      box(cloX0, p.CLO_D, p.CLO_W, W),               // walk-in vs linen closet
      box(0, bedY1, cloX1 + W, W),                   // bedroom + closets south
      box(bathX1, coreY0, W, p.BATH_D),              // bath east
      box(hallX0, svcY0, cloX1 + W - hallX0, W),     // service bank north
      box(mechX1, svcY0 + W, W, depth - svcY0 - W)   // mech vs W/D
    ];

    // Kitchen: base run down the east wall, returning along the south wall.
    const kitY0 = p.LIV_D;
    const eastX0 = width - COUNTER_D;
    const southY0 = depth - COUNTER_D;
    const fixtures = [
      // bath
      fx('vanity', 0, coreY0 + 4, VANITY_D, 48, { rot: 0, label: 'Vanity' }),
      fx('toilet', 0, coreY0 + 55, TOILET.d, TOILET.w),
      fx('tub', 22, depth - TUB.d, TUB.w, TUB.d),
      // laundry + mechanical
      fx('washer', wdX0 + 2, svcY0 + 12, 27, 30),
      fx('dryer', wdX0 + 29, svcY0 + 12, 27, 30),
      fx('heater', hallX0 + 8, svcY0 + 14, 24, 24),
      // closet rods
      fx('rod', cloX0 + 3, 6, p.CLO_W - 6, 3),
      fx('shelf', cloX0 + 3, p.CLO_D + W + 4, p.CLO_W - 6, 14),
      // kitchen east run
      fx('fridge', width - FRIDGE.d, kitY0, FRIDGE.d, FRIDGE.w),
      fx('counter', eastX0, kitY0 + 36, COUNTER_D, 30),
      fx('range', eastX0, kitY0 + 66, RANGE.d, RANGE.w),
      fx('counter', eastX0, kitY0 + 96, COUNTER_D, southY0 - (kitY0 + 96)),
      // kitchen south return
      fx('sink', eastX0 - 96, southY0, 30, COUNTER_D, { label: 'Sink' }),
      fx('counter', eastX0 - 66, southY0, 42, COUNTER_D),
      fx('dishwasher', eastX0 - 24, southY0, DISHWASHER.w, COUNTER_D),
      fx('counter', eastX0, southY0, COUNTER_D, COUNTER_D),
      // island
      fx('island', livX0 + 57, kitY0 + 19, p.ISLAND_W, p.ISLAND_L, { label: 'Island' })
    ];

    const rooms = [
      room('Bedroom', "11'9\" x 14'8\"", rectPoly(0, 0, p.BED_W, p.BED_D)),
      room('Living / Dining', "15'2\" x 11'9\"", rectPoly(livX0, 0, p.LIV_W, p.LIV_D)),
      room('Kitchen', '', rectPoly(livX0, kitY0, p.LIV_W, depth - kitY0)),
      room('Bath', '', rectPoly(0, coreY0, p.BATH_W, p.BATH_D)),
      room('Hall', '', rectPoly(hallX0, coreY0, cloX1 + W - hallX0, p.HALL_D)),
      room('Closet', '', rectPoly(cloX0, 0, p.CLO_W, p.CLO_D)),
      room('W/D', '', rectPoly(wdX0, svcY0 + W, cloX1 + W - wdX0, depth - svcY0 - W)),
      room('Mech.', '', rectPoly(hallX0, svcY0 + W, p.MECH_W, depth - svcY0 - W))
    ];

    const windows = [
      win(34, 0, 34 + 72, 0),                              // bedroom
      win(livX0 + 25, 0, livX0 + 25 + 132, 0)              // living
    ];

    const doors = [
      door(livX0 + 12, depth, ENTRY_DOOR_W, 0, -90),       // entry, swings in
      door(132, bedY1 + W / 2, DOOR_W, 180, 90),           // bedroom
      door(bathX1 + W / 2, coreY0 + 5, DOOR_W, 90, 90),    // bath
      door(bedX1 + W / 2, 98, DOOR_W, 270, -90),           // walk-in
      opening(cloX0 + 6, bedY1 + W, cloX1 - 6, bedY1 + W), // linen closet
      opening(wdX0, svcY0, cloX1 + W, svcY0),              // W/D bifold
      opening(hallX0, svcY0, mechX1, svcY0)                // mech
    ];

    return { outline, walls, fixtures, rooms, windows, doors };
  }
});

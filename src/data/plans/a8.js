// A8 — 795 sqft, the biggest one-bedroom. Corner unit with an angled window
// wall at the living end and a balcony off the north side.
// Envelope 365 x 327 less a 100" chamfer = 794.1 sqft.

definePlan({
  id: 'A8',
  sqft: 795,
  ref: 'ref/a8.jpg',
  beds: '1 bed / 1 bath',
  note: 'Largest of the one-bedrooms and the widest bedroom of the set. Angled window wall at the living end, plus a balcony.',
  params: {
    BED_W: 160, BED_D: 143,   // printed 13'4" x 11'11"
    LIV_W: 149, LIV_D: 165,   // printed 12'5" x 13'9"
    MID_W: 46,
    DEPTH: 327,
    CHAMFER: 100,
    BATH_W: 96, BATH_D: 134,
    SVC_W: 48,
    ISLAND_W: 40, ISLAND_L: 72,
    BALCONY_D: 54
  },
  labels: {
    BED_W: 'Bedroom width', BED_D: 'Bedroom depth',
    LIV_W: 'Living width', LIV_D: 'Living depth',
    MID_W: 'Hall closet width', DEPTH: 'Overall depth',
    CHAMFER: 'Angled wall run', BATH_W: 'Bath width', BATH_D: 'Bath depth',
    SVC_W: 'W/D closet width', ISLAND_W: 'Island width', ISLAND_L: 'Island length',
    BALCONY_D: 'Balcony depth'
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
    const cloY0 = bathY1 + W;
    const svcX1 = hallX0 + p.SVC_W;
    const wdY0 = coreY0 + 57, wdY1 = wdY0 + 48;
    const mechY0 = wdY1 + W, mechY1 = mechY0 + 48;

    const outline = [
      [0, 0], [width - ch, 0], [width, ch], [width, depth], [0, depth]
    ];

    const walls = [
      box(p.BED_W, 0, W, northD),
      box(midX1, 0, W, northD),
      box(0, northD, livX0, W),
      box(bathX1, coreY0, W, depth - coreY0),
      box(0, bathY1, hallX0, W),
      box(hallX0, wdY0 - W, p.SVC_W + W, W),
      box(svcX1, wdY0 - W, W, mechY1 - wdY0 + W),
      box(hallX0, wdY1, p.SVC_W, W),
      box(hallX0, mechY1, p.SVC_W + W, W)
    ];

    const kitX0 = width - COUNTER_D;
    const kitY0 = ch + p.LIV_D;
    const southY0 = depth - COUNTER_D;
    const fixtures = [
      fx('vanity', 0, coreY0 + 8, VANITY_D, 44),
      fx('toilet', 0, coreY0 + 62, TOILET.d, TOILET.w),
      fx('tub', bathX1 - TUB.d, bathY1 - TUB.w, TUB.d, TUB.w),
      fx('rod', 6, cloY0 + 6, p.BATH_W - 14, 3),
      fx('washer', hallX0 + 2, wdY0 + 4, (p.SVC_W - 6) / 2, 30),
      fx('dryer', hallX0 + 2 + (p.SVC_W - 6) / 2, wdY0 + 4, (p.SVC_W - 6) / 2, 30),
      fx('heater', hallX0 + (p.SVC_W - 24) / 2, mechY0 + 10, 24, 24),
      // kitchen wraps the south-east corner
      fx('fridge', width - FRIDGE.d, kitY0, FRIDGE.d, FRIDGE.w),
      fx('counter', kitX0, kitY0 + 36, COUNTER_D, southY0 - kitY0 - 36),
      fx('counter', kitX0, southY0, COUNTER_D, COUNTER_D),
      fx('range', livX0 + 58, southY0, RANGE.w, RANGE.d),
      fx('counter', livX0 + 88, southY0, kitX0 - livX0 - 88, COUNTER_D),
      fx('dishwasher', livX0 + 34, southY0, DISHWASHER.w, COUNTER_D),
      fx('island', livX0 + 34, kitY0 - 78, p.ISLAND_W, p.ISLAND_L, { label: 'Island' })
    ];

    const rooms = [
      room('Bedroom', "13'4\" x 11'11\"", rectPoly(0, 0, p.BED_W, p.BED_D)),
      room('Living', "12'5\" x 13'9\"", rectPoly(livX0, ch, p.LIV_W, p.LIV_D)),
      room('Closet', '', rectPoly(midX0, 0, p.MID_W, p.BED_D)),
      room('Bath', '', rectPoly(0, coreY0, p.BATH_W, p.BATH_D)),
      room('Closet', '', rectPoly(0, cloY0, p.BATH_W, depth - cloY0)),
      room('W/D', '', rectPoly(hallX0, wdY0, p.SVC_W, 48)),
      room('Mech.', '', rectPoly(hallX0, mechY0, p.SVC_W, 48)),
      room('Hall', '', rectPoly(hallX0, coreY0, svcX1 - hallX0, 52)),
      room('Kitchen', '', rectPoly(livX0, kitY0 - 6, p.LIV_W, depth - kitY0 + 6))
    ];

    const windows = [
      win(38, 0, 38 + 84, 0),
      win(width - ch + 18, 18, width - 18, ch - 18),
      win(width, ch + 16, width, ch + 16 + 96)
    ];

    const doors = [
      door(hallX0 + 42, depth, ENTRY_DOOR_W, 180, 90),
      door(midX0 - W / 2, northD + W / 2, DOOR_W, 180, -90),
      door(midX0 + 7, northD + W / 2, DOOR_W, 0, 90),
      door(bathX1 + W / 2, coreY0 + 8, DOOR_W, 90, 90),
      door(bathX1 + W / 2, cloY0 + 16, DOOR_W, 90, 90),
      opening(svcX1 + W, wdY0, svcX1 + W, wdY0 + 44),
      opening(svcX1 + W, mechY0, svcX1 + W, mechY0 + 44)
    ];

    // Balcony hangs off the straight part of the north wall.
    const balcony = rectPoly(midX0, -p.BALCONY_D, width - ch - midX0, p.BALCONY_D);

    return { outline, walls, fixtures, rooms, windows, doors, balcony };
  }
});

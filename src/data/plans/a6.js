// A6 — 787 sqft. The wedge: two exterior walls meet at an angle behind the
// living room, which is why the printed living dimension (13'7" x 8'0") reads
// so shallow — it is the rectangle that fits inside the splayed corner.
// Envelope 351 x 340 less a 110" chamfer = 786.7 sqft.

definePlan({
  id: 'A6',
  sqft: 787,
  ref: 'ref/a6.jpg',
  beds: '1 bed / 1 bath',
  note: 'Wedge-shaped corner unit. The living room sits inside a splayed window corner, and the kitchen and dining share one long open run down the east side.',
  params: {
    BED_W: 132, BED_D: 156,   // printed 11'0" x 13'0"
    LIV_W: 163, LIV_D: 96,    // printed 13'7" x 8'0"
    MID_W: 46,
    DEPTH: 340,
    CHAMFER: 110,
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
    const cloY0 = bathY1 + W;
    const svcX1 = hallX0 + p.SVC_W;
    const wdY0 = coreY0 + 57, wdY1 = wdY0 + 48;
    const mechY0 = wdY1 + W, mechY1 = mechY0 + 48;

    // Angled wall from (width - ch, 0) out to (width, ch).
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
    const fixtures = [
      fx('vanity', 0, coreY0 + 8, VANITY_D, 44),
      fx('toilet', 0, coreY0 + 62, TOILET.d, TOILET.w),
      fx('tub', bathX1 - TUB.d, bathY1 - TUB.w, TUB.d, TUB.w),
      fx('rod', 6, cloY0 + 6, p.BATH_W - 14, 3),
      fx('washer', hallX0 + 2, wdY0 + 4, (p.SVC_W - 6) / 2, 30),
      fx('dryer', hallX0 + 2 + (p.SVC_W - 6) / 2, wdY0 + 4, (p.SVC_W - 6) / 2, 30),
      fx('heater', hallX0 + (p.SVC_W - 24) / 2, mechY0 + 10, 24, 24),
      // one long kitchen run down the east wall below the living corner
      fx('fridge', width - FRIDGE.d, kitY0, FRIDGE.d, FRIDGE.w),
      fx('counter', kitX0, kitY0 + 36, COUNTER_D, 26),
      fx('range', kitX0, kitY0 + 62, RANGE.d, RANGE.w),
      fx('counter', kitX0, kitY0 + 92, COUNTER_D, depth - kitY0 - 92),
      fx('island', livX0 + 32, kitY0 - 10, p.ISLAND_W, p.ISLAND_L, { label: 'Island' })
    ];

    const rooms = [
      room('Bedroom', "11'0\" x 13'0\"", rectPoly(0, 0, p.BED_W, p.BED_D)),
      room('Living', "13'7\" x 8'0\"", rectPoly(livX0, ch, p.LIV_W, p.LIV_D)),
      room('Closet', '', rectPoly(midX0, 0, p.MID_W, p.BED_D)),
      room('Bath', '', rectPoly(0, coreY0, p.BATH_W, p.BATH_D)),
      room('Closet', '', rectPoly(0, cloY0, p.BATH_W, depth - cloY0)),
      room('W/D', '', rectPoly(hallX0, wdY0, p.SVC_W, 48)),
      room('Mech.', '', rectPoly(hallX0, mechY0, p.SVC_W, 48)),
      room('Hall', '', rectPoly(hallX0, coreY0, svcX1 - hallX0, 52)),
      room('Kitchen / Dining', '', rectPoly(livX0, kitY0 - 20, p.LIV_W, depth - kitY0 + 20))
    ];

    const windows = [
      win(26, 0, 26 + 80, 0),
      win(width - ch + 20, 20, width - 20, ch - 20),
      win(width, ch + 14, width, ch + 14 + 76)
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

    return { outline, walls, fixtures, rooms, windows, doors };
  }
});

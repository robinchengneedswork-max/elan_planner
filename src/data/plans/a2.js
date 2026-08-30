// A2 — 751 sqft. Living on the window wall with a balcony, bedroom beside it,
// service band and bath down the far side. Envelope 293 x 369 = 750.8 sqft.

definePlan({
  id: 'A2',
  sqft: 751,
  ref: 'ref/a2.jpg',
  beds: '1 bed / 1 bath',
  note: 'Living room opens onto a balcony. Bedroom sits beside it on the window wall, bath at the far corner off the hall.',
  params: {
    LIV_W: 142, LIV_D: 167,   // printed 11'10" x 13'11"
    BED_W: 146, BED_D: 165,   // printed 12'2" x 13'9"
    DEPTH: 369,
    HALL_W: 44, SVC_W: 36,
    CLO_D: 62, WD_D: 60, MECH_D: 64,
    ISLAND_W: 40, ISLAND_L: 72
  },
  labels: STANDARD_A_LABELS,
  build(p) {
    return standardA(p, {
      livLabel: "11'10\" x 13'11\"",
      bedLabel: "12'2\" x 13'9\"",
      balconyD: 54
    });
  }
});

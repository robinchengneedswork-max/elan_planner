// A2H — 751 sqft. The accessible version of A2: same envelope, but the bath is
// wider with a roll-in shower in place of the tub and the hall is widened.

definePlan({
  id: 'A2H',
  sqft: 751,
  ref: 'ref/a2h.jpg',
  beds: '1 bed / 1 bath, accessible',
  note: 'Accessible variant of A2 — roll-in shower instead of a tub, wider bath and hall. Balcony off the living room.',
  params: {
    LIV_W: 144, LIV_D: 167,   // printed 12'0" x 13'11"
    BED_W: 144, BED_D: 165,   // printed 12'0" x 13'9"
    DEPTH: 369,
    HALL_W: 48, SVC_W: 30,
    CLO_D: 62, WD_D: 60, MECH_D: 64,
    ISLAND_W: 40, ISLAND_L: 66
  },
  labels: STANDARD_A_LABELS,
  build(p) {
    return standardA(p, {
      livLabel: "12'0\" x 13'11\"",
      bedLabel: "12'0\" x 13'9\"",
      balconyD: 54,
      shower: true
    });
  }
});

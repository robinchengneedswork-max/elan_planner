// A4 — 753 sqft. Near-twin of A2 with a slightly deeper bedroom and shallower
// living room. Envelope 293 x 370 = 752.8 sqft.

definePlan({
  id: 'A4',
  sqft: 753,
  ref: 'ref/a4.jpg',
  beds: '1 bed / 1 bath',
  note: 'Close cousin of A2 — the bedroom picks up eight inches of depth and the living room gives up seven. Balcony off the living room.',
  params: {
    LIV_W: 142, LIV_D: 160,   // printed 11'10" x 13'4"
    BED_W: 146, BED_D: 168,   // printed 12'2" x 14'0"
    DEPTH: 370,
    HALL_W: 44, SVC_W: 36,
    CLO_D: 60, WD_D: 60, MECH_D: 62,
    ISLAND_W: 40, ISLAND_L: 72
  },
  labels: STANDARD_A_LABELS,
  build(p) {
    return standardA(p, {
      livLabel: "11'10\" x 13'4\"",
      bedLabel: "12'2\" x 14'0\"",
      balconyD: 54
    });
  }
});

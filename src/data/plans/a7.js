// A7 — 792 sqft. The largest of the rectangular A plans. Envelope 287 x 397
// = 791.2 sqft.

definePlan({
  id: 'A7',
  sqft: 792,
  ref: 'ref/a7.jpg',
  beds: '1 bed / 1 bath',
  note: 'Largest rectangular A plan — widest living room of the group, with a balcony. Bedroom is the more compact of the pair.',
  params: {
    LIV_W: 149, LIV_D: 160,   // printed 12'5" x 13'4"
    BED_W: 133, BED_D: 146,   // printed 11'1" x 12'2"
    DEPTH: 397,
    HALL_W: 42, SVC_W: 30,
    CLO_D: 60, WD_D: 60, MECH_D: 66,
    ISLAND_W: 40, ISLAND_L: 72
  },
  labels: STANDARD_A_LABELS,
  build(p) {
    return standardA(p, {
      livLabel: "12'5\" x 13'4\"",
      bedLabel: "11'1\" x 12'2\"",
      balconyD: 54
    });
  }
});

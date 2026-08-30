// A3 — 756 sqft. The long one: living and dining run the full depth of the west
// side, no balcony. Envelope 280 x 389 = 756.4 sqft.

definePlan({
  id: 'A3',
  sqft: 756,
  ref: 'ref/a3.jpg',
  beds: '1 bed / 1 bath',
  note: 'Longest living/dining run of the A plans — 18\'10" deep, enough for a sofa and a real dining table. No balcony.',
  params: {
    LIV_W: 139, LIV_D: 226,   // printed 11'7" x 18'10"
    BED_W: 136, BED_D: 158,   // printed 11'4" x 13'2"
    DEPTH: 389,
    HALL_W: 42, SVC_W: 30,
    CLO_D: 58, WD_D: 60, MECH_D: 64,
    ISLAND_W: 40, ISLAND_L: 72
  },
  labels: STANDARD_A_LABELS,
  build(p) {
    return standardA(p, {
      livLabel: "11'7\" x 18'10\"",
      bedLabel: "11'4\" x 13'2\""
    });
  }
});

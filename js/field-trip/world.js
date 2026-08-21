/* ==========================================================================
   world.js — the layout of Tabish Town.

   The town sits in a shallow valley. A ring of lanes goes round the green in
   the middle; Market Row runs along the top of it, the makers' yard hangs off
   the west side, and a footpath follows the millpond round the east. The bus
   arrives at the bottom and a stream leaves at the bottom, under a bridge.

   Three things follow from that shape, and all three are the point:

     - You can walk a full circle without retracing your steps. The ring, the
       lane behind the school and the pond path each close, so wandering is
       never a dead end and the map has no cul-de-sac of consequence.
     - Not every building is a door. The school, the cinema, two cottages and
       a parked caravan are scenery, so an open door means something.
     - Surfaces say what a place is for. Cobble is a street, dirt is a path or
       a yard somebody wore into the grass, and the paving is the green.

   Lanes are generated, not typed out: `lane()` walks between waypoints and
   stamps a band across the direction of travel, which is why a bend stays
   three tiles wide instead of ballooning. `blob()` does the same job for
   round places. Water knows its own edges: `shoreTile()` picks a shore sprite
   from each wet tile's neighbours, so world.js hands game.js ordinary ground
   steps and the engine never has to learn what a pond is.

   Tiles are 16px. Every coordinate below is in tile units.
   ========================================================================== */

window.FIELD_TRIP_WORLD = (function () {
  'use strict';

  const COLS = 88;
  const ROWS = 66;

  /* --- ground-painting helpers ------------------------------------------ */

  /* A lane between waypoints. The band is stamped across the direction of
     travel, so a diagonal run stays a road rather than spreading into a
     field, and interpolating between waypoints is what lets one bend. */
  function lane(tile, half, points) {
    const out = [];
    const span = half * 2 + 1;
    for (let i = 0; i < points.length - 1; i += 1) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const steps = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
      const flat = Math.abs(dx) >= Math.abs(dy);
      for (let s = 0; s <= steps; s += 1) {
        const x = Math.round(x0 + (dx * s) / steps);
        const y = Math.round(y0 + (dy * s) / steps);
        out.push(flat ? { rect: [x, y - half, 1, span], tile: tile }
                      : { rect: [x - half, y, span, 1], tile: tile });
      }
    }
    return out;
  }

  /* A rounded place: one rect per row of an ellipse. */
  function blob(tile, cx, cy, rx, ry) {
    const out = [];
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      const t = (y - cy) / ry;
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      if (w > 0) out.push({ rect: [cx - w, y, w * 2 + 1, 1], tile: tile });
    }
    return out;
  }

  /* --- water ------------------------------------------------------------- */
  /* The millpond, and the stream that leaves it southward under the bridge. */

  const WATER = new Set();
  const wkey = (x, y) => y * COLS + x;

  (function fillPond(cx, cy, rx, ry) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      const t = (y - cy) / ry;
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      for (let x = cx - w; x <= cx + w; x += 1) WATER.add(wkey(x, y));
    }
  })(67, 45, 8, 5);

  for (let y = 49; y < 64; y += 1) for (let x = 65; x <= 67; x += 1) WATER.add(wkey(x, y));

  /* Thirteen shore sprites cover every case the pack draws: four edges, four
     outside corners, and four insides where a bank cuts in diagonally. */
  function shoreTile(x, y) {
    const wet = (dx, dy) => WATER.has(wkey(x + dx, y + dy));
    const n = !wet(0, -1);
    const s = !wet(0, 1);
    const w = !wet(-1, 0);
    const e = !wet(1, 0);
    if (n && w) return 'water-nw';
    if (n && e) return 'water-ne';
    if (s && w) return 'water-sw';
    if (s && e) return 'water-se';
    if (n) return 'water-n';
    if (s) return 'water-s';
    if (w) return 'water-w';
    if (e) return 'water-e';
    if (!wet(-1, -1)) return 'water-inw';
    if (!wet(1, -1)) return 'water-ine';
    if (!wet(-1, 1)) return 'water-isw';
    if (!wet(1, 1)) return 'water-ise';
    return 'water';
  }

  /* Under the bridge it is still water; it is the collision that lifts, not
     the tile. Kept in one place so the deck and the gap cannot drift apart. */
  const BRIDGE = { x0: 65, x1: 67, y0: 55, y1: 57 };
  const onBridge = (x, y) => x >= BRIDGE.x0 && x <= BRIDGE.x1 && y >= BRIDGE.y0 && y <= BRIDGE.y1;

  /* --- ground ------------------------------------------------------------ */
  /* Later steps paint over earlier ones: grass, worn ground, streets, paths,
     the green, then water. */

  const GROUND = [{ fill: 'grass' }];

  /* ground people have worn bare by standing on it */
  GROUND.push(...blob('dirt', 32, 57, 8, 4));            // the arrival apron
  GROUND.push(...blob('dirt', 14, 38, 7, 4));            // the makers' yard
  GROUND.push(...blob('dirt', 58, 12, 5, 3));            // the school field

  /* Market Row, bent twice so no shopfront lines up with the next one, and
     carrying on under the canopy at both ends rather than stopping dead */
  GROUND.push(...lane('cobble', 1, [[2, 20], [8, 19], [14, 18], [21, 17], [28, 20], [36, 20], [44, 17], [55, 18], [62, 22]]));
  GROUND.push(...lane('cobble', 1, [[62, 22], [68, 19], [75, 17], [86, 16]]));

  /* the ring round the green */
  GROUND.push(...lane('cobble', 1, [[21, 17], [20, 24], [23, 30], [27, 33], [32, 33]]));
  GROUND.push(...lane('cobble', 1, [[55, 18], [57, 24], [56, 30], [52, 33], [49, 33]]));
  GROUND.push(...lane('cobble', 1, [[14, 41], [22, 42], [30, 41], [37, 43], [45, 42], [52, 44], [56, 45]]));
  GROUND.push(...lane('cobble', 1, [[41, 37], [40, 41]]));
  GROUND.push(...lane('cobble', 1, [[23, 30], [20, 34], [15, 37]]));
  GROUND.push(...lane('cobble', 1, [[38, 43], [36, 48], [34, 53], [33, 56]]));

  /* the lane behind the school, which is how the north-east reaches the pond */
  GROUND.push(...lane('cobble', 1, [[55, 18], [59, 22], [66, 23], [74, 24], [78, 30], [77, 37], [74, 40]]));

  /* footpaths: sandy, so a path never reads as another street */
  GROUND.push(...lane('dirt', 1, [
    [56, 45], [59, 41], [63, 38], [69, 37], [74, 40], [77, 45], [76, 51], [72, 56],
    [60, 56], [52, 57], [45, 56], [38, 56]
  ]));
  GROUND.push(...lane('dirt', 1, [[50, 34], [54, 38], [57, 42]]));   // the green to the water
  GROUND.push(...lane('dirt', 1, [[22, 42], [20, 47], [23, 52], [27, 56]]));  // the cottage lane

  /* the green: a rounded place with a squarer north end, because two doors
     open onto it from up there and a door needs somewhere to open onto */
  GROUND.push(...blob('paving', 41, 32, 8, 5));
  GROUND.push({ rect: [35, 26, 13, 3], tile: 'paving' });
  GROUND.push(...blob('grass', 41, 32, 4, 2));

  /* short spurs, so nothing important opens onto bare grass */
  GROUND.push(...lane('dirt', 0, [[19, 16], [19, 12], [16, 12]]));
  GROUND.push(...lane('dirt', 0, [[33, 19], [33, 21]]));
  GROUND.push(...lane('dirt', 0, [[49, 16], [49, 14], [52, 13]]));
  GROUND.push(...lane('dirt', 0, [[52, 13], [58, 10]]));
  GROUND.push(...lane('dirt', 0, [[19, 20], [13, 20], [12, 16]]));
  GROUND.push(...lane('dirt', 0, [[71, 22], [71, 27]]));
  GROUND.push(...lane('dirt', 0, [[36, 26], [36, 27]]));
  GROUND.push(...lane('dirt', 0, [[45, 26], [45, 27]]));
  GROUND.push(...lane('dirt', 0, [[11, 35], [11, 37]]));
  GROUND.push(...lane('dirt', 0, [[26, 31], [26, 32]]));
  GROUND.push(...lane('dirt', 0, [[55, 31], [55, 32]]));
  GROUND.push(...lane('dirt', 0, [[70, 38], [70, 40]]));
  GROUND.push(...lane('dirt', 0, [[16, 51], [20, 50]]));

  /* water last: it wins over any lane, and it is the one surface nobody can
     walk on */
  WATER.forEach((key) => {
    const x = key % COLS;
    const y = Math.floor(key / COLS);
    GROUND.push({ rect: [x, y, 1, 1], tile: shoreTile(x, y) });
  });

  /* --- collision --------------------------------------------------------- */
  /* A continuous band under the trees, plus the water. Streets are painted
     underneath the band at both map edges, so each one reads as carrying on
     into the woods instead of ending at a hard green seam. */

  const SOLIDS = [
    [0, 0, 4, ROWS], [COLS - 4, 0, 4, ROWS],
    [0, 0, COLS, 4], [0, ROWS - 4, COLS, 4]
  ];
  WATER.forEach((key) => {
    const x = key % COLS;
    const y = Math.floor(key / COLS);
    if (!onBridge(x, y)) SOLIDS.push([x, y, 1, 1]);
  });

  /* --- buildings ---------------------------------------------------------- */
  /* Every sprite in the pack faces down, so a door is the tile row directly
     below its building and a building has to sit above the lane it belongs
     to. No `id` means scenery: no door, no plaque, nothing to open. */

  const BUILDINGS = [
    /* Market Row, staggered along the bent street */
    { id: 'civic', sprite: 'b-community', at: [15, 8], door: [19, 16], plaque: 'the community center' },
    { id: 'market', sprite: 'b-market', at: [28, 11], door: [33, 19], plaque: 'the market' },
    { id: 'library', sprite: 'b-library', at: [45, 9], door: [49, 16], plaque: 'the library' },

    /* the four that face the green */
    { id: 'post', sprite: 'b-post', at: [34, 20], door: [36, 26], plaque: 'the post office' },
    { id: 'lostfound', sprite: 'b-house', at: [43, 21], door: [45, 26], plaque: 'the lost & found' },
    { id: 'pub', sprite: 'b-pub', at: [24, 26], door: [26, 31], plaque: 'the pub' },
    { id: 'arcade', sprite: 'b-arcade', at: [53, 25], door: [55, 31], plaque: 'the arcade' },

    /* the makers' yard, off the west side of the ring */
    { id: 'workshop', sprite: 'b-blacksmith', at: [9, 29], door: [11, 35], plaque: 'the workshop' },
    { id: 'drafting', sprite: 'b-trailer', at: [16, 32], door: [18, 36], plaque: 'the drafting room' },

    /* scenery: an ordinary town going on around the one you can open */
    { sprite: 'b-school', at: [62, 7] },
    { sprite: 'b-cinema', at: [61, 16] },
    { sprite: 'b-house', at: [69, 22] },
    { sprite: 'b-house', at: [12, 46] },
    { sprite: 'b-trailer', at: [54, 50] }
  ];

  /* --- props -------------------------------------------------------------- */

  const PROPS = [];
  const prop = (sprite, x, y, extra) => PROPS.push(Object.assign({ sprite: sprite, at: [x, y] }, extra || {}));

  /* the green. The fountain stands in a grass verge rather than on the
     paving, which is what stops the middle of town reading as a car park. */
  prop('fountain-0', 40.2, 30.3, {
    anim: ['fountain-0', 'fountain-1', 'fountain-2', 'fountain-3', 'fountain-4'],
    solid: [40, 31, 3, 2]
  });
  prop('bush-green', 38.6, 32.4);
  prop('bush-dark', 43.4, 32.6);
  prop('flower-yellow', 39.0, 33.0);
  prop('flower-cream', 43.0, 31.0);
  prop('flower-orange', 44.0, 33.0);
  prop('robin-0', 41.0, 33.2, { anim: ['robin-0', 'robin-1'], slow: true });
  prop('bench-left', 37.0, 36.4, { solid: [37, 36, 2, 1] });
  prop('bench-right', 46.0, 33.0, { solid: [46, 33, 2, 1] });
  prop('bench-right', 38.0, 27.2, { solid: [38, 28, 2, 1] });
  prop('bush-dark', 48.0, 30.0);
  prop('bush-green', 47.0, 35.0);
  prop('stone', 33.0, 35.0);
  prop('chalk-cat', 47.0, 36.0);
  prop('chalk-sun', 35.0, 30.0);
  prop('chalk-rainbow', 47.0, 31.0);
  prop('chalk-smiley', 36.0, 35.0);
  prop('chalk-heart', 39.0, 36.0);
  prop('butterfly-orange', 32.0, 28.0, { float: true });
  prop('butterfly-blue', 50.0, 34.0, { float: true });
  prop('lamp', 33.0, 28.1);
  prop('lamp', 49.0, 28.1);
  prop('lamp-twin', 34.0, 36.3);
  prop('lamp', 48.0, 36.1);

  /* Market Row: lamps and shop clutter beside the shopfronts, never in the
     walking lane */
  prop('lamp', 12.0, 20.1);
  prop('lamp', 25.0, 21.1);
  prop('lamp', 41.0, 21.1);
  prop('lamp', 52.0, 19.1);
  prop('crate', 39.0, 16.6, { solid: [39, 17, 2, 1] });
  prop('crate', 26.0, 13.6, { solid: [26, 14, 2, 1] });
  prop('bench-left', 42.0, 14.2, { solid: [42, 14, 2, 1] });
  prop('bush-green', 41.0, 14.4);
  prop('bush-dark', 44.0, 14.4);

  /* the allotments: fenced plots at the top of the west lane */
  prop('picket', 7.0, 10.0, { solid: [7, 10, 3, 1] });
  prop('picket', 10.0, 10.0, { solid: [10, 10, 3, 1] });
  prop('picket-gate', 13.0, 10.0);
  prop('picket', 7.0, 15.0, { solid: [7, 15, 3, 1] });
  prop('picket', 10.0, 15.0, { solid: [10, 15, 3, 1] });
  prop('flower-orange', 8.0, 12.0);
  prop('flower-yellow', 9.0, 13.0);
  prop('flower-blue', 11.0, 12.0);
  prop('flower-cream', 12.0, 13.0);
  prop('flower-orange', 10.0, 11.0);
  prop('flower-yellow', 12.0, 11.0);
  prop('crate', 14.0, 12.6, { solid: [14, 13, 2, 1] });
  prop('rail-fence', 6.0, 23.0, { solid: [6, 23, 2, 1] });
  prop('rail-fence', 8.0, 23.0, { solid: [8, 23, 2, 1] });
  prop('rail-fence', 10.0, 23.0, { solid: [10, 23, 2, 1] });

  /* the makers' yard */
  prop('crate', 12.0, 38.6, { solid: [12, 39, 2, 1] });
  prop('crate', 19.0, 39.6, { solid: [19, 40, 2, 1] });
  prop('rail-fence', 8.0, 41.0, { solid: [8, 41, 2, 1] });
  prop('rail-fence', 10.0, 41.0, { solid: [10, 41, 2, 1] });
  prop('fence-post', 7.6, 40.4);
  prop('fence-post', 12.0, 40.4);
  prop('rail-tall', 21.0, 35.0, { solid: [21, 37, 2, 1] });
  prop('lamp', 17.0, 40.1);
  prop('bush-dark', 7.0, 37.0);
  prop('stone', 8.0, 39.0);

  /* the school field: a playground is unmistakably not a portfolio button */
  prop('swing', 55.4, 8.6, { solid: [55, 11, 3, 1] });
  prop('slide', 59.2, 7.4, { solid: [59, 11, 2, 1] });
  prop('spring-bear', 56.4, 12.4, { solid: [56, 13, 2, 1] });
  prop('picket', 54.0, 15.0, { solid: [54, 15, 3, 1] });
  prop('picket', 57.0, 15.0, { solid: [57, 15, 3, 1] });
  prop('bench-left', 60.6, 12.4, { solid: [60, 13, 2, 1] });
  prop('fence', 74.0, 8.0, { solid: [74, 10, 5, 1] });

  /* the millpond: a bridge on the path, banks to sit on, and reeds */
  prop('bridge-h', 63.6, 54.6, { flat: true });
  prop('bench-right', 69.0, 38.4, { solid: [69, 39, 2, 1] });
  prop('bench-left', 76.0, 48.0, { solid: [76, 48, 2, 1] });
  prop('lamp-twin', 74.0, 42.3);
  prop('lamp', 62.0, 53.1);
  prop('bush-green', 58.0, 43.0);
  prop('bush-dark', 58.0, 46.0);
  prop('bush-green', 76.0, 44.0);
  prop('bush-dark', 75.0, 40.0);
  prop('bush-green', 63.0, 51.0);
  prop('bush-dark', 69.0, 51.0);
  prop('stone', 59.0, 48.0);
  prop('stone', 78.0, 47.0);
  prop('flower-blue', 60.0, 40.0);
  prop('flower-cream', 73.0, 51.0);
  prop('flower-yellow', 79.0, 43.0);
  prop('butterfly-blue', 66.0, 35.0, { float: true });
  prop('butterfly-orange', 71.0, 52.0, { float: true });
  prop('rail-fence', 61.0, 58.0, { solid: [61, 58, 2, 1] });
  prop('rail-fence', 70.0, 58.0, { solid: [70, 58, 2, 1] });
  prop('robin-0', 74.0, 46.4, { anim: ['robin-0', 'robin-1'], slow: true });

  /* the arrival apron: a shelter, a sign, and the bus you came in on */
  prop('shelter', 35.0, 55.0, { solid: [35, 56, 3, 2] });
  prop('bus-sign', 39.5, 55.4);
  prop('bus', 26.0, 55.0, { solid: [26, 57, 5, 2] });
  prop('lamp', 40.0, 52.1);
  prop('bench-left', 31.0, 59.6, { solid: [31, 60, 2, 1] });
  prop('crate', 23.0, 58.6, { solid: [23, 59, 2, 1] });
  prop('bush-green', 41.0, 58.0);
  prop('bush-dark', 22.0, 55.0);

  /* the lane behind the school */
  prop('lamp', 66.0, 24.1);
  prop('lamp', 78.0, 34.1);
  prop('rail-fence', 67.6, 28.0, { solid: [68, 28, 2, 1] });
  prop('rail-fence', 71.6, 28.0, { solid: [72, 28, 2, 1] });
  prop('bush-green', 66.0, 29.0);
  prop('bench-right', 64.0, 24.6, { solid: [64, 25, 2, 1] });
  prop('stone', 80.0, 27.0);

  /* the cottage down the south-west lane */
  prop('picket', 12.0, 51.0, { solid: [12, 51, 3, 1] });
  prop('picket', 15.0, 51.0, { solid: [15, 51, 3, 1] });
  prop('flower-cream', 13.0, 52.0);
  prop('flower-orange', 16.0, 52.0);
  prop('flower-yellow', 11.0, 52.0);
  prop('lamp', 21.0, 44.1);
  prop('lamp', 24.0, 53.1);
  prop('stone', 27.0, 49.0);
  prop('bush-dark', 18.0, 43.0);
  prop('bush-green', 26.0, 46.0);
  prop('rail-fence', 28.0, 53.0, { solid: [28, 53, 2, 1] });
  prop('rail-fence', 30.0, 53.0, { solid: [30, 53, 2, 1] });

  /* --- trees --------------------------------------------------------------- */
  /* A seeded scatter, not a picket line: two irregular ranks round the edge,
     then pockets and hedgerows inside the boundary. The band in SOLIDS does
     the collision out there; the trunks and overlapping canopies explain it. */

  const KINDS = ['tree-pine', 'tree-apple', 'tree-pine', 'tree-cherry', 'tree-apple', 'tree-pine', 'tree-apple', 'tree-cherry'];
  let seed = 20260820;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  const TREES = [];
  const tree = (x, y, i) => TREES.push([KINDS[Math.abs(Math.round(i)) % KINDS.length], x, y]);

  for (let x = -1, i = 0; x < COLS; x += 1.7, i += 1) {
    tree(x + rnd() * 1.4, rnd() * 1.6, i);
    tree(x + rnd() * 1.6 - 0.4, 1.9 + rnd() * 1.5, i + 3);
    tree(x + rnd() * 1.5, ROWS - 4 + rnd() * 1.4, i + 5);
    tree(x + rnd() * 1.4 - 0.3, ROWS - 2.2 + rnd() * 1.3, i + 1);
  }
  for (let y = 3, i = 0; y < ROWS - 3; y += 1.7, i += 1) {
    tree(rnd() * 1.5, y + rnd() * 1.4, i + 2);
    tree(1.8 + rnd() * 1.4, y + rnd() * 1.5 - 0.4, i + 6);
    tree(COLS - 4 + rnd() * 1.4, y + rnd() * 1.4, i + 4);
    tree(COLS - 2.2 + rnd() * 1.3, y + rnd() * 1.5 - 0.3, i + 7);
  }

  /* Woodland pockets and hedgerows inside the boundary. These are the trees
     that block a tile, so every one of them is somewhere nobody has to walk.
     The last group is deliberate foreground: a canopy overlapping a building's
     shoulder gives the row depth, and none of them is near a door. */
  const INLAND = [
    /* the orchard above the allotments, and the west shoulder */
    [6, 6], [9, 6], [12, 5], [16, 6], [20, 5], [24, 6], [5, 20], [4, 15], [6, 27], [9, 26],
    [17, 26], [14, 28], [6, 31], [7, 34], [17, 22], [24, 9], [27, 6], [31, 6],
    /* the hedgerow between Market Row and the green */
    [26, 23], [29, 25], [32, 24], [46, 23], [50, 22], [30, 28], [31, 25],
    /* the south-west, so the cottage lane runs through woodland */
    [8, 43], [6, 47], [10, 55], [15, 56], [17, 44], [20, 58], [24, 49], [30, 60], [26, 44],
    [31, 50], [30, 46], [36, 60], [43, 59], [50, 60],
    /* the green's south-east shoulder, teasing the pond from the square */
    [51, 37], [54, 34], [48, 47], [44, 49], [40, 51], [45, 52], [49, 39], [46, 39],
    /* the pond's wooded banks */
    [58, 33], [62, 32], [66, 31], [70, 32], [58, 36], [80, 38], [82, 43], [81, 55], [74, 60],
    [66, 61], [58, 60], [79, 50], [82, 33],
    /* the school's back field and the north-east */
    [58, 16], [77, 12], [81, 21], [84, 28], [79, 8], [51, 5], [55, 4], [60, 4], [68, 5], [73, 4],
    /* copses, so the grass between districts is somewhere rather than a gap */
    [5, 28], [7, 31], [16, 28], [6, 24], [19, 30], [4.5, 36], [5, 39],
    [22, 8], [26, 9], [30, 7], [20, 12], [25, 13], [40, 6], [44, 5], [49, 6],
    [29, 47], [31, 50], [30, 52], [30, 49], [39, 49], [42, 47], [41, 53], [41, 58], [38, 51],
    [47, 50], [52, 48], [49, 54], [56, 53], [45, 45], [55, 59],
    [81, 47], [83, 52], [72, 61], [84, 58], [7, 57], [13, 59], [18, 61], [21, 57],
    /* the verge in the middle of the green */
    [37.4, 30.4], [43.4, 30.8],
    /* foreground: canopies over a shoulder, never over a door */
    [13.6, 13.0], [38.4, 15.4], [53.0, 8.4], [60.4, 17.6], [29.4, 28.6], [58.4, 28.4], [42.6, 24.4]
  ];
  INLAND.forEach((t, i) => tree(t[0], t[1], i * 3));

  /* --- people, signs and the cat ------------------------------------------ */

  const NPCS = [
    { id: 'npc-a', at: [38.5, 33.6], dir: 'right' },
    { id: 'npc-b', at: [37.5, 58.6], dir: 'up' },
    { id: 'npc-c', at: [51.5, 33.6], dir: 'up' }
  ];

  /* Things you can look at outdoors. `room` is which page of the map
     directory they belong to, so the green and the millpond read as two
     places rather than one undifferentiated outside. */
  const SQUARE = [
    { id: 'welcome', sprite: 'sign-stand', at: [35.0, 27.0] },
    { id: 'notice', sprite: 'easel', at: [46.0, 27.0] },
    { id: 'mapsign', sprite: 'sign-stand', at: [44.0, 35.0] },
    { id: 'fountain', sprite: null, at: [41.0, 31.0] },
    { id: 'bench', sprite: null, at: [37.4, 36.6] },
    { id: 'noticeboard', sprite: 'sign-stand', at: [70.0, 38.6], room: 'pond' },
    { id: 'water', sprite: null, at: [64.0, 40.4], room: 'pond' },
    { id: 'bridge', sprite: null, at: [66.0, 55.4], room: 'pond' }
  ];

  const CAT_SPOT = [42.5, 29.0];
  const SPAWN = { tx: 33.5, ty: 58.5, dir: 'up' };

  return {
    version: 4,
    cols: COLS,
    rows: ROWS,
    tile: 16,
    ground: GROUND,
    solids: SOLIDS,
    buildings: BUILDINGS,
    props: PROPS,
    trees: TREES,
    npcs: NPCS,
    square: SQUARE,
    catSpot: CAT_SPOT,
    spawn: SPAWN
  };
})();

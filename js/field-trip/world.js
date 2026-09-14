/* ==========================================================================
   world.js — the layout of Tabish Town.

   The town is a street plan, not a scatter of buildings, and it is packed
   tight on purpose. Fourteen buildings spread across a big map read as
   fourteen sprites standing in a field; the same fourteen with two tiles
   between them read as a town. Everything below follows from that.

     - Streets run on the axes with a paved kerb either side, and they stop
       where the buildings stop. There is no road around the outside: a ring
       with nothing on its far side is a racetrack, not a town.
     - Three streets, three rows of buildings. Every sprite in the pack faces
       down, so each row sits directly above the street it fronts and the
       fronts line up the way a real street does.
     - Two connectors run through the built-up part rather than around it, so
       a loop goes past shopfronts instead of round the back of a hedge.
     - Nothing stands alone. Props come in groups that explain each other: a
       bench with a lamp and a tree, a yard with crates and a fence, a hedge
       marking where one garden stops and the next begins.
     - Trees grow in copses, never in an even sprinkle, and cherry is one in
       five so the wood stays a wood.
     - Detail thins outward: shopfronts, then back gardens, then orchard,
       then scrub, then closed forest.

   Tiles are 16px. Every coordinate below is in tile units.
   ========================================================================== */

window.FIELD_TRIP_WORLD = (function () {
  'use strict';

  const COLS = 72;
  const ROWS = 56;

  const GROUND = [{ fill: 'grass' }];
  const PROPS = [];
  const TREES = [];

  const paint = (tile, x, y, w, h) => GROUND.push({ rect: [x, y, w, h], tile: tile });
  const prop = (sprite, x, y, extra) => PROPS.push(Object.assign({ sprite: sprite, at: [x, y] }, extra || {}));

  /* one seeded stream of numbers, so the town is identical on every load */
  let seed = 20260903;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  const pick = (list) => list[Math.floor(rnd() * list.length)];

  /* --- streets ------------------------------------------------------------ */
  /* A carriageway with a paved kerb on both sides. Keeping them axis-aligned
     is what makes the town read as a town: the eye follows a straight edge
     and stops looking for a pattern in a diagonal. */

  function street(x0, y0, x1, y1, half) {
    const h = half === undefined ? 1 : half;
    if (y0 === y1) {
      paint('paving', x0, y0 - h - 1, x1 - x0 + 1, 1);
      paint('paving', x0, y0 + h + 1, x1 - x0 + 1, 1);
      paint('cobble', x0, y0 - h, x1 - x0 + 1, h * 2 + 1);
    } else {
      paint('paving', x0 - h - 1, y0, 1, y1 - y0 + 1);
      paint('paving', x0 + h + 1, y0, 1, y1 - y0 + 1);
      paint('cobble', x0 - h, y0, h * 2 + 1, y1 - y0 + 1);
    }
  }

  /* Hierarchy, and it matters more than it sounds: Main Street is three lanes
     wide because it is the boulevard, the two side lanes are one, and the
     alleys are dirt. Making every street the same width is what turns a town
     into a car park, and five tiles of featureless grey is a third of the
     screen at this zoom. */
  street(6, 28, 62, 28);           // Main Street, three lanes and two kerbs
  street(12, 14, 58, 14, 0);       // North Lane
  street(12, 40, 62, 40, 0);       // South Lane
  street(10, 13, 10, 41, 0);       // West Lane, down the side of the shops
  street(34, 15, 34, 39, 0);       // the Cut, straight through both blocks
  street(24, 41, 24, 46, 0);       // the station lane, down to the bus

  /* the service alley behind Market Row, on nobody's grid */
  paint('dirt', 13, 17, 19, 1);
  paint('dirt', 31, 17, 1, 9);

  /* the riverside path, and the lane along the millpond's south shore */
  paint('dirt', 61, 26, 3, 27);
  paint('dirt', 44, 50, 20, 3);

  /* Main Street carries on under the canopy at both ends */
  paint('cobble', 2, 27, 5, 3);

  /* --- plots -------------------------------------------------------------- */

  function fenceRun(x0, x1, y, gateX) {
    for (let x = x0; x + 3 <= x1 + 1; x += 3) {
      if (gateX !== undefined && x + 2 >= gateX - 1 && x <= gateX + 1) continue;
      prop('picket', x, y, { solid: [x, y, 3, 1] });
    }
  }

  /* A boundary between two gardens. A hedge, because two picket fences back
     to back looks like a mistake and a hedge does not. */
  function hedge(x, y0, y1) {
    for (let y = y0; y <= y1; y += 1) prop(rnd() > 0.5 ? 'bush-green' : 'bush-dark', x, y, { solid: [x, y, 1, 1] });
  }

  /* --- planting ----------------------------------------------------------- */
  /* Cherry is an accent. One in five is the difference between a wood and a
     sheet of blossom wallpaper. */

  const KINDS = ['tree-pine', 'tree-apple', 'tree-pine', 'tree-apple', 'tree-cherry'];
  const WOOD = ['tree-pine', 'tree-apple', 'tree-pine'];
  const wet = (x, y) => WATER.has(wkey(Math.floor(x) + 1, Math.floor(y) + 1));
  const tree = (kind, x, y) => { if (!wet(x, y)) TREES.push([kind, x, y]); };

  /* Trees grow in company: one big one, then a few smaller ones nudged round
     it, usually of the same kind. That is what reads as a copse. */
  function copse(cx, cy, count, spread) {
    const main = pick(KINDS);
    tree(main, cx, cy);
    for (let i = 1; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + rnd();
      const r = 0.7 + rnd() * spread;
      tree(rnd() > 0.25 ? main : pick(KINDS), cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7);
    }
  }

  /* Rough ground. A clump of bushes and stones with no fence and no order,
     which is what the land does where nobody is looking after it. None of it
     is solid, so the outer zone can never trap anybody. */
  function scrub(cx, cy, n) {
    for (let i = 0; i < n; i += 1) {
      const r = rnd();
      prop(r > 0.74 ? 'stone' : r > 0.37 ? 'bush-green' : 'bush-dark',
        Math.round(cx + (rnd() - 0.5) * 3.6), Math.round(cy + (rnd() - 0.5) * 2.8));
    }
  }

  /* An old field boundary, left over from before the town. Hedges have gaps
     in them, which is most of what makes a line of bushes read as a hedge. */
  function hedgerow(x0, x1, y) {
    for (let x = x0; x <= x1; x += 1) {
      if (rnd() > 0.84) continue;
      prop(rnd() > 0.5 ? 'bush-green' : 'bush-dark', x, y + (rnd() > 0.72 ? 1 : 0));
    }
  }

  /* An orchard is the opposite: somebody planted it, so it is in rows, and
     the contrast is what tells you where the town stops. */
  function orchard(x0, y0, cols, rows2) {
    for (let r = 0; r < rows2; r += 1) {
      for (let c = 0; c < cols; c += 1) tree('tree-apple', x0 + c * 3 + (r % 2) * 0.4, y0 + r * 3);
    }
  }

  /* --- water -------------------------------------------------------------- */

  const WATER = new Set();
  const wkey = (x, y) => y * COLS + x;

  (function pond(cx, cy, rx, ry) {
    for (let y = cy - ry; y <= cy + ry; y += 1) {
      const t = (y - cy) / ry;
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      for (let x = cx - w; x <= cx + w; x += 1) WATER.add(wkey(x, y));
    }
  })(52, 46, 5, 3);
  /* the brook out of the pond, running east to join the river */
  for (let y = 45; y <= 47; y += 1) for (let x = 56; x <= 64; x += 1) WATER.add(wkey(x, y));

  /* The river. The whole east side of the map is water rather than another
     wall of trees: you can walk down to the bank, see the far side, and not
     cross. A boundary you can look across stops reading as a wall. */
  for (let y = 0; y < ROWS; y += 1) for (let x = 64; x <= 69; x += 1) WATER.add(wkey(x, y));

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

  /* The two places you can stand on water: the bridge that carries the
     riverside path over the brook, and the jetty at the end of the walk. */
  const DECKS = [
    { x0: 61, x1: 63, y0: 45, y1: 47 },
    { x0: 64, x1: 66, y0: 49, y1: 50 }
  ];
  const onDeck = (x, y) => DECKS.some((c) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);

  /* --- buildings ---------------------------------------------------------- */
  /* No `id` means scenery: no door, no plaque, nothing to open. Five of the
     thirteen are scenery, so an open door means something. */

  const BUILDINGS = [
    /* Block A, fronting North Lane */
    { id: 'civic', sprite: 'b-community', at: [12, 5], door: [16, 13], plaque: 'the community center' },
    { id: 'library', sprite: 'b-library', at: [24, 6], door: [28, 13], plaque: 'the library' },
    { sprite: 'b-school', at: [42, 6] },

    /* Market Row, fronting Main Street */
    { id: 'market', sprite: 'b-market', at: [12, 18], door: [17, 26], plaque: 'the market' },
    { id: 'post', sprite: 'b-post', at: [25, 20], door: [27, 26], plaque: 'the post office' },
    { id: 'lostfound', sprite: 'b-house', at: [36, 21], door: [38, 26], plaque: 'the lost & found' },
    { id: 'pub', sprite: 'b-pub', at: [44, 21], door: [46, 26], plaque: 'the pub' },
    { sprite: 'b-cinema', at: [52, 20] },

    /* the south side, fronting South Lane */
    { id: 'arcade', sprite: 'b-arcade', at: [36, 33], door: [38, 39], plaque: 'the arcade' },
    { id: 'workshop', sprite: 'b-blacksmith', at: [44, 33], door: [46, 39], plaque: 'the workshop' },
    { id: 'drafting', sprite: 'b-trailer', at: [52, 35], door: [54, 39], plaque: 'the drafting room' },

    /* out past the bus stop */
    { sprite: 'b-house', at: [12, 44] },
    { sprite: 'b-trailer', at: [36, 45] }
  ];

  /* ======================================================================== */
  /* BLOCK A — the civic row                                                  */
  /* ======================================================================== */

  paint('paving', 12, 12, 10, 1);                // the community centre's apron
  paint('paving', 24, 12, 10, 1);                // the library's
  paint('dirt', 34, 5, 8, 8);                    // the school field
  hedge(22, 5, 12);                              // civic | library
  prop('bench-left', 19.0, 12.4, { solid: [19, 12, 2, 1] });
  prop('bench-right', 31.0, 12.4, { solid: [31, 12, 2, 1] });
  prop('lamp', 23.0, 12.2);
  prop('crate', 32.0, 11.4, { solid: [32, 12, 2, 1] });
  prop('bush-green', 12.0, 4.0);
  prop('bush-dark', 13.0, 4.0);
  prop('flower-yellow', 11.0, 12.0);

  /* the playground on the school field, behind a picket fence */
  fenceRun(34, 41, 13, 37);
  prop('picket-gate', 37.0, 13.0);
  paint('paving', 37, 13, 1, 1);
  prop('swing', 34.4, 6.6, { solid: [34, 9, 3, 1] });
  prop('slide', 38.2, 5.4, { solid: [38, 9, 2, 1] });
  prop('spring-bear', 35.4, 10.4, { solid: [35, 11, 2, 1] });
  prop('bench-left', 39.0, 11.4, { solid: [39, 11, 2, 1] });
  prop('bush-green', 41.0, 6.0);
  prop('bush-dark', 41.0, 7.0);
  prop('crate', 54.0, 11.4, { solid: [54, 12, 2, 1] });
  prop('bush-green', 56.0, 11.0);

  /* ======================================================================== */
  /* BLOCK B — Market Row                                                     */
  /* ======================================================================== */
  /* Shops meet the pavement directly, the way shops do, so there are no front
     gardens along here. What there is, is clutter against the shopfronts. */

  prop('crate', 23.2, 24.4, { solid: [23, 25, 2, 1] });
  prop('crate', 31.4, 23.4, { solid: [31, 24, 2, 1] });
  prop('bench-right', 32.0, 25.4, { solid: [32, 25, 2, 1] });
  prop('crate', 42.0, 24.4, { solid: [42, 25, 2, 1] });
  prop('bench-left', 50.4, 25.4, { solid: [50, 25, 2, 1] });
  prop('bush-green', 43.0, 25.0);
  prop('bush-dark', 51.0, 24.0);
  /* lamps on the main street only, which is the point of a main street */
  prop('lamp', 14.0, 26.2);
  prop('lamp', 24.0, 26.2);
  prop('lamp', 36.0, 26.2);
  prop('lamp', 44.0, 26.2);
  prop('lamp', 58.0, 26.2);
  prop('lamp', 20.0, 30.2);
  prop('lamp', 32.0, 30.2);
  prop('lamp', 50.0, 30.2);
  prop('lamp', 62.0, 30.2);

  /* Back gardens off the service alley, divided one per address. A block
     interior that is bare lawn is what makes a town look unfinished. */
  hedge(24, 18, 25);                             // market | post office
  hedge(32, 18, 25);                             // post office | the Cut
  hedge(42, 18, 25);                             // lost & found | pub
  hedge(50, 18, 25);                             // pub | cinema
  prop('rail-fence', 25.0, 17.6, { solid: [25, 18, 2, 1] });
  prop('crate', 28.0, 21.4, { solid: [28, 22, 2, 1] });
  prop('flower-orange', 26.0, 22.0);
  prop('flower-cream', 30.0, 23.0);
  prop('bush-green', 26.0, 25.0);
  prop('crate', 37.0, 17.6, { solid: [37, 18, 2, 1] });
  prop('crate', 39.6, 18.4, { solid: [39, 19, 2, 1] });
  prop('rail-fence', 36.0, 17.6, { solid: [36, 18, 2, 1] });
  prop('crate', 45.0, 17.6, { solid: [45, 18, 2, 1] });
  prop('bench-left', 47.4, 17.6, { solid: [47, 18, 2, 1] });
  prop('stone', 49.0, 20.0);
  prop('flower-yellow', 45.0, 21.0);
  prop('flower-blue', 48.0, 21.0);

  /* the walled garden on the corner of West Lane */
  fenceRun(12, 14, 17, -9);
  prop('flower-blue', 13.0, 15.0);
  prop('flower-yellow', 12.0, 16.0);

  /* ======================================================================== */
  /* THE GREEN — the middle of town, and the one place that is grass          */
  /* ======================================================================== */
  /* A village green is a lawn with paths worn across it, not a paved square.
     Paving the whole thing is what turns the middle of a town into a car
     park. The fountain sits where the two paths meet. */

  /* Two worn tracks and a small apron, and that is all. Paving the routes
     across a lawn cuts it into four grey-edged rectangles; wearing them into
     the grass is what people actually do to a green. */
  paint('paving', 18, 33, 4, 2);                 // the apron round the fountain
  paint('dirt', 20, 30, 1, 3);                   // the track up to Main Street
  paint('dirt', 20, 35, 1, 5);                   // and down to South Lane
  paint('dirt', 12, 36, 8, 1);                   // the track worn west
  paint('dirt', 21, 36, 12, 1);                  // and east, towards the Cut

  prop('fountain-0', 19.2, 32.6, {
    anim: ['fountain-0', 'fountain-1', 'fountain-2', 'fountain-3', 'fountain-4'],
    solid: [19, 33, 3, 2]
  });
  /* benches face the fountain, in pairs, each with a lamp behind it */
  prop('bench-right', 17.0, 34.4, { solid: [17, 34, 2, 1] });
  prop('bench-left', 22.0, 34.4, { solid: [22, 34, 2, 1] });
  prop('lamp-twin', 16.0, 31.2);
  prop('lamp-twin', 24.0, 31.2);
  prop('bench-left', 13.0, 37.4, { solid: [13, 37, 2, 1] });
  prop('lamp', 15.0, 37.2);
  prop('bench-right', 27.0, 37.4, { solid: [27, 37, 2, 1] });
  prop('lamp', 26.0, 37.2);
  /* flowerbeds in two clumps, not dotted about */
  prop('flower-orange', 14.0, 31.0);
  prop('flower-yellow', 15.0, 31.0);
  prop('flower-cream', 14.0, 32.0);
  prop('flower-orange', 28.0, 31.0);
  prop('flower-blue', 29.0, 31.0);
  prop('flower-yellow', 28.0, 32.0);
  prop('bush-green', 12.0, 36.0);
  prop('bush-dark', 12.0, 37.0);
  prop('bush-green', 30.0, 36.0);
  prop('bush-dark', 30.0, 37.0);
  /* chalk where children would actually draw: on the paving, near the seats */
  /* Chalk only goes on paving: the sprites are cut with the paving slab still
     under them, so on grass they read as grey patches rather than drawings. */
  prop('chalk-sun', 18.0, 33.0);
  prop('chalk-cat', 18.0, 34.0);
  prop('chalk-rainbow', 26.0, 30.0);
  prop('chalk-smiley', 30.0, 30.0);
  prop('chalk-heart', 14.0, 30.0);
  prop('robin-0', 24.0, 37.4, { anim: ['robin-0', 'robin-1'], slow: true });
  prop('butterfly-orange', 14.0, 38.0, { float: true });
  prop('butterfly-blue', 30.0, 33.0, { float: true });
  prop('stone', 13.0, 32.0);
  prop('stone', 29.0, 38.0);

  /* the court at the foot of the Cut, where the map sign stands */
  prop('bench-left', 30.0, 38.4, { solid: [30, 38, 2, 1] });
  prop('lamp', 32.0, 38.2);
  prop('bush-green', 35.0, 31.0);
  prop('bush-dark', 35.0, 32.0);

  /* ======================================================================== */
  /* THE WORKS YARD, THE BUS STOP AND THE MILLPOND                            */
  /* ======================================================================== */

  paint('dirt', 43, 32, 16, 7);                  // the works yard behind the row
  prop('crate', 42.0, 36.4, { solid: [42, 37, 2, 1] });
  prop('crate', 50.4, 34.4, { solid: [50, 35, 2, 1] });
  prop('crate', 51.0, 37.4, { solid: [51, 38, 2, 1] });
  prop('rail-tall', 57.0, 33.0, { solid: [57, 35, 2, 1] });
  prop('fence-post', 42.6, 31.4);
  prop('rail-fence', 43.0, 32.0, { solid: [43, 32, 2, 1] });
  prop('rail-fence', 45.0, 32.0, { solid: [45, 32, 2, 1] });
  prop('lamp', 43.0, 39.2);
  prop('lamp', 56.0, 39.2);
  prop('stone', 55.0, 33.0);
  prop('bush-dark', 58.0, 37.0);

  paint('dirt', 18, 44, 15, 7);                  // the bus apron
  prop('bus', 18.0, 45.0, { solid: [18, 47, 5, 2] });
  prop('shelter', 27.0, 45.0, { solid: [27, 46, 3, 2] });
  prop('bus-sign', 31.0, 45.4);
  prop('lamp', 32.0, 44.2);
  prop('bench-left', 26.0, 49.4, { solid: [26, 49, 2, 1] });
  prop('crate', 19.0, 49.4, { solid: [19, 50, 2, 1] });
  prop('bush-green', 17.0, 47.0);
  prop('bush-dark', 33.0, 47.0);
  /* the cottage and the caravan out past the bus, each with a garden */
  paint('paving', 14, 49, 1, 2);
  fenceRun(12, 17, 50, 14);
  prop('picket-gate', 14.0, 50.0);
  prop('flower-cream', 13.0, 49.0);
  prop('flower-orange', 16.0, 49.0);
  prop('rail-fence', 36.0, 49.0, { solid: [36, 49, 2, 1] });
  prop('rail-fence', 38.0, 49.0, { solid: [38, 49, 2, 1] });
  prop('lamp', 41.0, 49.2);

  /* the millpond and the riverside. The bridge carries the path over the
     brook, and the walk ends at a bench looking across the water. */
  prop('bridge-v', 60.9, 43.4, { flat: true });
  prop('bridge-h', 62.6, 48.4, { flat: true });
  prop('bench-left', 57.0, 53.4, { solid: [57, 53, 2, 1] });
  prop('bench-right', 45.0, 53.4, { solid: [45, 53, 2, 1] });
  prop('bench-left', 59.0, 30.4, { solid: [59, 30, 2, 1] });
  prop('lamp', 60.0, 41.2);
  prop('lamp', 60.0, 52.2);
  prop('lamp', 60.0, 31.2);
  prop('bush-green', 45.0, 43.0);
  prop('bush-dark', 46.0, 42.0);
  prop('bush-green', 58.0, 42.0);
  prop('bush-dark', 58.0, 49.0);
  prop('bush-green', 59.0, 36.0);
  prop('stone', 44.0, 46.0);
  prop('stone', 59.0, 51.0);
  prop('stone', 60.0, 22.0);
  prop('flower-blue', 44.0, 49.0);
  prop('flower-cream', 58.0, 54.0);
  prop('flower-yellow', 59.0, 34.0);
  prop('robin-0', 50.0, 52.4, { anim: ['robin-0', 'robin-1'], slow: true });
  prop('butterfly-blue', 55.0, 41.0, { float: true });
  prop('butterfly-orange', 60.0, 48.0, { float: true });
  prop('rail-fence', 44.0, 54.0, { solid: [44, 54, 2, 1] });
  prop('rail-fence', 54.0, 54.0, { solid: [54, 54, 2, 1] });

  /* --- planting, from the middle outwards ---------------------------------- */

  /* street trees on the verge, in line, because somebody planted them */
  [13, 27, 43, 59].forEach((x) => tree('tree-cherry', x, 30.6));
  [15, 31, 47].forEach((x) => tree('tree-apple', x, 17.6));

  /* the green's own trees, round its edge rather than in the middle of it */
  copse(14.0, 36.6, 3, 0.8);
  copse(28.5, 36.6, 3, 0.8);
  copse(29.5, 31.4, 2, 0.7);
  copse(13.5, 31.0, 2, 0.7);

  /* the orchards: one behind the community centre, one out past the pond */
  orchard(4, 5, 2, 3);
  orchard(57, 5, 2, 3);

  /* copses filling the ground between districts, thinning towards the edge */
  const CLUMPS = [
    [6, 15, 3], [6, 21, 3], [5, 34, 3], [6, 38, 3], [7, 44, 3], [8, 51, 4],
    [28, 52, 4], [34, 52, 3], [42, 46, 3], [45, 44, 2],
    [60, 34, 4], [64, 37, 3], [66, 45, 3], [67, 52, 3], [40, 53, 3],
    [61, 21, 4], [67, 23, 3], [62, 11, 3], [67, 33, 3],
    [57, 7, 3], [60, 5, 3], [6, 8, 3], [66, 38, 3]
  ];
  CLUMPS.forEach((c) => copse(c[0], c[1], c[2], 1.1 + rnd() * 0.7));

  /* Rough ground first, so the town does not meet the wood at a hard line */
  [[8, 6], [20, 4], [31, 4], [46, 4], [7, 11], [5, 19], [5, 27], [5, 35],
   [6, 45], [8, 52], [17, 53], [30, 54], [41, 53], [51, 53], [58, 19],
   [59, 24], [38, 4], [59, 13]].forEach((c) => scrub(c[0], c[1], 4 + Math.floor(rnd() * 3)));

  /* two hedgerows left over from the fields this town was built in */
  hedgerow(4, 8, 20);
  hedgerow(4, 8, 34);
  hedgerow(14, 22, 53);
  hedgerow(45, 53, 55);

  /* The edge of the wood. The depth wanders a long way and now and then the
     line opens right up, so it reads as woodland rather than as a fence made
     of trees. A fixed depth is the thing that looks artificial. */
  function edge(steps, place) {
    let depth = 2.4;
    for (let i = 0; i < steps; i += 1) {
      depth += (rnd() - 0.5) * 2.2;
      depth = Math.max(0.3, Math.min(3.6, depth));
      const open = rnd() > 0.82 ? rnd() * 0.8 : depth;
      for (let d = 0; d < open; d += 1) place(i, d + rnd() * 0.9, rnd());
    }
  }
  edge(Math.ceil(COLS / 1.9), (i, d, j) => {
    const x = -1 + i * 1.9 + j * 1.3;
    tree(pick(WOOD), x, d * 1.3 - 0.6);
    tree(pick(KINDS), x + 0.6, ROWS - 3.6 + d * 1.25);
  });
  edge(Math.ceil(ROWS / 1.9), (i, d, j) => {
    const y = 2 + i * 1.9 + j * 1.3;
    tree(pick(WOOD), d * 1.3 - 0.6, y);
  });

  /* The far bank of the river: trees you can see the whole time and never
     reach, which is a better reason not to walk east than a hedge. */
  for (let y = -1; y < ROWS; y += 1.4) {
    tree(pick(WOOD), COLS - 2.4 + rnd() * 1.2, y + rnd() * 1.1);
    if (rnd() > 0.35) tree(pick(KINDS), COLS - 1.3 + rnd(), y + rnd() * 1.2);
  }

  /* --- ground and collision, finished -------------------------------------- */
  /* Water last: it wins over anything a street painted, and it is the one
     surface nobody can walk on. Buildings and furniture mark themselves from
     their own silhouettes; see stampMask in game.js. */

  WATER.forEach((key) => {
    const x = key % COLS;
    const y = Math.floor(key / COLS);
    GROUND.push({ rect: [x, y, 1, 1], tile: shoreTile(x, y) });
  });

  const SOLIDS = [
    [0, 0, 4, ROWS], [COLS - 4, 0, 4, ROWS],
    [0, 0, COLS, 4], [0, ROWS - 4, COLS, 4]
  ];
  WATER.forEach((key) => {
    const x = key % COLS;
    const y = Math.floor(key / COLS);
    if (!onDeck(x, y)) SOLIDS.push([x, y, 1, 1]);
  });

  /* --- people, signs and the cat -------------------------------------------- */

  const NPCS = [
    { id: 'npc-a', at: [21.5, 37.6], dir: 'up' },
    { id: 'npc-b', at: [26.5, 48.6], dir: 'up' },
    { id: 'npc-c', at: [27.5, 36.6], dir: 'right' }
  ];

  /* Things you can look at outdoors. `room` is which page of the map
     directory they belong to, so the green and the millpond read as two
     places rather than one undifferentiated outside. */
  const SQUARE = [
    { id: 'welcome', sprite: 'sign-stand', at: [24.0, 30.0] },
    { id: 'notice', sprite: 'easel', at: [16.0, 30.0] },
    { id: 'mapsign', sprite: 'sign-stand', at: [31.0, 34.0] },
    { id: 'fountain', sprite: null, at: [20.0, 35.0] },
    { id: 'bench', sprite: null, at: [17.4, 35.6] },
    { id: 'noticeboard', sprite: 'sign-stand', at: [47.0, 47.4], room: 'pond' },
    { id: 'water', sprite: null, at: [50.0, 51.4], room: 'pond' },
    { id: 'bridge', sprite: null, at: [62.0, 48.4], room: 'pond' },
    /* the bus you arrived on, and the sign it stops at */
    { id: 'ride', sprite: null, at: [20.4, 48.6], room: 'stop' },
    { id: 'timetable', sprite: null, at: [31.0, 47.2], room: 'stop' }
  ];

  const CAT_SPOT = [22.5, 38.0];
  const SPAWN = { tx: 24.5, ty: 48.5, dir: 'up' };

  return {
    version: 5,
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

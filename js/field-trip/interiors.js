/* ==========================================================================
   interiors.js — where things stand inside each building.

   Layout only. What a room *says* lives in js/content.js under `town.rooms`,
   and the two are joined by id. Every room is built by the same scene code:
   two rows of wall along the top, floor below, one door in the bottom edge.

   Every room follows the same grammar, because a room where the furniture
   has been dropped at random is exactly as unconvincing as a town where the
   buildings have:

     - Rows 0 to 1 are wall. Wall art hangs there and nothing else does, and
       two pieces never share a column, because the tall thing in front wins
       and you are left looking at half a poster.
     - The tall fixtures — shelves, boards, counters, cabinets — stand along
       the back wall in a line with a clear tile between them. Those are the
       things worth inspecting, so they read as a row you can walk past.
     - The middle of the floor stays clear. Seating comes in groups on a rug;
       everything else hugs a wall.
     - The column above the door is kept empty from the mat to the middle of
       the room, so walking in never means walking into something.

   Units are tiles (16px). `at` is the sprite's top-left and may be
   fractional. Collision comes from the sprite's own alpha mask, lower half
   only, unless `solid` overrides it or `pass` waives it (rugs, wall art).
   ========================================================================== */

window.FIELD_TRIP_INTERIORS = (function () {
  'use strict';

  /* shorthand: [id, sprite, x, y, extra] */
  const o = (id, sprite, x, y, extra) => Object.assign({ id: id, sprite: sprite, at: [x, y] }, extra || {});
  const d = (sprite, x, y, extra) => Object.assign({ sprite: sprite, at: [x, y] }, extra || {});

  return {
    workshop: {
      cols: 18, rows: 12,
      floor: 'floor-tan', wall: 'wall-cream',
      exit: [9, 11], spawn: [9, 9.4],
      tint: 'rgba(255, 176, 92, 0.06)',
      decor: [
        d('window-in', 14.8, 0.9, { pass: true }),
        d('poster-a', 13.4, 1.2, { pass: true }),
        d('board-tiny', 8.6, 8.4),
        d('rug-long', 3.4, 7.6, { pass: true }),
        d('stool', 4.2, 8.0),
        d('stool', 6.2, 8.0),
        d('forge', 15.2, 5.2),
        d('anvil', 12.4, 8.2),
        d('crate-box', 1.3, 8.0),
        d('bin', 1.2, 5.2),
        d('plant', 16.2, 8.8)
      ],
      objects: [
        o('whiteboard', 'whiteboard', 1.4, 1.4),
        o('toolwall', 'cabinet', 6.4, 1.9),
        o('teststation', 'machines', 9.2, 2.0),
        o('workbench', 'workbench', 3.6, 5.2),
        o('terminal', 'terminal', 7.6, 5.2),
        o('halfbuilt', 'machines', 10.6, 5.4)
      ],
      npcs: [{ id: 'npc-b', at: [14.5, 8.6], dir: 'left' }]
    },

    drafting: {
      cols: 16, rows: 11,
      floor: 'floor-green', wall: 'wall-lilac',
      exit: [8, 10], spawn: [8, 8.4],
      tint: 'rgba(120, 140, 255, 0.05)',
      decor: [
        d('curtains', 12.8, 0.9, { pass: true }),
        d('rug-green', 5.6, 5.6, { pass: true }),
        d('stool', 5.0, 6.4),
        d('chair', 8.6, 6.2),
        d('sofa', 11.8, 8.2),
        d('crate-box', 1.3, 5.4),
        d('bin', 14.2, 8.4),
        d('plant', 1.3, 8.4)
      ],
      objects: [
        o('flowboard', 'whiteboard', 1.4, 1.4),
        o('pinboard', 'poster-d', 6.2, 1.3),
        o('calendar', 'board-small', 8.6, 1.7),
        o('ledger', 'bookcase', 10.8, 1.5),
        o('table', 'desk', 6.0, 4.4)
      ],
      npcs: [{ id: 'npc-c', at: [3.5, 7.4], dir: 'right' }]
    },

    pub: {
      cols: 16, rows: 11,
      floor: 'floor-oak', wall: 'wall-teal',
      exit: [8, 10], spawn: [8, 8.4],
      tint: 'rgba(255, 176, 92, 0.07)',
      decor: [
        d('poster-b', 4.2, 1.3, { pass: true }),
        d('frame', 6.2, 1.5, { pass: true }),
        d('rug-long', 10.6, 6.6, { pass: true }),
        d('stool', 4.4, 6.4),
        d('stool', 6.0, 6.4),
        d('stool', 7.6, 6.4),
        d('sofa-red', 1.4, 8.2),
        d('plant', 14.4, 8.6),
        d('bin', 1.2, 5.4),
        d('crate-box', 14.2, 5.2)
      ],
      objects: [
        o('jukebox', 'arcade-6', 1.4, 1.2),
        o('records', 'shop-shelf', 8.6, 1.9),
        o('counter', 'counter-bar', 4.4, 4.2),
        o('table', 'table-round', 11.0, 7.4),
        o('window', 'curtains', 12.0, 1.2, { pass: true })
      ],
      npcs: [{ id: 'npc-a', at: [11.5, 5.4], dir: 'down' }]
    },

    civic: {
      cols: 19, rows: 12,
      floor: 'floor-marble', wall: 'wall-grey',
      exit: [9, 11], spawn: [9, 9.4],
      tint: null,
      decor: [
        d('rug-blue', 7.4, 7.6, { pass: true }),
        d('sofa', 6.8, 8.2),
        d('sofa', 10.4, 8.2),
        d('plant', 1.3, 5.4),
        d('plant', 16.9, 5.4),
        d('art-easel', 16.0, 8.0),
        d('stool', 2.4, 8.4)
      ],
      objects: [
        o('report', 'poster-d', 1.6, 1.3),
        o('wallmap', 'whiteboard', 4.4, 1.4),
        o('cabinet', 'cabinet', 9.4, 1.9),
        o('terminal', 'terminal', 12.6, 1.7),
        o('aquarium', 'aquarium', 14.6, 1.9)
      ],
      npcs: []
    },

    lostfound: {
      cols: 18, rows: 12,
      floor: 'floor-check', wall: 'wall-teal',
      exit: [9, 11], spawn: [9, 9.4],
      tint: 'rgba(90, 160, 200, 0.05)',
      decor: [
        d('shelf-crates-2', 1.3, 5.0),
        d('shelf-items', 13.6, 5.4),
        d('rug-long', 5.4, 8.0, { pass: true }),
        d('stool', 6.4, 8.4),
        d('bin', 16.2, 8.6),
        d('plant', 16.2, 2.4)
      ],
      objects: [
        o('shelves', 'shelf-crates', 1.5, 1.6),
        o('trophy', 'trophy-case', 4.8, 1.4),
        o('noticeboard', 'poster-c', 7.6, 1.3),
        o('cabinet', 'cabinet', 9.6, 1.9),
        o('terminal', 'terminal', 12.8, 1.7),
        o('intake', 'counter-long', 6.4, 5.2),
        o('ledger', 'desk', 10.8, 5.4)
      ],
      npcs: [{ id: 'npc-a', at: [9.5, 7.0], dir: 'down' }]
    },

    market: {
      cols: 19, rows: 12,
      floor: 'floor-blue', wall: 'wall-red',
      exit: [9, 11], spawn: [9, 9.4],
      tint: null,
      decor: [
        d('counter-blue', 12.4, 8.0),
        d('shop-narrow', 16.8, 5.4),
        d('shop-narrow', 16.8, 7.4),
        d('crate-box', 4.4, 8.4),
        d('plant', 17.0, 2.4),
        d('stool', 11.0, 8.6)
      ],
      objects: [
        o('tickets', 'desk-small', 1.6, 1.8),
        o('stockboard', 'whiteboard', 3.4, 1.4),
        o('staffdoor', 'door-in', 8.4, 1.1),
        o('shelves', 'shop-shelf', 11.0, 1.9),
        o('shelves-b', 'shop-shelf-2', 1.6, 5.4, { alias: 'shelves' }),
        o('shelves-c', 'shop-shelf-3', 1.8, 7.4, { alias: 'shelves' }),
        o('checkout', 'counter-bar', 8.4, 5.4)
      ],
      npcs: []
    },

    library: {
      cols: 19, rows: 12,
      floor: 'floor-wood', wall: 'wall-cream',
      exit: [9, 11], spawn: [9, 9.4],
      tint: 'rgba(255, 214, 140, 0.07)',
      decor: [
        d('bookcase-wide', 1.4, 5.0),
        d('bookcase-wide', 13.4, 5.0),
        d('rug-long', 7.4, 7.4, { pass: true }),
        d('table-round', 8.4, 7.8),
        d('armchair', 6.6, 7.6),
        d('armchair', 10.8, 7.6),
        d('plant', 17.0, 8.6),
        d('stool', 1.6, 8.4)
      ],
      objects: [
        o('shelves', 'bookcase-wide', 1.4, 1.4),
        o('blackboard', 'board-small', 6.2, 1.8),
        o('awards', 'trophy-case', 8.6, 1.4),
        o('studyboard', 'poster-b', 12.0, 1.3),
        o('tutordesk', 'desk', 14.4, 1.9)
      ],
      npcs: [{ id: 'npc-b', at: [14.5, 8.4], dir: 'up' }]
    },

    post: {
      cols: 16, rows: 11,
      floor: 'floor-teal', wall: 'wall-dark',
      exit: [8, 10], spawn: [8, 8.4],
      tint: 'rgba(255, 206, 140, 0.06)',
      decor: [
        d('frame', 12.6, 1.5, { pass: true }),
        d('rug-blue', 1.6, 6.6, { pass: true }),
        d('armchair', 2.2, 6.8),
        d('crate-box', 13.4, 5.4),
        d('crate-box', 13.4, 7.8),
        d('bin', 1.2, 4.4),
        d('plant', 14.4, 3.0)
      ],
      objects: [
        o('pigeonholes', 'pigeonholes', 1.4, 1.5),
        o('addressbook', 'bookcase', 4.6, 1.5),
        o('computer', 'terminal', 6.8, 1.7),
        o('parcels', 'shelf-items-2', 8.6, 1.9),
        o('desk', 'counter-long', 6.2, 5.2)
      ],
      npcs: []
    },

    arcade: {
      cols: 18, rows: 12,
      floor: 'floor-slate', wall: 'wall-dark',
      exit: [9, 11], spawn: [9, 9.4],
      tint: 'rgba(150, 90, 255, 0.04)',
      neon: true,
      decor: [
        d('arcade-sign', 10.9, 0.3, { pass: true }),
        d('arcade-5', 13.8, 2.6),
        d('arcade-6', 15.9, 2.6),
        d('rug-blue', 2.4, 7.8, { pass: true }),
        d('sofa-red', 2.0, 8.4),
        d('tv', 12.4, 5.4),
        d('table-round', 12.8, 8.0),
        d('stool', 14.8, 8.2),
        d('bin', 16.4, 5.4),
        d('plant', 1.3, 5.4)
      ],
      objects: [
        o('machine1', 'arcade-2', 1.4, 2.6),
        o('machine2', 'arcade-3', 3.5, 2.6),
        o('machine3', 'arcade-4', 5.6, 2.6),
        o('cabinet', 'arcade-1', 8.4, 2.6),
        o('highscore', 'board-small', 1.6, 1.6),
        o('prizes', 'shelf-items', 5.6, 6.0)
      ],
      npcs: [
        { id: 'npc-c', at: [8.5, 6.6], dir: 'up' },
        { id: 'npc-a', at: [11.5, 7.4], dir: 'left' }
      ]
    }
  };
})();

/* ==========================================================================
   interiors.js — where things stand inside each building.

   Layout only. What a room *says* lives in js/content.js under `town.rooms`,
   and the two are joined by id. Every room is built by the same scene code:
   two rows of wall along the top, floor below, one door in the bottom edge.

   Units are tiles (16px). `at` is the sprite's top-left and may be fractional.
   Collision is derived from the sprite's footprint unless `solid` overrides it
   or `pass` waives it (rugs, wall art).
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
        d('rug-long', 5.4, 7.4, { pass: true }),
        d('window-in', 14.6, 0.9, { pass: true }),
        d('poster-a', 12.8, 1.2, { pass: true }),
        d('bin', 1.2, 8.6),
        d('plant', 16.0, 8.8),
        d('stool', 3.6, 6.4),
        d('anvil', 12.2, 6.6),
        d('forge', 14.4, 5.2),
        d('crate-box', 1.3, 5.4)
      ],
      objects: [
        o('whiteboard', 'whiteboard', 1.4, 1.2),
        o('toolwall', 'cabinet', 6.4, 1.7),
        o('teststation', 'machines', 9.4, 1.3),
        o('workbench', 'workbench', 4.4, 5.2),
        o('terminal', 'terminal', 8.6, 5.4),
        o('halfbuilt', 'machines', 11.2, 8.2)
      ],
      npcs: [{ id: 'npc-b', at: [7.5, 8.6], dir: 'right' }]
    },

    drafting: {
      cols: 16, rows: 11,
      floor: 'floor-green', wall: 'wall-lilac',
      exit: [8, 10], spawn: [8, 8.4],
      tint: 'rgba(120, 140, 255, 0.05)',
      decor: [
        d('rug-green', 6.4, 6.2, { pass: true }),
        d('curtains', 12.6, 0.9, { pass: true }),
        d('frame', 4.4, 1.4, { pass: true }),
        d('stool', 5.4, 6.8),
        d('stool', 9.6, 6.8),
        d('plant', 1.3, 8.2),
        d('bin', 14.2, 8.2),
        d('stool', 2.4, 5.4),
        d('sofa', 11.4, 8.4),
        d('crate-box', 1.4, 5.6),
        d('rug-blue', 2.2, 8.6, { pass: true })
      ],
      objects: [
        o('flowboard', 'whiteboard', 1.4, 1.2),
        o('pinboard', 'poster-d', 6.4, 1.3),
        o('calendar', 'board-small', 8.6, 1.6),
        o('ledger', 'bookcase', 13.4, 1.4),
        o('table', 'desk', 6.6, 4.6)
      ],
      npcs: [{ id: 'npc-c', at: [3.5, 7.4], dir: 'right' }]
    },

    pub: {
      cols: 16, rows: 11,
      floor: 'floor-oak', wall: 'wall-teal',
      exit: [8, 10], spawn: [8, 8.4],
      tint: 'rgba(255, 176, 92, 0.07)',
      decor: [
        d('rug-long', 5.4, 6.6, { pass: true }),
        d('poster-b', 3.0, 1.3, { pass: true }),
        d('frame', 5.6, 1.5, { pass: true }),
        d('stool', 4.4, 6.6),
        d('stool', 6.4, 6.6),
        d('stool', 9.4, 6.6),
        d('sofa-red', 1.4, 8.2),
        d('plant', 14.4, 8.4),
        d('bin', 1.3, 5.4),
        d('crate-box', 14.2, 5.2)
      ],
      objects: [
        o('jukebox', 'arcade-6', 1.4, 1.4),
        o('records', 'shop-shelf', 8.6, 1.7),
        o('counter', 'counter-bar', 5.4, 4.4),
        o('table', 'table-round', 11.4, 7.4),
        o('window', 'curtains', 12.4, 1.2, { pass: true })
      ],
      npcs: [{ id: 'npc-a', at: [11.5, 5.4], dir: 'down' }]
    },

    civic: {
      cols: 19, rows: 12,
      floor: 'floor-marble', wall: 'wall-grey',
      exit: [9, 11], spawn: [9, 9.4],
      tint: null,
      decor: [
        d('rug-blue', 5.4, 7.6, { pass: true }),
        d('sofa', 3.4, 7.6),
        d('sofa', 12.4, 7.6),
        d('plant', 1.3, 3.4),
        d('plant', 16.9, 3.4),
        d('art-easel', 15.4, 6.4),
        d('stool', 8.4, 5.4)
      ],
      objects: [
        o('wallmap', 'whiteboard', 6.4, 1.1),
        o('report', 'poster-d', 3.4, 1.3),
        o('cabinet', 'cabinet', 14.4, 1.7),
        o('terminal', 'terminal', 1.4, 5.4),
        o('aquarium', 'aquarium', 10.4, 4.6)
      ],
      npcs: []
    },

    lostfound: {
      cols: 18, rows: 12,
      floor: 'floor-check', wall: 'wall-teal',
      exit: [9, 11], spawn: [9, 9.4],
      tint: 'rgba(90, 160, 200, 0.05)',
      decor: [
        d('shelf-crates-2', 1.3, 5.2),
        d('shelf-items', 13.4, 5.4),
        d('bin', 16.2, 8.6),
        d('plant', 16.2, 5.0),
        d('stool', 6.4, 7.4),
        d('rug-long', 5.4, 7.4, { pass: true })
      ],
      objects: [
        o('shelves', 'shelf-crates', 1.3, 1.4),
        o('trophy', 'trophy-case', 4.4, 1.3),
        o('noticeboard', 'poster-c', 7.4, 1.3),
        o('cabinet', 'cabinet', 9.4, 1.7),
        o('terminal', 'terminal', 13.6, 1.5),
        o('intake', 'counter-long', 6.4, 5.2),
        o('ledger', 'desk', 10.6, 8.0)
      ],
      npcs: [{ id: 'npc-a', at: [9.5, 6.9], dir: 'down' }]
    },

    market: {
      cols: 19, rows: 12,
      floor: 'floor-blue', wall: 'wall-red',
      exit: [9, 11], spawn: [9, 9.4],
      tint: null,
      decor: [
        d('shop-narrow', 16.6, 4.4),
        d('shop-narrow', 16.6, 6.4),
        d('crate-box', 1.3, 8.4),
        d('plant', 17.0, 8.6),
        d('stool', 12.4, 8.4)
      ],
      objects: [
        o('shelves', 'shop-shelf', 1.4, 4.4),
        o('shelves-b', 'shop-shelf-2', 1.4, 6.4, { alias: 'shelves' }),
        o('shelves-c', 'shop-shelf-3', 1.6, 8.4, { alias: 'shelves' }),
        o('stockboard', 'whiteboard', 5.4, 1.2),
        o('tickets', 'desk-small', 3.4, 1.7),
        o('checkout', 'counter-bar', 9.4, 5.4),
        o('staffdoor', 'door-in', 14.4, 1.1),
        o('crate', 'crate-box', 6.4, 8.6)
      ],
      npcs: []
    },

    library: {
      cols: 19, rows: 12,
      floor: 'floor-wood', wall: 'wall-cream',
      exit: [9, 11], spawn: [9, 9.4],
      tint: 'rgba(255, 214, 140, 0.07)',
      decor: [
        d('bookcase-wide', 11.4, 4.4),
        d('bookcase', 15.6, 4.4),
        d('table-round', 8.4, 7.6),
        d('armchair', 6.9, 7.4),
        d('armchair', 10.6, 7.4),
        d('rug-long', 3.4, 7.6, { pass: true }),
        d('bookcase-wide', 4.6, 4.6),
        d('bookcase', 16.8, 1.4),
        d('plant', 17.0, 8.6),
        d('stool', 3.6, 8.2)
      ],
      objects: [
        o('shelves', 'bookcase-wide', 1.4, 1.4),
        o('blackboard', 'board-small', 5.6, 1.7),
        o('awards', 'trophy-case', 8.4, 1.3),
        o('studyboard', 'poster-b', 12.8, 1.3),
        o('tutordesk', 'desk', 1.6, 5.4)
      ],
      npcs: [{ id: 'npc-b', at: [13.5, 8.4], dir: 'up' }]
    },

    post: {
      cols: 16, rows: 11,
      floor: 'floor-teal', wall: 'wall-dark',
      exit: [8, 10], spawn: [8, 8.4],
      tint: 'rgba(255, 206, 140, 0.06)',
      decor: [
        d('rug-blue', 2.2, 6.6, { pass: true }),
        d('armchair', 2.6, 5.6),
        d('plant', 1.3, 8.4),
        d('stool', 7.4, 4.3),
        d('poster-a', 13.6, 1.3, { pass: true }),
        d('frame', 11.4, 1.5, { pass: true }),
        d('crate-box', 12.4, 5.4),
        d('crate-box', 13.2, 7.6),
        d('bin', 14.6, 4.4)
      ],
      objects: [
        o('pigeonholes', 'pigeonholes', 1.4, 1.3),
        o('addressbook', 'bookcase', 4.4, 1.4),
        o('computer', 'terminal', 7.4, 1.6),
        o('parcels', 'shelf-items-2', 9.6, 1.9),
        o('desk', 'counter-long', 6.4, 5.2)
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
        d('arcade-sign', 7.0, 0.4, { pass: true }),
        d('frame', 3.2, 1.4, { pass: true }),
        d('arcade-5', 11.6, 3.2),
        d('arcade-6', 13.8, 3.2),
        d('rug-blue', 4.8, 6.6, { pass: true }),
        d('sofa-red', 2.4, 7.6),
        d('table-round', 13.0, 7.2),
        d('stool', 14.8, 7.4),
        d('tv', 16.2, 4.8),
        d('bin', 16.2, 8.6),
        d('plant', 1.3, 8.4)
      ],
      objects: [
        o('cabinet', 'arcade-1', 8.4, 3.4),
        o('machine1', 'arcade-2', 1.4, 3.2),
        o('machine2', 'arcade-3', 3.6, 3.2),
        o('machine3', 'arcade-4', 5.8, 3.2),
        o('highscore', 'board-small', 11.2, 1.5),
        o('prizes', 'shelf-items', 14.2, 1.8)
      ],
      npcs: [
        { id: 'npc-c', at: [7.5, 7.4], dir: 'up' },
        { id: 'npc-a', at: [12.5, 6.4], dir: 'left' }
      ]
    }
  };
})();

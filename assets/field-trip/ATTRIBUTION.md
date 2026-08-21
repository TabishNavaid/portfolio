# Field Trip — asset attribution

The pixel art in Field Trip comes from asset packs **purchased by Tabish
Navaid** from **shubibubi** (town, nature and farm) and the **Character v.2**
modular character pack.

## Licence and what that means here

The shubibubi packs are licensed for use and modification in commercial and
non-commercial projects, and forbid reselling or redistributing the packs
themselves, modified or not. So:

- The purchased `.zip` archives are **not** in this repository. They are
  excluded by `.gitignore` and live only on Tabish's machine, in
  `assets/images/purchased assets zip/`.
- Only the small derived atlases below ship with the site. They contain the
  sprites this one feature uses — not a redistributable version of any pack.
- Nothing here is resold or offered for download as art.
- A credit line appears in the game's map directory and in the repository
  README.

The **Sprout Lands** pack by Cup Nooble is present on Tabish's machine but is
deliberately **not** used: its licence covers non-commercial projects only, and
a portfolio used to find work is not clearly that.

## What ships

| file | size | contents |
| --- | --- | --- |
| `town.png` | 512×481 | 75 frames: ground tiles, water, props, and one variant of each building |
| `rooms.png` | 448×173 | 75 frames: interior floors and walls, furniture, arcade cabinets, and the cat |
| `chars.png` | 320×257 | the player's 8-frame walk cycle in four directions, plus three standing townsfolk |
| `bus.png` | 80×52 | the one sprite Meadow Desktop borrows, for the animated entrance |

Frame rectangles are generated into `js/field-trip/atlas.js`. Nothing else from
the packs is loaded, and none of it is loaded until the Field Trip profile is
chosen.

## Sources

| what | pack | file | source rect |
| --- | --- | --- | --- |
| ground, paths, paving | Cozy Town | `town full/tiles/tiles.png` | see `TOWN_PIECES` in the build script |
| fountain, lamps, benches, fences, crates | Cozy Town | `town full/tiles/tiles.png` | ditto |
| bus, bus shelter, bus sign | Cozy Town | `town full/tiles/tiles.png` | ditto |
| pond and stream tiles | Cozy Town | `town full/tiles/tiles.png` | the 3×3 water blob at (240, 0) plus the 2×2 of inner corners at (288, 16) |
| the wooden bridge | Cozy Town | `town full/tiles/tiles.png` | (0, 702, 80, 49), the east–west deck only |
| rail fences, picket fence and gate | Cozy Town | `town full/tiles/tiles.png` | see `TOWN_PIECES` |
| swing, slide and spring rider | Cozy Town | `town full/tiles/tiles.png` | ditto |
| the robin on the green | Cozy Town | `town full/animals/bird_robin_animations.png` | two frames of the peck cycle at (0, 32) and (16, 32) |
| every building | Cozy Town | `town full/buildings/buildings_all.png` | first (summer) variant of each |
| trees, bushes, stone, butterflies | 100 Nature Things | `nature full/global.png` | ditto |
| flowers | Cozy Farm | `full version/farming/crops.png` | ditto |
| player and townsfolk | Character v.2 | `characters/`, `eyes/`, `clothes/`, `hair/`, `acc/` | layered per `CAST` |
| interior furniture | Cozy Town | `town full/interior/interior.png` | see `ROOM_PIECES` |
| floors and wallpapers | Cozy Interior | `interior full/basics/wallpapers.png` | 16×16 cells by grid position |
| rugs | Cozy Interior | `interior full/basics/rugs.png` | two 48×32 patterned rugs |
| the cat in the square | Cozy Interior | `interior full/pets/cat animation.png` | two sitting frames |

## Modifications

- The player is composed from the modular Character v.2 layers — base, eyes,
  shirt, trousers, shoes, curly hair, glasses — to echo the dark hair and round
  glasses of the hand-drawn character on Meadow Desktop. The base artwork is
  the pack's, not original work.
- The player's shirt is recoloured towards the site's orange (`#d96e34`
  family). The licence permits modification.

## Rebuilding

```bash
python3 tools/build-field-trip-assets.py
```

The script reads the purchased archives in place, cuts the rectangles listed in
`TOWN_PIECES` and `CAST`, packs them, and rewrites `town.png`, `chars.png`,
`bus.png`, `rooms.png` and `js/field-trip/atlas.js`. That file is the map back
to the originals; the originals stay the source of truth.

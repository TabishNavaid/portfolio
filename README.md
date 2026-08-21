# tabish navaid — three ways in

The site boots like a small computer and asks *who's logging in?* Three
profiles, one set of facts:

- **The Brief** — a conventional, scrollable portfolio. Name, fit, proof,
  links.
- **Meadow Desktop** — the original. A single-screen desktop in a meadow;
  everything opens in windows launched from five illustrated icons.
- **Field Trip** — a top-down pixel village you walk around. Nine doors open
  and hold part of the same résumé; the school, the cinema, the cottages and
  the caravan are scenery, so an open door means something.

No framework, no build step, no dependencies.

```
index.html                 the shell: boot, profile chooser, and the three mode roots
404.html                   a wrong address, and the three ways back
css/styles.css             chooser, Meadow Desktop, shared tokens
css/brief.css              The Brief          (loaded when picked)
css/field-trip.css         the game frame     (loaded when picked)
js/content.js              every fact on the site, once
js/modes.js                boot, chooser, URL state, lazy loading, profile switching
js/main.js                 Meadow Desktop
js/brief.js                The Brief
js/bus-ride.js             the ride from Meadow Desktop to Field Trip
js/soundscapes.js          opt-in ambience, shared by the ride and Field Trip
js/field-trip/atlas.js     generated sprite table
js/field-trip/world.js     the town outside
js/field-trip/interiors.js what stands where inside each building
js/field-trip/panels.js    every panel Field Trip can open
js/field-trip/game.js      scene engine: loop, collision, camera, save
js/field-trip/arcade.js    Cat Courier, loaded at the cabinet
assets/                    art and sounds; optimised derivatives in images/opt
tools/                     the asset build script
```

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` directly also works —
there are no modules and no fetches.

## Modes

The mode lives in the URL. `?mode=brief`, `?mode=meadow` and `?mode=field-trip`
go straight in; the bare root shows the chooser. The last profile is
remembered only to pre-select it on the chooser — a direct URL always wins, and
nobody gets trapped in a mode. Every mode carries a small **switch profile**
control that returns to the chooser without clearing preferences.

A mode's CSS and JS are injected on first use. Field Trip's three sprite
atlases are requested only after that profile is chosen, the arcade module only
when somebody reaches the cabinet, and the game loop stops when the tab is
hidden, when a panel is open, and when the mode is switched away.

## How the pieces work

**One content model.** `js/content.js` is the only place a fact is written.
The Brief, the desktop windows and the town panels are three renderers over the
same objects. A missing fact is `null` with a note, so the action disappears
instead of becoming a dead link — set `LINKS.resume` to a path and every résumé
action on the site appears.

**Meadow Desktop is one screen.** `html, body { overflow: hidden }`, the
desktop window centred in the viewport, long content scrolling inside its own
window. About, Links, Work, Notes and Contact are native `<dialog>` elements
opened with `showModal()`, so focus trapping, the inert background and focus
return come from the browser. They drag by their title bar, become full-screen
sheets below 720px, and Work can be maximised.

**One number for time of day.** `--theme-progress` runs 0 (noon) to 1
(midnight) and drives the sky, grass, window paper, ink, accent and the sun's
position along its arc. The paper has two states rather than a continuous fade,
because halfway between cream and navy no ink colour clears 4.5:1 against it.
Field Trip reads the same number for its night tint.

**Hashes name the open window** (`?mode=meadow#/work/sos-lost-found`). They
never create a second page. Reload lands back in the same window; Escape and
the close button clear them.

**The bus.** A pixel bus drives into the meadow, waits by its sign, and goes on.
Clicking it opens Field Trip. It is an explicit state machine — arriving,
parked, departing, cooldown — driven by wall-clock time, so a tab switch cannot
strand it: its speech bubble goes before it does, its click target is disabled
whenever it is not standing at the stop, and reduced motion parks it for good.
It is the only pixel art on the desktop, and it is there to explain why a
hand-drawn desktop leads into a pixel world.

**The village is a shape, not a grid.** `world.js` generates its lanes from
waypoints rather than listing rectangles, so a street can bend without becoming
a staircase; a ring of lanes goes round the green, Market Row runs along the
top, the makers' yard hangs off the west side and a footpath follows the
millpond round the east. Each of those closes, so wandering never dead-ends.
The pond picks its own shore sprite per tile from that tile's four neighbours,
which is why the map file never has to spell out a coastline. Bump `version`
when outdoor coordinates move and old saved positions are discarded rather than
spawning somebody inside a hedge.

**Buildings are places, not buttons.** A door loads that building's interior
as a scene — same engine, same collision, camera and controls — and the player
walks around it. Work is found by inspecting a terminal, a whiteboard, a wall
map or a filing cabinet, not by opening a door. Rooms are declared as data in
`interiors.js` (layout) and `content.js` (what each object says), joined by id,
so adding a room is a data change.

**Field Trip is reachable without walking.** The map directory (`M`, or the
toolbar) opens every room as text and lists the same objects as buttons, so the
professional content never depends on being good at a keyboard. Quests are
cosmetic: contact details, projects and evidence are all reachable without
completing any of them.

**The arcade has no résumé in it.** It holds Cat Courier: a 75-second parcel
run with a score, a combo, a timer and a local high score. Its module, canvas
and loop are separate, load only when somebody walks up to the cabinet, and are
disposed of on exit.

**Audio is opt-in.** No `Audio` object is constructed and no sound file is
requested until sound is switched on. There is no autoplay path in either mode.

**Decoration is deterministic.** Stars, fireflies and the town's grass tufts
come from a fixed seed, so the scene is identical on every load.

## Assets

Original art stays in `assets/images/`. `assets/images/opt/` holds the
derivatives the page loads — cropped to the drawing, resized to display size,
re-encoded. The two large cat animations went from 2.4 MB and 3.9 MB of GIF to
about 11 KB and 19 KB of animated WebP.

The `.gif` beside each cat is the `<picture>` fallback, and it is no longer the
original: the originals were 1000 px square with up to 51 frames, which is 6.4 MB
served to nobody, since every browser that understands `<picture>` also
understands WebP. Each fallback is now rebuilt from its own WebP — same 300 px
box, same frames, same timing, transparency intact — for 252 KB the whole set.
Rebuild them from `assets/images/opt/cat-*.webp` if the art changes.

Field Trip's pixel art is cut from purchased packs by **shubibubi** and the
**Character v.2** pack into three small atlases (town, rooms, characters) by
[`tools/build-field-trip-assets.py`](tools/build-field-trip-assets.py). The
purchased archives are gitignored and never deployed; licence terms and the
exact source rectangles are in
[`assets/field-trip/ATTRIBUTION.md`](assets/field-trip/ATTRIBUTION.md).

## Editing

- Copy, projects, experience, and everything the town says: `js/content.js`.
- Where things stand outdoors: `js/field-trip/world.js`.
- Where things stand indoors: `js/field-trip/interiors.js`.
- Which sprites get cut from the packs: `tools/build-field-trip-assets.py`,
  then re-run it.

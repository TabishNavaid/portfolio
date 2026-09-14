#!/usr/bin/env python3
"""Cut the Field Trip runtime atlases out of the purchased pixel-art packs.

The packs are licensed for use and modification but not for redistribution, so
the archives stay in `assets/images/purchased assets zip/` (gitignored) and only
the two small atlases below ever ship. Every rectangle taken from a pack is
listed here, which makes this file the map back to the originals.

    python3 tools/build-field-trip-assets.py

Writes:
    assets/field-trip/town.png      ground tiles, props and building sprites
    assets/field-trip/chars.png     player walk cycle and standing townsfolk
    assets/field-trip/rooms.png     interior floors, walls and furniture
    assets/field-trip/bus.png       the one sprite Meadow Desktop borrows
    js/field-trip/atlas.js          the frame table the game reads

`assets/field-trip/ATTRIBUTION.md` is written by hand: add a row there when a
new pack or sheet is cut from.
"""

import io
import json
import os
import zipfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKS = os.path.join(ROOT, "assets", "images", "purchased assets zip")
OUT_ASSETS = os.path.join(ROOT, "assets", "field-trip")
OUT_JS = os.path.join(ROOT, "js", "field-trip")

# Matched by prefix: the download names carry narrow no-break spaces and a
# timestamp, and re-downloading the pack changes the timestamp.
ZIPS = {
    "town": "town full",
    "nature": "nature full",
    "farm": "full version.zip",
    "char": "Character v.2",
    "indoor": "Interior full",
}

_cache = {}


def archive(pack):
    prefix = ZIPS[pack]
    for name in sorted(os.listdir(PACKS)):
        if name.endswith(".zip") and name.startswith(prefix):
            return os.path.join(PACKS, name)
    raise SystemExit(f"no archive starting with {prefix!r} in {PACKS}")


def sheet(pack, member):
    key = (pack, member)
    if key not in _cache:
        with zipfile.ZipFile(archive(pack)) as z:
            with z.open(member) as fh:
                _cache[key] = Image.open(io.BytesIO(fh.read())).convert("RGBA")
    return _cache[key]


def cut(pack, member, box):
    return sheet(pack, member).crop((box[0], box[1], box[0] + box[2], box[1] + box[3]))


def tighten(img, threshold=8):
    mask = img.split()[3].point(lambda v: 255 if v > threshold else 0)
    bb = mask.getbbox()
    return img.crop(bb) if bb else img


# --------------------------------------------------------------------------
# town: ground, props, buildings
# --------------------------------------------------------------------------

TILES = "town full/tiles/tiles.png"
BUILDINGS = "town full/buildings/buildings_all.png"
NATURE = "nature full/global.png"
CROPS = "full version/farming/crops.png"
ROBIN = "town full/animals/bird_robin_animations.png"

TOWN_PIECES = [
    # id,            pack,     member,     source rect (x, y, w, h),  tighten
    ("grass", "town", TILES, (16, 16, 16, 16), False),
    ("dirt", "town", TILES, (80, 48, 16, 16), False),
    ("cobble", "town", TILES, (576, 16, 16, 16), False),
    ("paving", "town", TILES, (576, 80, 16, 16), False),
    ("tuft-a", "town", TILES, (0, 48, 16, 16), False),
    ("tuft-b", "town", TILES, (16, 48, 16, 16), False),
    ("tuft-c", "town", TILES, (32, 48, 16, 16), False),
    ("tuft-d", "town", TILES, (48, 48, 16, 16), False),
    ("tuft-e", "town", TILES, (64, 48, 16, 16), False),
    ("chalk-smiley", "town", TILES, (560, 48, 16, 16), False),
    ("chalk-rainbow", "town", TILES, (576, 48, 16, 16), False),
    ("chalk-heart", "town", TILES, (592, 48, 16, 16), False),
    ("chalk-sun", "town", TILES, (608, 48, 16, 16), False),
    ("chalk-cat", "town", TILES, (624, 48, 16, 16), False),
    ("fountain-0", "town", TILES, (4, 260, 38, 28), False),
    ("fountain-1", "town", TILES, (53, 260, 38, 28), False),
    ("fountain-2", "town", TILES, (101, 260, 38, 28), False),
    ("fountain-3", "town", TILES, (149, 260, 38, 28), False),
    ("fountain-4", "town", TILES, (197, 260, 38, 28), False),
    ("lamp", "town", TILES, (321, 257, 15, 31), True),
    ("lamp-twin", "town", TILES, (289, 259, 15, 29), True),
    ("bench-left", "town", TILES, (258, 944, 28, 16), True),
    ("bench-right", "town", TILES, (290, 944, 28, 16), True),
    ("crate", "town", TILES, (432, 449, 32, 31), True),
    ("fence", "town", TILES, (2, 752, 78, 48), True),
    ("fence-post", "town", TILES, (227, 752, 6, 41), True),
    # The bus is x128..205, y816..863. The old cut started four rows high,
    # which dragged in the bench above it, and ran three columns long, which
    # picked up the seam and the nose of the next bus as a blue strip.
    ("bus", "town", TILES, (128, 816, 78, 48), True),
    ("shelter", "town", TILES, (0, 806, 48, 60), True),
    ("bus-sign", "town", TILES, (48, 806, 16, 60), True),
    # buildings, first (summer) variant of each
    ("b-blacksmith", "town", BUILDINGS, (3, 759, 88, 89), True),
    ("b-trailer", "town", BUILDINGS, (4, 1154, 88, 62), True),
    ("b-community", "town", BUILDINGS, (2, 395, 156, 117), True),
    ("b-arcade", "town", BUILDINGS, (4, 90, 90, 86), True),
    ("b-market", "town", BUILDINGS, (4, 945, 167, 127), True),
    ("b-library", "town", BUILDINGS, (6, 651, 149, 101), True),
    ("b-post", "town", BUILDINGS, (5, 292, 85, 92), True),
    ("b-pub", "town", BUILDINGS, (9, 3, 82, 77), True),
    # Three cinema variants sit side by side on a 96px pitch with no gap
    # between them; the roofs only touch at the seam columns (95, 191).
    # 160 sliced one and a half buildings, 191 took two whole ones.
    ("b-cinema", "town", BUILDINGS, (0, 860, 96, 84), True),
    ("b-school", "town", BUILDINGS, (1, 184, 190, 104), True),
    ("b-house", "town", BUILDINGS, (2, 1074, 92, 78), True),
    # greenery, same artist, already used elsewhere on the site
    ("tree-apple", "nature", NATURE, (0, 0, 32, 32), False),
    ("tree-pine", "nature", NATURE, (96, 0, 32, 32), False),
    ("tree-cherry", "nature", NATURE, (64, 32, 32, 32), False),
    ("bush-green", "nature", NATURE, (0, 96, 16, 16), False),
    ("bush-dark", "nature", NATURE, (16, 96, 16, 16), False),
    ("stone", "nature", NATURE, (0, 144, 16, 16), False),
    ("butterfly-orange", "nature", NATURE, (0, 192, 16, 16), False),
    ("butterfly-blue", "nature", NATURE, (64, 192, 16, 16), False),
    ("flower-cream", "farm", CROPS, (16, 400, 16, 16), False),
    ("flower-orange", "farm", CROPS, (16, 432, 16, 16), False),
    ("flower-yellow", "farm", CROPS, (16, 448, 16, 16), False),
    ("flower-blue", "farm", CROPS, (16, 496, 16, 16), False),
    # water. The pack draws ponds as a 3x3 blob plus a 2x2 of inner corners,
    # so thirteen 16x16 cells cover every edge a pond or a stream can have.
    # world.js picks one per tile from its four orthogonal neighbours.
    ("water", "town", TILES, (256, 16, 16, 16), False),
    ("water-n", "town", TILES, (256, 0, 16, 16), False),
    ("water-s", "town", TILES, (256, 32, 16, 16), False),
    ("water-w", "town", TILES, (240, 16, 16, 16), False),
    ("water-e", "town", TILES, (272, 16, 16, 16), False),
    ("water-nw", "town", TILES, (240, 0, 16, 16), False),
    ("water-ne", "town", TILES, (272, 0, 16, 16), False),
    ("water-sw", "town", TILES, (240, 32, 16, 16), False),
    ("water-se", "town", TILES, (272, 32, 16, 16), False),
    # the four quarters of the pack's little round island: each one is a bank
    # cutting into the water from one corner, which is the concave case
    ("water-ine", "town", TILES, (288, 32, 16, 16), False),
    ("water-inw", "town", TILES, (304, 32, 16, 16), False),
    ("water-ise", "town", TILES, (288, 16, 16, 16), False),
    ("water-isw", "town", TILES, (304, 16, 16, 16), False),
    # two crossings: an east-west deck for a north-south stream, and a
    # north-south deck for the brook that feeds the river
    ("bridge-h", "town", TILES, (0, 702, 80, 49), True),
    ("bridge-v", "town", TILES, (1, 627, 46, 77), True),
    # boundaries that are not forest: yards, allotments, the school field
    ("rail-fence", "town", TILES, (4, 430, 36, 18), True),
    ("rail-tall", "town", TILES, (2, 398, 38, 50), True),
    ("picket", "town", TILES, (0, 288, 48, 16), True),
    ("picket-gate", "town", TILES, (96, 288, 32, 16), True),
    # the playground on the school field: somewhere that is plainly not a door
    ("swing", "town", TILES, (0, 456, 50, 56), True),
    ("slide", "town", TILES, (46, 444, 32, 66), True),
    ("spring-bear", "town", TILES, (82, 455, 26, 34), True),
    # a robin that pecks about on the green
    ("robin-0", "town", ROBIN, (0, 32, 16, 16), False),
    ("robin-1", "town", ROBIN, (16, 32, 16, 16), False),
]


# --------------------------------------------------------------------------
# interiors: floors, walls and the furniture the rooms are built from
# --------------------------------------------------------------------------

INSIDE = "town full/interior/interior.png"
PAPER = "interior full/basics/wallpapers.png"
RUGS = "interior full/basics/rugs.png"
CAT = "interior full/pets/cat animation.png"


def tile(col, row):
    """A 16x16 cell out of the wallpaper sheet, by grid position."""
    return (col * 16, row * 16, 16, 16)


ROOM_PIECES = [
    # floors — one per room so no two interiors read the same
    ("floor-wood", "indoor", PAPER, tile(14, 36), False),
    ("floor-oak", "indoor", PAPER, tile(23, 36), False),
    ("floor-teal", "indoor", PAPER, tile(26, 36), False),
    ("floor-tan", "indoor", PAPER, tile(29, 36), False),
    ("floor-slate", "indoor", PAPER, tile(17, 41), False),
    ("floor-marble", "indoor", PAPER, tile(20, 43), False),
    ("floor-green", "indoor", PAPER, tile(32, 41), False),
    ("floor-blue", "indoor", PAPER, tile(26, 41), False),
    ("floor-check", "indoor", PAPER, tile(14, 43), False),
    # walls
    ("wall-cream", "indoor", PAPER, tile(17, 34), False),
    ("wall-grey", "indoor", PAPER, tile(20, 34), False),
    ("wall-red", "indoor", PAPER, tile(29, 34), False),
    ("wall-dark", "indoor", PAPER, tile(32, 34), False),
    ("wall-teal", "indoor", PAPER, tile(23, 34), False),
    ("wall-lilac", "indoor", PAPER, tile(14, 34), False),
    # furniture, all from the Cozy Town interior sheet
    ("bookcase-wide", "town", INSIDE, (320, 17, 64, 31), True),
    ("bookcase", "town", INSIDE, (288, 17, 29, 31), True),
    ("counter-bar", "town", INSIDE, (129, 48, 47, 32), True),
    ("arcade-1", "town", INSIDE, (720, 86, 31, 42), True),
    ("arcade-2", "town", INSIDE, (784, 86, 31, 42), True),
    ("arcade-3", "town", INSIDE, (848, 86, 31, 42), True),
    ("arcade-4", "town", INSIDE, (912, 86, 31, 42), True),
    ("arcade-5", "town", INSIDE, (976, 86, 31, 42), True),
    ("arcade-6", "town", INSIDE, (1104, 134, 31, 42), True),
    ("arcade-sign", "town", INSIDE, (85, 65, 55, 40), True),
    ("pigeonholes", "town", INSIDE, (1777, 177, 45, 31), True),
    ("door-in", "town", INSIDE, (1881, 177, 30, 47), True),
    ("whiteboard", "town", INSIDE, (1376, 224, 64, 38), True),
    ("board-small", "town", INSIDE, (593, 640, 30, 16), True),
    ("board-tiny", "town", INSIDE, (641, 640, 15, 16), True),
    ("desk", "town", INSIDE, (1217, 242, 30, 14), True),
    ("desk-small", "town", INSIDE, (1200, 242, 16, 14), True),
    ("easel", "town", INSIDE, (1585, 242, 15, 30), True),
    ("trophy-case", "town", INSIDE, (558, 256, 40, 38), True),
    ("shelf-crates", "town", INSIDE, (279, 273, 36, 47), True),
    ("shelf-crates-2", "town", INSIDE, (320, 273, 32, 47), True),
    ("shelf-items", "town", INSIDE, (992, 454, 48, 26), True),
    ("shelf-items-2", "town", INSIDE, (1041, 454, 48, 26), True),
    ("cabinet", "town", INSIDE, (358, 281, 35, 23), True),
    ("table-round", "town", INSIDE, (196, 305, 23, 15), True),
    ("terminal", "town", INSIDE, (112, 308, 16, 27), True),
    ("aquarium", "town", INSIDE, (288, 363, 47, 21), True),
    ("counter-long", "town", INSIDE, (1678, 428, 56, 29), True),
    ("counter-blue", "town", INSIDE, (960, 206, 64, 18), True),
    ("machines", "town", INSIDE, (1696, 217, 63, 33), True),
    ("sofa", "town", INSIDE, (240, 449, 31, 15), True),
    ("sofa-red", "town", INSIDE, (435, 746, 44, 22), True),
    ("armchair", "town", INSIDE, (325, 449, 22, 19), True),
    ("plant", "town", INSIDE, (1840, 433, 16, 15), True),
    ("forge", "town", INSIDE, (596, 672, 25, 32), True),
    ("anvil", "town", INSIDE, (195, 674, 24, 14), True),
    ("window-in", "town", INSIDE, (150, 712, 35, 37), True),
    ("shop-shelf", "town", INSIDE, (1013, 812, 38, 17), True),
    ("shop-shelf-2", "town", INSIDE, (1109, 812, 38, 17), True),
    ("shop-shelf-3", "town", INSIDE, (1200, 844, 32, 17), True),
    ("shop-narrow", "town", INSIDE, (1152, 876, 16, 17), True),
    ("workbench", "town", INSIDE, (640, 918, 32, 26), True),
    ("chair", "town", INSIDE, (424, 925, 17, 19), True),
    ("curtains", "town", INSIDE, (118, 945, 37, 22), True),
    ("art-easel", "town", INSIDE, (577, 951, 14, 25), True),
    ("crate-box", "town", INSIDE, (388, 1016, 24, 24), True),
    ("bin", "town", INSIDE, (368, 1013, 16, 27), True),
    ("tv", "town", INSIDE, (517, 1019, 22, 21), True),
    # rugs come from the interior pack: the cozy-town sheet has none, and the
    # rectangle that used to be cut here was empty, so the rug never drew.
    ("rug-long", "indoor", RUGS, (48, 64, 48, 32), True),
    ("rug-blue", "indoor", RUGS, (144, 64, 48, 32), True),
    ("rug-green", "town", INSIDE, (2177, 194, 47, 29), True),
    ("poster-a", "town", INSIDE, (1446, 240, 21, 22), True),
    ("poster-b", "town", INSIDE, (1478, 240, 21, 22), True),
    ("poster-c", "town", INSIDE, (1510, 240, 21, 22), True),
    ("poster-d", "town", INSIDE, (1058, 225, 27, 27), True),
    ("frame", "town", INSIDE, (866, 240, 28, 16), True),
    ("sign-stand", "town", INSIDE, (545, 951, 14, 41), True),
    ("stool", "town", INSIDE, (2144, 240, 15, 16), True),
    # the cat who turns up in the square once the town has been walked
    ("cat-0", "indoor", CAT, (0, 72, 18, 18), False),
    ("cat-1", "indoor", CAT, (18, 72, 18, 18), False),
]


# --------------------------------------------------------------------------
# characters: layered 32x32, eight walk frames per direction
# --------------------------------------------------------------------------

CHAR_LAYERS = ["skin", "eyes", "shirt", "pants", "shoes", "hair", "acc"]

#            skin  eyes shirt              pants shoes hair                 acc
CAST = {
    # dark curly hair and glasses, to echo the drawn character on the desktop
    "tabish": ("char1.png", 0, ("basic.png", 8), 0, 0, ("curly.png", 0), "glasses.png"),
    "npc-a": ("char4.png", 3, ("stripe.png", 2), 1, 1, ("long_straight .png", 2), None),
    "npc-b": ("char6.png", 5, ("sporty.png", 4), 3, 0, ("buzzcut.png", 3), None),
    "npc-c": ("char2.png", 6, ("floral.png", 6), 2, 1, ("braids.png", 1), None),
}

CELL = 256  # every layer sheet is a row of 256px-wide colour variants


def compose(recipe, box):
    skin, eye, (shirt, shirt_i), pant_i, shoe_i, (hair, hair_i), acc = recipe
    x, y, w, h = box
    out = cut("char", "Character v.2/characters/" + skin, box)
    def layer(member, variant):
        return cut("char", member, (variant * CELL + x, y, w, h))
    out.alpha_composite(layer("Character v.2/eyes/eyes.png", eye))
    out.alpha_composite(layer("Character v.2/clothes/" + shirt, shirt_i))
    out.alpha_composite(layer("Character v.2/clothes/pants.png", pant_i))
    out.alpha_composite(layer("Character v.2/clothes/shoes.png", shoe_i))
    out.alpha_composite(layer("Character v.2/hair/" + hair, hair_i))
    if acc:
        out.alpha_composite(layer("Character v.2/acc/" + acc, 0))
    return out


def recolour_shirt(img, mapping):
    """Nudge the shirt into the site's orange. Licensed: modification is allowed."""
    px = img.load()
    w, h = img.size
    for yy in range(h):
        for xx in range(w):
            r, g, b, a = px[xx, yy]
            if a and (r, g, b) in mapping:
                px[xx, yy] = mapping[(r, g, b)] + (a,)
    return img


# --------------------------------------------------------------------------
# packing
# --------------------------------------------------------------------------

def footprints(pieces, threshold=0.30):
    """Per-tile collision masks, read off each sprite's own alpha.

    A building's frame is a rectangle; a building is not. The community
    centre's frame is 37% air, and marking that whole rectangle solid puts an
    invisible wall across the gap beside its conservatory. So every sprite
    carries a grid of 16px cells instead, and a cell is solid only when the
    art actually covers `threshold` of it. Roof corners, the notch between the
    cinema's two reels and the sloped eaves all become walkable, which is what
    they look like.
    """
    out = {}
    for name, img in pieces:
        w, h = img.size
        if w <= 16 and h <= 16:
            continue
        alpha = img.split()[3]
        cols = -(-w // 16)
        rows = -(-h // 16)
        grid = []
        for ty in range(rows):
            line = ""
            for tx in range(cols):
                box = alpha.crop((tx * 16, ty * 16, min(tx * 16 + 16, w), min(ty * 16 + 16, h)))
                cells = box.size[0] * box.size[1]
                covered = sum(1 for v in box.getdata() if v > 8)
                line += "1" if cells and covered / cells >= threshold else "0"
            grid.append(line)
        if any("1" in row for row in grid):
            out[name] = grid
    return out


def pack(pieces, width, pad=1):
    """Shelf packer. Returns (image, {name: [x, y, w, h]})."""
    pieces = sorted(pieces, key=lambda p: -p[1].size[1])
    frames = {}
    x = y = row_h = 0
    placed = []
    for name, img in pieces:
        w, h = img.size
        if x + w + pad > width:
            x = 0
            y += row_h + pad
            row_h = 0
        placed.append((name, img, x, y))
        frames[name] = [x, y, w, h]
        x += w + pad
        row_h = max(row_h, h)
    total_h = y + row_h
    out = Image.new("RGBA", (width, total_h), (0, 0, 0, 0))
    for name, img, px, py in placed:
        out.paste(img, (px, py))
    return out, frames


def main():
    os.makedirs(OUT_ASSETS, exist_ok=True)
    os.makedirs(OUT_JS, exist_ok=True)

    town = []
    for name, pk, member, box, tight in TOWN_PIECES:
        img = cut(pk, member, box)
        if tight:
            img = tighten(img)
        town.append((name, img))
    town_img, town_frames = pack(town, 512)
    town_solid = footprints(town)

    chars = []
    # the player: all eight walk frames for each of the four directions
    walk = compose(CAST["tabish"], (0, 0, 256, 128))
    walk = recolour_shirt(walk, {
        (150, 60, 52): (176, 84, 44),
        (176, 78, 66): (207, 106, 56),
        (120, 46, 42): (140, 63, 34),
    })
    chars.append(("tabish", walk))
    # Townsfolk walk a short beat around where they are placed, so they need
    # the same eight frames per direction the player has.
    for who in ("npc-a", "npc-b", "npc-c"):
        chars.append((who, compose(CAST[who], (0, 0, 256, 128))))
    chars_img, char_frames = pack(chars, 512)

    room = []
    for name, pk, member, box, tight in ROOM_PIECES:
        img = cut(pk, member, box)
        if tight:
            img = tighten(img)
        room.append((name, img))
    room_img, room_frames = pack(room, 448)
    room_solid = footprints(room)

    town_img.save(os.path.join(OUT_ASSETS, "town.png"), optimize=True)
    chars_img.save(os.path.join(OUT_ASSETS, "chars.png"), optimize=True)

    # The one sprite Meadow Desktop borrows: the bus that parks in the grass
    # and opens Field Trip. Standalone so the desktop never pulls the atlas.
    bus = dict(town)["bus"]
    bus.save(os.path.join(OUT_ASSETS, "bus.png"), optimize=True)

    room_img.save(os.path.join(OUT_ASSETS, "rooms.png"), optimize=True)

    atlas = {
        "town": {"file": "assets/field-trip/town.png", "width": town_img.size[0],
                 "height": town_img.size[1], "frames": town_frames,
                 "solid": town_solid},
        "chars": {"file": "assets/field-trip/chars.png", "width": chars_img.size[0],
                  "height": chars_img.size[1], "frames": char_frames},
        "rooms": {"file": "assets/field-trip/rooms.png", "width": room_img.size[0],
                  "height": room_img.size[1], "frames": room_frames,
                  "solid": room_solid},
        "tile": 16,
        "charFrame": [32, 32],
        "walkFrames": 8,
        "dirRows": {"down": 0, "up": 1, "right": 2, "left": 3},
    }
    with open(os.path.join(OUT_JS, "atlas.js"), "w") as fh:
        fh.write("/* Generated by tools/build-field-trip-assets.py. Do not edit by hand. */\n")
        fh.write("window.FIELD_TRIP_ATLAS = ")
        fh.write(json.dumps(atlas, indent=2, sort_keys=True))
        fh.write(";\n")

    print("town.png ", town_img.size, len(town_frames), "frames,", len(town_solid), "footprints")
    print("chars.png", chars_img.size, len(char_frames), "frames")
    print("rooms.png", room_img.size, len(room_frames), "frames")


if __name__ == "__main__":
    main()

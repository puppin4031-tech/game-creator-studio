import os, struct, zlib, math

OUTPUT_DIR = "/Users/gim-euntaeg/.gemini/antigravity/scratch/game-creator-studio/src/assets/survival"

def create_canvas(w=32, h=32):
    return [[(0, 0, 0, 0) for _ in range(w)] for _ in range(h)]

def set_pixel(c, x, y, color):
    if 0 <= x < 32 and 0 <= y < 32 and color[3] > 0:
        c[y][x] = color

def fill_rect(c, x, y, w, h, color):
    for j in range(y, y + h):
        for i in range(x, x + w):
            set_pixel(c, i, j, color)

def fill_circle(c, cx, cy, r, color):
    for y in range(int(cy - r), int(cy + r + 1)):
        for x in range(int(cx - r), int(cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2:
                set_pixel(c, x, y, color)

def draw_outline(c, outline_color=(43, 29, 20, 255)):
    # Find all transparent pixels adjacent to opaque pixels
    new_c = [row[:] for row in c]
    for y in range(32):
        for x in range(32):
            if c[y][x][3] == 0:
                has_neighbor = False
                for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < 32 and 0 <= nx < 32 and c[ny][nx][3] > 100:
                        has_neighbor = True
                        break
                if has_neighbor:
                    new_c[y][x] = outline_color
    return new_c

def save_png(canvas, filename):
    w, h = 32, 32
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            r, g, b, a = canvas[y][x]
            raw.extend([r, g, b, a])
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    out_path = os.path.join(OUTPUT_DIR, filename)
    with open(out_path, 'wb') as f:
        f.write(sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b''))
    print(f"Saved: {filename}")

# ── 1. Coal (석탄) ──
def gen_coal():
    c = create_canvas()
    fill_circle(c, 16, 17, 10, (30, 28, 26, 255))
    fill_circle(c, 12, 14, 7, (45, 42, 38, 255))
    fill_circle(c, 20, 15, 6, (40, 36, 33, 255))
    fill_rect(c, 11, 11, 4, 3, (80, 75, 70, 255))
    fill_rect(c, 12, 12, 2, 2, (120, 115, 110, 255))
    fill_rect(c, 18, 12, 3, 2, (70, 65, 60, 255))
    fill_rect(c, 14, 18, 5, 4, (35, 32, 30, 255))
    return draw_outline(c)

# ── 2. Limestone (석회석) ──
def gen_limestone():
    c = create_canvas()
    fill_circle(c, 16, 16, 11, (168, 162, 158, 255))
    # Stratified layers
    for y, w_off in [(10, 6), (14, 8), (18, 9), (22, 6)]:
        fill_rect(c, 16 - w_off, y, w_off * 2, 2, (214, 211, 209, 255))
    fill_rect(c, 12, 9, 6, 3, (245, 245, 244, 255))
    fill_rect(c, 13, 10, 3, 2, (255, 255, 255, 255))
    fill_rect(c, 10, 16, 12, 2, (120, 113, 108, 255))
    return draw_outline(c)

# ── 3. Sulfur (유황) ──
def gen_sulfur():
    c = create_canvas()
    # Yellow crystal needles
    for dx, dy, h, w in [(-5, -2, 14, 5), (0, -6, 18, 6), (5, -3, 15, 5), (-2, 2, 10, 4), (4, 3, 9, 4)]:
        fill_rect(c, 16 + dx, 16 + dy - h//2, w, h, (202, 138, 4, 255))
        fill_rect(c, 16 + dx + 1, 16 + dy - h//2 + 1, w - 2, h - 3, (234, 179, 8, 255))
        fill_rect(c, 16 + dx + 1, 16 + dy - h//2 + 1, 1, h - 5, (250, 204, 21, 255))
        fill_pixel = (254, 240, 138, 255)
        set_pixel(c, 16 + dx + 1, 16 + dy - h//2 + 1, fill_pixel)
    return draw_outline(c, (113, 63, 18, 255))

# ── 4. Copper Ore (구리 원석) ──
def gen_copper_ore():
    c = create_canvas()
    fill_circle(c, 16, 16, 11, (80, 50, 35, 255))
    fill_circle(c, 15, 15, 8, (180, 83, 9, 255))
    # Green oxidation veins (malachite)
    fill_rect(c, 11, 11, 4, 3, (13, 148, 136, 255))
    fill_rect(c, 12, 12, 2, 2, (45, 212, 191, 255))
    fill_rect(c, 17, 16, 5, 3, (13, 148, 136, 255))
    fill_rect(c, 18, 17, 3, 2, (45, 212, 191, 255))
    # Metallic copper gleam
    fill_rect(c, 14, 9, 3, 3, (245, 158, 11, 255))
    fill_rect(c, 15, 10, 2, 2, (254, 215, 170, 255))
    return draw_outline(c)

# ── 5. Tin Ore (주석 원석) ──
def gen_tin_ore():
    c = create_canvas()
    fill_circle(c, 16, 16, 10, (71, 85, 105, 255))
    fill_circle(c, 14, 14, 7, (148, 163, 184, 255))
    fill_circle(c, 19, 17, 6, (100, 116, 139, 255))
    fill_rect(c, 11, 10, 5, 4, (203, 213, 225, 255))
    fill_rect(c, 12, 11, 3, 2, (241, 245, 249, 255))
    fill_rect(c, 18, 14, 3, 2, (203, 213, 225, 255))
    return draw_outline(c)

# ── 6. Silver Ore (은광석) ──
def gen_silver_ore():
    c = create_canvas()
    fill_circle(c, 16, 16, 11, (51, 65, 85, 255))
    fill_rect(c, 10, 8, 8, 10, (148, 163, 184, 255))
    fill_rect(c, 16, 11, 8, 9, (148, 163, 184, 255))
    # Sparkling crystal facets
    fill_rect(c, 11, 9, 5, 5, (226, 232, 240, 255))
    fill_rect(c, 12, 10, 2, 2, (255, 255, 255, 255))
    fill_rect(c, 17, 12, 5, 4, (226, 232, 240, 255))
    fill_rect(c, 18, 13, 2, 2, (255, 255, 255, 255))
    return draw_outline(c)

# ── 7. Gold Ore (사금 · 금광석) ──
def gen_gold_ore():
    c = create_canvas()
    fill_circle(c, 16, 17, 11, (68, 64, 60, 255))
    # Embedded gold nuggets
    for x, y, r in [(12, 12, 4), (19, 14, 5), (14, 20, 4), (19, 21, 3)]:
        fill_circle(c, x, y, r, (180, 83, 9, 255))
        fill_circle(c, x, y, r - 1, (245, 158, 11, 255))
        fill_rect(c, x - 1, y - 1, 2, 2, (253, 224, 71, 255))
        set_pixel(c, x, y - 1, (255, 255, 255, 255))
    return draw_outline(c)

# ── 8. Magnetite (자철석) ──
def gen_magnetite():
    c = create_canvas()
    # Octahedral crystal shape
    for y in range(7, 26):
        w = 19 - abs(16 - y)
        fill_rect(c, 16 - w//2, y, w, 1, (30, 41, 59, 255))
    for y in range(9, 24):
        w = 15 - abs(16 - y)
        fill_rect(c, 15 - w//2, y, w, 1, (51, 65, 85, 255))
    fill_rect(c, 12, 11, 4, 4, (100, 116, 139, 255))
    fill_rect(c, 13, 12, 2, 2, (148, 163, 184, 255))
    return draw_outline(c)

# ── 9. Mana Stone (마력석) ──
def gen_mana_stone():
    c = create_canvas()
    # Glowing violet polygon
    for y in range(6, 27):
        w = 17 - int(abs(16 - y) * 1.1)
        if w > 0:
            fill_rect(c, 16 - w//2, y, w, 1, (107, 33, 168, 255))
    for y in range(8, 25):
        w = 13 - int(abs(16 - y) * 1.1)
        if w > 0:
            fill_rect(c, 15 - w//2, y, w, 1, (168, 85, 247, 255))
    fill_rect(c, 12, 10, 5, 5, (216, 180, 254, 255))
    fill_rect(c, 13, 11, 2, 2, (255, 255, 255, 255))
    return draw_outline(c, (59, 7, 100, 255))

# ── 10. Meteor Shard (운석 파편) ──
def gen_meteor_shard():
    c = create_canvas()
    fill_circle(c, 16, 16, 10, (24, 24, 27, 255))
    # Molten red/orange glowing cracks
    fill_rect(c, 10, 12, 6, 2, (185, 28, 28, 255))
    fill_rect(c, 12, 13, 4, 1, (239, 68, 68, 255))
    fill_rect(c, 14, 14, 7, 2, (249, 115, 22, 255))
    fill_rect(c, 16, 15, 4, 1, (253, 224, 71, 255))
    fill_rect(c, 11, 18, 5, 2, (185, 28, 28, 255))
    return draw_outline(c, (69, 10, 10, 255))

# ── 11. Charcoal (목탄) ──
def gen_charcoal():
    c = create_canvas()
    # Cylindrical charred branch block
    fill_rect(c, 8, 10, 16, 13, (39, 39, 42, 255))
    fill_circle(c, 24, 16, 6, (24, 24, 27, 255))
    # Ember glow on tip
    fill_circle(c, 8, 16, 4, (194, 65, 12, 255))
    fill_circle(c, 8, 16, 2, (249, 115, 22, 255))
    set_pixel(c, 8, 16, (254, 240, 138, 255))
    return draw_outline(c)

# ── 12. Copper Ingot (구리 주괴) ──
def gen_copper_ingot():
    c = create_canvas()
    # Ingot bar trapezoid
    for y in range(11, 23):
        w = 20 - int((y - 11) * 0.4)
        fill_rect(c, 16 - w//2, y, w, 1, (180, 83, 9, 255))
    # Top face bevel
    fill_rect(c, 7, 12, 18, 4, (245, 158, 11, 255))
    fill_rect(c, 8, 12, 15, 2, (254, 215, 170, 255))
    return draw_outline(c, (120, 53, 15, 255))

# ── 13. Bronze Ingot (청동 주괴) ──
def gen_bronze_ingot():
    c = create_canvas()
    for y in range(11, 23):
        w = 20 - int((y - 11) * 0.4)
        fill_rect(c, 16 - w//2, y, w, 1, (161, 98, 7, 255))
    fill_rect(c, 7, 12, 18, 4, (217, 119, 6, 255))
    fill_rect(c, 8, 12, 15, 2, (253, 230, 138, 255))
    return draw_outline(c, (113, 63, 18, 255))

# ── 14. Steel Ingot (강철 주괴) ──
def gen_steel_ingot():
    c = create_canvas()
    for y in range(11, 23):
        w = 20 - int((y - 11) * 0.4)
        fill_rect(c, 16 - w//2, y, w, 1, (71, 85, 105, 255))
    fill_rect(c, 7, 12, 18, 4, (148, 163, 184, 255))
    fill_rect(c, 8, 12, 15, 2, (241, 245, 249, 255))
    return draw_outline(c, (30, 41, 59, 255))

# ── 15. Arrow (화살) ──
def gen_arrow():
    c = create_canvas()
    # Diagonal shaft from (8, 24) to (24, 8)
    for i in range(17):
        set_pixel(c, 8 + i, 24 - i, (120, 75, 40, 255))
        set_pixel(c, 8 + i + 1, 24 - i, (92, 56, 30, 255))
    # Stone Arrowhead at (23, 9)
    fill_rect(c, 21, 6, 5, 5, (100, 116, 139, 255))
    fill_rect(c, 23, 5, 4, 4, (148, 163, 184, 255))
    set_pixel(c, 26, 5, (226, 232, 240, 255))
    # Fletching feathers at (7, 25)
    fill_rect(c, 6, 23, 3, 3, (239, 68, 68, 255))
    fill_rect(c, 7, 26, 3, 3, (248, 250, 252, 255))
    return draw_outline(c)

# ── 16. Sling Stone (돌멩이 탄환) ──
def gen_sling_stone():
    c = create_canvas()
    # Three rounded polished sling stones
    fill_circle(c, 12, 18, 5, (120, 113, 108, 255))
    fill_rect(c, 10, 16, 3, 2, (214, 211, 209, 255))
    fill_circle(c, 20, 18, 5, (100, 95, 90, 255))
    fill_rect(c, 19, 16, 3, 2, (190, 185, 180, 255))
    fill_circle(c, 16, 12, 5, (140, 135, 130, 255))
    fill_rect(c, 15, 10, 3, 2, (230, 225, 220, 255))
    return draw_outline(c)

# ── 17. Coconut (야자 열매) ──
def gen_coconut():
    c = create_canvas()
    fill_circle(c, 16, 16, 10, (113, 63, 18, 255))
    fill_circle(c, 15, 15, 8, (146, 64, 14, 255))
    fill_rect(c, 11, 10, 4, 3, (180, 83, 9, 255))
    # 3 eye dots
    set_pixel(c, 14, 18, (69, 26, 3, 255))
    set_pixel(c, 18, 18, (69, 26, 3, 255))
    set_pixel(c, 16, 21, (69, 26, 3, 255))
    return draw_outline(c)

# ── 18. Spoiled Food (상한 음식) ──
def gen_spoiled_food():
    c = create_canvas()
    fill_circle(c, 16, 17, 9, (60, 50, 40, 255))
    # Green and purple mold patches
    fill_circle(c, 13, 15, 5, (22, 101, 52, 255))
    fill_circle(c, 14, 14, 3, (34, 197, 94, 255))
    fill_circle(c, 19, 16, 4, (88, 28, 135, 255))
    fill_circle(c, 18, 15, 2, (147, 51, 234, 255))
    # Green spore mist
    set_pixel(c, 12, 9, (74, 222, 128, 255))
    set_pixel(c, 19, 10, (74, 222, 128, 255))
    return draw_outline(c, (20, 83, 45, 255))

# ── 19. Wild Spice (야생 향신초) ──
def gen_wild_spice():
    c = create_canvas()
    # Leaf bunch
    fill_circle(c, 12, 13, 5, (21, 128, 61, 255))
    fill_circle(c, 19, 12, 5, (22, 163, 74, 255))
    fill_circle(c, 16, 17, 5, (34, 197, 94, 255))
    fill_rect(c, 11, 11, 2, 2, (134, 239, 172, 255))
    fill_rect(c, 18, 11, 2, 2, (134, 239, 172, 255))
    # Twine tie
    fill_rect(c, 14, 21, 4, 3, (180, 83, 9, 255))
    return draw_outline(c)

# ── 20. Rock Salt (암염 결정) ──
def gen_rock_salt():
    c = create_canvas()
    # Hexagonal pink crystal block
    fill_rect(c, 8, 9, 16, 15, (225, 29, 72, 255))
    fill_rect(c, 9, 10, 14, 13, (244, 63, 94, 255))
    fill_rect(c, 11, 11, 10, 9, (251, 113, 133, 255))
    fill_rect(c, 12, 12, 5, 4, (255, 241, 242, 255))
    fill_rect(c, 13, 13, 2, 2, (255, 255, 255, 255))
    return draw_outline(c, (159, 18, 57, 255))

# ── 21. Pepper Berry (매운 후추열매) ──
def gen_pepper_berry():
    c = create_canvas()
    # Green stem
    fill_rect(c, 15, 6, 2, 6, (22, 101, 52, 255))
    # 3 red hot berries
    fill_circle(c, 12, 15, 5, (185, 28, 28, 255))
    fill_rect(c, 11, 13, 2, 2, (248, 113, 113, 255))
    fill_circle(c, 19, 16, 5, (220, 38, 38, 255))
    fill_rect(c, 18, 14, 2, 2, (248, 113, 113, 255))
    fill_circle(c, 15, 22, 4, (185, 28, 28, 255))
    fill_rect(c, 14, 20, 2, 2, (248, 113, 113, 255))
    return draw_outline(c)

# ── 22. Bone Stew (뼈 고기 스튜) ──
def gen_bone_stew():
    c = create_canvas()
    # Clay pot
    fill_circle(c, 16, 20, 9, (146, 64, 14, 255))
    # Golden broth surface
    fill_rect(c, 9, 14, 14, 5, (217, 119, 6, 255))
    fill_rect(c, 11, 15, 10, 3, (251, 191, 36, 255))
    # Marrow bone sticking out
    fill_rect(c, 18, 7, 4, 9, (245, 245, 244, 255))
    fill_circle(c, 20, 6, 2, (255, 255, 255, 255))
    # Steam puffs
    set_pixel(c, 12, 8, (255, 255, 255, 200))
    set_pixel(c, 14, 6, (255, 255, 255, 200))
    return draw_outline(c)

# ── 23. Spice Roast (향신료 통고기 구이) ──
def gen_spice_roast():
    c = create_canvas()
    # Roast meat haunch
    fill_circle(c, 18, 16, 8, (124, 45, 18, 255))
    fill_circle(c, 17, 15, 6, (194, 65, 12, 255))
    fill_rect(c, 15, 13, 4, 3, (249, 115, 22, 255))
    fill_rect(c, 16, 14, 2, 2, (254, 240, 138, 255))
    # Bone handle
    fill_rect(c, 7, 18, 6, 3, (245, 245, 244, 255))
    fill_circle(c, 6, 19, 2, (255, 255, 255, 255))
    # Spice seasoning flecks
    set_pixel(c, 14, 16, (22, 101, 52, 255))
    set_pixel(c, 19, 13, (220, 38, 38, 255))
    return draw_outline(c)

# ── 24. Shell Currency (조개 화폐) ──
def gen_shell():
    c = create_canvas()
    fill_circle(c, 16, 16, 9, (217, 119, 6, 255))
    fill_circle(c, 16, 16, 7, (254, 215, 170, 255))
    # Shell ribs
    fill_rect(c, 11, 14, 2, 5, (253, 230, 138, 255))
    fill_rect(c, 15, 12, 2, 8, (253, 230, 138, 255))
    fill_rect(c, 19, 14, 2, 5, (253, 230, 138, 255))
    fill_rect(c, 15, 13, 2, 2, (255, 255, 255, 255))
    return draw_outline(c)

# ── 25. Taming Snare (가죽 올가미) ──
def gen_taming_snare():
    c = create_canvas()
    # Rope loop
    fill_circle(c, 16, 14, 7, (146, 64, 14, 255))
    fill_circle(c, 16, 14, 5, (0, 0, 0, 0)) # hollow center
    # Knot and tail
    fill_rect(c, 14, 20, 4, 3, (180, 83, 9, 255))
    fill_rect(c, 15, 23, 3, 5, (120, 53, 15, 255))
    # Bone slip toggle
    fill_rect(c, 14, 19, 4, 2, (245, 245, 244, 255))
    return draw_outline(c)

# ── 26. Frost Shard (빙결석 조각) ──
def gen_frost_shard():
    c = create_canvas()
    # Blue crystal icicle
    for y in range(6, 27):
        w = 14 - int(abs(16 - y) * 0.9)
        if w > 0:
            fill_rect(c, 16 - w//2, y, w, 1, (2, 132, 199, 255))
    for y in range(8, 25):
        w = 10 - int(abs(16 - y) * 0.9)
        if w > 0:
            fill_rect(c, 15 - w//2, y, w, 1, (56, 189, 248, 255))
    fill_rect(c, 13, 10, 4, 6, (186, 230, 253, 255))
    fill_rect(c, 14, 11, 2, 3, (255, 255, 255, 255))
    return draw_outline(c, (12, 74, 110, 255))

# ── 27. Frost Pelt (혹한의 모피) ──
def gen_frost_pelt():
    c = create_canvas()
    fill_circle(c, 16, 16, 10, (148, 163, 184, 255))
    fill_circle(c, 15, 15, 8, (226, 232, 240, 255))
    fill_rect(c, 12, 12, 6, 5, (248, 250, 252, 255))
    # Blue ice sparkles
    set_pixel(c, 10, 11, (56, 189, 248, 255))
    set_pixel(c, 21, 13, (56, 189, 248, 255))
    set_pixel(c, 15, 20, (56, 189, 248, 255))
    return draw_outline(c, (30, 41, 59, 255))

SPRITES = {
    'item-coal.png': gen_coal,
    'item-limestone.png': gen_limestone,
    'item-sulfur.png': gen_sulfur,
    'item-copper-ore.png': gen_copper_ore,
    'item-tin-ore.png': gen_tin_ore,
    'item-silver-ore.png': gen_silver_ore,
    'item-gold-ore.png': gen_gold_ore,
    'item-magnetite.png': gen_magnetite,
    'item-mana-stone.png': gen_mana_stone,
    'item-meteor-shard.png': gen_meteor_shard,
    'item-charcoal.png': gen_charcoal,
    'item-copper-ingot.png': gen_copper_ingot,
    'item-bronze-ingot.png': gen_bronze_ingot,
    'item-steel-ingot.png': gen_steel_ingot,
    'item-arrow.png': gen_arrow,
    'item-sling-stone.png': gen_sling_stone,
    'item-coconut.png': gen_coconut,
    'item-spoiled-food.png': gen_spoiled_food,
    'item-wild-spice.png': gen_wild_spice,
    'item-rock-salt.png': gen_rock_salt,
    'item-pepper-berry.png': gen_pepper_berry,
    'item-bone-stew.png': gen_bone_stew,
    'item-spice-roast.png': gen_spice_roast,
    'item-shell.png': gen_shell,
    'item-taming-snare.png': gen_taming_snare,
    'item-frost-shard.png': gen_frost_shard,
    'item-frost-pelt.png': gen_frost_pelt,
}

for name, fn in SPRITES.items():
    img = fn()
    save_png(img, name)

print(f"Generated {len(SPRITES)} pixel art items successfully!")

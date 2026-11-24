import os, struct, zlib, math

OUTPUT_DIR = "/Users/gim-euntaeg/.gemini/antigravity/scratch/game-creator-studio/src/assets/survival"

def create_canvas(w=32, h=32):
    return [[(0, 0, 0, 0) for _ in range(w)] for _ in range(h)]

def set_pixel(c, x, y, color):
    w, h = len(c[0]), len(c)
    if 0 <= x < w and 0 <= y < h and color[3] > 0:
        c[y][x] = color

def fill_rect(c, x, y, rw, rh, color):
    for j in range(y, y + rh):
        for i in range(x, x + rw):
            set_pixel(c, i, j, color)

def fill_circle(c, cx, cy, r, color):
    for y in range(int(cy - r), int(cy + r + 1)):
        for x in range(int(cx - r), int(cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2:
                set_pixel(c, x, y, color)

def draw_outline(c, outline_color=(43, 29, 20, 255)):
    w, h = len(c[0]), len(c)
    new_c = [row[:] for row in c]
    for y in range(h):
        for x in range(w):
            if c[y][x][3] == 0:
                has_neighbor = False
                for dy, dx in [(-1,0), (1,0), (0,-1), (0,1)]:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and c[ny][nx][3] > 100:
                        has_neighbor = True
                        break
                if has_neighbor:
                    new_c[y][x] = outline_color
    return new_c

def save_png(canvas, filename):
    h = len(canvas)
    w = len(canvas[0])
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
    print(f"Saved: {filename} ({w}x{h})")

# ══════════════════════════════════════════════
# HUD SPECIFIC ICONS (1:1 Reference Match)
# ══════════════════════════════════════════════

# 1. UI Backpack (32x32) - Chunky leather satchel
def gen_ui_backpack():
    c = create_canvas(32, 32)
    # Body
    fill_rect(c, 7, 10, 18, 16, (146, 64, 14, 255))
    fill_rect(c, 8, 11, 16, 14, (180, 83, 9, 255))
    fill_rect(c, 9, 12, 14, 12, (217, 119, 6, 255))
    # Top Flap
    fill_rect(c, 6, 8, 20, 7, (120, 53, 15, 255))
    fill_rect(c, 7, 9, 18, 5, (146, 64, 14, 255))
    fill_rect(c, 8, 10, 16, 3, (180, 83, 9, 255))
    # Flap Point / Tongue
    fill_rect(c, 13, 14, 6, 4, (120, 53, 15, 255))
    fill_rect(c, 14, 15, 4, 3, (146, 64, 14, 255))
    # Golden Buckle
    fill_rect(c, 14, 15, 4, 3, (245, 158, 11, 255))
    fill_rect(c, 15, 16, 2, 1, (254, 240, 138, 255))
    # Side Straps & Stitches
    for y in [12, 16, 20]:
        fill_rect(c, 10, y, 2, 2, (254, 215, 170, 255))
        fill_rect(c, 20, y, 2, 2, (254, 215, 170, 255))
    # Handle on top
    fill_rect(c, 12, 5, 8, 3, (120, 53, 15, 255))
    fill_rect(c, 14, 6, 4, 2, (0, 0, 0, 0))
    # Subtle bottom shadow
    fill_rect(c, 9, 24, 14, 2, (92, 40, 10, 255))
    return draw_outline(c)

# 2. UI Dino Egg (32x32) - Speckled pale teal/green egg
def gen_ui_egg():
    c = create_canvas(32, 32)
    # Oval Egg Body
    fill_circle(c, 16, 18, 10, (167, 243, 208, 255))
    fill_circle(c, 16, 13, 8, (167, 243, 208, 255))
    fill_circle(c, 16, 10, 5, (167, 243, 208, 255))
    # Base inner tone
    fill_circle(c, 15, 16, 8, (209, 250, 229, 255))
    fill_circle(c, 15, 12, 6, (209, 250, 229, 255))
    # Highlight gleam
    fill_circle(c, 13, 12, 3, (255, 255, 255, 255))
    set_pixel(c, 12, 11, (255, 255, 255, 255))
    # Prehistoric Green/Teal Speckles
    speckles = [(11, 16), (18, 13), (19, 19), (14, 22), (20, 23), (12, 21), (17, 9)]
    for sx, sy in speckles:
        fill_rect(c, sx, sy, 2, 2, (52, 211, 153, 255))
        set_pixel(c, sx, sy, (16, 185, 129, 255))
    # Bottom shading
    fill_circle(c, 16, 25, 6, (110, 231, 183, 255))
    return draw_outline(c, (15, 76, 50, 255))

# 3. UI Campfire (32x32) - Crossed logs with roaring flame
def gen_ui_campfire():
    c = create_canvas(32, 32)
    # Crossed Wood Logs at base
    # Left log
    for i in range(12):
        set_pixel(c, 7 + i, 27 - i // 3, (120, 53, 15, 255))
        set_pixel(c, 7 + i, 26 - i // 3, (180, 83, 9, 255))
        set_pixel(c, 7 + i, 25 - i // 3, (146, 64, 14, 255))
    # Right log
    for i in range(12):
        set_pixel(c, 24 - i, 27 - i // 3, (120, 53, 15, 255))
        set_pixel(c, 24 - i, 26 - i // 3, (180, 83, 9, 255))
        set_pixel(c, 24 - i, 25 - i // 3, (146, 64, 14, 255))
    # Stone Ring Base
    for sx, sy in [(6, 27), (10, 28), (16, 29), (21, 28), (25, 27)]:
        fill_circle(c, sx, sy, 2, (120, 113, 108, 255))
        fill_circle(c, sx, sy - 1, 1, (168, 162, 158, 255))
    # Outer Red Flame
    fill_circle(c, 16, 19, 8, (220, 38, 38, 255))
    fill_circle(c, 16, 13, 6, (220, 38, 38, 255))
    fill_circle(c, 15, 8, 3, (220, 38, 38, 255))
    # Mid Orange Flame
    fill_circle(c, 16, 19, 6, (249, 115, 22, 255))
    fill_circle(c, 16, 14, 4, (249, 115, 22, 255))
    fill_circle(c, 15, 10, 2, (249, 115, 22, 255))
    # Inner Bright Yellow Core
    fill_circle(c, 16, 20, 4, (250, 204, 21, 255))
    fill_circle(c, 16, 16, 2, (254, 240, 138, 255))
    # Sparks / Embers floating
    set_pixel(c, 12, 7, (250, 204, 21, 255))
    set_pixel(c, 19, 6, (249, 115, 22, 255))
    set_pixel(c, 16, 3, (254, 240, 138, 255))
    return draw_outline(c, (69, 10, 10, 255))

# 4. UI Stone Gear (32x32) - Chiseled Granite Cogwheel
def gen_ui_stone_gear():
    c = create_canvas(32, 32)
    # Main round stone disc
    fill_circle(c, 16, 16, 10, (120, 113, 108, 255))
    fill_circle(c, 15, 15, 8, (168, 162, 158, 255))
    fill_circle(c, 14, 14, 5, (214, 211, 209, 255))
    # 6 Cogwheel Teeth protruding outwards
    # Top & Bottom
    fill_rect(c, 14, 3, 4, 4, (168, 162, 158, 255))
    fill_rect(c, 14, 25, 4, 4, (120, 113, 108, 255))
    # Left & Right
    fill_rect(c, 3, 14, 4, 4, (168, 162, 158, 255))
    fill_rect(c, 25, 14, 4, 4, (120, 113, 108, 255))
    # Diagonals
    fill_rect(c, 6, 6, 4, 4, (168, 162, 158, 255))
    fill_rect(c, 22, 22, 4, 4, (100, 95, 90, 255))
    fill_rect(c, 22, 6, 4, 4, (140, 135, 130, 255))
    fill_rect(c, 6, 22, 4, 4, (140, 135, 130, 255))
    # Chiseled Center Square Hole
    fill_rect(c, 13, 13, 6, 6, (43, 29, 20, 255))
    fill_rect(c, 14, 14, 4, 4, (28, 25, 23, 255))
    return draw_outline(c)

# 5. UI Heart (16x16) - Crisp Pixel Red Heart
def gen_ui_heart():
    c = create_canvas(16, 16)
    # Left and Right lobes
    fill_circle(c, 5, 5, 3, (220, 38, 38, 255))
    fill_circle(c, 10, 5, 3, (220, 38, 38, 255))
    # Lower V-shape
    for y in range(6, 13):
        w = 12 - (y - 5) * 2
        fill_rect(c, 8 - w//2, y, w, 1, (220, 38, 38, 255))
    # Bright inner highlight
    fill_circle(c, 5, 5, 2, (239, 68, 68, 255))
    fill_circle(c, 10, 5, 2, (239, 68, 68, 255))
    set_pixel(c, 4, 4, (255, 255, 255, 255))
    set_pixel(c, 5, 4, (255, 255, 255, 255))
    set_pixel(c, 4, 5, (254, 202, 202, 255))
    # Deep shadow
    set_pixel(c, 8, 12, (153, 27, 27, 255))
    return draw_outline(c, (80, 10, 10, 255))

# 6. UI Banana (16x16) - Crisp Pixel Yellow/Lime Banana
def gen_ui_banana():
    c = create_canvas(16, 16)
    # Banana curve
    points = [
        (3, 11, 2, (163, 230, 53, 255)), # lime tip
        (4, 9, 3, (250, 204, 21, 255)),
        (6, 7, 3, (250, 204, 21, 255)),
        (8, 5, 3, (250, 204, 21, 255)),
        (10, 4, 3, (250, 204, 21, 255)),
        (12, 4, 2, (234, 179, 8, 255)),
        (13, 5, 2, (133, 77, 14, 255)) # brown stem
    ]
    for x, y, r, col in points:
        fill_circle(c, x, y, r, col)
    # Highlight
    set_pixel(c, 7, 5, (254, 240, 138, 255))
    set_pixel(c, 8, 4, (255, 255, 255, 255))
    set_pixel(c, 9, 4, (254, 240, 138, 255))
    return draw_outline(c, (66, 32, 6, 255))

# 7. UI Stone (16x16) - Crisp Pixel Stone
def gen_ui_stone():
    c = create_canvas(16, 16)
    fill_circle(c, 8, 8, 5, (120, 113, 108, 255))
    fill_circle(c, 7, 7, 3, (168, 162, 158, 255))
    set_pixel(c, 6, 6, (214, 211, 209, 255))
    set_pixel(c, 7, 6, (245, 245, 244, 255))
    return draw_outline(c, (43, 29, 20, 255))

# 8. UI Chevron Down (24x24) - Round Carved Wooden Disc with ⌵
def gen_ui_chevron_down():
    c = create_canvas(24, 24)
    # Round wooden medallion
    fill_circle(c, 12, 12, 10, (146, 64, 14, 255))
    fill_circle(c, 11, 11, 8, (180, 83, 9, 255))
    fill_circle(c, 10, 10, 6, (217, 119, 6, 255))
    # Beveled inner ring
    for r in range(7, 9):
        for deg in range(0, 360, 20):
            rx = int(12 + r * math.cos(math.radians(deg)))
            ry = int(12 + r * math.sin(math.radians(deg)))
            if 0 <= rx < 24 and 0 <= ry < 24:
                set_pixel(c, rx, ry, (120, 53, 15, 255))
    # Carved Downward Chevron ⌵
    for i in range(5):
        set_pixel(c, 8 + i, 9 + i, (43, 29, 20, 255))
        set_pixel(c, 8 + i, 10 + i, (43, 29, 20, 255))
        set_pixel(c, 16 - i, 9 + i, (43, 29, 20, 255))
        set_pixel(c, 16 - i, 10 + i, (43, 29, 20, 255))
    # Chevron subtle groove highlight
    for i in range(4):
        set_pixel(c, 8 + i, 11 + i, (245, 158, 11, 255))
        set_pixel(c, 16 - i, 11 + i, (245, 158, 11, 255))
    return draw_outline(c, (43, 29, 20, 255))

# ══════════════════════════════════════════════
# NEW WEAPONS (32x32)
# ══════════════════════════════════════════════

# 1. Bone Club (Mammoth femur club)
def gen_item_bone_club():
    c = create_canvas(32, 32)
    # Handle diagonal
    for i in range(16):
        set_pixel(c, 7 + i, 24 - i, (245, 245, 244, 255))
        set_pixel(c, 8 + i, 24 - i, (231, 229, 228, 255))
        set_pixel(c, 8 + i, 25 - i, (214, 211, 209, 255))
    # Large knuckle / club head at top-right
    fill_circle(c, 23, 8, 5, (245, 245, 244, 255))
    fill_circle(c, 21, 6, 4, (255, 255, 255, 255))
    fill_circle(c, 26, 11, 4, (231, 229, 228, 255))
    # Leather grip wrap around handle
    for i in range(4, 10):
        set_pixel(c, 7 + i, 24 - i, (146, 64, 14, 255))
        set_pixel(c, 8 + i, 24 - i, (180, 83, 9, 255))
    return draw_outline(c)

# 2. Spiked Club (War club studded with obsidian shards)
def gen_item_spiked_club():
    c = create_canvas(32, 32)
    # Heavy club shaft
    for i in range(18):
        set_pixel(c, 6 + i, 25 - i, (120, 53, 15, 255))
        set_pixel(c, 7 + i, 25 - i, (180, 83, 9, 255))
        set_pixel(c, 7 + i, 26 - i, (146, 64, 14, 255))
    # Enlarged head
    for i in range(12, 19):
        fill_circle(c, 7 + i, 25 - i, 3, (146, 64, 14, 255))
        fill_circle(c, 6 + i, 24 - i, 2, (180, 83, 9, 255))
    # Black Obsidian Spikes protruding
    spikes = [(16, 10), (22, 4), (25, 7), (19, 13), (22, 16)]
    for sx, sy in spikes:
        fill_rect(c, sx, sy, 3, 3, (30, 41, 59, 255))
        set_pixel(c, sx + 1, sy + 1, (100, 116, 139, 255))
    return draw_outline(c)

# 3. Flint Knife (Hunting hand knife with wrapped cord)
def gen_item_flint_knife():
    c = create_canvas(32, 32)
    # Handle
    for i in range(8):
        fill_rect(c, 7 + i, 24 - i, 3, 2, (120, 53, 15, 255))
        set_pixel(c, 8 + i, 24 - i, (180, 83, 9, 255))
    # Chipped Flint Blade
    for i in range(7, 18):
        fill_circle(c, 7 + i, 24 - i, 3, (100, 116, 139, 255))
        set_pixel(c, 6 + i, 23 - i, (203, 213, 225, 255))
        set_pixel(c, 7 + i, 23 - i, (241, 245, 249, 255))
    # Knife Point
    set_pixel(c, 25, 6, (241, 245, 249, 255))
    return draw_outline(c)

# 4. Stone Battleaxe (Primal dual-bladed battleaxe)
def gen_item_stone_battleaxe():
    c = create_canvas(32, 32)
    # Ash wood shaft
    for i in range(24):
        set_pixel(c, 5 + i, 26 - i, (120, 53, 15, 255))
        set_pixel(c, 6 + i, 26 - i, (180, 83, 9, 255))
    # Dual Stone Axe Blades
    # Upper Blade
    fill_circle(c, 18, 9, 6, (120, 113, 108, 255))
    fill_circle(c, 17, 8, 4, (168, 162, 158, 255))
    set_pixel(c, 15, 6, (214, 211, 209, 255))
    # Lower Blade
    fill_circle(c, 24, 15, 6, (120, 113, 108, 255))
    fill_circle(c, 23, 14, 4, (168, 162, 158, 255))
    set_pixel(c, 22, 12, (214, 211, 209, 255))
    # Rawhide lashing X
    fill_rect(c, 20, 11, 3, 3, (217, 119, 6, 255))
    set_pixel(c, 21, 12, (254, 215, 170, 255))
    return draw_outline(c)

# 5. Boomerang (Aboriginal hunting boomerang)
def gen_item_boomerang():
    c = create_canvas(32, 32)
    # L-curved aerodynamic wood wing
    # Wing 1 (going up-left)
    for i in range(12):
        set_pixel(c, 16 - i, 16 - i // 2, (180, 83, 9, 255))
        set_pixel(c, 16 - i, 15 - i // 2, (217, 119, 6, 255))
        set_pixel(c, 16 - i, 17 - i // 2, (120, 53, 15, 255))
    # Wing 2 (going down-right)
    for i in range(12):
        set_pixel(c, 16 + i // 2, 16 + i, (180, 83, 9, 255))
        set_pixel(c, 15 + i // 2, 16 + i, (217, 119, 6, 255))
        set_pixel(c, 17 + i // 2, 16 + i, (120, 53, 15, 255))
    # Tribal ochre paint bands
    set_pixel(c, 11, 13, (220, 38, 38, 255))
    set_pixel(c, 19, 21, (220, 38, 38, 255))
    set_pixel(c, 12, 14, (254, 240, 138, 255))
    set_pixel(c, 18, 20, (254, 240, 138, 255))
    return draw_outline(c)

# 6. Blowpipe (Bamboo blowpipe with feather dart)
def gen_item_blowpipe():
    c = create_canvas(32, 32)
    # Long straight bamboo tube
    for i in range(26):
        set_pixel(c, 4 + i, 27 - i, (101, 163, 13, 255))
        set_pixel(c, 4 + i, 26 - i, (163, 230, 53, 255))
        set_pixel(c, 5 + i, 27 - i, (77, 124, 15, 255))
    # Bamboo segments / nodes
    for seg in [9, 16, 23]:
        set_pixel(c, 4 + seg, 26 - seg, (234, 179, 8, 255))
        set_pixel(c, 5 + seg, 27 - seg, (120, 53, 15, 255))
    # Poison dart resting near mouthpiece
    fill_rect(c, 24, 7, 4, 2, (168, 85, 247, 255))
    set_pixel(c, 28, 6, (147, 51, 234, 255))
    return draw_outline(c)

# 7. Bone Spear (Barbed bone spear)
def gen_item_bone_spear():
    c = create_canvas(32, 32)
    # Long wooden shaft
    for i in range(25):
        set_pixel(c, 4 + i, 27 - i, (146, 64, 14, 255))
        set_pixel(c, 4 + i, 26 - i, (180, 83, 9, 255))
    # Long barbed bone spear tip
    for i in range(18, 28):
        set_pixel(c, 4 + i, 26 - i, (255, 255, 255, 255))
        set_pixel(c, 3 + i, 26 - i, (245, 245, 244, 255))
        set_pixel(c, 4 + i, 27 - i, (214, 211, 209, 255))
    # Barbs
    set_pixel(c, 23, 7, (255, 255, 255, 255))
    set_pixel(c, 25, 9, (255, 255, 255, 255))
    set_pixel(c, 29, 3, (255, 255, 255, 255))
    # Cordage bindings
    fill_rect(c, 20, 9, 3, 3, (217, 119, 6, 255))
    return draw_outline(c)

# 8. Fire Torch Club (Flaming war torch club)
def gen_item_fire_torch_club():
    c = create_canvas(32, 32)
    # Heavy club shaft
    for i in range(16):
        set_pixel(c, 6 + i, 25 - i, (120, 53, 15, 255))
        set_pixel(c, 7 + i, 25 - i, (180, 83, 9, 255))
    # Cloth-wrapped torch head
    fill_circle(c, 22, 10, 5, (120, 53, 15, 255))
    fill_circle(c, 22, 10, 4, (69, 10, 10, 255))
    # Blazing Flames
    fill_circle(c, 23, 8, 5, (220, 38, 38, 255))
    fill_circle(c, 24, 7, 3, (249, 115, 22, 255))
    fill_circle(c, 25, 6, 2, (250, 204, 21, 255))
    set_pixel(c, 26, 4, (254, 240, 138, 255))
    # Flying embers
    set_pixel(c, 19, 5, (249, 115, 22, 255))
    set_pixel(c, 28, 8, (250, 204, 21, 255))
    return draw_outline(c, (69, 10, 10, 255))

# ══════════════════════════════════════════════
# NEW TOOLS (32x32)
# ══════════════════════════════════════════════

# 9. Waterskin (Stitched leather flask)
def gen_item_waterskin():
    c = create_canvas(32, 32)
    fill_circle(c, 16, 18, 9, (180, 83, 9, 255))
    fill_circle(c, 15, 17, 7, (217, 119, 6, 255))
    # Flask neck & bone stopper
    fill_rect(c, 14, 7, 4, 4, (146, 64, 14, 255))
    fill_rect(c, 14, 5, 4, 3, (245, 245, 244, 255))
    set_pixel(c, 15, 4, (255, 255, 255, 255))
    # Carrying strap
    for i in range(12):
        set_pixel(c, 9 + i, 8 + abs(6 - i) // 2, (120, 53, 15, 255))
    # Stitched seam line
    for y in range(12, 24):
        set_pixel(c, 16, y, (254, 215, 170, 255))
    # Blue drop highlight (showing full of cool water)
    fill_circle(c, 13, 19, 2, (56, 189, 248, 255))
    set_pixel(c, 13, 18, (255, 255, 255, 255))
    return draw_outline(c)

# 10. Fire Drill (Bow fire drill set)
def gen_item_fire_drill():
    c = create_canvas(32, 32)
    # Hearth board at bottom
    fill_rect(c, 5, 24, 22, 5, (146, 64, 14, 255))
    fill_rect(c, 6, 25, 20, 3, (180, 83, 9, 255))
    # Notch with smoke ember
    fill_circle(c, 16, 24, 2, (239, 68, 68, 255))
    set_pixel(c, 16, 23, (250, 204, 21, 255))
    # Vertical Spindle stick
    fill_rect(c, 15, 9, 3, 15, (180, 83, 9, 255))
    fill_rect(c, 16, 9, 1, 15, (217, 119, 6, 255))
    # Curved Bow
    for i in range(18):
        set_pixel(c, 7 + i, 14 - abs(9 - i) // 2, (120, 53, 15, 255))
    return draw_outline(c)

# 11. Primitive Sickle (Flint jaw sickle)
def gen_item_primitive_sickle():
    c = create_canvas(32, 32)
    # Curved jawbone base
    for deg in range(30, 160, 10):
        rx = int(18 + 11 * math.cos(math.radians(deg)))
        ry = int(14 + 11 * math.sin(math.radians(deg)))
        fill_circle(c, rx, ry, 2, (245, 245, 244, 255))
        set_pixel(c, rx, ry, (255, 255, 255, 255))
    # Micro-flint serrated teeth inside curve
    for deg in range(50, 140, 15):
        rx = int(18 + 9 * math.cos(math.radians(deg)))
        ry = int(14 + 9 * math.sin(math.radians(deg)))
        set_pixel(c, rx, ry, (100, 116, 139, 255))
        set_pixel(c, rx - 1, ry, (30, 41, 59, 255))
    # Wooden grip handle
    fill_rect(c, 7, 21, 5, 8, (146, 64, 14, 255))
    fill_rect(c, 8, 22, 3, 6, (180, 83, 9, 255))
    return draw_outline(c)

# 12. Stone Anvil (Polished heavy stone anvil)
def gen_item_stone_anvil():
    c = create_canvas(32, 32)
    # Flat top working face
    fill_rect(c, 6, 10, 20, 6, (168, 162, 158, 255))
    fill_rect(c, 7, 11, 18, 4, (214, 211, 209, 255))
    set_pixel(c, 10, 11, (255, 255, 255, 255))
    # Heavy tapered base
    fill_rect(c, 10, 16, 12, 6, (120, 113, 108, 255))
    fill_rect(c, 7, 22, 18, 6, (100, 95, 90, 255))
    fill_rect(c, 8, 23, 16, 4, (120, 113, 108, 255))
    return draw_outline(c)

# 13. Flint Striker (Pyrite and flint striker set)
def gen_item_flint_striker():
    c = create_canvas(32, 32)
    # Iron Pyrite chunk (golden metallic)
    fill_circle(c, 12, 18, 6, (202, 138, 4, 255))
    fill_circle(c, 11, 17, 4, (250, 204, 21, 255))
    set_pixel(c, 10, 16, (254, 240, 138, 255))
    # Sharp black flint node
    fill_circle(c, 21, 15, 6, (51, 65, 85, 255))
    fill_circle(c, 20, 14, 4, (100, 116, 139, 255))
    set_pixel(c, 19, 13, (203, 213, 225, 255))
    # Striking sparks in the middle
    set_pixel(c, 16, 14, (254, 240, 138, 255))
    set_pixel(c, 16, 13, (239, 68, 68, 255))
    set_pixel(c, 15, 12, (250, 204, 21, 255))
    return draw_outline(c)

# ══════════════════════════════════════════════
# NEW ARMOR & GEAR (32x32)
# ══════════════════════════════════════════════

# 14. Bone Helmet (Beast skull helmet)
def gen_item_bone_helmet():
    c = create_canvas(32, 32)
    # Skull dome
    fill_circle(c, 16, 14, 9, (245, 245, 244, 255))
    fill_circle(c, 15, 13, 7, (255, 255, 255, 255))
    # Eye sockets
    fill_circle(c, 12, 15, 2, (43, 29, 20, 255))
    fill_circle(c, 20, 15, 2, (43, 29, 20, 255))
    # Nasal cavity
    set_pixel(c, 16, 17, (43, 29, 20, 255))
    # Pointed Horns on sides
    for i in range(5):
        set_pixel(c, 8 - i, 10 - i, (217, 119, 6, 255))
        set_pixel(c, 24 + i, 10 - i, (217, 119, 6, 255))
    return draw_outline(c)

# 15. Feather Headdress (Sacred shaman feather crown)
def gen_item_feather_headdress():
    c = create_canvas(32, 32)
    # Headband
    fill_rect(c, 7, 21, 18, 4, (180, 83, 9, 255))
    # Turquoise and Coral Beads on band
    for x in [9, 13, 17, 21]:
        set_pixel(c, x, 22, (45, 212, 191, 255))
        set_pixel(c, x + 2, 22, (239, 68, 68, 255))
    # Array of Tall Feathers
    # Center Eagle Feather (white with dark tip)
    for y in range(5, 21):
        set_pixel(c, 16, y, (255, 255, 255, 255))
        set_pixel(c, 15, y, (241, 245, 249, 255))
    fill_rect(c, 15, 5, 2, 4, (43, 29, 20, 255))
    # Left & Right Scarlet & Cyan Feathers
    for y in range(8, 21):
        set_pixel(c, 12, y, (239, 68, 68, 255))
        set_pixel(c, 20, y, (56, 189, 248, 255))
    for y in range(12, 21):
        set_pixel(c, 9, y, (250, 204, 21, 255))
        set_pixel(c, 23, y, (168, 85, 247, 255))
    return draw_outline(c)

# 16. Beast Fur Boots (Insulated fur-lined moccasin boots)
def gen_item_beast_fur_boots():
    c = create_canvas(32, 32)
    # Left boot
    fill_rect(c, 7, 12, 7, 14, (120, 53, 15, 255))
    fill_rect(c, 5, 21, 9, 6, (146, 64, 14, 255))
    fill_circle(c, 10, 11, 4, (245, 245, 244, 255)) # Fluffy fur trim
    # Right boot
    fill_rect(c, 18, 12, 7, 14, (120, 53, 15, 255))
    fill_rect(c, 18, 21, 9, 6, (146, 64, 14, 255))
    fill_circle(c, 21, 11, 4, (245, 245, 244, 255))
    return draw_outline(c)

# 17. Turtle Shield (Ancient carapace buckler)
def gen_item_turtle_shield():
    c = create_canvas(32, 32)
    # Oval Carapace
    fill_circle(c, 16, 16, 11, (101, 163, 13, 255))
    fill_circle(c, 15, 15, 9, (132, 204, 22, 255))
    # Scute Hexagonal Patterns
    fill_rect(c, 14, 13, 5, 5, (77, 124, 15, 255))
    fill_rect(c, 15, 14, 3, 3, (163, 230, 53, 255))
    # Outer Bone Rim
    for deg in range(0, 360, 25):
        rx = int(16 + 11 * math.cos(math.radians(deg)))
        ry = int(16 + 11 * math.sin(math.radians(deg)))
        set_pixel(c, rx, ry, (245, 245, 244, 255))
    return draw_outline(c)

# 18. Mammoth Coat (Heavy mammoth fur coat)
def gen_item_mammoth_coat():
    c = create_canvas(32, 32)
    # Thick wool body
    fill_rect(c, 9, 10, 14, 17, (120, 53, 15, 255))
    fill_rect(c, 10, 11, 12, 15, (146, 64, 14, 255))
    # Massive fur collar
    fill_circle(c, 11, 9, 5, (180, 83, 9, 255))
    fill_circle(c, 21, 9, 5, (180, 83, 9, 255))
    fill_circle(c, 16, 8, 4, (217, 119, 6, 255))
    # Bone toggle buttons down center
    for y in [14, 18, 22]:
        set_pixel(c, 16, y, (255, 255, 255, 255))
        set_pixel(c, 15, y, (214, 211, 209, 255))
    return draw_outline(c)

# ══════════════════════════════════════════════
# NEW MATERIALS (32x32)
# ══════════════════════════════════════════════

# 19. Dino Scale (Iridescent green/teal reptilian scale)
def gen_item_dino_scale():
    c = create_canvas(32, 32)
    # Diamond/shield scale shape
    for y in range(7, 25):
        w = 14 - abs(16 - y)
        fill_rect(c, 16 - w//2, y, w, 1, (13, 148, 136, 255))
        fill_rect(c, 16 - w//2 + 1, y, max(1, w - 2), 1, (20, 184, 166, 255))
    # Iridescent sheen highlights
    set_pixel(c, 15, 12, (94, 234, 212, 255))
    set_pixel(c, 16, 12, (204, 251, 241, 255))
    set_pixel(c, 16, 13, (255, 255, 255, 255))
    return draw_outline(c, (15, 76, 50, 255))

# 20. Amber Fossil (Golden amber with insect inside)
def gen_item_amber_fossil():
    c = create_canvas(32, 32)
    # Smooth golden pebble
    fill_circle(c, 16, 16, 10, (217, 119, 6, 255))
    fill_circle(c, 15, 15, 8, (245, 158, 11, 255))
    fill_circle(c, 14, 14, 6, (251, 191, 36, 255))
    # Trapped prehistoric insect silhouette
    fill_rect(c, 15, 15, 3, 4, (69, 26, 3, 255))
    # Insect wings
    set_pixel(c, 14, 15, (120, 53, 15, 255))
    set_pixel(c, 18, 15, (120, 53, 15, 255))
    set_pixel(c, 13, 16, (180, 83, 9, 255))
    set_pixel(c, 19, 16, (180, 83, 9, 255))
    # Glassy shine
    fill_rect(c, 11, 10, 3, 2, (255, 255, 255, 255))
    return draw_outline(c, (113, 63, 18, 255))

# 21. Primal Feather (Vibrant raptor plumage)
def gen_item_primal_feather():
    c = create_canvas(32, 32)
    # Diagonal shaft
    for i in range(24):
        set_pixel(c, 5 + i, 26 - i, (255, 255, 255, 255))
    # Scarlet and Azure Vanes
    for i in range(5, 22):
        set_pixel(c, 5 + i - 1, 26 - i - 1, (239, 68, 68, 255))
        set_pixel(c, 5 + i - 2, 26 - i - 1, (220, 38, 38, 255))
        set_pixel(c, 5 + i + 1, 26 - i + 1, (56, 189, 248, 255))
        set_pixel(c, 5 + i + 2, 26 - i + 1, (14, 165, 233, 255))
    return draw_outline(c)

# 22. Venom Sac (Glistening poison gland)
def gen_item_venom_sac():
    c = create_canvas(32, 32)
    fill_circle(c, 16, 18, 9, (126, 34, 206, 255))
    fill_circle(c, 15, 17, 7, (168, 85, 247, 255))
    fill_circle(c, 14, 16, 4, (216, 180, 254, 255))
    # Tied duct at top
    fill_rect(c, 14, 7, 4, 4, (88, 28, 135, 255))
    set_pixel(c, 15, 6, (107, 114, 128, 255))
    # Toxic green droplet oozing
    fill_circle(c, 17, 24, 2, (74, 222, 128, 255))
    set_pixel(c, 17, 23, (187, 247, 208, 255))
    return draw_outline(c, (59, 7, 100, 255))

# 23. Meteorite Ore (Celestial ore shard with star glow)
def gen_item_meteorite_ore():
    c = create_canvas(32, 32)
    # Jagged dark extraterrestrial mineral
    fill_circle(c, 16, 16, 10, (15, 23, 42, 255))
    fill_circle(c, 15, 15, 7, (51, 65, 85, 255))
    # Cosmic craters / regmaglypts
    fill_circle(c, 12, 14, 2, (2, 6, 23, 255))
    fill_circle(c, 19, 18, 3, (2, 6, 23, 255))
    # Glowing violet/cyan star sparkle
    set_pixel(c, 15, 11, (192, 132, 252, 255))
    set_pixel(c, 16, 11, (255, 255, 255, 255))
    set_pixel(c, 16, 12, (56, 189, 248, 255))
    return draw_outline(c, (30, 27, 75, 255))

# 24. Primal Sap (Golden amber resin in leaf bowl)
def gen_item_primal_sap():
    c = create_canvas(32, 32)
    # Green jungle leaf bowl underneath
    fill_circle(c, 16, 20, 9, (22, 101, 52, 255))
    fill_circle(c, 16, 20, 7, (34, 197, 94, 255))
    # Golden sticky sap mound
    fill_circle(c, 16, 15, 6, (217, 119, 6, 255))
    fill_circle(c, 15, 14, 4, (245, 158, 11, 255))
    set_pixel(c, 14, 13, (254, 240, 138, 255))
    return draw_outline(c, (20, 83, 45, 255))

# 25. Volcanic Ash (Ash fertilizer pouch)
def gen_item_volcanic_ash():
    c = create_canvas(32, 32)
    # Rawhide pouch
    fill_circle(c, 16, 19, 9, (100, 116, 139, 255))
    fill_circle(c, 15, 18, 7, (148, 163, 184, 255))
    # Gray ash puff billowing out
    fill_circle(c, 16, 10, 4, (203, 213, 225, 255))
    fill_circle(c, 14, 9, 3, (226, 232, 240, 255))
    fill_circle(c, 18, 8, 2, (241, 245, 249, 255))
    # Tied string around pouch neck
    fill_rect(c, 13, 13, 6, 2, (217, 119, 6, 255))
    return draw_outline(c)

# 26. Dragon Bone (Fossilized leviathan spine)
def gen_item_dragon_bone():
    c = create_canvas(32, 32)
    # Huge vertebral bone with dorsal spine
    fill_circle(c, 16, 19, 8, (245, 245, 244, 255))
    fill_circle(c, 15, 18, 6, (255, 255, 255, 255))
    # Hollow center spinal canal
    fill_circle(c, 16, 19, 3, (43, 29, 20, 255))
    # Sharp dorsal crest spike
    for y in range(6, 13):
        w = 1 + (13 - y) // 2
        fill_rect(c, 16 - w//2, y, w, 1, (245, 245, 244, 255))
    set_pixel(c, 16, 6, (255, 255, 255, 255))
    return draw_outline(c)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # HUD Icons
    save_png(gen_ui_backpack(), "ui-backpack.png")
    save_png(gen_ui_egg(), "ui-egg.png")
    save_png(gen_ui_campfire(), "ui-campfire.png")
    save_png(gen_ui_stone_gear(), "ui-stone-gear.png")
    save_png(gen_ui_heart(), "ui-heart.png")
    save_png(gen_ui_banana(), "ui-banana.png")
    save_png(gen_ui_stone(), "ui-stone.png")
    save_png(gen_ui_chevron_down(), "ui-chevron-down.png")
    
    # Weapons
    save_png(gen_item_bone_club(), "item-bone-club.png")
    save_png(gen_item_spiked_club(), "item-spiked-club.png")
    save_png(gen_item_flint_knife(), "item-flint-knife.png")
    save_png(gen_item_stone_battleaxe(), "item-stone-battleaxe.png")
    save_png(gen_item_boomerang(), "item-boomerang.png")
    save_png(gen_item_blowpipe(), "item-blowpipe.png")
    save_png(gen_item_bone_spear(), "item-bone-spear.png")
    save_png(gen_item_fire_torch_club(), "item-fire-torch-club.png")

    # Tools
    save_png(gen_item_waterskin(), "item-waterskin.png")
    save_png(gen_item_fire_drill(), "item-fire-drill.png")
    save_png(gen_item_primitive_sickle(), "item-primitive-sickle.png")
    save_png(gen_item_stone_anvil(), "item-stone-anvil.png")
    save_png(gen_item_flint_striker(), "item-flint-striker.png")

    # Armor & Gear
    save_png(gen_item_bone_helmet(), "item-bone-helmet.png")
    save_png(gen_item_feather_headdress(), "item-feather-headdress.png")
    save_png(gen_item_beast_fur_boots(), "item-beast-fur-boots.png")
    save_png(gen_item_turtle_shield(), "item-turtle-shield.png")
    save_png(gen_item_mammoth_coat(), "item-mammoth-coat.png")

    # Materials
    save_png(gen_item_dino_scale(), "item-dino-scale.png")
    save_png(gen_item_amber_fossil(), "item-amber-fossil.png")
    save_png(gen_item_primal_feather(), "item-primal-feather.png")
    save_png(gen_item_venom_sac(), "item-venom-sac.png")
    save_png(gen_item_meteorite_ore(), "item-meteorite-ore.png")
    save_png(gen_item_primal_sap(), "item-primal-sap.png")
    save_png(gen_item_volcanic_ash(), "item-volcanic-ash.png")
    save_png(gen_item_dragon_bone(), "item-dragon-bone.png")

    print("\nAll 34 prehistoric pixel sprites successfully generated!")

if __name__ == "__main__":
    main()

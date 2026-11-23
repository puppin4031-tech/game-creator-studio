/**
 * Built-in Prehistoric Mob & Dinosaur Pixel-Art Sprite Sheet Generator
 * 
 * Generates crisp, retro 16-bit 4-frame horizontal sprite sheets for:
 * - Small / Fast: dodo, boar, wolf, raptor, eagle, rabbit
 * - Medium / Heavy: sabertooth, bear, crocodile, triceratops
 * - Apex / Boss: mammoth, trex, skull_dragon, boss_direwolf, boss_mammoth
 * 
 * Uses HTML5 Canvas (imageSmoothingEnabled = false) and caches generated PNG data URLs.
 */

export interface MobSpriteDef {
  url: string;
  frames: number;
  fps: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  action: 'idle' | 'walk' | 'attack';
}

const SPRITE_CACHE = new Map<string, MobSpriteDef>();

type MobPalette = {
  main: string;
  dark: string;
  light: string;
  accent: string;
  eye: string;
  teeth?: string;
  glow?: string;
};

const PALETTES: Record<string, MobPalette> = {
  dodo: {
    main: '#8d6e63',
    dark: '#5d4037',
    light: '#d7ccc8',
    accent: '#f59e0b',
    eye: '#1e293b',
    teeth: '#fbbf24',
  },
  boar: {
    main: '#5c3a21',
    dark: '#3b2211',
    light: '#8d5b36',
    accent: '#fde047',
    eye: '#ef4444',
    teeth: '#fef08a',
  },
  wolf: {
    main: '#64748b',
    dark: '#334155',
    light: '#cbd5e1',
    accent: '#e2e8f0',
    eye: '#eab308',
    teeth: '#ffffff',
  },
  raptor: {
    main: '#0d9488',
    dark: '#115e59',
    light: '#2dd4bf',
    accent: '#fef08a',
    eye: '#eab308',
    teeth: '#ffffff',
  },
  eagle: {
    main: '#451a03',
    dark: '#291002',
    light: '#f8fafc',
    accent: '#eab308',
    eye: '#f59e0b',
    teeth: '#fef08a',
  },
  rabbit: {
    main: '#e2e8f0',
    dark: '#94a3b8',
    light: '#ffffff',
    accent: '#f472b6',
    eye: '#ef4444',
  },
  sabertooth: {
    main: '#d97706',
    dark: '#92400e',
    light: '#fde68a',
    accent: '#78350f',
    eye: '#84cc16',
    teeth: '#ffffff',
  },
  bear: {
    main: '#4a2c11',
    dark: '#2a1607',
    light: '#78461f',
    accent: '#1e1107',
    eye: '#fbbf24',
    teeth: '#fef3c7',
  },
  crocodile: {
    main: '#15803d',
    dark: '#14532d',
    light: '#4ade80',
    accent: '#fde047',
    eye: '#eab308',
    teeth: '#ffffff',
  },
  triceratops: {
    main: '#65a30d',
    dark: '#3f6212',
    light: '#a3e635',
    accent: '#e7e5e4',
    eye: '#fbbf24',
    teeth: '#e7e5e4',
  },
  mammoth: {
    main: '#6b3710',
    dark: '#3c1d06',
    light: '#96521e',
    accent: '#fef9c3',
    eye: '#38bdf8',
    teeth: '#fef9c3',
  },
  trex: {
    main: '#991b1b',
    dark: '#5a0c0c',
    light: '#f87171',
    accent: '#fef08a',
    eye: '#eab308',
    teeth: '#ffffff',
  },
  skull_dragon: {
    main: '#1e1b4b',
    dark: '#0f0e26',
    light: '#c084fc',
    accent: '#f1f5f9',
    eye: '#a855f7',
    teeth: '#f8fafc',
    glow: '#d8b4fe',
  },
  boss_direwolf: {
    main: '#334155',
    dark: '#0f172a',
    light: '#94a3b8',
    accent: '#dc2626',
    eye: '#ef4444',
    teeth: '#ffffff',
    glow: '#f87171',
  },
  boss_mammoth: {
    main: '#451a03',
    dark: '#1c0701',
    light: '#78350f',
    accent: '#fef08a',
    eye: '#ef4444',
    teeth: '#fef08a',
    glow: '#f97316',
  },
};

/**
 * Renders a specific mob species frame onto a 2D canvas context.
 */
function drawMobFrame(
  ctx: CanvasRenderingContext2D,
  species: string,
  action: 'idle' | 'walk' | 'attack',
  frameIdx: number,
  cx: number,
  cy: number,
  size: number
) {
  const p = PALETTES[species] ?? PALETTES.boar;
  const isAttack = action === 'attack';
  
  // Animation offsets
  // Frame 0..3 offsets
  const bobY = isAttack
    ? [0, -3, 2, 0][frameIdx]
    : [0, -2, 0, 1][frameIdx];
  const lungeX = isAttack
    ? [-2, 5, 8, 1][frameIdx]
    : [0, 1, 0, -1][frameIdx];
  const legCycle = [0, 2, 0, -2][frameIdx];

  const bx = cx + lungeX;
  const by = cy + bobY;

  ctx.save();

  // Draw per species category
  if (species === 'dodo' || species === 'rabbit') {
    // ── Small Birds & Critters ──
    if (species === 'dodo') {
      // Body
      ctx.fillStyle = p.main;
      ctx.fillRect(bx - 8, by - 6, 16, 12);
      ctx.fillStyle = p.dark;
      ctx.fillRect(bx - 10, by - 4, 3, 6); // tail
      // Head & Neck
      ctx.fillStyle = p.main;
      ctx.fillRect(bx + 4, by - 14, 6, 9);
      // Eye
      ctx.fillStyle = p.eye;
      ctx.fillRect(bx + 7, by - 12, 2, 2);
      // Large hooked beak
      ctx.fillStyle = isAttack ? '#ea580c' : p.accent;
      const beakExt = isAttack && frameIdx === 2 ? 10 : 7;
      ctx.fillRect(bx + 10, by - 11, beakExt, 4);
      ctx.fillStyle = p.dark;
      ctx.fillRect(bx + 10 + beakExt - 2, by - 9, 2, 4); // hook down
      // Wings
      ctx.fillStyle = p.dark;
      ctx.fillRect(bx - 4, by - 4, 8, 5);
      // Legs
      ctx.fillStyle = p.accent;
      ctx.fillRect(bx - 4 + legCycle, by + 6, 2, 5);
      ctx.fillRect(bx + 3 - legCycle, by + 6, 2, 5);
    } else {
      // Rabbit
      ctx.fillStyle = p.main;
      ctx.fillRect(bx - 6, by - 4, 12, 9); // body
      ctx.fillStyle = p.light;
      ctx.fillRect(bx + 4, by - 9, 6, 6); // head
      ctx.fillStyle = p.eye;
      ctx.fillRect(bx + 7, by - 8, 2, 2);
      // Long Ears
      ctx.fillStyle = p.accent;
      ctx.fillRect(bx + 5, by - 16, 2, 7);
      ctx.fillRect(bx + 8, by - 16, 2, 7);
      // Tail & Paws
      ctx.fillStyle = p.light;
      ctx.fillRect(bx - 8, by - 2, 3, 3);
      ctx.fillRect(bx - 3 + legCycle, by + 5, 3, 3);
      ctx.fillRect(bx + 4 - legCycle, by + 5, 3, 3);
    }
  } else if (species === 'eagle') {
    // ── Giant Eagle ──
    const wingFlap = isAttack ? [-4, 6, 10, 0][frameIdx] : [-6, 0, 6, 0][frameIdx];
    // Spread Wings
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 16, by - 8 + wingFlap, 12, 5);
    ctx.fillRect(bx + 4, by - 8 + wingFlap, 12, 5);
    // Body & White Crown
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 6, by - 4, 12, 10);
    ctx.fillStyle = p.light; // White head
    ctx.fillRect(bx + 4, by - 10, 7, 7);
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 8, by - 9, 2, 2);
    // Hooked yellow beak
    ctx.fillStyle = p.accent;
    ctx.fillRect(bx + 11, by - 8, 5, 3);
    ctx.fillRect(bx + 14, by - 6, 2, 3);
    // Talons
    ctx.fillStyle = isAttack ? '#ef4444' : p.accent;
    ctx.fillRect(bx - 2, by + 6, 4, 4);
  } else if (species === 'raptor') {
    // ── Velociraptor ──
    // Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 8, by - 6, 16, 10);
    ctx.fillStyle = p.light;
    ctx.fillRect(bx - 6, by, 12, 4); // Underbelly
    // Counterbalance Tail
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 18, by - 4, 11, 4);
    // Long Neck & Reptilian Head
    ctx.fillStyle = p.main;
    ctx.fillRect(bx + 6, by - 12, 6, 8);
    const jawOpen = isAttack && (frameIdx === 1 || frameIdx === 2) ? 4 : 0;
    ctx.fillRect(bx + 10, by - 14, 9, 6 + jawOpen);
    // Eye & Razor Teeth
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 14, by - 13, 2, 2);
    if (jawOpen > 0) {
      ctx.fillStyle = p.teeth!;
      ctx.fillRect(bx + 12, by - 8, 6, 2);
    }
    // Sickle Claw Hind Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 4 + legCycle, by + 4, 4, 8);
    ctx.fillRect(bx + 4 - legCycle, by + 4, 4, 8);
    ctx.fillStyle = '#f59e0b'; // Sickle claw
    ctx.fillRect(bx + 1 - legCycle, by + 10, 3, 2);
    ctx.fillRect(bx + 8 - legCycle, by + 10, 3, 2);
  } else if (species === 'sabertooth') {
    // ── Saber-toothed Tiger ──
    // Muscular Feline Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 14, by - 8, 26, 14);
    ctx.fillStyle = p.light;
    ctx.fillRect(bx - 10, by + 2, 20, 4); // Underbelly
    // Feline Head
    ctx.fillStyle = p.main;
    ctx.fillRect(bx + 10, by - 12, 10, 10);
    // Ears
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 11, by - 15, 3, 3);
    ctx.fillRect(bx + 16, by - 15, 3, 3);
    // Eye
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 16, by - 10, 2, 2);
    // Massive Saber Canines
    ctx.fillStyle = p.teeth!;
    const fangLen = isAttack && frameIdx === 2 ? 9 : 7;
    ctx.fillRect(bx + 17, by - 4, 2, fangLen);
    ctx.fillRect(bx + 19, by - 4, 2, fangLen);
    // Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 10 + legCycle, by + 6, 4, 8);
    ctx.fillRect(bx + 8 - legCycle, by + 6, 4, 8);
    // Short Tail
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 17, by - 6, 4, 4);
  } else if (species === 'bear') {
    // ── Prehistoric Cave Bear ──
    // Massive Body & Shoulder Hump
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 15, by - 10, 28, 18);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 2, by - 14, 12, 6); // Shoulder hump
    // Snout & Head
    ctx.fillStyle = p.light;
    ctx.fillRect(bx + 11, by - 9, 9, 9);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 16, by - 6, 5, 5); // Nose
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 14, by - 8, 2, 2);
    // Ears
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 11, by - 12, 3, 3);
    // Heavy Paw Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 12 + legCycle, by + 8, 6, 8);
    ctx.fillRect(bx + 7 - legCycle, by + 8, 6, 8);
    // Claws
    if (isAttack) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 14, by + 12, 4, 3);
    }
  } else if (species === 'crocodile') {
    // ── Giant Crocodile ──
    // Low Armored Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 16, by - 4, 30, 8);
    // Armored Dorsal Scutes
    ctx.fillStyle = p.dark;
    for (let s = -14; s < 10; s += 5) {
      ctx.fillRect(bx + s, by - 7, 3, 3);
    }
    // Long Serrated Tail
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 26, by - 2, 11, 5);
    // Broad Snout with Teeth
    const snapOpen = isAttack && (frameIdx === 1 || frameIdx === 2) ? 6 : 0;
    ctx.fillStyle = p.main;
    ctx.fillRect(bx + 13, by - 6 - snapOpen, 14, 5);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 13, by - 1 + snapOpen, 14, 4);
    // Teeth & Eyes
    ctx.fillStyle = p.teeth!;
    ctx.fillRect(bx + 16, by - 2, 10, 2);
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 14, by - 8 - snapOpen, 3, 2);
    // Short Quad Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 10 + legCycle, by + 4, 5, 4);
    ctx.fillRect(bx + 6 - legCycle, by + 4, 5, 4);
  } else if (species === 'triceratops') {
    // ── Triceratops ──
    // Sturdy Quad Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 16, by - 8, 28, 16);
    // Large Horned Frill
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 7, by - 18, 5, 16);
    ctx.fillStyle = p.accent; // Frill rim spikes
    ctx.fillRect(bx + 6, by - 19, 7, 2);
    // Head & Beak
    ctx.fillStyle = p.main;
    ctx.fillRect(bx + 11, by - 10, 10, 11);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 19, by - 5, 4, 6); // Beak
    // Long Brow Horns
    ctx.fillStyle = p.accent;
    const hornThrust = isAttack ? 4 : 0;
    ctx.fillRect(bx + 14 + hornThrust, by - 16, 9, 3);
    ctx.fillRect(bx + 19 + hornThrust, by - 7, 4, 3); // Nose horn
    // Pillar Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 12 + legCycle, by + 8, 6, 8);
    ctx.fillRect(bx + 5 - legCycle, by + 8, 6, 8);
  } else if (species === 'trex') {
    // ── Tyrannosaurus Rex (Apex Predator) ──
    // Massive Theropod Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 18, by - 12, 32, 18);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 12, by, 22, 6);
    // Heavy Muscular Tail
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 32, by - 8, 16, 7);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 36, by - 6, 6, 4);
    // Giant Skull
    const roarGap = isAttack && (frameIdx === 1 || frameIdx === 2) ? 8 : 2;
    ctx.fillStyle = p.main;
    ctx.fillRect(bx + 12, by - 20, 18, 9); // Upper skull
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 14, by - 10 + roarGap, 15, 6); // Lower jaw
    // Razor Teeth
    ctx.fillStyle = p.teeth!;
    ctx.fillRect(bx + 17, by - 11, 12, 3);
    ctx.fillRect(bx + 17, by - 11 + roarGap, 12, 2);
    // Ferocious Eye
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 18, by - 18, 3, 3);
    // Tiny Arms
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 9, by - 4, 4, 4);
    // Thunderous Hind Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 8 + legCycle, by + 6, 7, 12);
    ctx.fillRect(bx + 6 - legCycle, by + 6, 7, 12);
    ctx.fillStyle = '#0f172a'; // Claws
    ctx.fillRect(bx - 9 + legCycle, by + 16, 9, 3);
    ctx.fillRect(bx + 5 - legCycle, by + 16, 9, 3);
  } else if (species === 'skull_dragon') {
    // ── Skull Dragon (Apex Mythic Boss) ──
    // Skeletal Ribcage Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 18, by - 10, 32, 16);
    ctx.fillStyle = p.accent; // Bone ribs
    for (let r = -14; r < 10; r += 5) {
      ctx.fillRect(bx + r, by - 8, 2, 12);
    }
    // Spiked Dragon Wings
    const wingY = isAttack ? [-6, 6, 12, 0][frameIdx] : [-4, 0, 4, 0][frameIdx];
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 12, by - 22 + wingY, 20, 8);
    ctx.fillStyle = p.light; // Purple wing membrane
    ctx.fillRect(bx - 8, by - 16 + wingY, 14, 5);
    // Horned Skull Head
    ctx.fillStyle = p.accent;
    ctx.fillRect(bx + 12, by - 16, 14, 12);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 18, by - 22, 3, 7); // Skull Horn
    ctx.fillRect(bx + 23, by - 20, 3, 6);
    // Glowing Purple Eye & Breath
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 17, by - 13, 3, 3);
    if (isAttack) {
      ctx.fillStyle = p.glow!;
      ctx.fillRect(bx + 26, by - 12, 12, 6); // Purple breath flare!
    }
    // Tail with Bone Scythe
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 28, by - 6, 12, 4);
    ctx.fillStyle = p.accent;
    ctx.fillRect(bx - 32, by - 10, 5, 8); // Scythe tip
    // Clawed Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 8 + legCycle, by + 6, 6, 10);
    ctx.fillRect(bx + 6 - legCycle, by + 6, 6, 10);
  } else if (species === 'mammoth' || species === 'boss_mammoth') {
    // ── Woolly Mammoth ──
    const isBoss = species === 'boss_mammoth';
    // Huge Shaggy Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 20, by - 14, 38, 22);
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 14, by - 18, 16, 6); // Dome head
    // Shaggy fur fringe
    ctx.fillStyle = p.light;
    for (let f = -18; f < 14; f += 4) {
      ctx.fillRect(bx + f, by + 6, 3, 4);
    }
    // Curled Trunk
    const trunkWave = isAttack && frameIdx === 2 ? 6 : [0, -3, 0, 3][frameIdx];
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx + 18, by - 8, 6, 10);
    ctx.fillRect(bx + 22, by + 2 - trunkWave, 6, 6);
    // Giant Curved Tusks
    ctx.fillStyle = p.accent;
    ctx.fillRect(bx + 16, by - 4, 10, 4);
    ctx.fillRect(bx + 24, by - 12 - (isAttack ? 4 : 0), 4, 10); // Curves upward!
    // Eyes
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 14, by - 12, 3, 3);
    // Heavy Column Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 14 + legCycle, by + 8, 8, 10);
    ctx.fillRect(bx + 6 - legCycle, by + 8, 8, 10);
    // Boss Aura
    if (isBoss) {
      ctx.fillStyle = p.glow!;
      ctx.fillRect(bx - 22, by - 16, 2, 26);
    }
  } else {
    // ── Default Boar & Wolf Quadrupeds ──
    const isWolf = species === 'wolf' || species === 'boss_direwolf';
    // Body
    ctx.fillStyle = p.main;
    ctx.fillRect(bx - 12, by - 7, 24, 13);
    ctx.fillStyle = p.light;
    ctx.fillRect(bx - 8, by + 1, 16, 4); // Belly
    // Head & Snout
    ctx.fillStyle = p.main;
    ctx.fillRect(bx + 10, by - 10, 9, 9);
    ctx.fillStyle = p.eye;
    ctx.fillRect(bx + 14, by - 8, 2, 2);
    // Ears / Tusks
    if (isWolf) {
      ctx.fillStyle = p.dark;
      ctx.fillRect(bx + 11, by - 13, 3, 4); // Pointed ear
      ctx.fillStyle = p.dark;
      ctx.fillRect(bx - 18, by - 8, 8, 5); // Bushy tail
    } else {
      // Boar tusk
      ctx.fillStyle = p.teeth!;
      const tuskLunge = isAttack && frameIdx === 2 ? 3 : 0;
      ctx.fillRect(bx + 17 + tuskLunge, by - 6, 4, 3);
      ctx.fillRect(bx + 19 + tuskLunge, by - 9, 2, 4);
    }
    // Legs
    ctx.fillStyle = p.dark;
    ctx.fillRect(bx - 8 + legCycle, by + 6, 4, 7);
    ctx.fillRect(bx + 6 - legCycle, by + 6, 4, 7);
  }

  ctx.restore();
}

/**
 * Generates a 4-frame horizontal sprite sheet strip for a given mob species.
 */
export function getBuiltinMobSprite(
  species: string,
  action: 'idle' | 'walk' | 'attack' = 'idle'
): MobSpriteDef {
  const normAction = action === 'walk' ? 'idle' : action;
  const key = `${species}:${normAction}`;
  if (SPRITE_CACHE.has(key)) return SPRITE_CACHE.get(key)!;

  // Determine standard cell dimensions based on size category
  let cellW = 48;
  let cellH = 48;
  if (species === 'dodo' || species === 'rabbit') {
    cellW = 36;
    cellH = 36;
  } else if (
    species === 'mammoth' ||
    species === 'boss_mammoth' ||
    species === 'trex' ||
    species === 'skull_dragon'
  ) {
    cellW = 64;
    cellH = 64;
  } else if (species === 'crocodile' || species === 'triceratops' || species === 'bear') {
    cellW = 56;
    cellH = 50;
  }

  const frameCount = 4;
  const totalWidth = cellW * frameCount;
  const totalHeight = cellH;

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.imageSmoothingEnabled = false;

  const cxBase = Math.floor(cellW / 2);
  const cyBase = Math.floor(cellH / 2) + 2;

  for (let i = 0; i < frameCount; i++) {
    const frameCx = i * cellW + cxBase;
    drawMobFrame(ctx, species, normAction, i, frameCx, cyBase, cellW);
  }

  const url = canvas.toDataURL('image/png');
  const result: MobSpriteDef = {
    url,
    frames: frameCount,
    fps: normAction === 'attack' ? 10 : 6,
    width: totalWidth,
    height: totalHeight,
    cellWidth: cellW,
    cellHeight: cellH,
    action: normAction,
  };

  SPRITE_CACHE.set(key, result);
  return result;
}

/**
 * List of all supported prehistoric mobs & dinosaurs.
 */
export const PREHISTORIC_MOBS = [
  // Small / Fast Mobs
  { id: 'dodo', name: '도도새', category: 'small', tier: '일반' },
  { id: 'rabbit', name: '산토끼', category: 'small', tier: '초식' },
  { id: 'boar', name: '야생 멧돼지', category: 'small', tier: '야수' },
  { id: 'wolf', name: '선사시대 회색 늑대', category: 'small', tier: '맹수' },
  { id: 'raptor', name: '벨로키랍토르', category: 'small', tier: '공룡' },
  { id: 'eagle', name: '거대 독수리', category: 'small', tier: '비행' },

  // Medium / Heavy Mobs
  { id: 'sabertooth', name: '검치호 (세이버투스)', category: 'medium', tier: '맹수' },
  { id: 'bear', name: '선사시대 동굴곰', category: 'medium', tier: '야수' },
  { id: 'crocodile', name: '거대 고대악어', category: 'medium', tier: '습지' },
  { id: 'triceratops', name: '트리케라톱스', category: 'medium', tier: '초식공룡' },

  // Apex / Boss Mobs
  { id: 'mammoth', name: '눈보라 털매머드', category: 'apex', tier: '대형' },
  { id: 'trex', name: '티라노사우루스 렉스', category: 'apex', tier: '최상위 포식자' },
  { id: 'skull_dragon', name: '스컬 드래곤', category: 'apex', tier: '전설 우두머리' },
  { id: 'boss_direwolf', name: '우두머리 · 거대 늑대', category: 'apex', tier: '보스' },
  { id: 'boss_mammoth', name: '우두머리 · 분노한 매머드', category: 'apex', tier: '보스' },
] as const;

export type PrehistoricMobId = (typeof PREHISTORIC_MOBS)[number]['id'];

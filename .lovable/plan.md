

## Plan: Treasure Hunt — Shovel Item, Gems, Points & Treasure Chest System

### Overview
Add a shovel-based exploration mechanic, gem treasures with point scoring, quiz/puzzle presets, team score tracking, and a game-ending treasure chest that requires a key.

### Game Flow
```text
Player taps 🪓 Shovel → "주변을 탐색하시겠습니까?" dialog
  → 탐색: checks proximity for nearest unfound treasure
    → Within range: challenge appears (quiz / puzzle / treasure gem / chest)
    → Out of range: "근처에 보물이 없습니다"
  → 뒤로가기: closes dialog

Treasure chest flow:
  Player finds "열쇠(key)" item first → gains chest access
  Player with key approaches chest → opens it → GAME OVER, that team wins
```

### Database Changes

**1. Add columns to `treasure_items` table:**
- `points` (integer, default 15) — score value
- `treasure_subtype` (text, nullable) — `diamond` | `gold` | `sapphire` | `ruby` | `key` | `chest` | null

No new tables needed — team scores are computed in realtime from `treasure_items.found_by` joined with `tag_players.team`.

### Code Changes

**2. Update `TreasureSetup.tsx` — Host setup with presets**
- Add 3rd challenge type button: "보물" (treasure/gem)
- For each challenge type, add a preset dropdown (Select component):
  - **퀴즈 프리셋 (20개)**: Random general knowledge quizzes (한국 수도는?, 지구에서 가장 큰 대양은?, etc.) — host picks from dropdown or types custom
  - **퍼즐 프리셋**: Already exists (4 paintings) — add 1 more to make 5
  - **보물 프리셋**: Diamond(50pt), Gold(30pt), Sapphire(10pt), Ruby(15pt)
- Add special items section: "열쇠" (key, no challenge) and "보물상자" (chest, requires key)
- Points field shown per item

**3. Update `useTreasureHunt.ts` — Score & key logic**
- Add `teamScores` computed memo: sum points of found treasures grouped by team (via player lookup)
- Track if current player has found the "key" item
- `attemptChest()` — only works if player has key, ends game on success
- For treasure-type items: no quiz/puzzle, just claim directly when in range

**4. Create `ShovelButton.tsx` — New floating UI element**
- Shovel icon button (🪓) on the bottom bar of `TreasureGameMap`
- On tap → AlertDialog: "주변을 탐색하시겠습니까?" with 탐색/뒤로가기
- On 탐색: checks nearest treasure proximity
  - If within 10m: opens the challenge (quiz popup, puzzle, or direct gem claim)
  - If out of range: toast "근처에 보물이 없습니다"

**5. Update `TreasureGameMap.tsx`**
- Replace auto-proximity reveal with shovel-triggered exploration
- Add ShovelButton to bottom bar
- Display team scores in top bar (replacing or alongside Team1Score/Team2Score)
- Show key indicator if player has key: 🔑 badge
- Handle chest opening → call endGame with winner info

**6. Update `TreasureHUD.tsx` — Show team points**
- Display `팀1: 45점 | 팀2: 30점` realtime scores
- Show key possession indicator

**7. Update `GameRoom.tsx` ended state**
- Show point-based results for treasure mode (not just alive counts)
- Show which team found the chest (if applicable)

### Preset Data (embedded in code)

**Quiz presets (20):**
한국 수도, 태양계 행성 수, 가장 큰 대양, 피타고라스 정리, DNA 풀네임, 물의 화학식, 광합성 산물, 지구 위성, 올림픽 오륜 색상, 한글 창제자, 등 20개 상식 문제

**Treasure presets:**
| Type | Icon | Points |
|------|------|--------|
| 다이아몬드 | 💎 | 50 |
| 황금 | 🥇 | 30 |
| 루비 | ❤️ | 15 |
| 사파이어 | 💙 | 10 |

**Special items:**
| Type | Icon | Description |
|------|------|-------------|
| 열쇠 | 🔑 | 보물상자를 열 수 있는 아이템 |
| 보물상자 | 📦 | 먼저 여는 팀이 승리 (열쇠 필요) |

### Files Modified
- `supabase/migrations/` — new migration for `points`, `treasure_subtype` columns
- `src/hooks/useTreasureHunt.ts` — score computation, key tracking, chest logic
- `src/components/treasure/TreasureSetup.tsx` — presets, treasure type, points UI
- `src/components/treasure/TreasureGameMap.tsx` — shovel button, scores display
- `src/components/treasure/TreasureHUD.tsx` — team scores
- `src/components/treasure/ShovelButton.tsx` — new component
- `src/pages/play/GameRoom.tsx` — ended state for treasure mode


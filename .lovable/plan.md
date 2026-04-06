

## Plan: Fix Mobile Scroll + Reset All Rooms

### Problem
1. `body { overflow: hidden }` in `src/index.css` blocks all scrolling. Pages like Lobby and WaitingRoom have content taller than the viewport on mobile but can't scroll.
2. Existing rooms in the database need to be cleared.

### Changes

**1. Fix scrolling in `src/index.css`**
- Change `overflow: hidden` on `body` to `overflow-x: hidden` so vertical scrolling works while still preventing horizontal overflow.

**2. Add proper scroll containers to play pages**
- `src/pages/play/Lobby.tsx` — wrap the outer div with `overflow-y-auto` class.
- `src/components/tag-game/WaitingRoom.tsx` — add `overflow-y-auto` to the root container.

**3. Reset all rooms (database)**
- Delete all rows from `tag_messages`, `tag_players`, `tag_rooms`, and `treasure_items` tables to clear existing game data.

### Technical Details
- The `overflow: hidden` on body is likely there for the game map views (full-screen maps). We'll keep `overflow-x: hidden` globally and let individual full-screen map pages set `overflow: hidden` on their own containers instead.
- Database cleanup uses DELETE statements on the four game tables. Foreign key cascade isn't set, so we delete in dependency order: messages → players → treasure_items → rooms.


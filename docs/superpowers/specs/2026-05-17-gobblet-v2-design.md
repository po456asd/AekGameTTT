# Gobblet v2 — Design Spec
**Date:** 2026-05-17  
**Status:** Approved

---

## 1. Game Rules

### Board
- 4×4 grid, 16 cells (indexed 0–15, row-major `r*4+c`)

### Pieces
| Size   | Index | Qty/Player | Can Gobble         |
|--------|-------|------------|--------------------|
| Tiny   | 0     | 3          | Nothing (empty only)|
| Small  | 1     | 3          | Tiny               |
| Medium | 2     | 3          | Small, Tiny        |
| Large  | 3     | 3          | Medium, Small, Tiny|

12 pieces per player, 24 total.

### Gobble Rule
`canPlace(fromSize, targetCell)` — valid if:
- Cell is empty, OR
- `fromSize > topPiece.size` AND `topPiece.color !== currentPlayer`  
  *(cannot gobble own pieces)*

### Stock Exception Rule (tournament rule)
Placing a **new piece from stock** onto an **occupied cell** (gobbling) is only legal if the opponent currently has an active 3-in-a-row threat on the surface. Stock to empty cell: always allowed.

### Win Condition
4-in-a-row on the **surface layer** only (visible top pieces).  
10 winning lines: 4 rows + 4 columns + 2 diagonals.

---

## 2. Data Model

### Stack Array
```js
board[16]  // array of stacks
// board[cell] = [{ color, size }, ...]  bottom→top
// board[cell].at(-1) = visible piece
```

### Stock
```js
stock = {
  red:    [3, 3, 3, 3],  // [Tiny, Small, Medium, Large]
  yellow: [3, 3, 3, 3]
}
```

### Move Object
```js
{
  from: { type: 'stock'|'board', cell: 0-15, size: 0-3 },
  to:   { cell: 0-15 },
  color: 'red'|'yellow',
  timestamp: ms_since_game_start
}
```

---

## 3. AI Engine (`js/ai.js`)

### Bitboard Layout — Implicitly Segmented 64-bit Mask
One `BigInt` per player. Four 16-bit blocks:
```
Bits 00-15: Tiny   positions (cells 0-15)
Bits 16-31: Small  positions (cells 0-15)
Bits 32-47: Medium positions (cells 0-15)
Bits 48-63: Large  positions (cells 0-15)
```
Bit `(size * 16 + cell)` = 1 if player has that size at that cell.  
Two masks total: `redMask`, `yellowMask`. Size decoded by bit position — no separate sizeMask.

### Surface Projection (O(1) Win Detection)
Two 16-bit `BigInt` surface masks maintained per player, updated incrementally on every move.  
Scan Large→Medium→Small→Tiny per cell to determine top visible piece.

10 pre-computed 16-bit win masks. Win check:
```js
WIN_MASKS.some(mask => (surfaceRed & mask) === mask)  // O(1)
```
Threat detection (3-in-a-row) = same masks, one bit cleared per mask.

### Zobrist Hashing
```js
zobristTable[cell][stackDepth][color][size]  // full stack (not surface only)
zobristStock[color][size][count]             // stock state included
```
Hash = XOR of all stack entries + stock counts. Incremental update on make/unmake.

### Move Generation (ordered)
1. Winning moves
2. Blocking opponent win
3. Gobbles (captures)
4. Stock → empty cell
5. Quiet board moves

Stock Exception Rule enforced here — not in evaluation.

### Search Stack
1. **Iterative deepening** — depth 1→18, 3s time limit
2. **PVS (Principal Variation Search)** — first child full `(α,β)`, rest null window `(α, α+1)`, re-search on fail-high
3. **NMP (Null Move Pruning)** — simulate passed turn, search at `depth-3`, prune if score ≥ β. Disabled when: endgame or opponent has active 3-in-a-row
4. **LMR (Late Move Reductions)** — moves after first 3 searched at `depth-2`. Fail-high → re-search full depth
5. **Quiescence Search** — at depth 0: stand-pat score as lower bound, then search noisy moves only (gobbles + reveals) until quiet. Eliminates horizon effect
6. **Unmake move** — no board copy; pop/push stacks, XOR hash back, restore stock counts

### Transposition Table
`SharedArrayBuffer` shared across all Web Workers.  
Entry: `{ depth, score, flag, bestMove }`  
Flags: `EXACT | LOWERBOUND | UPPERBOUND`  
Cap: ~1M entries, overwrite on overflow.

### Lazy SMP (Multi-core)
```
main thread → spawns (navigator.hardwareConcurrency - 1) Web Workers
each worker → runs full alpha-beta on same root, slight move-order variation
shared TT   → SharedArrayBuffer, lazy writes (no strict sync)
```
Worker finds refutation → writes to shared TT → other workers prune that branch instantly.  
Effective depth: 18+ on 4-core hardware.

### Evaluation Function
Applied at depth limit (non-terminal positions):
```
Score = Σ surface_lines(W_size × N_open)
      + Σ subsurface_lines(W_size × 0.25 × N_open)
      − Σ opponent_threats(W_size × N_threat)

Size weights: Large=8, Medium=4, Small=2, Tiny=1
```
Subsurface (index `stack.length-2`) at 25% weight — AI sees "time bombs" hidden under own pieces.

---

## 4. Game Engine (`js/engine.js`)

Pure functions, no DOM. Owns:
- `board[]` stack array
- `stock` counts
- `redMask`, `yellowMask` BigInts
- `surfaceRed`, `surfaceYellow` 16-bit projection masks
- `applyMove(move)` — makes move, updates all state
- `undoMove(move)` — unmakes move (used by AI search)
- `getValidMoves(color)` — returns move array with stock exception rule applied
- `checkWin(color)` — O(1) via surface projection
- `checkThreats(color, count)` — detects N-in-a-row threats

`applyMove()` is the single entry point for both local and future online moves.

---

## 5. UI & Rendering (`js/ui.js` + `css/style.css`)

### Visual Style
Rich/polished 3D-ish. Pure DOM + CSS (no canvas).  
Pieces: CSS 3D circles, radial gradients, box-shadows.

| Size   | Diameter |
|--------|----------|
| Tiny   | 32px     |
| Small  | 48px     |
| Medium | 64px     |
| Large  | 80px     |

Red = warm red + gold rim. Yellow = gold + amber rim.  
Rim thickness varies by size for visual distinction.

Board: 4×4 dark CSS grid, inset cell shadows, hover glow.  
Stack depth hinted by layered shadow behind top piece.

### Piece Interaction
- Click piece (stock or board) → highlight valid destination cells
- Click valid cell → animate piece to destination (200ms CSS keyframe)
- Invalid click → red flash, no state change
- AI thinking → spinner on AI's stock panel

### Animations
| Event      | Animation                                          |
|------------|---------------------------------------------------|
| Place      | scale 0.8→1.0, 150ms ease-out                    |
| Gobble     | victim shrinks+fades, attacker slides in, 250ms   |
| Win        | 4 cells pulse gold, confetti burst, overlay fade  |

### Screens
```
Mode Select → Game → Result Overlay
                         ↓
                   Replay Viewer
```
Single-page. `main.js` swaps `display` on divs. No routing library.

### Stock Panels
Left = current player, Right = opponent.  
Each size shown as stacked icons + count badge. Depleted sizes grayed out.

### Responsive
Minimum 360px. Board scales via CSS `clamp()`.  
Mobile: stock panels collapse below board.

---

## 6. Replay System

### Recording
Every `applyMove()` appends to `moveLog[]`.

### Replay JSON Format
```json
{
  "version": 2,
  "mode": "vs_ai",
  "difficulty": "easy",
  "winner": "red",
  "duration_seconds": 142,
  "date": "2026-05-17T14:23:00Z",
  "moves": [
    {
      "from": { "type": "stock", "cell": null, "size": 3 },
      "to":   { "cell": 5 },
      "color": "red",
      "timestamp": 1240
    }
  ]
}
```

### Result Screen Buttons
- `💾 Save Replay` — download as `replay-YYYY-MM-DD.json`
- `📋 Copy JSON` — copies raw JSON to clipboard (`navigator.clipboard.writeText()`)
- `▶ Replay` — opens viewer with current game

### Replay Viewer
- Load via file picker or drag-drop
- Header: **Winner badge** · **Difficulty** · **Total time** · **Move N of M**
- Controls: `⏮ Start` `⏪ Prev` `⏩ Next` `⏭ End` `▶ Auto-play`
- Auto-play speeds: 1× / 2× / 4×
- Pieces animate identically to live game
- Same 3 buttons (Save / Copy / —) in viewer header

---

## 7. Networking (`js/network.js`)

### Now
```js
export const isOnlineAvailable = false;
```
"Play Online" button visible, grayed out, tooltip "Coming soon".

### Future Architecture (not built now)
- Signaling: Supabase Realtime (free)
- STUN: `stun.l.google.com:19302`
- TURN: Open Relay Project (free fallback)
- Transport: WebRTC DataChannel, moves as `{ from, to, color }` JSON
- Integration point: `network.js` receives opponent move → calls `applyMove()` — same as local

---

## 8. File Structure

```
AekGameTTT/
├── index.html              ← mode select screen
├── css/
│   └── style.css
├── js/
│   ├── engine.js           ← game rules, board state, pure functions
│   ├── ai.js               ← minimax, bitboards, Zobrist, workers
│   ├── ui.js               ← rendering, animations, interaction
│   ├── replay.js           ← recording, save, load, viewer
│   ├── network.js          ← WebRTC placeholder
│   └── main.js             ← wires everything, screen routing
└── gobbletv1/              ← old game, untouched
```

No build step. All ES modules loaded via `<script type="module">`. GitHub Pages compatible.

---

## 9. Modes

| Mode         | Status      | Notes                              |
|--------------|-------------|------------------------------------|
| vs AI        | Build now   | Single difficulty (perfect play)   |
| Local 2P     | Build now   | Same device, hot-seat              |
| Online       | Placeholder | Button visible, grayed out         |

---

## Out of Scope (v2)

- Accounts / leaderboard
- Move timer / clock
- Game history beyond session (no persistence)
- Multiple AI difficulty levels
- Sound effects / music

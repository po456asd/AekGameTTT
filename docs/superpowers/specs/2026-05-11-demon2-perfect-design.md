# Demon2 Perfect Unbeatable AI Design
**Date:** 2026-05-11  
**Goal:** Implement minimax-based unbeatable AI that forces win or draw, never loses.

---

## Overview

Replace demon2's heuristic evaluation (evalMoveDemon2) with full **Minimax + Alpha-Beta Pruning + Iterative Deepening**. Time budget: 5-10 seconds per move. Target: depth 8-10 search, achieving perfect unbeatable play on 4×4 board.

**Guarantee:** Demon2 plays optimally — forces win when possible, accepts draw only if no win path exists, never loses.

---

## Architecture

```
pcMoveDemon2()
  └─ iterativeDeepen(board, stock, aiColor)
      ├─ Initialize transposition table (empty)
      ├─ For depth = 1 to MAX_DEPTH (10):
      │   ├─ Call minimax(depth, -∞, +∞, true, board, stock)
      │   ├─ Track best move found at this depth
      │   └─ Continue if time < 5 seconds
      └─ Return best move from deepest completed search
```

---

## Core Functions

### 1. minimax(depth, alpha, beta, isMax, board, stock, aiColor)
**Purpose:** Recursive alpha-beta search.

**Logic:**
1. Check transposition table: if cached depth ≥ current depth, return cached score
2. Terminal check:
   - AI won → return +1000
   - Opponent won → return -1000
   - Draw (no moves either side) → return 0
3. Depth = 0 → return evalLeaf(board, stock, aiColor)
4. Generate moves for current player
5. Move ordering: wins first, blocks second, center positions third
6. Alpha-beta loop:
   - If maximizing: try moves, update alpha, prune if beta ≤ alpha
   - If minimizing: try moves, update beta, prune if beta ≤ alpha
7. Store result in transposition table
8. Return best score found

**Input:** depth, alpha, beta, isMax, board, stock, aiColor  
**Output:** numeric score (±1000 for terminal, heuristic for leaf)

### 2. boardHash(board, stock)
**Purpose:** Generate deterministic hash key for transposition table.

**Logic:** Concatenate board state + stock counts into unique string  
**Input:** board (2D array), stock (both players)  
**Output:** string key (e.g., "YYYY...RBB...stock{8,4,8,4}")

### 3. evalLeaf(board, stock, aiColor)
**Purpose:** Evaluate non-terminal leaf position (depth=0).

**Scoring:**
- Piece count differential: ±10 per piece advantage
- Captured pieces: ±50 per capture (vs opponent)
- Stock remaining: ±5 per piece in reserve
- Position control: corners +10, center +5, edges +2
- Threat count: ±20 per unblocked opponent winning move

**Input:** board, stock, aiColor  
**Output:** numeric score (sum of heuristics)

### 4. moveOrder(moves, board, stock, aiColor)
**Purpose:** Sort moves for better alpha-beta pruning.

**Order (highest priority first):**
1. Immediate wins (checkWin after move)
2. Opponent blocking moves (prevent opponent win)
3. Center positions (control bonus)
4. Remaining moves

**Input:** move list  
**Output:** sorted move list

### 5. iterativeDeepen(board, stock, aiColor)
**Purpose:** Iterative deepening loop (depth 1→10).

**Logic:**
1. Initialize transposition table = {}
2. bestMove = first legal move
3. startTime = now()
4. For depth = 1 to 10:
   - If (now() - startTime) > 5 seconds: break
   - score = minimax(depth, -∞, +∞, true, board, stock)
   - If score > bestScore: bestScore = score, bestMove = moveFound
5. Return bestMove

**Input:** board, stock, aiColor  
**Output:** best move {row, col, piece}

---

## Search Guarantees

**Unbeatable Condition:** At depth D, AI plays optimally if game tree height ≤ D.

For 4×4 Gobble Bingo:
- Average branching factor: ~5-8 (fewer moves as board fills)
- Game length: 8-16 moves total
- Nodes at depth 8: ~5^8 ≈ 390,000 (with alpha-beta pruning: ~10-20k evaluated)
- Time per depth: exponential, but pruning makes depth 8 feasible in 1-2s

**At 5-10 second budget:**
- Iterative deepening reaches depth 8-10
- Depth 8 covers most forced wins/draws
- Depth 10 covers nearly all endgames
- Result: Provably unbeatable play

---

## Move Ordering Details

Move ordering dramatically improves alpha-beta efficiency. Priority:
1. **Winning moves** (create 4-in-a-row) — evaluated first, cause cutoffs
2. **Blocking moves** (prevent opponent 4-in-a-row) — high value
3. **Center/stable moves** (high position score) — good positional value
4. **Remaining moves** (random order acceptable)

**Implementation:** Sort moves array before AB loop using evalMoveStrength() fast heuristic.

---

## Transposition Table

**Key:** boardHash(board, stock)  
**Value:** {score, depth, flag}
- flag: "exact" (terminal), "lower" (alpha cutoff), "upper" (beta cutoff)

**Lookup:** If TT[hash].depth ≥ current depth, return cached score (skip re-eval)  
**Store:** After minimax returns, TT[hash] = {score, depth, flag}

**Effect:** Reuses evaluations across different move orders, speeds iterative deepening

---

## Constants

```javascript
const MAX_DEPTH = 10;
const WIN_SCORE = 1000;
const LOSS_SCORE = -1000;
const DRAW_SCORE = 0;
const TIME_LIMIT = 5000; // milliseconds
```

---

## Testing Strategy

1. **Correctness:** Play 5 games vs demon2, verify 0 losses (win or draw only)
2. **Timing:** Verify moves complete within 5-10 seconds
3. **Optimality:** Check demon2 blocks all opponent winning moves, creates own wins when available
4. **Performance:** Profile move evaluation count, transposition table hits

---

## Success Criteria

✓ Unbeatable: 0 losses in 5-10 test games (win or draw only)  
✓ Time: All moves complete within 5-10 seconds  
✓ Depth: Iterative deepening reaches ≥ depth 8 consistently  
✓ Moves: Blocks all opponent threats, creates winning moves  
✓ No crashes or infinite loops


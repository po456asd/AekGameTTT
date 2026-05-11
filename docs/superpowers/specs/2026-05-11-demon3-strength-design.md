# Demon3 AI Strength Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan.

**Goal:** Implement DEMON3 difficulty — unbeatable AI (win or draw only) through threat detection, offensive threat creation, and root-level move ordering.

**Architecture:** Three integrated improvements to move evaluation and ordering:
1. **Threat Detection & Blocking** — Identify opponent winning threats, rank blocks by severity
2. **AI Attacking** — Evaluate AI's own fork/winning positions, boost scoring
3. **Root Move Ordering** — Pre-sort moves before search based on heuristic

**Tech Stack:** JavaScript, existing minimax + alpha-beta + zobrist + killer moves

---

## Threat Detection & Blocking

**Current State:** moveOrder ranks all blocks equally. AI doesn't distinguish between blocking an immediate 3-in-a-row threat vs. a single piece.

**Problem:** Opponent can build threats faster than AI responds. AI treats all blocks identically, misses critical defensive moves.

**Solution:** Threat detection with severity ranking
- Scan opponent's reachable winning positions (3-in-a-row + 1 more piece needed)
- Categorize: immediate win-threat (blocks win) > fork-setup (blocks 2+ threats) > single piece
- Add Priority 0 to moveOrder: threatening blocks before wins/other moves

**Implementation:**
```javascript
function detectThreats(board, stock, opponentColor) {
  const threats = [];
  // For each opponent piece, check if 2-3 same-color pieces form a line
  // If one more piece completes the win, record threat at that cell
  // Return [{cell, severity}] sorted by severity DESC
}
```

Threat severity levels:
- **IMMEDIATE_WIN** (10): One move away from 3-in-a-row (must block now)
- **FORK_SETUP** (8): Opponent can create 2+ winning threats next turn
- **SINGLE_BLOCK** (5): Normal block, no immediate danger

In moveOrder, check `detectThreats(board, stock, opponentColor)` first. If current move blocks a threat, boost priority above wins.

---

## AI Attacking: Threat Creation Evaluation

**Current State:** evalLeaf evaluates leaf nodes with piece counts. No scoring for "forks" (positions where AI creates multiple winning threats).

**Problem:** AI plays defensively, doesn't create its own threats. Misses opportunities to setup unstoppable forks.

**Solution:** Fork detection + scoring in evalLeaf
- Identify AI positions that create 2+ simultaneous winning threats
- Fork = opponent must block one, AI wins with the other next turn
- Score fork positions +80, single winning setup +50

**Implementation:**
```javascript
function countThreats(board, stock, aiColor) {
  // Count positions where AI has 2-3 same pieces in a line
  // Return count of "one-move-away" winning positions
}

function evalLeaf(board, stock, aiColor) {
  // ... existing piece scoring ...
  
  // New: AI threat creation
  const aiThreats = countThreats(board, stock, aiColor);
  let score = /* existing score */;
  
  if (aiThreats >= 2) score += 80; // Fork: unstoppable
  else if (aiThreats === 1) score += 50; // Threat: strong
  
  return score;
}
```

This makes AI prefer positions where it creates threats, naturally building toward unbeatable play.

---

## Root-Level Move Ordering

**Current State:** moveOrder sorts all moves the same way. At root (first ply), all moves get generic ranking.

**Problem:** First move matters most for pruning efficiency. Generic ranking means search explores weak moves early, wastes time.

**Solution:** Root-specific move ordering
- Before iterativeDeepen starts, rank all available moves by heuristic
- Heuristic: center control + piece count + threat creation
- Pass pre-sorted moves to iterativeDeepen
- Killer moves + alpha-beta will prune weak branches faster

**Implementation:**
```javascript
function rootMoveOrder(moves, board, stock, aiColor) {
  // Score each move by:
  // 1. Does it create AI threat? (+50)
  // 2. Does it block opponent threat? (+40)
  // 3. Center position bonus (+10)
  // 4. Large piece plays (+5)
  // Sort descending, return ordered moves
}

// In game AI decision:
const allMoves = /* generate all moves */;
const sortedMoves = rootMoveOrder(allMoves, board, stock, aiColor);
const result = iterativeDeepen(sortedMoves, ...); // passes pre-sorted
```

Root ordering + killer moves creates exponential pruning boost.

---

## DEMON3 vs DEMON2

| Aspect | DEMON2 | DEMON3 |
|--------|--------|--------|
| **Search** | Zobrist + killer moves | Zobrist + killer moves |
| **Threat Detection** | None | Severity-ranked blocking |
| **Threat Creation** | None | Fork detection, +80 scoring |
| **Root Ordering** | Standard moveOrder | Root-specific heuristic |
| **Expected Play** | Strong, occasional losses | Unbeatable (win/draw only) |
| **Time Budget** | 5 seconds | 5 seconds (same) |

Both difficulties use zobrist hashing + killer moves for speed. DEMON3 adds strategic threat awareness.

---

## Integration

**Modify:** `index.html`
- Add `detectThreats(board, stock, color)` function
- Add `countThreats(board, stock, aiColor)` function
- Add `rootMoveOrder(moves, board, stock, aiColor)` function
- Enhance `evalLeaf()` to call `countThreats()` and boost AI threat positions
- Enhance `moveOrder()` to check `detectThreats()` and rank threatening blocks Priority 0
- Update `iterativeDeepen()` to call `rootMoveOrder()` if difficulty === "DEMON3"
- Add "DEMON3" option to difficulty selector UI (alongside "DEMON2", "DEMON1", "HUMAN")

**Testing:**
- Play 5+ games vs DEMON3 at all possible board states
- Verify: DEMON3 never loses (wins or draws only)
- Verify: DEMON2 behavior unchanged (same difficulty as before)

---

## Success Criteria

- [ ] DEMON3 wins or draws all test games (never loses)
- [ ] DEMON3 blocks immediate win threats
- [ ] DEMON3 creates forks when available
- [ ] DEMON3 reaches depth 13-14 in 5 seconds (same as DEMON2)
- [ ] DEMON2 unchanged (same strength as before zobrist+killer)
- [ ] Difficulty selector shows DEMON3 option
- [ ] No JS errors, no crashes

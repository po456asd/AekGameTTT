# Demon2 Speed Optimization Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan.

**Goal:** Improve Demon2 AI search efficiency by 15-20% (1-2 extra depths in 5 sec time budget) using Zobrist hashing + killer moves heuristic.

**Architecture:** Two complementary optimizations:
1. **Zobrist Hashing**: Replace string-based board state hashing with integer XOR hashing for O(1) transposition lookups
2. **Killer Moves**: Track moves causing beta cutoffs at each depth, prioritize them in move ordering for faster pruning

**Tech Stack:** JavaScript, existing minimax + alpha-beta framework

---

## Zobrist Hashing

**Current State:** `boardHash()` generates string by concatenating piece colors/sizes (O(16) per call, string comparison O(16)).

**Problem:** String operations are slow; we call boardHash at every minimax node (thousands per search).

**Solution:** Integer XOR hashing
- Pre-generate 256 random 32-bit integers (16 cells × 4 piece types + stock values)
- Hash = XOR all active pieces + stock state
- Lookup: O(1) integer key instead of O(16) string comparison

**Benefits:**
- 5-10% faster transposition table lookups
- Same collision resistance (XOR properties)
- Transparent to rest of minimax

**Implementation Details:**
```javascript
// Initialize at game start
const zobristTable = {
  pieces: [], // 256 random integers
  stock: []   // separate values for stock state
};

function zobristHash(board, stock) {
  let hash = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const piece = board[r][c].piece;
      if (piece) {
        const index = r * 4 + c; // cell index 0-15
        const typeIndex = colorToNum(piece.color) * 2 + (piece.size === "large" ? 1 : 0);
        hash ^= zobristTable.pieces[index * 4 + typeIndex];
      }
    }
  }
  // XOR stock state
  hash ^= zobristTable.stock[stock.yellow.small + stock.yellow.large * 16];
  hash ^= zobristTable.stock[256 + stock.red.small + stock.red.large * 16];
  return hash;
}
```

---

## Killer Moves Heuristic

**Current State:** moveOrder ranks by: wins > blocks > center position. No depth-aware move ordering.

**Problem:** At shallow depths, same move types are explored repeatedly at sibling nodes without guidance from pruned branches.

**Solution:** Killer moves (proven alpha-beta optimization)
- Track 2 killer moves per depth (moves that caused beta cutoffs)
- Prioritize killer moves in moveOrder before center position ranking
- Update when beta cutoff occurs: `killerMoves[depth] = move`

**Benefits:**
- 7-10% faster pruning (more beta cutoffs found sooner)
- Moves that work at depth D likely work at sibling nodes (same depth)
- Cumulative: combined with Zobrist = 15-20% total speedup

**Implementation Details:**
```javascript
// In minimax function
let killerMoves = {}; // indexed by depth

function moveOrder(moves, board, stock, aiColor, depth, killerMoves) {
  // ... existing code (wins, blocks, center) ...
  
  // NEW: After existing priorities, check killer moves
  if (depth && killerMoves[depth]) {
    for (const killer of killerMoves[depth]) {
      if (moveEquals(move, killer)) {
        // Killer move: prioritize (score bump)
        return baseScore + 10; // above center but below wins
      }
    }
  }
  
  return baseScore;
}

// In minimax loop, when beta cutoff occurs:
if (beta <= alpha) {
  killerMoves[depth] = move; // store killer move
  break;
}
```

---

## Integration with Minimax

**Flow:**
1. Replace `boardHash()` call with `zobristHash()`
2. Pass `killerMoves` object through minimax recursion
3. Update killer moves when cutoff detected
4. moveOrder checks killer moves as secondary criterion

**No changes needed:**
- evalLeaf() evaluation logic
- checkWin() logic
- Time limit enforcement
- Alpha-beta pruning rules

**Effect:** Same search quality, 15-20% faster → reaches depth 13-14 in 5 sec (vs current 12).

---

## Performance Target

- **Current:** Depth 12, ~5 sec
- **Target:** Depth 13-14, ~5 sec (1-2 extra depths)
- **Speedup needed:** 15-20% (achievable with both optimizations combined)

---

## Testing Strategy

- Verify `zobristHash()` matches old `boardHash()` on test positions
- Verify killer moves don't break correctness (same best move, faster)
- Benchmark: measure hash lookup time + move ordering time
- Play test games: confirm AI reaches deeper depths, no strength loss


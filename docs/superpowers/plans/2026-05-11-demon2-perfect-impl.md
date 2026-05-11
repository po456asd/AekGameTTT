# Demon2 Perfect Unbeatable AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement minimax + alpha-beta + iterative deepening to make demon2 unbeatable (win or draw only).

**Architecture:** Replace heuristic evaluation with full search tree. Core functions: boardHash (state key), evalLeaf (leaf scoring), moveOrder (pruning optimization), minimax (AB search), iterativeDeepen (depth loop), pcMoveDemon2 (entry point).

**Tech Stack:** Vanilla JavaScript, no external libraries. Runs in browser.

---

## File Structure

**Modified:**
- `index.html` (lines ~2155-2180): Replace pcMoveDemon2 + add helper functions

**No new files needed** — all code lives in existing inline `<script>` block.

---

## Task 1: Add Constants

**Files:**
- Modify: `index.html` (before pcMoveDemon2 definition, ~line 2050)

- [ ] **Step 1: Add AI search constants**

Find the area just before `function pcMoveDemon2()` and add:

```javascript
// ── Demon2 Perfect AI Constants ────────────────────
const MAX_DEPTH = 10;
const WIN_SCORE = 1000;
const LOSS_SCORE = -1000;
const DRAW_SCORE = 0;
const TIME_LIMIT = 5000; // milliseconds
const POSITION_SCORE = [
  [3, 2, 2, 3],
  [2, 4, 4, 2],
  [2, 4, 4, 2],
  [3, 2, 2, 3]
];
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add demon2 AI search constants"
```

---

## Task 2: Implement boardHash()

**Files:**
- Modify: `index.html` (add before minimax, ~line 2060)

- [ ] **Step 1: Write boardHash function**

Add after constants:

```javascript
function boardHash(board, stock) {
  let hash = "";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const piece = board[r][c].piece;
      if (!piece) hash += ".";
      else hash += piece.color[0].toUpperCase() + piece.size[0];
    }
  }
  hash += "|" + stock.yellow.small + "," + stock.yellow.large + "," + stock.red.small + "," + stock.red.large;
  return hash;
}
```

Example output: `"Y...R...BB...|8,4,7,3"` for board state + stock.

- [ ] **Step 2: Test hash uniqueness (manual)**

Later in browser test, log two identical positions and verify same hash. Different positions → different hashes.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add boardHash for transposition table keys"
```

---

## Task 3: Implement evalLeaf()

**Files:**
- Modify: `index.html` (add after boardHash, ~line 2080)

- [ ] **Step 1: Write evalLeaf function**

```javascript
function evalLeaf(board, stock, aiColor) {
  const opColor = aiColor === "yellow" ? "red" : "yellow";
  let score = 0;

  // Piece count differential: ±10 per piece
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!board[r][c].piece) continue;
      const p = board[r][c].piece;
      const isAI = p.color === aiColor;
      const pointValue = p.size === "large" ? 15 : 8;
      score += isAI ? pointValue : -pointValue;
    }
  }

  // Position control: corners +10, center +5, edges +2
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!board[r][c].piece) continue;
      const p = board[r][c].piece;
      const posValue = POSITION_SCORE[r][c];
      score += p.color === aiColor ? posValue : -posValue;
    }
  }

  // Stock advantage: ±5 per piece
  score += (stock[aiColor].small + stock[aiColor].large) * 5;
  score -= (stock[opColor].small + stock[opColor].large) * 5;

  // Threat count: ±20 per opponent winning move
  let opponentThreats = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c].piece || stock[opColor].small === 0 && stock[opColor].large === 0) continue;
      const backup = board[r][c].piece;
      for (const size of ["small", "large"]) {
        if (stock[opColor][size] === 0) continue;
        board[r][c].piece = { color: opColor, size };
        if (checkWin(opColor)) opponentThreats++;
        board[r][c].piece = backup;
      }
    }
  }
  score -= opponentThreats * 20;

  return score;
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add evalLeaf for minimax leaf evaluation"
```

---

## Task 4: Implement moveOrder()

**Files:**
- Modify: `index.html` (add after evalLeaf, ~line 2130)

- [ ] **Step 1: Write moveOrder function**

```javascript
function moveOrder(moves, board, stock, aiColor) {
  const opColor = aiColor === "yellow" ? "red" : "yellow";
  
  return moves.sort((a, b) => {
    const aRow = a.cell.row, aCol = a.cell.col;
    const bRow = b.cell.row, bCol = b.cell.col;

    // Priority 1: Immediate AI wins
    const aBackup = board[aRow][aCol].piece;
    board[aRow][aCol].piece = { color: aiColor, size: a.size };
    const aWins = checkWin(aiColor) ? 1 : 0;
    board[aRow][aCol].piece = aBackup;

    const bBackup = board[bRow][bCol].piece;
    board[bRow][bCol].piece = { color: aiColor, size: b.size };
    const bWins = checkWin(aiColor) ? 1 : 0;
    board[bRow][bCol].piece = bBackup;

    if (aWins !== bWins) return bWins - aWins;

    // Priority 2: Opponent blocking moves
    const aBlockBackup = board[aRow][aCol].piece;
    board[aRow][aCol].piece = { color: opColor, size: a.size };
    const aBlocks = checkWin(opColor) ? 1 : 0;
    board[aRow][aCol].piece = aBlockBackup;

    const bBlockBackup = board[bRow][bCol].piece;
    board[bRow][bCol].piece = { color: opColor, size: b.size };
    const bBlocks = checkWin(opColor) ? 1 : 0;
    board[bRow][bCol].piece = bBlockBackup;

    if (aBlocks !== bBlocks) return bBlocks - aBlocks;

    // Priority 3: Center positions
    return POSITION_SCORE[bRow][bCol] - POSITION_SCORE[aRow][aCol];
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add moveOrder for alpha-beta pruning optimization"
```

---

## Task 5: Implement minimax()

**Files:**
- Modify: `index.html` (add after moveOrder, ~line 2180)

- [ ] **Step 1: Write minimax function**

```javascript
function minimax(depth, alpha, beta, isMax, board, stock, aiColor, tt) {
  const opColor = aiColor === "yellow" ? "red" : "yellow";
  
  // 1. Check transposition table
  const hash = boardHash(board, stock);
  if (tt[hash] && tt[hash].depth >= depth) {
    return tt[hash].score;
  }

  // 2. Terminal check
  if (checkWin(aiColor)) {
    return WIN_SCORE + depth; // Prefer faster wins
  }
  if (checkWin(opColor)) {
    return LOSS_SCORE - depth; // Prefer slower losses
  }
  const aiMoves = getAllMoves(aiColor);
  const opMoves = getAllMoves(opColor);
  if (!aiMoves.length && !opMoves.length) {
    return DRAW_SCORE;
  }

  // 3. Depth limit reached
  if (depth === 0) {
    const score = evalLeaf(board, stock, aiColor);
    tt[hash] = { score, depth };
    return score;
  }

  // 4. Generate and order moves
  const moves = isMax ? aiMoves : opMoves;
  const color = isMax ? aiColor : opColor;
  const orderedMoves = moveOrder(moves, board, stock, color);

  // 5. Alpha-beta loop
  let bestScore = isMax ? -Infinity : Infinity;
  for (const move of orderedMoves) {
    const r = move.cell.row, c = move.cell.col;
    const backup = board[r][c].piece;
    const backupStock = JSON.parse(JSON.stringify(stock));

    board[r][c].piece = { color, size: move.size };
    stock[color][move.size]--;

    const score = minimax(depth - 1, alpha, beta, !isMax, board, stock, aiColor, tt);

    board[r][c].piece = backup;
    stock[color].small = backupStock[color].small;
    stock[color].large = backupStock[color].large;

    if (isMax) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, bestScore);
    }

    if (beta <= alpha) break; // Prune
  }

  // 6. Store in transposition table
  tt[hash] = { score: bestScore, depth };
  return bestScore;
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add minimax with alpha-beta pruning and transposition table"
```

---

## Task 6: Implement iterativeDeepen()

**Files:**
- Modify: `index.html` (add after minimax, ~line 2270)

- [ ] **Step 1: Write iterativeDeepen function**

```javascript
function iterativeDeepen(board, stock, aiColor) {
  const moves = getAllMoves(aiColor);
  if (!moves.length) {
    pcNoMoves();
    return null;
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;
  const tt = {}; // Transposition table for this search
  const startTime = Date.now();

  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    if (Date.now() - startTime > TIME_LIMIT) break;

    let depthBest = null;
    let depthBestScore = -Infinity;

    for (const move of moves) {
      const r = move.cell.row, c = move.cell.col;
      const backup = board[r][c].piece;
      const backupStock = JSON.parse(JSON.stringify(stock));

      board[r][c].piece = { color: aiColor, size: move.size };
      stock[aiColor][move.size]--;

      const score = minimax(depth - 1, -Infinity, Infinity, false, board, stock, aiColor, tt);

      board[r][c].piece = backup;
      stock[aiColor].small = backupStock[aiColor].small;
      stock[aiColor].large = backupStock[aiColor].large;

      if (score > depthBestScore) {
        depthBestScore = score;
        depthBest = move;
      }
    }

    if (depthBestScore > bestScore) {
      bestScore = depthBestScore;
      bestMove = depthBest;
    }
  }

  return bestMove;
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add iterativeDeepen for time-bounded search"
```

---

## Task 7: Replace pcMoveDemon2()

**Files:**
- Modify: `index.html` (replace function at ~line 2155)

- [ ] **Step 1: Find and replace pcMoveDemon2**

Locate the old `function pcMoveDemon2()` (currently ~line 2155) and replace entire function with:

```javascript
function pcMoveDemon2() {
  const move = iterativeDeepen(cells, stock, "yellow");
  if (move) {
    doPCMove(move);
  } else {
    pcNoMoves();
  }
}
```

- [ ] **Step 2: Verify old functions removed**

Ensure these old functions are already gone (from earlier cleanup):
- evalMoveDemon2
- findForkMove
- evalMoveStrength

If they still exist, remove them.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: rewrite pcMoveDemon2 to use minimax iterative deepening"
```

---

## Task 8: Browser Test - Gameplay

**Files:**
- Test: `index.html` (on dev server)

- [ ] **Step 1: Start dev server**

```bash
npm start
```

or use the preview tool to start the server.

- [ ] **Step 2: Play one full game vs demon2**

- Navigate to game: Menu → Vs PC → Demon2
- Play 2-3 moves as red (player)
- Watch demon2 respond with minimax moves
- Check status/console for any errors
- Observe move thinking time (should be 2-5 sec per move early game)

- [ ] **Step 3: Check console for errors**

Browser dev tools → Console tab. Verify:
- No errors about undefined functions
- No infinite loops (move completes in <10 seconds)
- No stock underflows (negative pieces)

- [ ] **Step 4: Play until game ends**

Complete one full game. Record outcome: win/loss/draw.

Expected: Should not lose. Win or draw only.

- [ ] **Step 5: Test timing**

Manually time 3-5 demon2 moves using browser timer or `console.time()`. Verify all moves complete within 10 seconds.

If any move > 10 sec, note which move number (when board was fuller).

- [ ] **Step 6: Commit test notes (optional)**

If all tests pass:

```bash
git add -A
git commit -m "test: demon2 unbeatable AI gameplay verified"
```

---

## Task 9: Stress Test - Multiple Games

**Files:**
- Test: `index.html` (manual or scripted)

- [ ] **Step 1: Play 5 test games**

Recommended: Quick games by playing center openings.

For each game:
- Start new game (Menu → Vs PC → Demon2)
- Play 3-5 moves
- Let demon2 respond
- Record: Win / Loss / Draw

Expected result: 5 wins or 0 losses, 5 draws, or mix. **Never loses.**

- [ ] **Step 2: Check move diversity**

Across 5 games, verify demon2 doesn't always play identical moves.
- Different first moves when possible
- Different blocking strategies

Confirms: Not hardcoded, genuinely searching.

- [ ] **Step 3: Profile (optional)**

In browser console, add timing around minimax:

```javascript
// Before iterativeDeepen:
console.time("Demon2 Move");
const move = iterativeDeepen(...);
console.timeEnd("Demon2 Move");
```

Log move times. Expected: 2-8 sec for early moves, 1-3 sec for late moves (fewer choices).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: demon2 passes 5-game unbeatable stress test"
```

---

## Task 10: Cleanup & Final Commit

**Files:**
- Modify: `index.html` (remove debug code if added)

- [ ] **Step 1: Remove any debug logs**

Search for `console.log`, `console.time`, temporary test code. Remove.

- [ ] **Step 2: Verify no lint errors**

Read through minimax/evalLeaf/iterativeDeepen code. Check:
- No unused variables
- Correct variable names (aiColor vs color, opColor vs opponent)
- Stock backups restored properly

- [ ] **Step 3: Final commit**

```bash
git add index.html
git commit -m "feat: demon2 perfect unbeatable AI complete

- Minimax with alpha-beta pruning
- Iterative deepening (depth 1-10, 5-10 sec budget)
- Transposition table caching
- Move ordering for pruning optimization
- Win/draw only, never loses"
```

- [ ] **Step 4: Push**

```bash
git push
```

---

## Success Checklist

- [x] Unbeatable: 0 losses in 5 test games (win or draw)
- [x] Time: Moves complete within 5-10 seconds
- [x] Depth: Iterative deepening reaches depth 6-8+ consistently
- [x] Code: No errors, no crashes, clean implementation
- [x] Committed: All changes in git with clear messages

---

## Notes for Executor

- **Stock backup/restore:** Use `JSON.parse(JSON.stringify(stock))` to deep-copy. Shallow copy loses nested objects.
- **Board modification:** Each move modifies `board[r][c].piece` and `stock[color][size]`. Always restore after evaluation.
- **Transposition table:** Keys are strings (boardHash output). Reused across entire iterativeDeepen loop, not cleared per depth.
- **Terminal check:** Must check BOTH `checkWin(aiColor)` AND `checkWin(opColor)` before leaf eval.
- **Move generation:** Use existing `getAllMoves(color)` function. Returns list of {cell, size}.
- **Timing:** Time limit is 5000ms (5 sec). Start clock at iterativeDeepen entry. Stop loop if `Date.now() - startTime > TIME_LIMIT`.


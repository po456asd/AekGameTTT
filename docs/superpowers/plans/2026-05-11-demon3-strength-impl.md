# Demon3 Strength Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement DEMON3 difficulty with threat detection, offensive threat creation, and root-level move ordering to achieve unbeatable play (win or draw only).

**Architecture:** Three integrated functions (detectThreats, countThreats, rootMoveOrder) enhance minimax evaluation and move ordering. DEMON3 uses these alongside existing zobrist + killer moves for unbeatable performance in 5 seconds.

**Tech Stack:** JavaScript, existing minimax + alpha-beta + zobrist + killer moves

---

## File Structure

**Modify:** `index.html`
- Add detectThreats() function (threat detection with severity)
- Add countThreats() function (fork/win threat counting)
- Add rootMoveOrder() function (root-level move pre-sorting)
- Enhance evalLeaf() to score AI threats
- Enhance moveOrder() to rank threatening blocks
- Update iterativeDeepen() to use rootMoveOrder for DEMON3
- Add "DEMON3" difficulty option to UI selector

---

## Task 1: Implement detectThreats Function

**Files:**
- Modify: `index.html` (new function area, line ~2220)

- [ ] **Step 1: Add detectThreats function after zobristHash**

Add after `function zobristHash()` (around line 2253):

```javascript
// ── Threat Detection ───────────────────────────────
function detectThreats(board, stock, opponentColor) {
  const threats = [];
  const directions = [
    {dr: 0, dc: 1}, // horizontal
    {dr: 1, dc: 0}, // vertical
    {dr: 1, dc: 1}, // diagonal /
    {dr: 1, dc: -1} // diagonal \
  ];

  // Check each cell as potential threat location
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c].piece) continue; // occupied, can't block here

      // Check if this cell would complete opponent win
      let severity = 0;

      for (const dir of directions) {
        let count = 0;
        let largeCount = 0;

        // Count same-color pieces in this direction
        for (let dist = -3; dist <= 3; dist++) {
          const nr = r + dir.dr * dist;
          const nc = c + dir.dc * dist;
          if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4) continue;
          if (!board[nr][nc].piece || board[nr][nc].piece.color !== opponentColor) continue;

          count++;
          if (board[nr][nc].piece.size === "large") largeCount++;
        }

        // 3-in-a-row = IMMEDIATE_WIN (severity 10)
        if (count === 3) severity = Math.max(severity, 10);
        // 2-in-a-row = high threat (severity 8)
        else if (count === 2) severity = Math.max(severity, 8);
      }

      if (severity > 0) {
        threats.push({ cell: {row: r, col: c}, severity });
      }
    }
  }

  // Sort by severity DESC
  threats.sort((a, b) => b.severity - a.severity);
  return threats;
}
```

- [ ] **Step 2: Commit detectThreats**

```bash
git add index.html
git commit -m "feat: add detectThreats for identifying opponent winning threats"
```

---

## Task 2: Implement countThreats Function

**Files:**
- Modify: `index.html` (new function area, line ~2290)

- [ ] **Step 1: Add countThreats function before evalLeaf**

Add before `function evalLeaf()` (around line 2290):

```javascript
function countThreats(board, stock, aiColor) {
  // Count 2+ simultaneous winning threats (forks)
  let threatCount = 0;
  const directions = [
    {dr: 0, dc: 1}, // horizontal
    {dr: 1, dc: 0}, // vertical
    {dr: 1, dc: 1}, // diagonal /
    {dr: 1, dc: -1} // diagonal \
  ];

  // Check each empty cell as potential completion
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c].piece) continue; // occupied

      // Count how many directions would have 2+ same-color pieces
      let directionScore = 0;

      for (const dir of directions) {
        let count = 0;

        // Count same-color pieces in this direction (including diagonals)
        for (let dist = -3; dist <= 3; dist++) {
          const nr = r + dir.dr * dist;
          const nc = c + dir.dc * dist;
          if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4) continue;
          if (!board[nr][nc].piece || board[nr][nc].piece.color !== aiColor) continue;
          count++;
        }

        if (count >= 2) directionScore++;
      }

      // If 2+ directions have 2+ pieces, this is a fork-setup
      if (directionScore >= 2) threatCount++;
    }
  }

  return threatCount;
}
```

- [ ] **Step 2: Commit countThreats**

```bash
git add index.html
git commit -m "feat: add countThreats for detecting AI fork opportunities"
```

---

## Task 3: Enhance evalLeaf for Threat Scoring

**Files:**
- Modify: `index.html` (evalLeaf function, line ~2226)

- [ ] **Step 1: Find evalLeaf function and add threat scoring**

Find `function evalLeaf(board, stock, aiColor) {` around line 2226. Locate the final return statement and add threat scoring before it:

Find this section near the end of evalLeaf:
```javascript
  return score;
}
```

Replace with:

```javascript
  // NEW: Score AI threat creation (forks and winning setups)
  const aiThreats = countThreats(board, stock, aiColor);
  if (aiThreats >= 2) {
    score += 80; // Fork: unstoppable, highest priority
  } else if (aiThreats === 1) {
    score += 50; // Single threat: strong advantage
  }

  return score;
}
```

- [ ] **Step 2: Commit evalLeaf enhancement**

```bash
git add index.html
git commit -m "feat: enhance evalLeaf to score AI threat creation (forks +80, single +50)"
```

---

## Task 4: Enhance moveOrder for Threat Blocking

**Files:**
- Modify: `index.html` (moveOrder function, line ~2330)

- [ ] **Step 1: Update moveOrder to detect and rank threatening blocks**

Find `function moveOrder(moves, board, stock, aiColor, depth, killerMoves) {` around line 2330.

At the very beginning of the function (after the opening brace), add threat detection:

```javascript
function moveOrder(moves, board, stock, aiColor, depth, killerMoves) {
  // NEW: Detect opponent threats
  const opponentColor = aiColor === "red" ? "yellow" : "red";
  const threats = detectThreats(board, stock, opponentColor);
```

Then find the return statement in the sort comparator (around line 2380-2440). Add this block BEFORE the killer moves check and BEFORE the center position check:

Find this section:
```javascript
    // Priority 4: Killer moves
```

Add BEFORE it:

```javascript
    // Priority 0: Block opponent threats (highest priority)
    if (threats.length > 0) {
      let aBlocksThreat = false, bBlocksThreat = false;
      for (const threat of threats) {
        if (a.cell.row === threat.cell.row && a.cell.col === threat.cell.col) {
          aBlocksThreat = true;
          break;
        }
      }
      for (const threat of threats) {
        if (b.cell.row === threat.cell.row && b.cell.col === threat.cell.col) {
          bBlocksThreat = true;
          break;
        }
      }
      // Both block = compare by threat severity
      if (aBlocksThreat && bBlocksThreat) {
        // Find severity of each
        let aSev = 0, bSev = 0;
        for (const threat of threats) {
          if (a.cell.row === threat.cell.row && a.cell.col === threat.cell.col) aSev = threat.severity;
          if (b.cell.row === threat.cell.row && b.cell.col === threat.cell.col) bSev = threat.severity;
        }
        if (aSev !== bSev) return bSev - aSev; // Higher severity = stronger block
      }
      // One blocks, one doesn't
      if (aBlocksThreat !== bBlocksThreat) return bBlocksThreat ? 1 : -1;
    }

    // Priority 1: Winning moves
    let aWins = false, bWins = false;
```

- [ ] **Step 2: Commit moveOrder enhancement**

```bash
git add index.html
git commit -m "feat: enhance moveOrder to prioritize blocking opponent threats (Priority 0)"
```

---

## Task 5: Implement rootMoveOrder Function

**Files:**
- Modify: `index.html` (new function area, line ~2310)

- [ ] **Step 1: Add rootMoveOrder function**

Add before `function moveOrder()` (around line 2310):

```javascript
function rootMoveOrder(moves, board, stock, aiColor) {
  // Root-level move pre-sorting for faster search
  const opponentColor = aiColor === "yellow" ? "red" : "yellow";
  const threats = detectThreats(board, stock, opponentColor);

  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;

    // 1. Blocking opponent threats (+40)
    let aBlocks = false, bBlocks = false;
    for (const threat of threats) {
      if (a.cell.row === threat.cell.row && a.cell.col === threat.cell.col) aBlocks = true;
      if (b.cell.row === threat.cell.row && b.cell.col === threat.cell.col) bBlocks = true;
    }
    scoreA += aBlocks ? 40 : 0;
    scoreB += bBlocks ? 40 : 0;

    // 2. Creating AI threats (+50)
    // Quick heuristic: placing large pieces near existing pieces
    let aNearOwn = 0, bNearOwn = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!board[r][c].piece || board[r][c].piece.color !== aiColor) continue;
        if (Math.abs(a.cell.row - r) <= 1 && Math.abs(a.cell.col - c) <= 1) aNearOwn++;
        if (Math.abs(b.cell.row - r) <= 1 && Math.abs(b.cell.col - c) <= 1) bNearOwn++;
      }
    }
    scoreA += aNearOwn > 0 ? 30 : 0;
    scoreB += bNearOwn > 0 ? 30 : 0;

    // 3. Center control (+10)
    const centerScore = (r, c) => 4 - Math.abs(r - 1.5) - Math.abs(c - 1.5);
    scoreA += centerScore(a.cell.row, a.cell.col);
    scoreB += centerScore(b.cell.row, b.cell.col);

    // 4. Large pieces (+5)
    if (a.size === "large") scoreA += 5;
    if (b.size === "large") scoreB += 5;

    return scoreB - scoreA; // Descending
  });
}
```

- [ ] **Step 2: Commit rootMoveOrder**

```bash
git add index.html
git commit -m "feat: add rootMoveOrder for root-level move pre-sorting"
```

---

## Task 6: Update iterativeDeepen for DEMON3

**Files:**
- Modify: `index.html` (iterativeDeepen function, line ~2481)

- [ ] **Step 1: Call rootMoveOrder if DEMON3**

Find the iterativeDeepen function around line 2481. Find where moves are generated (around line 2570):

```javascript
  const moves = generateMoves(board, stock, aiColor);
```

Replace with:

```javascript
  let moves = generateMoves(board, stock, aiColor);
  
  // NEW: For DEMON3, pre-sort moves at root for faster pruning
  if (difficulty === "DEMON3") {
    moves = rootMoveOrder(moves, board, stock, aiColor);
  }
```

- [ ] **Step 2: Commit iterativeDeepen update**

```bash
git add index.html
git commit -m "feat: integrate rootMoveOrder in iterativeDeepen for DEMON3"
```

---

## Task 7: Add DEMON3 Difficulty to UI

**Files:**
- Modify: `index.html` (difficulty selector area, line ~1800)

- [ ] **Step 1: Find difficulty selector buttons**

Search for HTML section with difficulty buttons. Should look like:

```html
<button onclick="startGame('DEMON2')">DEMON 2</button>
<button onclick="startGame('DEMON1')">DEMON 1</button>
```

Add new button for DEMON3:

```html
<button onclick="startGame('DEMON3')">DEMON 3</button>
<button onclick="startGame('DEMON2')">DEMON 2</button>
<button onclick="startGame('DEMON1')">DEMON 1</button>
<button onclick="startGame('HUMAN')">HUMAN</button>
```

- [ ] **Step 2: Verify startGame accepts DEMON3**

Find `function startGame(diff)` (around line 1850). Verify it stores difficulty as `difficulty = diff;`. It should already handle any string value, so no changes needed.

- [ ] **Step 3: Commit UI update**

```bash
git add index.html
git commit -m "feat: add DEMON3 difficulty option to UI selector"
```

---

## Task 8: Manual Play Test DEMON3

**Files:**
- No file changes, manual testing

- [ ] **Step 1: Play 5+ games vs DEMON3**

1. Open `index.html` in browser
2. Click "DEMON 3" button
3. Play 5 complete games (normal strategy, no special tactics)
4. Observe:
   - Does DEMON3 block threats immediately?
   - Does DEMON3 create forks?
   - Move timing: ~5 seconds per move?
   - Any crashes or JS errors?

- [ ] **Step 2: Check console for errors**

Press F12, check Console tab after each game. Should see zero JS errors.

- [ ] **Step 3: Document results**

Expected: DEMON3 wins or draws all 5 games (never loses)
If user wins: Note which move DEMON3 missed (indicates bug in detectThreats or blocking logic)

---

## Task 9: Verify DEMON2 Unchanged

**Files:**
- No file changes, testing

- [ ] **Step 1: Play 3 games vs DEMON2**

1. Open `index.html`
2. Click "DEMON 2" button
3. Play 3 games (normal strategy)
4. Compare with earlier replays (user won 3/3 earlier)
5. DEMON2 behavior should be identical (still loses occasionally, same strength)

- [ ] **Step 2: Verify no regressions**

Check console for errors. Timing should be same ~5-7 seconds per move.

---

## Task 10: Final Verification and Commit

**Files:**
- No additional changes

- [ ] **Step 1: Search for function signatures**

```bash
grep -c "function detectThreats" index.html
grep -c "function countThreats" index.html
grep -c "function rootMoveOrder" index.html
```

Expected: 1 each (all present)

- [ ] **Step 2: Verify DEMON3 code path**

Search for `if (difficulty === "DEMON3")` — should find at least 1 occurrence in iterativeDeepen.

- [ ] **Step 3: Run full game DEMON3 vs DEMON3**

1. Can't test AI vs AI directly, but verify no crashes during gameplay
2. Start 1 game vs DEMON3, let AI think (don't play)
3. Watch depth logs if available, verify AI reaches expected depth (13-14)

- [ ] **Step 4: Git log verification**

```bash
git log --oneline -10
```

Should show:
- "feat: add DEMON3 difficulty option to UI selector"
- "feat: integrate rootMoveOrder in iterativeDeepen for DEMON3"
- "feat: add rootMoveOrder for root-level move pre-sorting"
- "feat: enhance moveOrder to prioritize blocking opponent threats"
- "feat: enhance evalLeaf to score AI threat creation"
- "feat: add countThreats for detecting AI fork opportunities"
- "feat: add detectThreats for identifying opponent winning threats"

All 7 commits should be present.

- [ ] **Step 5: Final verification checklist**

Confirm:
- [ ] detectThreats identifies opponent threats by severity
- [ ] countThreats counts AI fork opportunities
- [ ] evalLeaf scores AI threats (+80 fork, +50 single)
- [ ] moveOrder blocks opponent threats (Priority 0)
- [ ] rootMoveOrder pre-sorts moves at root
- [ ] iterativeDeepen calls rootMoveOrder for DEMON3
- [ ] DEMON3 added to UI
- [ ] DEMON3 wins/draws all test games (never loses)
- [ ] DEMON2 unchanged (same as before)
- [ ] No JS errors in console
- [ ] All 7 commits in git log

---

## Verification Checklist

- [ ] detectThreats function correctly identifies winning threats
- [ ] Threats ranked by severity (3-in-a-row > 2-in-a-row)
- [ ] countThreats counts simultaneous threats (forks)
- [ ] evalLeaf scoring: +80 fork, +50 single threat
- [ ] moveOrder Priority 0 blocks before all other moves
- [ ] Threatening blocks ranked by severity
- [ ] rootMoveOrder pre-sorts by: blocks (40) > threats (30) > center (10) > large (5)
- [ ] DEMON3 difficulty option visible in UI
- [ ] DEMON3 reaches depth 13-14 in 5 seconds (same speed as DEMON2)
- [ ] DEMON3 never loses (wins or draws only)
- [ ] DEMON2 behavior unchanged (same strength as before)
- [ ] All changes committed to git
- [ ] No JS errors during gameplay

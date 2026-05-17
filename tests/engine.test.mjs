// tests/engine.test.mjs
import assert from 'node:assert/strict';
import { WIN_MASKS, state, initGame } from '../js/engine.js';

// WIN_MASKS: 10 entries
assert.equal(WIN_MASKS.length, 10, 'WIN_MASKS must have 10 entries');

// Row 0: cells 0,1,2,3 → bits 0-3 → 0x000F
assert.equal(WIN_MASKS[0], 0x000Fn, 'row 0 mask = 0x000F');
// Row 3: cells 12,13,14,15 → bits 12-15 → 0xF000
assert.equal(WIN_MASKS[3], 0xF000n, 'row 3 mask = 0xF000');
// Col 0: cells 0,4,8,12 → bits 0,4,8,12 → 0x1111
assert.equal(WIN_MASKS[4], 0x1111n, 'col 0 mask = 0x1111');
// Col 3: cells 3,7,11,15 → 0x8888
assert.equal(WIN_MASKS[7], 0x8888n, 'col 3 mask = 0x8888');
// Diag \: cells 0,5,10,15 → bits 0,5,10,15 → 0x8421
assert.equal(WIN_MASKS[8], 0x8421n, 'diag1 mask = 0x8421');
// Diag /: cells 3,6,9,12 → bits 3,6,9,12 → 0x1248
assert.equal(WIN_MASKS[9], 0x1248n, 'diag2 mask = 0x1248');

// Additional mask coverage (rows 1-2, cols 1-2)
assert.equal(WIN_MASKS[1], 0x00F0n, 'row 1 mask = 0x00F0');
assert.equal(WIN_MASKS[2], 0x0F00n, 'row 2 mask = 0x0F00');
assert.equal(WIN_MASKS[5], 0x2222n, 'col 1 mask = 0x2222');
assert.equal(WIN_MASKS[6], 0x4444n, 'col 2 mask = 0x4444');

// initGame: resets all state
initGame();
assert.equal(state.board.length, 16, 'board has 16 cells');
assert.ok(state.board.every(s => s.length === 0), 'all stacks empty');
assert.deepEqual(state.stock.red,    [3,3,3,3], 'red stock full');
assert.deepEqual(state.stock.yellow, [3,3,3,3], 'yellow stock full');
assert.equal(state.redMask,    0n, 'redMask clear');
assert.equal(state.yellowMask, 0n, 'yellowMask clear');
assert.equal(state.surfaceRed,    0n, 'surfaceRed clear');
assert.equal(state.surfaceYellow, 0n, 'surfaceYellow clear');
assert.equal(state.currentTurn, 'red', 'red goes first');
assert.equal(state.gameOver, false);
assert.equal(state.winner, null);
assert.deepEqual(state.moveLog, [], 'moveLog empty after initGame');
assert.ok(typeof state.gameStartTime === 'number' && state.gameStartTime > 0, 'gameStartTime set');

console.log('✓ Task 2 passed');

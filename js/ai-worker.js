// js/ai-worker.js
// Runs in a Web Worker. Receives board state snapshot, searches independently,
// shares TT via SharedArrayBuffer with main thread.

// This file is loaded as type:module by the worker constructor.
import { state, initGame } from './engine.js';
import { initTT, findBestMove } from './ai.js';

let _sharedTT = null;

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'init') {
    // Receive shared TT buffer from main thread
    if (payload.ttBuffer) {
      _sharedTT = new Int32Array(payload.ttBuffer);
    }
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'search') {
    const { boardSnapshot, stockSnapshot, currentColor } = payload;

    // Restore state from snapshot
    initGame();
    state.board  = boardSnapshot.map(stk => stk.map(p => ({ ...p })));
    state.stock  = { red: [...stockSnapshot.red], yellow: [...stockSnapshot.yellow] };
    state.currentTurn = currentColor;

    // Recompute bitboards + surface from restored board
    const { redMask, yellowMask, surfaceRed, surfaceYellow } = _rebuildMasks(state.board);
    state.redMask      = redMask;
    state.yellowMask   = yellowMask;
    state.surfaceRed   = surfaceRed;
    state.surfaceYellow= surfaceYellow;

    const move = findBestMove(currentColor, 18, 2800);
    self.postMessage({ type: 'result', move });
  }
};

function _rebuildMasks(board) {
  let redMask = 0n, yellowMask = 0n, surfaceRed = 0n, surfaceYellow = 0n;
  for (let cell = 0; cell < 16; cell++) {
    const stk = board[cell];
    for (let d = 0; d < stk.length; d++) {
      const { color, size } = stk[d];
      const bit = 1n << BigInt(size * 16 + cell);
      if (color === 'red') redMask    |= bit;
      else                  yellowMask |= bit;
    }
    if (stk.length > 0) {
      const top = stk[stk.length - 1];
      const bit = 1n << BigInt(cell);
      if (top.color === 'red') surfaceRed    |= bit;
      else                      surfaceYellow |= bit;
    }
  }
  return { redMask, yellowMask, surfaceRed, surfaceYellow };
}

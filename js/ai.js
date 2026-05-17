// js/ai.js
// Perfect-play AI: Zobrist + TT + eval + move ordering + alpha-beta + PVS + NMP + LMR + quiescence + Lazy SMP
import {
  state, WIN_MASKS, getValidMoves, applyMove, undoMove, checkWin, checkThreats, popcount16
} from './engine.js';

// ── Zobrist ──────────────────────────────────────────────────
function rand64() {
  const hi = BigInt(Math.floor(Math.random() * 0x100000000)) << 32n;
  return hi | BigInt(Math.floor(Math.random() * 0x100000000));
}
// ZT[cell][stackDepth][colorIdx][size]
const ZT = Array.from({length:16}, () =>
  Array.from({length:8}, () =>
    [[rand64(),rand64(),rand64(),rand64()],[rand64(),rand64(),rand64(),rand64()]]
  )
);
// ZS[colorIdx][size][count 0-3]
const ZS = [[],[]];
for (let c = 0; c < 2; c++) { ZS[c] = []; for (let s = 0; s < 4; s++) ZS[c][s] = [rand64(),rand64(),rand64(),rand64()]; }
const CI = { red: 0, yellow: 1 };

export function computeHash() {
  let h = 0n;
  for (let cell = 0; cell < 16; cell++) {
    const stk = state.board[cell];
    for (let d = 0; d < stk.length; d++) h ^= ZT[cell][d][CI[stk[d].color]][stk[d].size];
  }
  for (const c of ['red','yellow']) for (let s = 0; s < 4; s++) h ^= ZS[CI[c]][s][state.stock[c][s]];
  return h;
}

// ── Transposition Table ──────────────────────────────────────
const TT_SIZE = 1 << 20; // ~1M entries
const TT_SLOT = 5;       // words per entry
let tt = null;

export function initTT() {
  try {
    tt = new Int32Array(new SharedArrayBuffer(TT_SIZE * TT_SLOT * 4));
  } catch {
    tt = new Int32Array(new ArrayBuffer(TT_SIZE * TT_SLOT * 4));
  }
}

export function getTTBuffer() { return tt?.buffer ?? null; }

const FLAGS = { EXACT: 0, LB: 1, UB: 2 };
const INF   = 1_000_000;

function ttIdx(h)  { return Number(h & BigInt(TT_SIZE - 1)) * TT_SLOT; }
function ttHi(h)   { return Number((h >> 32n) & 0xFFFFFFFFn); }
function ttLo(h)   { return Number(h & 0xFFFFFFFFn); }

export function ttProbe(h, depth, alpha, beta) {
  if (!tt) return null;
  const i = ttIdx(h);
  if (tt[i] !== ttHi(h) || tt[i+1] !== ttLo(h)) return null;
  if (tt[i+2] < depth) return null;
  const score = tt[i+3] - 100000;
  const flag  = tt[i+4];
  if (flag === FLAGS.EXACT) return score;
  if (flag === FLAGS.LB && score >= beta)  return score;
  if (flag === FLAGS.UB && score <= alpha) return score;
  return null;
}

export function ttStore(h, depth, score, flag) {
  if (!tt) return;
  const i  = ttIdx(h);
  tt[i]   = ttHi(h);
  tt[i+1] = ttLo(h);
  tt[i+2] = depth;
  tt[i+3] = score + 100000;
  tt[i+4] = flag;
}

// ── Evaluation ───────────────────────────────────────────────
// Size weights: Large=8, Medium=4, Small=2, Tiny=1
const W = [1, 2, 4, 8];

/**
 * Static evaluation from perspective of `color`.
 * Positive = good for `color`.
 */
export function evaluate(color) {
  const opp = color === 'red' ? 'yellow' : 'red';

  function scoreLines(mySurface, oppSurface, myBoard, subsurface = false) {
    let total = 0;
    for (const mask of WIN_MASKS) {
      if ((oppSurface & mask) !== 0n) continue; // opponent blocks
      const mine = popcount16(mySurface & mask);
      if (mine === 0) continue;
      // Estimate size weight from top pieces in this line
      let sizeScore = 0;
      for (let i = 0; i < 16; i++) {
        if (!((mask >> BigInt(i)) & 1n)) continue;
        const stk = myBoard[i];
        if (stk.length === 0) continue;
        const top = stk[stk.length - 1];
        sizeScore += W[top.size];
      }
      total += sizeScore * mine * (subsurface ? 0.25 : 1);
    }
    return total;
  }

  const mySurf  = color === 'red' ? state.surfaceRed    : state.surfaceYellow;
  const oppSurf = color === 'red' ? state.surfaceYellow : state.surfaceRed;

  // Compute subsurface masks (second-from-top pieces)
  let mySubSurf  = 0n;
  let oppSubSurf = 0n;
  for (let cell = 0; cell < 16; cell++) {
    const stk = state.board[cell];
    if (stk.length < 2) continue;
    const sub = stk[stk.length - 2];
    const bit = 1n << BigInt(cell);
    if (sub.color === color) mySubSurf  |= bit;
    else                      oppSubSurf |= bit;
  }

  const myScore  = scoreLines(mySurf, oppSurf, state.board)
                 + scoreLines(mySubSurf, oppSubSurf, state.board, true);
  const oppScore = scoreLines(oppSurf, mySurf, state.board)
                 + scoreLines(oppSubSurf, mySubSurf, state.board, true);

  return myScore - oppScore;
}

// ── Move Ordering ─────────────────────────────────────────────
/**
 * Order moves for better alpha-beta pruning:
 * 1. Winning moves
 * 2. Blocking opponent win
 * 3. Gobbles (captures)
 * 4. Stock → empty cell
 * 5. Quiet board moves
 */
export function orderMoves(moves, color) {
  const opp = color === 'red' ? 'yellow' : 'red';
  return moves.slice().sort((a, b) => {
    const rankA = moveRank(a, color, opp);
    const rankB = moveRank(b, color, opp);
    return rankA - rankB;
  });
}

function moveRank(move, color, opp) {
  // Winning move
  move._searchMode = true;
  applyMove(move);
  const win = checkWin(color);
  undoMove(move);
  move._searchMode = false; // reset
  if (win) return 0;

  // Blocking opponent win (opponent had a winning move into this cell)
  // Approximate: look if opponent has a threat involving move.to.cell
  if (checkThreats(opp, 3)) {
    // Check if this move covers a threat cell
    const surface = opp === 'red' ? state.surfaceRed : state.surfaceYellow;
    const cell = move.to.cell;
    for (const mask of WIN_MASKS) {
      if ((mask >> BigInt(cell)) & 1n && popcount16(surface & mask) >= 3) return 1;
    }
  }

  const stack = state.board[move.to.cell];
  if (stack.length > 0) return 2; // gobble
  if (move.from.type === 'stock') return 3; // stock to empty
  return 4; // quiet board move
}

// ── Quiescence Search ─────────────────────────────────────────
function quiescence(color, alpha, beta, hash) {
  // Stand-pat
  const standPat = evaluate(color);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const opp = color === 'red' ? 'yellow' : 'red';
  // Only noisy moves: gobbles
  const noisyMoves = getValidMoves(color).filter(m => state.board[m.to.cell].length > 0);

  for (const move of noisyMoves) {
    move._searchMode = true;
    applyMove(move);
    if (checkWin(color)) { undoMove(move); return INF; }
    const score = -quiescence(opp, -beta, -alpha, hash);
    undoMove(move);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ── Alpha-Beta with PVS + NMP + LMR ──────────────────────────
let _searchStart = 0;
let _timeLimit   = 3000; // ms

export function alphabeta(color, depth, alpha, beta, hash) {
  // Time check
  if (Date.now() - _searchStart > _timeLimit) return evaluate(color);

  // Terminal check
  const opp = color === 'red' ? 'yellow' : 'red';
  if (checkWin(opp)) return -INF; // opponent just won on previous move

  // TT probe
  const ttHit = ttProbe(hash, depth, alpha, beta);
  if (ttHit !== null) return ttHit;

  if (depth === 0) {
    const q = quiescence(color, alpha, beta, hash);
    ttStore(hash, 0, q, FLAGS.EXACT);
    return q;
  }

  const moves = orderMoves(getValidMoves(color), color);
  if (moves.length === 0) return evaluate(color); // no moves = losing

  // Null Move Pruning (skip when: depth < 3, endgame, opponent has threat)
  if (depth >= 3 && !checkThreats(opp, 3)) {
    // Simulate passing turn: flip turn and search at reduced depth
    state.currentTurn = opp;
    const nullScore = -alphabeta(opp, depth - 3, -beta, -beta + 1, hash);
    state.currentTurn = color;
    if (nullScore >= beta) {
      ttStore(hash, depth, beta, FLAGS.LB);
      return beta;
    }
  }

  let bestScore = -INF;
  let flag      = FLAGS.UB;
  let moveCount = 0;

  for (const move of moves) {
    move._searchMode = true;

    // Compute incremental hash delta
    const newHash = _hashDelta(move, hash, color);

    applyMove(move);
    let score;

    if (moveCount === 0) {
      // First move: full window
      score = -alphabeta(opp, depth - 1, -beta, -alpha, newHash);
    } else {
      // LMR: later moves at reduced depth
      const reduction = moveCount >= 3 ? 2 : 1;
      const lmrDepth  = Math.max(0, depth - reduction);
      score = -alphabeta(opp, lmrDepth, -alpha - 1, -alpha, newHash); // null window
      if (score > alpha && score < beta) {
        // Re-search at full depth on fail-high
        score = -alphabeta(opp, depth - 1, -beta, -alpha, newHash);
      }
    }

    undoMove(move);
    moveCount++;

    if (score > bestScore) bestScore = score;
    if (score > alpha) { alpha = score; flag = FLAGS.EXACT; }
    if (alpha >= beta) {
      ttStore(hash, depth, beta, FLAGS.LB);
      return beta;
    }
  }

  ttStore(hash, depth, bestScore, flag);
  return bestScore;
}

// Incremental Zobrist hash update for a move
function _hashDelta(move, oldHash, color) {
  let h = oldHash;
  const ci = CI[color];

  if (move.from.type === 'stock') {
    // Stock count changes: old count → new count
    const old = state.stock[color][move.from.size];
    h ^= ZS[ci][move.from.size][old];
    h ^= ZS[ci][move.from.size][old - 1];
  } else {
    // Piece lifted from source cell (depth = stack.length - 1)
    const srcStk = state.board[move.from.cell];
    const piece  = srcStk[srcStk.length - 1];
    h ^= ZT[move.from.cell][srcStk.length - 1][CI[piece.color]][piece.size];
  }

  // Piece placed on destination (depth = current stack.length)
  const dstStk  = state.board[move.to.cell];
  const piece   = move.from.type === 'stock'
    ? { color, size: move.from.size }
    : state.board[move.from.cell][state.board[move.from.cell].length - 1];
  h ^= ZT[move.to.cell][dstStk.length][CI[piece.color]][piece.size];

  return h;
}

// ── Iterative Deepening ────────────────────────────────────────
/**
 * Find best move for `color` using iterative deepening up to `maxDepth`.
 * Returns a move object.
 */
export function findBestMove(color, maxDepth = 18, timeLimitMs = 3000) {
  _searchStart = Date.now();
  _timeLimit   = timeLimitMs;

  let bestMove = null;
  const moves  = orderMoves(getValidMoves(color), color);
  if (moves.length === 0) return null;

  // Check for immediate win
  for (const move of moves) {
    move._searchMode = true;
    applyMove(move);
    const win = checkWin(color);
    undoMove(move);
    if (win) return move;
  }

  let hash = computeHash();

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() - _searchStart > _timeLimit) break;

    let depthBest = null;
    let bestScore = -INF;

    for (const move of moves) {
      if (Date.now() - _searchStart > _timeLimit) break;
      move._searchMode = true;
      const newHash = _hashDelta(move, hash, color);
      applyMove(move);
      const opp   = color === 'red' ? 'yellow' : 'red';
      const score = -alphabeta(opp, depth - 1, -INF, INF, newHash);
      undoMove(move);
      if (score > bestScore) { bestScore = score; depthBest = move; }
    }

    if (depthBest) bestMove = depthBest;
  }

  return bestMove ?? moves[0];
}

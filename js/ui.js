// js/ui.js
import { state } from './engine.js';

const SIZE_NAMES = ['Tiny', 'Small', 'Medium', 'Large'];

// ── Board ─────────────────────────────────────────────────────

/**
 * Render/refresh the 4×4 board into `container`.
 * Creates 16 .cell divs on first call; updates top pieces on subsequent calls.
 * @param {HTMLElement} container
 * @param {function|null} onCellClick  callback(cellIndex: 0-15)
 */
export function renderBoard(container, onCellClick = null, onBoardPieceDragStart = null) {
  if (container.children.length !== 16) {
    container.innerHTML = '';
    for (let cell = 0; cell < 16; cell++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.cell = cell;
      if (onCellClick) div.addEventListener('click', () => onCellClick(cell));
      container.appendChild(div);
    }
  }
  for (let cell = 0; cell < 16; cell++) {
    const div   = container.children[cell];
    const stack = state.board[cell];
    div.classList.remove('win-cell');
    div.dataset.depth = stack.length;
    const existing = div.querySelector('.piece');
    if (existing) div.removeChild(existing);
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      const pieceEl = makePieceElement(top.color, top.size, null);
      pieceEl.dataset.fromType = 'board';
      pieceEl.dataset.fromCell = cell;
      if (onBoardPieceDragStart) {
        pieceEl.draggable = true;
        pieceEl.addEventListener('dragstart', e => onBoardPieceDragStart(cell, e));
      }
      div.appendChild(pieceEl);
    }
  }
}

// ── Stock ─────────────────────────────────────────────────────

/**
 * Render both stock panels.
 * @param {string} redId      id of the red stock container element
 * @param {string} yellowId   id of the yellow stock container element
 * @param {function|null} onStockClick  callback(color, size)
 */
export function renderStock(redId, yellowId, onStockClick = null, onDragStart = null) {
  _renderStockPanel(redId,    'red',    onStockClick, onDragStart);
  _renderStockPanel(yellowId, 'yellow', onStockClick, onDragStart);
}

function _renderStockPanel(panelId, color, onStockClick, onDragStart) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.innerHTML = `<div class="stock-label">${color === 'red' ? '🔴 Red' : '🟡 Yellow'}</div>`;

  for (let size = 3; size >= 0; size--) {
    const count    = state.stock[color][size];
    const depleted = count === 0;

    const piece = makePieceElement(color, size,
      (!depleted && onStockClick) ? () => onStockClick(color, size) : null
    );
    piece.dataset.fromType = 'stock';

    // Count badge inside the piece — two-line "Large x 3"
    const badge = document.createElement('span');
    badge.className = 'stock-count-badge';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = SIZE_NAMES[size];
    const countSpan = document.createElement('span');
    countSpan.textContent = `x ${count}`;
    badge.appendChild(nameSpan);
    badge.appendChild(countSpan);
    piece.appendChild(badge);

    if (depleted) {
      piece.classList.add('depleted');
    } else if (onDragStart) {
      piece.draggable = true;
      piece.addEventListener('dragstart', e => onDragStart(color, size, e));
    }

    panel.appendChild(piece);
  }
}

// ── Piece element ─────────────────────────────────────────────

/**
 * Create a .piece div element (color + size data attributes set).
 */
export function makePieceElement(color, size, onClick) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.dataset.color = color;
  el.dataset.size  = size;
  if (onClick) el.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return el;
}

// ── Highlights ────────────────────────────────────────────────

export function clearHighlights(boardId = 'board', stockRedId = 'stock-red', stockYellowId = 'stock-yellow') {
  document.getElementById(boardId)?.querySelectorAll('.cell,.piece')
    .forEach(el => el.classList.remove('valid-target', 'selected', 'drag-over'));
  [stockRedId, stockYellowId].forEach(id =>
    document.getElementById(id)?.querySelectorAll('.piece')
      .forEach(el => el.classList.remove('selected'))
  );
}

export function highlightValidCells(validCells, boardId = 'board') {
  const board = document.getElementById(boardId);
  if (!board) return;
  board.querySelectorAll('.cell').forEach(c => {
    if (validCells.includes(parseInt(c.dataset.cell, 10))) c.classList.add('valid-target');
  });
}

export function flashInvalid(cell, boardId = 'board') {
  const board  = document.getElementById(boardId);
  if (!board) return;
  const cellEl = board.children[cell];
  if (!cellEl) return;
  cellEl.classList.remove('invalid-flash');
  void cellEl.offsetWidth;
  cellEl.classList.add('invalid-flash');
  cellEl.addEventListener('animationend', () => cellEl.classList.remove('invalid-flash'), { once: true });
}

// ── Win / AI ──────────────────────────────────────────────────

export function showWinAnimation(winCells, boardId = 'board') {
  const board = document.getElementById(boardId);
  if (!board) return;
  winCells.forEach(cell => board.children[cell]?.classList.add('win-cell'));
  _spawnConfetti();
}

function _spawnConfetti() {
  const colors = ['#f5c842','#e53935','#4caf50','#2196f3','#ff9800'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay    = Math.random() * 0.8 + 's';
    el.style.animationDuration = (1 + Math.random()) + 's';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}

export function setThinking(panelId, thinking) {
  document.getElementById(panelId)?.classList.toggle('thinking', thinking);
}

export function updateTurnIndicator(color, isAI = false) {
  const el = document.getElementById('turn-indicator');
  if (!el) return;
  const label = color === 'red' ? '🔴 Red' : '🟡 Yellow';
  el.textContent = isAI ? `${label} (AI thinking…)` : `${label}'s turn`;
  el.style.color = color === 'red' ? '#ff6b6b' : '#ffe082';
}

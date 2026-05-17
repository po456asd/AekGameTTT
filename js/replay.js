// js/replay.js
import { state } from './engine.js';

// Active replay being recorded
let _replayData = null;

/**
 * Begin recording. Called at game start.
 */
export function startRecording(mode, difficulty = 'perfect') {
  _replayData = {
    version:  2,
    mode,
    difficulty,
    winner:   null,
    duration_seconds: 0,
    date:     new Date().toISOString(),
    moves:    [],
  };
}

/**
 * Called after every human/AI move.
 * Snapshot the move into replay data.
 */
export function recordMove(move) {
  if (!_replayData) return;
  _replayData.moves.push({
    from:      { type: move.from.type, cell: move.from.cell, size: move.from.size },
    to:        { cell: move.to.cell },
    color:     move.color,
    timestamp: move.timestamp,
  });
}

/**
 * Finalize replay at game end. Called by endGame().
 */
export function finalizeReplay(winner) {
  if (!_replayData) return;
  _replayData.winner           = winner;
  _replayData.duration_seconds = Math.round((Date.now() - state.gameStartTime) / 1000);
}

/** Get current replay data object (read-only reference). */
export function getReplayData() { return _replayData; }

/** Download replay as JSON file. */
export function saveReplayJSON() {
  if (!_replayData) return;
  const json = JSON.stringify(_replayData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `replay-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy replay JSON to clipboard. */
export async function copyReplayJSON() {
  const data = _replayData ?? _viewerData;
  if (!data) return;
  const json = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    ['btn-copy-json', 'btn-copy-json-viewer'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { const orig = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = orig, 2000); }
    });
  } catch { prompt('Copy this JSON:', json); }
}

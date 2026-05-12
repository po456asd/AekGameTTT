# Neural Network AI Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan.

**Goal:** Create a self-trained neural network AI difficulty (NEURAL) that learns through self-play, specializing in first-move (RED) and second-move (YELLOW) strategies, with 5-second MCTS+network inference.

**Architecture:** Two color-specialized Policy+Value networks (firststart=RED, secondstart=YELLOW) trained via self-play, integrated with lightweight MCTS for 5-second inference.

**Tech Stack:** Python (PyTorch + self-play training), TensorFlow.js (browser inference), MCTS hybrid search

---

## Model Architecture

**Policy+Value Network:**
- Input: 80-dim board encoding (16 cells × 5 states: empty|red-small|red-large|yellow-small|yellow-large)
- Trunk: 3 dense layers (512→256→128 units, ReLU)
- Policy head: 16 outputs (move logits, softmax → move probabilities)
- Value head: 1 output (tanh → [-1,+1] position value estimate)
- Parameters: ~80K (fast inference)

**Two Models:**
- `firststart` (RED): Specializes in first-move advantage strategies
- `secondstart` (YELLOW): Specializes in second-move defensive strategies

---

## Self-Play Training Pipeline

**Setup:**
1. Initialize both models with random weights (different seeds)
2. Create training loop that runs locally on user's machine

**Training Loop (iterative):**
1. Play N self-play games: RED (firststart_v{i}) vs YELLOW (secondstart_v{i})
   - RED always moves first
   - Collect (board_state, action_taken, game_outcome) tuples
2. Train new versions from collected data:
   - `firststart_v{i+1}`: supervised learning on RED's moves, value targets from outcomes
   - `secondstart_v{i+1}`: supervised learning on YELLOW's moves, value targets from outcomes
3. Evaluate new versions:
   - Play `firststart_v{i+1}` vs `secondstart_v{i}` (20 games)
   - Play `secondstart_v{i+1}` vs `firststart_v{i}` (20 games)
4. If win rate > threshold (60%), promote to v{i+1}, repeat
5. Save model snapshots after each successful generation
6. Training continues until convergence (or user stops)

**Stopping Criteria:**
- Win rates plateau (< 5% improvement over 5 generations)
- User manually stops training
- After ~100+ generations (estimated training time: hours to days on local GPU)

---

## Browser Inference: MCTS+Network Hybrid

**During 5-second AI thinking time:**

1. **Load Model:** 
   - Load appropriate model (firststart if RED turn, secondstart if YELLOW turn)
   - Models pre-exported to TensorFlow.js format (~500KB each)

2. **MCTS with Network Guidance (~100-500 simulations in 5 sec):**
   - Initialize tree with root node (current board state)
   - For each simulation:
     - **Selection:** Traverse tree using UCB1 (Upper Confidence Bound) with network policy bias
     - **Expansion:** Add children guided by network policy head (high-probability moves first)
     - **Evaluation:** Use network value head instead of random rollout (much faster)
     - **Backup:** Update visit counts and value accumulation up tree
   - Return best move (highest visit count)

3. **Return best move** to game engine

**Why MCTS+Network:** Network alone might miss tactics; MCTS with network guidance is fast (5 sec budget) and strategically sound.

---

## Integration with Game

**Difficulty Selection UI:**
- Add "NEURAL" button alongside HUMAN, DEMON, DEMON2, DEMON3
- Display: "NEURAL: Self-trained network + MCTS"

**Game Flow:**
- When difficulty="NEURAL":
  - If RED's turn: use `firststart` model + MCTS
  - If YELLOW's turn: use `secondstart` model + MCTS
  - Display thinking indicator: "PC (🧠 NEURAL) thinking..." (5 sec)

**Fallback:** If model fails to load, log error and offer retry or fallback to DEMON3.

---

## File Structure

**Training (Python - run locally):**
```
training/
  train.py              # Main training loop
  models/
    firststart_v0.pt    # Saved PyTorch models
    secondstart_v0.pt
    ...
    firststart_v50.pt
    secondstart_v50.pt
  selfplay.py           # Self-play game engine
  evaluate.py           # Win rate evaluation
  export_to_tfjs.py     # Convert .pt → TensorFlow.js format
```

**Browser (JavaScript):**
```
models/
  firststart_latest.json    # TensorFlow.js model metadata
  firststart_latest_weights.bin
  secondstart_latest.json
  secondstart_latest_weights.bin

index.html
  - Load models at game start
  - mcts_search() function for MCTS tree search
  - pcMoveNeural() function for NEURAL difficulty
```

---

## Testing

**Phase 1: Automated Training Validation**
- Track win rates across generations
- Confirm models improve (win rate delta > 5%)
- Detect training divergence (loss increases unexpectedly)

**Phase 2: Gameplay Testing (Browser)**
- Play 5+ games manually vs trained NEURAL difficulty
- Verify:
  - Model loads without errors
  - AI responds within 5 seconds
  - Moves are legal and reasonable
  - No console JS errors
  - Performance is smooth (no UI freezes)

---

## Success Criteria

- [ ] Both models train successfully (loss curves smooth, no NaN)
- [ ] Models improve over generations (win rate > 55% at v10+)
- [ ] Models load in browser without errors
- [ ] MCTS search completes within 5 seconds
- [ ] NEURAL difficulty plays competitively (vs DEMON3)
- [ ] No JS errors during gameplay
- [ ] Models specialize: firststart learns aggressive opens, secondstart learns defensive tactics

---

## Timeline & Complexity

**Estimated effort:**
- Training infrastructure: 4-6 hours
- Model training: 4-24 hours (depends on GPU, game complexity)
- Browser integration: 2-3 hours
- Testing: 1-2 hours

**Total: ~3-4 days of work** (training runs in background during integration/testing)

---

## Notes

- Training can be paused/resumed by saving checkpoint
- Model exports are deterministic (same weights → same move given same board)
- MCTS with network is faster than pure MCTS (avoids expensive random rollouts)
- Two models allow specialization for color/starting position


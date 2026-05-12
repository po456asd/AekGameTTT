# Training the Neural AI

## Setup
1. `pip install -r requirements.txt`
2. Ensure CUDA is available (for GPU training)

## Running Training
```python
python train.py --generations 100 --games-per-gen 20
```

## Output
- Models saved to `models/firststart_v{N}.pt`, `models/secondstart_v{N}.pt`
- Training logs: `training_log.csv` (generation, win_rate, loss)
- **Browser uses YELLOW model only:** secondstart is exported to TensorFlow.js

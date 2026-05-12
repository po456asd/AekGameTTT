import torch
import torch.optim as optim
import torch.nn.functional as F
from models import PolicyValueNetwork, encode_board
from selfplay import play_games, GameEngine
import csv
from pathlib import Path

def train_network(network, games_data, epochs=3, batch_size=32, lr=0.001):
    """
    Train network on collected games data.

    Args:
        network: PolicyValueNetwork to train
        games_data: list of dicts {'moves': [(board, move, color), ...], 'winner': 'red'|'yellow'|'draw'}
        epochs: training epochs
        batch_size: batch size for SGD
        lr: learning rate
    """
    optimizer = optim.Adam(network.parameters(), lr=lr)

    # Collect training samples
    training_samples = []
    for game in games_data:
        winner = game['winner']
        for board, move, color in game['moves']:
            # Skip if not the right color
            if color != network.color:  # Assuming network has .color attribute set
                continue

            # Outcome: +1 if won, -1 if lost, 0 if draw
            if winner == 'draw':
                outcome = 0.0
            elif (color == 'red' and winner == 'red') or (color == 'yellow' and winner == 'yellow'):
                outcome = 1.0
            else:
                outcome = -1.0

            training_samples.append((board, move, outcome))

    # Train
    network.train()
    for epoch in range(epochs):
        epoch_loss = 0
        for i in range(0, len(training_samples), batch_size):
            batch = training_samples[i:i+batch_size]

            boards = torch.stack([encode_board(b) for b, _, _ in batch])
            outcomes = torch.tensor([o for _, _, o in batch]).unsqueeze(1)
            moves = [m['cell'] for _, m, _ in batch]

            # Forward
            policy_logits, value = network(boards)

            # Loss: policy cross-entropy + value MSE
            policy_loss = F.cross_entropy(policy_logits, torch.tensor(moves))
            value_loss = F.mse_loss(value, outcomes)
            loss = policy_loss + value_loss

            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

        print(f"Epoch {epoch+1}/{epochs} loss={epoch_loss/len(training_samples):.4f}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--generations', type=int, default=50, help='Number of training generations')
    parser.add_argument('--games-per-gen', type=int, default=20, help='Games per generation')
    args = parser.parse_args()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")

    # Initialize models
    firststart = PolicyValueNetwork().to(device)
    firststart.color = 'red'
    secondstart = PolicyValueNetwork().to(device)
    secondstart.color = 'yellow'

    script_dir = Path(__file__).parent
    models_dir = script_dir / 'models'
    models_dir.mkdir(exist_ok=True)

    # Logging
    log_file = script_dir / 'training_log.csv'
    with open(log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['generation', 'red_wins', 'yellow_wins', 'draws', 'red_win_rate'])

    # Training loop
    for gen in range(args.generations):
        print(f"\n=== Generation {gen} ===")

        # Play games
        print(f"Playing {args.games_per_gen} games...")
        games = play_games(firststart, secondstart, args.games_per_gen)

        # Log results
        red_wins = sum(1 for g in games if g['winner'] == 'red')
        yellow_wins = sum(1 for g in games if g['winner'] == 'yellow')
        draws = sum(1 for g in games if g['winner'] == 'draw')
        red_rate = red_wins / args.games_per_gen

        print(f"Results: RED {red_wins}, YELLOW {yellow_wins}, DRAW {draws} (RED win rate: {red_rate:.2%})")

        # Log to file
        with open(log_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([gen, red_wins, yellow_wins, draws, red_rate])

        # Train
        print("Training RED model...")
        train_network(firststart, games, epochs=3)
        print("Training YELLOW model...")
        train_network(secondstart, games, epochs=3)

        # Save models
        torch.save(firststart.state_dict(), models_dir / f'firststart_v{gen}.pt')
        torch.save(secondstart.state_dict(), models_dir / f'secondstart_v{gen}.pt')
        print(f"Saved models to v{gen}")

if __name__ == '__main__':
    main()

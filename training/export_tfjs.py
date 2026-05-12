import torch
import json
from pathlib import Path
from models import PolicyValueNetwork
import numpy as np

def export_to_tfjs(pt_path, output_dir, model_name):
    """
    Convert PyTorch model to TensorFlow.js format.

    Args:
        pt_path: Path to .pt file
        output_dir: Directory to save TensorFlow.js files
        model_name: Name prefix (e.g., 'secondstart')
    """
    import onnx
    from onnx2tf import convert

    # Load PyTorch model
    model = PolicyValueNetwork()
    model.load_state_dict(torch.load(pt_path, map_location='cpu'))
    model.eval()

    # Convert to ONNX
    dummy_input = torch.randn(1, 80)
    onnx_path = Path(output_dir) / f'{model_name}_model.onnx'

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        input_names=['input'],
        output_names=['policy', 'value'],
        opset_version=12
    )

    print(f"Exported to ONNX: {onnx_path}")

    # Convert ONNX to TensorFlow.js
    # Note: this requires tensorflowjs installed
    import subprocess
    subprocess.run([
        'python', '-m', 'onnx_tf.backend',
        str(onnx_path),
        '--output', str(Path(output_dir) / model_name)
    ])

    print(f"Exported to TFLite: {Path(output_dir) / model_name}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True, choices=['firststart', 'secondstart'])
    parser.add_argument('--generation', type=int, required=True)
    args = parser.parse_args()

    pt_path = Path(f'training/models/{args.model}_v{args.generation}.pt')
    output_dir = Path('models')
    output_dir.mkdir(exist_ok=True)

    export_to_tfjs(pt_path, output_dir, args.model)
    print(f"Done! Model ready for browser: {output_dir}/{args.model}_latest.*")

if __name__ == '__main__':
    main()

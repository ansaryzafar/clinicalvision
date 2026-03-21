#!/usr/bin/env python3
"""
Model Download Script for ClinicalVision

Downloads trained models from cloud storage (Google Drive or S3) to local directory.

Usage:
 python download_models.py --version v12_production --source gdrive
 python download_models.py --version v12_production --source s3
"""

import os
import sys
import json
import argparse
import shutil
from pathlib import Path


def download_from_gdrive(gdrive_path: str, local_path: Path, files: list):
 """
 Download files from Google Drive using rclone or gdown.
 
 Requires rclone configured with 'gdrive' remote, or gdown installed.
 """
 try:
 import subprocess
 
 # Try rclone first (more reliable for folders)
 for file in files:
 src = f"gdrive:{gdrive_path}/{Path(file).name}"
 dst = local_path / file
 dst.parent.mkdir(parents=True, exist_ok=True)
 
 print(f"Downloading: {src} -> {dst}")
 result = subprocess.run(
 ['rclone', 'copy', src, str(dst.parent)],
 capture_output=True, text=True
 )
 
 if result.returncode!= 0:
 print(f" Warning: rclone failed - {result.stderr}")
 return False
 
 return True
 
 except FileNotFoundError:
 print("rclone not found. Please install rclone and configure 'gdrive' remote.")
 print(" Install: https://rclone.org/install/")
 print(" Configure: rclone config")
 return False


def download_from_s3(s3_uri: str, local_path: Path, files: list):
 """
 Download files from AWS S3.
 
 Requires boto3 installed and AWS credentials configured.
 """
 try:
 import boto3
 from urllib.parse import urlparse
 
 parsed = urlparse(s3_uri)
 bucket = parsed.netloc
 prefix = parsed.path.lstrip('/')
 
 s3 = boto3.client('s3')
 
 for file in files:
 key = f"{prefix}/{file}"
 dst = local_path / file
 dst.parent.mkdir(parents=True, exist_ok=True)
 
 print(f"Downloading: s3://{bucket}/{key} -> {dst}")
 s3.download_file(bucket, key, str(dst))
 
 return True
 
 except ImportError:
 print("boto3 not installed. Run: pip install boto3")
 return False
 except Exception as e:
 print(f"S3 download failed: {e}")
 return False


def copy_from_local_training(training_path: Path, local_path: Path, version_config: dict):
 """
 Copy models from local training directory (CBIS-DDSM model training folder).
 
 This is for development when models exist in the training folder.
 """
 source_checkpoint_dir = training_path / 'checkpoints_roi'
 
 if not source_checkpoint_dir.exists():
 print(f"Training checkpoint directory not found: {source_checkpoint_dir}")
 return False
 
 # Copy ensemble models
 ensemble_files = version_config['artifacts']['ensemble']
 for i, target_file in enumerate(ensemble_files):
 src_name = f"model_{i}_stage3_best.h5"
 src = source_checkpoint_dir / src_name
 dst = local_path / target_file
 
 if src.exists():
 dst.parent.mkdir(parents=True, exist_ok=True)
 print(f"Copying: {src} -> {dst}")
 shutil.copy2(src, dst)
 else:
 print(f" Warning: Source file not found: {src}")
 
 return True


def main():
 parser = argparse.ArgumentParser(description='Download ClinicalVision models')
 parser.add_argument('--version', default='v12_production', 
 help='Model version to download')
 parser.add_argument('--source', choices=['gdrive', 's3', 'local_training'], 
 default='local_training',
 help='Source storage backend')
 parser.add_argument('--registry', default='ml_models/model_registry.json',
 help='Path to model registry JSON')
 parser.add_argument('--output', default='ml_models',
 help='Output directory for models')
 parser.add_argument('--training-path', 
 default='/home/tars/Desktop/final_project/CBIS-DDSM model training',
 help='Path to training folder (for local_training source)')
 
 args = parser.parse_args()
 
 # Load registry
 registry_path = Path(args.registry)
 if not registry_path.exists():
 # Try relative to script location
 registry_path = Path(__file__).parent.parent / args.registry
 
 if not registry_path.exists():
 print(f"Model registry not found: {registry_path}")
 sys.exit(1)
 
 with open(registry_path) as f:
 registry = json.load(f)
 
 # Get version config
 if args.version not in registry['models']:
 print(f"Version '{args.version}' not found in registry")
 print(f"Available versions: {list(registry['models'].keys())}")
 sys.exit(1)
 
 version_config = registry['models'][args.version]
 local_path = Path(args.output) / args.version
 
 print(f"Downloading model: {args.version}")
 print(f"Source: {args.source}")
 print(f"Destination: {local_path}")
 print()
 
 # Get list of files to download
 artifacts = version_config['artifacts']
 files = artifacts['ensemble'].copy()
 if artifacts.get('calibrator'):
 files.append(artifacts['calibrator'])
 if artifacts.get('config'):
 files.append(artifacts['config'])
 
 # Download based on source
 success = False
 
 if args.source == 'gdrive':
 gdrive_path = version_config['storage']['gdrive_path']
 success = download_from_gdrive(gdrive_path, local_path, files)
 
 elif args.source == 's3':
 s3_uri = version_config['storage']['s3_uri']
 success = download_from_s3(s3_uri, local_path, files)
 
 elif args.source == 'local_training':
 training_path = Path(args.training_path)
 success = copy_from_local_training(training_path, local_path, version_config)
 
 if success:
 print()
 print(" Download complete!")
 print(f" Models available at: {local_path}")
 
 # Update registry status
 registry['models'][args.version]['status'] = 'ready'
 with open(registry_path, 'w') as f:
 json.dump(registry, f, indent=2)
 else:
 print()
 print(" Download failed. Check the errors above.")
 sys.exit(1)


if __name__ == '__main__':
 main()

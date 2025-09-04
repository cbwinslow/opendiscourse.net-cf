#!/usr/bin/env bash
set -euo pipefail
if ! command -v chezmoi >/dev/null 2>&1; then
  echo "chezmoi is not installed. Please install it first: https://www.chezmoi.io/install/"
  exit 1
fi
SRC_DIR="$(pwd)/dotfiles/crew4ai"
echo "Adding crew4ai dotfiles to chezmoi from ${SRC_DIR}"
chezmoi import ${SRC_DIR}
echo "Run 'chezmoi apply' to install to your home directory."

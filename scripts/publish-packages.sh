#!/bin/bash
# Called by semantic-release @semantic-release/exec plugin
# Builds and publishes every package to npm
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Building packages..."
pnpm turbo build --filter=@lightbird/core --filter=@lightbird/player-react --filter=@lightbird/player

echo "Publishing @lightbird/core..."
pnpm --filter @lightbird/core publish --access public --no-git-checks --provenance

echo "Publishing @lightbird/player-react..."
pnpm --filter @lightbird/player-react publish --access public --no-git-checks --provenance

echo "Publishing @lightbird/player..."
pnpm --filter @lightbird/player publish --access public --no-git-checks --provenance

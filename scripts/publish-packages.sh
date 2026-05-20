#!/bin/bash
# Called by semantic-release @semantic-release/exec plugin
# Builds and publishes both packages to npm

cd "$(dirname "$0")/.."

echo "Building packages..."
pnpm turbo build --filter=@lightbird/core --filter=@lightbird/ui

echo "Publishing @lightbird/core..."
pnpm --filter @lightbird/core publish --access public --no-git-checks --provenance

echo "Publishing @lightbird/ui..."
pnpm --filter @lightbird/ui publish --access public --no-git-checks --provenance

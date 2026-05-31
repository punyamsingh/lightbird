#!/bin/bash
# Called by semantic-release @semantic-release/exec plugin
# Updates version in every published package.json to the new release version
set -euo pipefail

VERSION=$1

echo "Updating packages to version $VERSION"

cd "$(dirname "$0")/.."

# Update every published package version
node -e "
const fs = require('fs');
for (const pkg of ['packages/lightbird/package.json', 'packages/ui/package.json', 'packages/web-component/package.json']) {
  const json = JSON.parse(fs.readFileSync(pkg, 'utf8'));
  json.version = '$VERSION';
  fs.writeFileSync(pkg, JSON.stringify(json, null, 2) + '\n');
  console.log('Updated', pkg, 'to', '$VERSION');
}
"

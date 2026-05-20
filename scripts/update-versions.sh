#!/bin/bash
# Called by semantic-release @semantic-release/exec plugin
# Updates version in both package.json files to the new release version
VERSION=$1

echo "Updating packages to version $VERSION"

cd "$(dirname "$0")/.."

# Update both package versions
node -e "
const fs = require('fs');
for (const pkg of ['packages/lightbird/package.json', 'packages/ui/package.json']) {
  const json = JSON.parse(fs.readFileSync(pkg, 'utf8'));
  json.version = '$VERSION';
  fs.writeFileSync(pkg, JSON.stringify(json, null, 2) + '\n');
  console.log('Updated', pkg, 'to', '$VERSION');
}
"

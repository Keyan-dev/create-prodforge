#!/usr/bin/env bash
# Pack the CLI the way npm will publish it, install the tarball in a clean directory and
# generate a project with it. Catches files missing from the package (templates, dist).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cd "$root"
tarball="$(pnpm pack --pack-destination "$work" | tail -n 1)"
echo "Packed $(basename "$tarball")"
tar -tzf "$tarball" > "$work/contents.txt"
for path in package/dist/index.js package/README.md package/LICENSE; do
  grep -qx "$path" "$work/contents.txt" || { echo "Missing from the package: $path"; exit 1; }
done
if grep -E '^package/(src|tests|scripts)/' "$work/contents.txt"; then
  echo 'Source files ended up in the package'
  exit 1
fi

cd "$work"
npm init -y > /dev/null
npm install --no-audit --no-fund --silent "$tarball"
version="$(./node_modules/.bin/create-prodforge --version)"
test "$version" = "$(node -p "require('$root/package.json').version")"

for preset in minimal api full; do
  ./node_modules/.bin/create-prodforge "app-$preset" --preset "$preset" --yes --no-install --no-git > /dev/null
  test -f "app-$preset/package.json" && test -f "app-$preset/src/app.ts"
done
test -f app-full/src/worker.ts && test -f app-full/src/lib/auth.ts
echo "Smoke test passed: create-prodforge $version generates every preset from the packed tarball"

#!/bin/sh
# Copy repo hooks into .git/hooks. Does not change git config.
# Safe to run from npm prepare when this directory is not a checkout.

git_dir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

hooks="$git_dir/hooks"
mkdir -p "$hooks"

src="scripts/git-hooks/pre-commit"
dest="$hooks/pre-commit"
if [ -f "$dest" ] && ! grep -q "check-conflict-markers.sh" "$dest" 2>/dev/null; then
  echo "Left existing $dest in place."
  exit 0
fi

cp "$src" "$dest"
chmod +x "$dest"

#!/bin/sh
# Fail when a commit or the worktree still contains merge conflict markers.
# GitHub Desktop warns about these, then still lets you commit them.

staged=0
if [ "${1:-}" = "--staged" ]; then
  staged=1
elif [ -n "${1:-}" ]; then
  echo "Usage: sh scripts/check-conflict-markers.sh [--staged]" >&2
  exit 2
fi

root=$(git rev-parse --show-toplevel) || exit 1
cd "$root" || exit 1

pattern='^(<<<<<<<|>>>>>>>|=======)( |$)'

if [ "$staged" -eq 1 ]; then
  list=$(mktemp)
  trap 'rm -f "$list"' EXIT
  git diff --cached --name-only --diff-filter=ACM -z > "$list"
  if [ ! -s "$list" ]; then
    exit 0
  fi
  matches=$(git grep --cached -n -E "$pattern" --pathspec-from-file="$list" --pathspec-file-nul || true)
else
  matches=$(git grep -n -E "$pattern" || true)
fi

if [ -n "$matches" ]; then
  echo "Conflict markers are still in:" >&2
  echo "$matches" >&2
  echo "" >&2
  echo "Keep the code you want and delete the <<<<<<<, =======, and >>>>>>> lines before committing." >&2
  exit 1
fi

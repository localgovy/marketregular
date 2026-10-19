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
matches=""

if [ "$staged" -eq 1 ]; then
  files=$(git diff --cached --name-only --diff-filter=ACM)
  if [ -z "$files" ]; then
    exit 0
  fi
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    hit=$(git grep --cached -n -I -E "$pattern" -- "$file")
    code=$?
    if [ "$code" -eq 0 ]; then
      matches="${matches}${hit}
"
    elif [ "$code" -gt 1 ]; then
      echo "Could not scan $file for conflict markers." >&2
      exit 1
    fi
  done <<EOF
$files
EOF
else
  hit=$(git grep -n -I -E "$pattern")
  code=$?
  if [ "$code" -eq 0 ]; then
    matches=$hit
  elif [ "$code" -gt 1 ]; then
    echo "Could not scan the worktree for conflict markers." >&2
    exit 1
  fi
fi

if [ -n "$matches" ]; then
  echo "Conflict markers are still in:" >&2
  printf '%s\n' "$matches" >&2
  echo "Keep the code you want and delete the <<<<<<<, =======, and >>>>>>> lines before committing." >&2
  exit 1
fi

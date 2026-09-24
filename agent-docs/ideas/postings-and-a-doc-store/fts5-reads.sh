#!/bin/bash
#
# Counts the reads SQLite makes answering each query once the schema is
# loaded. Over HTTP each one is a range request, and most depend on the one
# before.
#
#   ./fts5-reads.sh hg38.db

set -euo pipefail

dir=$(dirname "$0")
db=$1
trace=$(mktemp)
trap 'rm -f "$trace"' EXIT

while IFS='|' read -r table match; do
  result=$(strace -f -e trace=pread64,write -o "$trace" \
    node "$dir/fts5.mjs" query "$db" "$table" "$match" 2>/dev/null)
  read -r reads bytes < <(awk '
    /MARK/ { counting = 1; next }
    /END/ { exit }
    counting && /pread64\(/ && match($0, /= [0-9]+$/) { n++; s += substr($0, RSTART + 2) }
    END { print n + 0, s + 0 }' "$trace")
  printf '%-6s %-16s reads=%-4s KiB=%-5s %s\n' \
    "$table" "$match" "$reads" "$((bytes / 1024))" "$result"
done <<'EOF'
ids|"nm_000546.6"
ids|"p53"
ids|"0546"
ids|"brca1"
words|dna AND repair
words|kinas*
EOF

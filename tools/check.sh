#!/usr/bin/env bash
# Local acceptance for this entry, run before anything is submitted.
#
#   tools/check.sh
#
# What it does, in the order the grader would:
#   1. copies the shipped files into a scratch directory it cannot write to,
#      the way the grader mounts the repository read-only;
#   2. runs main.ts twice, each run into its own fresh output directory, and
#      compares the two images byte for byte against each other and against
#      the entry.png held in the repository (run_deterministic);
#   3. runs tools/verify.mjs over the image, which re-states the gate: a whole
#      PNG or JPEG, every chunk checked, at most 1 MiB, at most 1024x1024.
set -uo pipefail
cd "$(dirname "$0")/.."
repo=$(pwd)
scratch=$(mktemp -d)
trap 'chmod -R u+w "$scratch" 2>/dev/null; rm -rf "$scratch"' EXIT

echo "== copy the shipped files to $scratch/bot, read-only as /bot is =="
mkdir -p "$scratch/bot"
cp main.ts entry.png LICENSE "$scratch/bot"/
chmod -R a-w "$scratch/bot"

status=0
for run in 1 2; do
  out="$scratch/out$run"
  mkdir -p "$out"
  echo "== run $run =="
  if ! (cd "$scratch/bot" && MAKEFUN_OUTPUT_DIR="$out" node main.ts); then
    echo "  FAIL: main.ts exited non-zero"
    status=1
  fi
done

echo "== compare the two runs and the repository's copy =="
one=$(sha256sum "$scratch/out1/entry.png" 2>/dev/null | cut -d' ' -f1)
two=$(sha256sum "$scratch/out2/entry.png" 2>/dev/null | cut -d' ' -f1)
kept=$(sha256sum "$repo/entry.png" | cut -d' ' -f1)
echo "  run 1: ${one:-missing}"
echo "  run 2: ${two:-missing}"
echo "  repo : $kept"
if [ -z "$one" ] || [ "$one" != "$two" ]; then
  echo "  FAIL: the two runs differ"
  status=1
else
  echo "  identical: yes"
fi
if [ "$one" != "$kept" ]; then
  echo "  FAIL: the output is not the entry.png the repository holds"
  status=1
fi

echo "== the image gate =="
node tools/verify.mjs "$scratch/out1/entry.png" || status=1

echo
if [ "$status" -eq 0 ]; then
  echo "PASS: byte-identical across two runs, and a valid image within the limits"
else
  echo "FAIL"
fi
exit "$status"

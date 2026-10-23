#!/usr/bin/env bash
# Generates one Kokoro clip per caption (public/audio/docs2skill/c1..c4.wav) and prints their lengths.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/audio/docs2skill
i=1
while IFS= read -r line; do
  uv run -q --python 3.12 --with kokoro --with soundfile python scripts/say.py af_heart "public/audio/docs2skill/c$i.wav" "$line"
  i=$((i+1))
done <<'TXT'
Turn any docs site into an agent skill.
SKILL.md, llms.txt and AGENTS.md, in seconds.
Drop it into Claude Code or Codex.
Free and open source. Built on Spicrawl.
TXT

#!/usr/bin/env bash
# Pull recent-25 auto-caption transcripts from selected hockey coaching channels.
# Free/legit: YouTube public auto-captions via yt-dlp. No login, no bulk member content.
set -u
export PATH="$PATH:/c/Users/mtsli/AppData/Roaming/Python/Python314/Scripts"

OUT="/c/Users/mtsli/IceIQ/tools/tcs-scraper/transcripts"
N=25

# handle | folder-name
CHANNELS=(
  "@TheCoachesSite|coaches-site-glass-and-out"
  "@TheHockeyThinkTank|hockey-think-tank"
  "@PavelBarber|pavel-barber"
  "@HockeyCanada|hockey-canada"
  "@USAHockey|usa-hockey"
)

for entry in "${CHANNELS[@]}"; do
  handle="${entry%%|*}"
  folder="${entry##*|}"
  dir="$OUT/$folder"
  mkdir -p "$dir/raw"
  echo "=== $handle -> $folder (recent $N) ==="
  yt-dlp \
    --playlist-end "$N" \
    --write-auto-sub --sub-lang "en.*" --sub-format vtt --skip-download \
    --ignore-errors --no-warnings \
    --sleep-requests 1 \
    -o "$dir/raw/%(upload_date)s__%(title).100B__%(id)s.%(ext)s" \
    "https://www.youtube.com/$handle/videos" 2>&1 | grep -iE "writing|error|has no subtitles" | tail -3
done

echo "=== raw VTT counts ==="
for entry in "${CHANNELS[@]}"; do
  folder="${entry##*|}"
  c=$(ls "$OUT/$folder/raw/"*.vtt 2>/dev/null | wc -l)
  echo "$folder: $c"
done
echo "DONE_PULL"

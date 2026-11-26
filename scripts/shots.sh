#!/bin/sh
# Captures d'écran du site local (http://localhost:8765) dans plusieurs largeurs, en anglais et en français.
# Usage : sh scripts/shots.sh [dossier de sortie]   (le site doit tourner en local)
# Les téléphones (375, 414 px) se vérifient dans le navigateur intégré : Edge sans fenêtre ne descend pas sous ~500 px.
OUT="${1:-$TEMP/shots}"
E="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
mkdir -p "$OUT"
for page in home rank guild runs news; do
  for w in 768 1024 1300 1600 1920; do
    for lang in en fr; do
      "$E" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TEMP/ep_shot$RANDOM" \
        --lang=$lang --virtual-time-budget=12000 --window-size=$w,1400 \
        --screenshot="$OUT/$page-$w-$lang.png" "http://localhost:8765/?p=$page&lang=$lang&shot=1&v=$RANDOM" 2>/dev/null
    done
  done
done
echo "captures : $OUT"

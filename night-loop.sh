#!/usr/bin/env bash
set -u

REPO="/home/saif/Dev/personal-projects/werewolf"
MODEL="opencode/x-preview-f-free"   # Ox Alpha Free
LOG="$REPO/night-loop.log"
JSONL="$REPO/night-loop.jsonl"
MAX_HOURS="${MAX_HOURS:-8}"
MAX_ITER="${MAX_ITER:-30}"
END=$(( $(date +%s) + MAX_HOURS * 3600 ))
FAILS=0

cd "$REPO" || exit 1
echo "[loop] start $(date '+%F %T') model=$MODEL cap=${MAX_HOURS}h/${MAX_ITER}it" >> "$LOG"

PROMPT='You are running autonomously overnight. Read NIGHT_BRIEF.md and backlog.md at the repo root. Execute the highest-priority incomplete task in backlog.md end-to-end: implement it, verify npm run build passes inside Front-End, capture milestone screenshots via node scripts/shoot.mjs into screenshots/, stop any server you started, update backlog.md checkboxes, and git commit on branch egyptian-arabic. Append new follow-up tasks you discover to backlog.md. If and only if ALL tasks are complete, prepend BACKLOG_EMPTY alone on line 1 of backlog.md and reply with exactly BACKLOG_EMPTY. Never ask questions.'

cleanup() {
  pkill -f "vite --port 5199" 2>/dev/null
  pkill -f "vite preview" 2>/dev/null
}
trap 'cleanup; echo "[loop] interrupted $(date)" >> "$LOG"; exit 130' INT TERM

for ((i = 1; i <= MAX_ITER; i++)); do
  now=$(date +%s)
  if (( now >= END )); then
    echo "[loop] time budget reached, stopping" >> "$LOG"
    break
  fi

  cleanup
  sleep 2
  echo "[loop] iter $i start $(date '+%F %T')" >> "$LOG"

  OUT=$(opencode run -m "$MODEL" --dangerously-skip-permissions "$PROMPT" 2>&1)
  RC=$?
  printf '%s\n' "$OUT" >> "$JSONL"

  if (( RC != 0 )); then
    FAILS=$((FAILS + 1))
    echo "[loop] iter $i failed rc=$RC (consecutive=$FAILS)" >> "$LOG"
    if (( FAILS >= 3 )); then
      echo "[loop] 3 consecutive failures, stopping" >> "$LOG"
      break
    fi
    sleep 90
    continue
  fi
  FAILS=0

  if printf '%s' "$OUT" | grep -q "BACKLOG_EMPTY"; then
    echo "[loop] agent reports backlog empty, done" >> "$LOG"
    break
  fi

  # also check the file directly (agent may have marked it without echoing)
  if head -1 backlog.md 2>/dev/null | grep -q "BACKLOG_EMPTY"; then
    echo "[loop] backlog.md marked empty, done" >> "$LOG"
    break
  fi

  sleep 5
done

cleanup
echo "[loop] finished $(date '+%F %T')" >> "$LOG"
notify-send "Night loop" "Werewolf Egyptian remake loop finished — check night-loop.log" 2>/dev/null || true

#!/usr/bin/env bash
# Keeps an overnight agent session alive: blocks until BOARD.md gets a new line for this session
# (addressed to it, or a CONTRACT-CHANGED / DONE from S0), or until the timeout, then prints what changed.
# Usage: bash docs/overnight/wait-for-work.sh S1 [timeout_minutes=20]
set -u
SESSION="${1:?usage: wait-for-work.sh S0|S1|S2|S3|S4 [minutes]}"
MINUTES="${2:-20}"
BOARD="$(cd "$(dirname "$0")" && pwd)/BOARD.md"
START_LINES=$(wc -l < "$BOARD")
DEADLINE=$(( $(date +%s) + MINUTES * 60 ))
STOP_HOUR=6

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  sleep 30
  NEW=$(tail -n +"$((START_LINES + 1))" "$BOARD" | grep -E "→[^]]*${SESSION}|\[${SESSION}\]|CONTRACT-CHANGED|\[S0\] DONE|SUPERVISOR\] (TASK|RULE)")
  if [ -n "$NEW" ]; then
    echo "=== Việc mới trên BOARD cho ${SESSION}:"
    echo "$NEW"
    echo "=== Hãy xử lý các dòng trên, rồi tiếp tục danh sách việc. Khi rảnh lại chạy lệnh này."
    exit 0
  fi
done

if [ "$(date +%H)" -ge "$STOP_HOUR" ] && [ "$(date +%H)" -lt 12 ]; then
  echo "=== Đã tới ${STOP_HOUR}:00 — ghi dòng STATUS tổng kết vào BOARD rồi kết thúc phiên."
else
  echo "=== Không có việc mới sau ${MINUTES} phút. Đọc lại BOARD + git log, chọn việc chưa xong hoặc tự rà lỗi giao diện/test"
  echo "=== của thư mục mình (UI-GUIDE §6), commit, rồi chạy lại: bash docs/overnight/wait-for-work.sh ${SESSION}"
fi

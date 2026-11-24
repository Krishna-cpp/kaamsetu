#!/usr/bin/env bash
# Retries POST /telegram/setup every 5 min until Telegram accepts the webhook (prints the result and exits).
set -u
API="${1:?api base url}"; SECRET="${2:?secret}"
for i in $(seq 1 60); do
  OUT=$(curl -s -m 45 -X POST "$API/telegram/setup" -H "x-kaamsetu-secret: $SECRET")
  if echo "$OUT" | grep -q '"webhook":{"ms":[0-9]*,"status":200,"body":{"ok":true'; then echo "WEBHOOK SET at $(date +%H:%M): ${OUT:0:600}"; exit 0; fi
  echo "$(date +%H:%M) attempt $i: ${OUT:0:200}"
  sleep 300
done
exit 1

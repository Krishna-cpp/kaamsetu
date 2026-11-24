#!/usr/bin/env bash
# Every 30 min: try a Nova Converse call (profile meteora, ap-south-1). Exits 0 with the first working model id.
set -u
for i in $(seq 1 24); do
  for M in apac.amazon.nova-pro-v1:0 apac.amazon.nova-lite-v1:0 apac.amazon.nova-micro-v1:0; do
    OUT=$(aws bedrock-runtime converse --profile meteora --region ap-south-1 --model-id "$M" \
      --messages '[{"role":"user","content":[{"text":"hi"}]}]' --inference-config '{"maxTokens":20}' \
      --query 'output.message.content[0].text' --output text 2>&1)
    if [ $? -eq 0 ]; then echo "BEDROCK WORKS at $(date +%H:%M) model=$M reply=$OUT"; exit 0; fi
  done
  echo "$(date +%H:%M) check $i: still blocked: $(echo "$OUT" | tail -1 | cut -c1-140)"
  sleep 1800
done
exit 1

#!/usr/bin/env bash
# Every 30 min: try a Nova Converse call (profile meteora, ap-south-1). On the first success:
# set LLM_PROVIDER=bedrock + BEDROCK_MODEL_ID in .env, redeploy the CDK stack (Lambdas + Amplify env) and rebuild Amplify.
set -u
cd "$(dirname "$0")/.."
for i in $(seq 1 48); do
  for M in apac.amazon.nova-pro-v1:0 apac.amazon.nova-lite-v1:0 apac.amazon.nova-micro-v1:0; do
    OUT=$(aws bedrock-runtime converse --profile meteora --region ap-south-1 --model-id "$M" \
      --messages '[{"role":"user","content":[{"text":"hi"}]}]' --inference-config '{"maxTokens":20}' \
      --query 'output.message.content[0].text' --output text 2>&1)
    if [ $? -eq 0 ]; then
      echo "BEDROCK WORKS at $(date +%H:%M) model=$M reply=$OUT"
      sed -i "s#^LLM_PROVIDER=.*#LLM_PROVIDER=bedrock#; s#^BEDROCK_MODEL_ID=.*#BEDROCK_MODEL_ID=$M#" .env
      (cd infra && GITHUB_TOKEN=$(gh auth token) GEO_PROVIDER=aws LLM_PROVIDER=bedrock BEDROCK_MODEL_ID="$M" \
        npx cdk deploy --profile meteora --require-approval never 2>&1 | grep -E "✅|❌|rror" | head -5)
      aws amplify start-job --profile meteora --region ap-south-1 --app-id d1ro3ffmsok6d8 --branch-name main --job-type RELEASE \
        --query 'jobSummary.[jobId,status]' --output text
      echo "switched to bedrock ($M), stack redeployed, Amplify rebuild started"
      exit 0
    fi
  done
  echo "$(date +%H:%M) check $i: still blocked: $(echo "$OUT" | tail -1 | cut -c1-140)"
  sleep 1800
done
exit 1

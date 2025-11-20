#!/bin/bash
# Monitor Amplify deployment

APP_ID=$(aws amplify list-apps --query 'apps[0].appId' --output text)
BRANCH="main"

echo "Monitoreando deployment de Amplify..."
echo ""

while true; do
  STATUS=$(aws amplify list-jobs \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH" \
    --max-results 1 \
    --query 'jobSummaries[0].[jobId,status,commitMessage]' \
    --output text)
  
  JOB_ID=$(echo "$STATUS" | awk '{print $1}')
  JOB_STATUS=$(echo "$STATUS" | awk '{print $2}')
  
  echo "Job $JOB_ID: $JOB_STATUS"
  
  if [ "$JOB_STATUS" = "SUCCEED" ]; then
    echo ""
    echo "✅ Deployment completado!"
    echo ""
    echo "Frontend actualizado: https://main.dxq4kvnf2cwb4.amplifyapp.com"
    echo ""
    echo "Verifica ahora:"
    echo "1. Abre: https://main.dxq4kvnf2cwb4.amplifyapp.com/register"
    echo "2. DevTools → Console"
    echo "3. Intenta registro"
    echo "4. Debe usar: https://api.h2oassistant.com"
    break
  elif [ "$JOB_STATUS" = "FAILED" ]; then
    echo ""
    echo "❌ Deployment falló"
    echo "Revisa logs en: https://console.aws.amazon.com/amplify/"
    break
  fi
  
  sleep 15
done

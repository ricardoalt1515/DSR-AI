#!/bin/bash

# Script para identificar y ayudar a reemplazar console.logs en el frontend
# Uso: ./scripts/cleanup-console-logs.sh

set -e

echo "🔍 Frontend Console.log Cleanup Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
TOTAL_CONSOLE_LOG=0
TOTAL_CONSOLE_ERROR=0
TOTAL_CONSOLE_WARN=0

echo "📊 Scanning for console statements..."
echo ""

# Buscar console.log
echo -e "${YELLOW}🔎 console.log occurrences:${NC}"
CONSOLE_LOG_FILES=$(grep -r "console\.log" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=scripts \
  components/ lib/ app/ 2>/dev/null || true)

if [ -n "$CONSOLE_LOG_FILES" ]; then
  echo "$CONSOLE_LOG_FILES" | while IFS= read -r line; do
    TOTAL_CONSOLE_LOG=$((TOTAL_CONSOLE_LOG + 1))
    echo "  - $line"
  done
  TOTAL_CONSOLE_LOG=$(echo "$CONSOLE_LOG_FILES" | wc -l)
  echo -e "${RED}Found: $TOTAL_CONSOLE_LOG console.log statements${NC}"
else
  echo -e "${GREEN}✅ No console.log found!${NC}"
fi

echo ""

# Buscar console.error
echo -e "${YELLOW}🔎 console.error occurrences:${NC}"
CONSOLE_ERROR_FILES=$(grep -r "console\.error" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=scripts \
  components/ lib/ app/ 2>/dev/null || true)

if [ -n "$CONSOLE_ERROR_FILES" ]; then
  echo "$CONSOLE_ERROR_FILES" | while IFS= read -r line; do
    echo "  - $line"
  done
  TOTAL_CONSOLE_ERROR=$(echo "$CONSOLE_ERROR_FILES" | wc -l)
  echo -e "${RED}Found: $TOTAL_CONSOLE_ERROR console.error statements${NC}"
else
  echo -e "${GREEN}✅ No console.error found!${NC}"
fi

echo ""

# Buscar console.warn
echo -e "${YELLOW}🔎 console.warn occurrences:${NC}"
CONSOLE_WARN_FILES=$(grep -r "console\.warn" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=scripts \
  components/ lib/ app/ 2>/dev/null || true)

if [ -n "$CONSOLE_WARN_FILES" ]; then
  echo "$CONSOLE_WARN_FILES" | while IFS= read -r line; do
    echo "  - $line"
  done
  TOTAL_CONSOLE_WARN=$(echo "$CONSOLE_WARN_FILES" | wc -l)
  echo -e "${RED}Found: $TOTAL_CONSOLE_WARN console.warn statements${NC}"
else
  echo -e "${GREEN}✅ No console.warn found!${NC}"
fi

echo ""
echo "======================================"
echo "📈 Summary:"
echo "  - console.log:   $TOTAL_CONSOLE_LOG"
echo "  - console.error: $TOTAL_CONSOLE_ERROR"
echo "  - console.warn:  $TOTAL_CONSOLE_WARN"
TOTAL=$((TOTAL_CONSOLE_LOG + TOTAL_CONSOLE_ERROR + TOTAL_CONSOLE_WARN))
echo "  - TOTAL:         $TOTAL"
echo ""

if [ $TOTAL -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Recomendación:${NC}"
  echo "  Reemplaza console statements con el logger:"
  echo ""
  echo "  // ❌ Antes"
  echo "  console.log('Message', data)"
  echo ""
  echo "  // ✅ Después"
  echo "  import { logger } from '@/lib/utils/logger'"
  echo "  logger.debug('Message', data)"
  echo ""
  echo "  El logger automáticamente filtra logs en producción."
  echo ""
else
  echo -e "${GREEN}✅ ¡Frontend limpio de console statements!${NC}"
fi

echo "======================================"
echo "✅ Scan complete!"

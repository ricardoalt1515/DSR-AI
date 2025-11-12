#!/bin/bash

# Script para identificar uso de 'any' types en TypeScript
# Uso: ./scripts/find-any-types.sh

set -e

echo "🔍 TypeScript 'any' Type Finder"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📊 Scanning for 'any' types..."
echo ""

# Buscar: any (incluyendo Record<string, any>)
ANY_TYPES=$(grep -r ": any\|<any>\|any\[\]\|<string, any>" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=scripts \
  components/ lib/ app/ 2>/dev/null || true)

if [ -n "$ANY_TYPES" ]; then
  echo -e "${YELLOW}Found 'any' types in:${NC}"
  echo ""
  
  # Agrupar por archivo y contar
  echo "$ANY_TYPES" | cut -d: -f1 | sort | uniq -c | sort -rn | while read count file; do
    echo -e "  ${RED}[$count]${NC} $file"
  done
  
  echo ""
  TOTAL=$(echo "$ANY_TYPES" | wc -l)
  echo -e "${RED}Total 'any' occurrences: $TOTAL${NC}"
  echo ""
  
  echo -e "${YELLOW}Top 5 archivos con más 'any':${NC}"
  echo "$ANY_TYPES" | cut -d: -f1 | sort | uniq -c | sort -rn | head -5 | while read count file; do
    echo "  $count - $file"
  done
  
  echo ""
  echo -e "${YELLOW}⚠️  Recomendación:${NC}"
  echo "  Reemplaza 'any' con tipos más específicos:"
  echo ""
  echo "  // ❌ Evitar"
  echo "  const data: any = ..."
  echo "  Record<string, any>"
  echo ""
  echo "  // ✅ Preferir"
  echo "  const data: unknown = ... // Luego type guard"
  echo "  Record<string, unknown>"
  echo "  Record<string, JsonValue>"
  echo ""
  echo "  // ✅ Mejor aún"
  echo "  interface SpecificType {"
  echo "    field1: string"
  echo "    field2: number"
  echo "  }"
  echo ""
else
  echo -e "${GREEN}✅ ¡No se encontraron 'any' types!${NC}"
fi

echo "======================================"
echo "✅ Scan complete!"

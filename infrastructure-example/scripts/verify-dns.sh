#!/bin/bash
# Quick DNS verification

echo "Verificando DNS..."
echo ""

echo "1. Nameservers (Google DNS):"
dig @8.8.8.8 NS h2oassistant.com +short
echo ""

echo "2. api.h2oassistant.com (Google DNS):"
dig @8.8.8.8 api.h2oassistant.com +short
echo ""

echo "3. Probando HTTPS:"
curl -I https://api.h2oassistant.com/health 2>&1 | head -5
echo ""

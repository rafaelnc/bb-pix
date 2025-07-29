#!/bin/bash

# Script para testar webhook no IP 163.176.145.46
# Execute: chmod +x test-webhook.sh && ./test-webhook.sh

IP="163.176.145.46"
WEBHOOK_DATA='{
  "pix": [
    {
      "endToEndId": "E60746948202103082223A7540Db1234",
      "txid": "123234443",
      "valor": "100.00",
      "componentesValor": {
        "original": {
          "valor": "100.00"
        }
      },
      "chave": "baaf230c-a642-546d-1254-aa16ae7c8dc6",
      "horario": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
      "infoPagador": "Teste via curl",
      "pagador": {
        "cpf": "93492239293",
        "nome": "VICTOR LOPES DORNELES",
        "email": "victor@exemplo.com",
        "telefone": "11999999999"
      },
      "recebedor": {
        "nome": "EMPRESA EXEMPLO LTDA",
        "cnpj": "12345678000199",
        "email": "financeiro@empresa.com",
        "telefone": "1133333333"
      },
      "status": "CONCLUIDA",
      "tipoChave": "EVP",
      "tipoPagamento": "PIX"
    }
  ]
}'

echo "🧪 Testando Webhook em $IP"
echo "=================================="
echo ""

# Teste 1: Health Check HTTP
echo "1️⃣ Testando Health Check HTTP..."
curl -s http://$IP/health | jq . 2>/dev/null || curl -s http://$IP/health
echo ""
echo ""

# Teste 2: Webhook HTTP
echo "2️⃣ Testando Webhook HTTP..."
curl -s -X POST http://$IP/webhook \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_DATA" | jq . 2>/dev/null || curl -s -X POST http://$IP/webhook \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_DATA"
echo ""
echo ""

# Teste 3: Simular Webhook
echo "3️⃣ Testando Simular Webhook..."
curl -s -X POST http://$IP/simular-webhook | jq . 2>/dev/null || curl -s -X POST http://$IP/simular-webhook
echo ""
echo ""

# Teste 4: Client Info HTTP
echo "4️⃣ Testando Client Info HTTP..."
curl -s http://$IP/api/client-info | jq . 2>/dev/null || curl -s http://$IP/api/client-info
echo ""
echo ""

# Teste 5: Health Check HTTPS
echo "5️⃣ Testando Health Check HTTPS..."
curl -s -k https://$IP:3443/health | jq . 2>/dev/null || curl -s -k https://$IP:3443/health
echo ""
echo ""

# Teste 6: Webhook HTTPS (sem certificado - deve falhar)
echo "6️⃣ Testando Webhook HTTPS (sem certificado - deve falhar)..."
curl -s -k -X POST https://$IP:3443/webhook \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_DATA" | jq . 2>/dev/null || curl -s -k -X POST https://$IP:3443/webhook \
  -H "Content-Type: application/json" \
  -d "$WEBHOOK_DATA"
echo ""
echo ""

# Teste 7: Client Info HTTPS (sem certificado - deve falhar)
echo "7️⃣ Testando Client Info HTTPS (sem certificado - deve falhar)..."
curl -s -k https://$IP:3443/api/client-info | jq . 2>/dev/null || curl -s -k https://$IP:3443/api/client-info
echo ""
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "📋 Resumo esperado:"
echo "  ✅ Testes 1-4: Devem funcionar (HTTP)"
echo "  ✅ Teste 5: Deve funcionar (HTTPS sem mTLS)"
echo "  ❌ Testes 6-7: Devem falhar (HTTPS com mTLS sem certificado)"
echo ""
echo "🔗 URLs para teste manual:"
echo "  🌐 Interface web: http://$IP"
echo "  🔗 Webhook HTTP: http://$IP/webhook"
echo "  🔐 Webhook HTTPS: https://$IP:3443/webhook" 
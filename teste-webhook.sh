#!/bin/bash

# Script para testar o webhook PIX
# Uso: ./teste-webhook.sh

echo "🧪 Testando Webhook PIX - Banco do Brasil"
echo "=========================================="

# Verificar se o servidor está rodando
echo "1. Verificando se o servidor está rodando..."
if curl -s http://localhost:3000/api/pagamentos > /dev/null; then
    echo "✅ Servidor está rodando em http://localhost:3000"
else
    echo "❌ Servidor não está rodando. Execute: node index.js"
    exit 1
fi

echo ""
echo "2. Simulando webhook via endpoint interno..."
curl -X POST http://localhost:3000/simular-webhook

echo ""
echo ""
echo "3. Enviando webhook personalizado..."
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "pix": [
      {
        "endToEndId": "E60746948202103082223A7540Db5678",
        "txid": "987654321",
        "valor": "250.50",
        "componentesValor": {
          "original": {
            "valor": "250.50"
          }
        },
        "chave": "baaf230c-a642-546d-1254-aa16ae7c8dc6",
        "horario": "'$(date -u +"%Y-%m-%dT%H:%M:%S.00-03:00")'",
        "infoPagador": "Pedido ABC",
        "pagador": {
          "cpf": "12345678901",
          "nome": "MARIA SILVA SANTOS"
        }
      }
    ]
  }'

echo ""
echo ""
echo "4. Consultando pagamentos atuais..."
curl -s http://localhost:3000/api/pagamentos

echo ""
echo ""
echo "✅ Teste concluído!"
echo "📱 Acesse http://localhost:3000 para ver a interface web" 
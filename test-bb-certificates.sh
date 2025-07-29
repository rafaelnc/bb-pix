#!/bin/bash

# Script para testar os certificados do Banco do Brasil
# Execute: chmod +x test-bb-certificates.sh && ./test-bb-certificates.sh

echo "🔐 Testando certificados do Banco do Brasil..."
echo ""

# Verificar se os certificados existem
echo "📋 Verificando arquivos de certificados:"
if [ -f "cert/api_webhook_bb_com_br.crt" ]; then
    echo "  ✅ api_webhook_bb_com_br.crt - OK"
else
    echo "  ❌ api_webhook_bb_com_br.crt - NÃO ENCONTRADO"
fi

if [ -f "cert/2-GeoTrust_EV_RSA_CA_G2.cer" ]; then
    echo "  ✅ 2-GeoTrust_EV_RSA_CA_G2.cer - OK"
else
    echo "  ❌ 2-GeoTrust_EV_RSA_CA_G2.cer - NÃO ENCONTRADO"
fi

if [ -f "cert/1-DigiCert_Global_Root_G2.cer" ]; then
    echo "  ✅ 1-DigiCert_Global_Root_G2.cer - OK"
else
    echo "  ❌ 1-DigiCert_Global_Root_G2.cer - NÃO ENCONTRADO"
fi

if [ -f "cert/bb-webhook-chain.crt" ]; then
    echo "  ✅ bb-webhook-chain.crt - OK"
else
    echo "  ❌ bb-webhook-chain.crt - NÃO ENCONTRADO"
fi

echo ""

# Verificar informações do certificado do servidor
echo "🔍 Informações do certificado do servidor:"
openssl x509 -in cert/api_webhook_bb_com_br.crt -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:)"

echo ""

# Verificar cadeia de certificados
echo "🔗 Verificando cadeia de certificados:"
openssl verify -CAfile cert/bb-webhook-chain.crt cert/api_webhook_bb_com_br.crt

echo ""

# Testar conexão HTTPS (se o servidor estiver rodando)
echo "🧪 Testando conexão HTTPS:"
if curl -s -k https://localhost:3443/health > /dev/null 2>&1; then
    echo "  ✅ Servidor HTTPS respondendo na porta 3443"
    
    # Testar endpoint de informações do cliente
    echo "  📊 Testando endpoint /api/client-info:"
    curl -s -k https://localhost:3443/api/client-info | jq . 2>/dev/null || curl -s -k https://localhost:3443/api/client-info
    
else
    echo "  ⚠️ Servidor HTTPS não está rodando na porta 3443"
    echo "  💡 Execute: node index.js"
fi

echo ""

# Testar conexão HTTP (se o servidor estiver rodando)
echo "🧪 Testando conexão HTTP:"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "  ✅ Servidor HTTP respondendo na porta 3000"
    
    # Testar endpoint de informações do cliente (sem certificado)
    echo "  📊 Testando endpoint /api/client-info (sem certificado):"
    curl -s http://localhost:3000/api/client-info | jq . 2>/dev/null || curl -s http://localhost:3000/api/client-info
    
else
    echo "  ⚠️ Servidor HTTP não está rodando na porta 3000"
    echo "  💡 Execute: node index.js"
fi

echo ""

# Verificar se o Nginx está configurado
echo "🌐 Verificando configuração do Nginx:"
if command -v nginx >/dev/null 2>&1; then
    if nginx -t >/dev/null 2>&1; then
        echo "  ✅ Nginx configurado corretamente"
    else
        echo "  ❌ Nginx com erro de configuração"
        echo "  💡 Execute: sudo nginx -t"
    fi
else
    echo "  ⚠️ Nginx não instalado"
    echo "  💡 Execute: sudo apt install nginx"
fi

echo ""

echo "📝 Próximos passos:"
echo "  1. Se todos os certificados estão OK, execute: node index.js"
echo "  2. Para configurar Nginx: sudo cp nginx-bb-mtls.conf /etc/nginx/sites-available/"
echo "  3. Para testar mTLS: curl --cert client.crt --key client.key --cacert cert/bb-webhook-chain.crt https://localhost:3443/webhook"
echo "" 
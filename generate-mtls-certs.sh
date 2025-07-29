#!/bin/bash

# Script para gerar certificados mTLS de exemplo
# Execute: chmod +x generate-mtls-certs.sh && ./generate-mtls-certs.sh

echo "🔐 Gerando certificados mTLS..."

# Criar diretório para certificados
mkdir -p certs
cd certs

# 1. Gerar CA (Certificate Authority)
echo "📝 Gerando CA..."
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt -subj "/C=BR/ST=SP/L=Sao Paulo/O=PIX Webhook/CN=PIX Webhook CA"

# 2. Gerar certificado do servidor
echo "📝 Gerando certificado do servidor..."
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/C=BR/ST=SP/L=Sao Paulo/O=PIX Webhook/CN=pix-webhook-server"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt

# 3. Gerar certificado do cliente
echo "📝 Gerando certificado do cliente..."
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/C=BR/ST=SP/L=Sao Paulo/O=PIX Webhook/CN=pix-webhook-client"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt

# 4. Criar bundle CA para Nginx
echo "📝 Criando bundle CA..."
cat ca.crt > ca-chain.crt

# 5. Criar certificado cliente em formato PKCS12 (para alguns clientes)
echo "📝 Criando certificado cliente PKCS12..."
openssl pkcs12 -export -out client.p12 -inkey client.key -in client.crt -certfile ca.crt -passout pass:password

# 6. Limpar arquivos temporários
rm -f *.csr *.srl

echo "✅ Certificados gerados com sucesso!"
echo ""
echo "📁 Arquivos gerados:"
echo "  - ca.crt (Certificate Authority)"
echo "  - ca.key (Chave privada da CA)"
echo "  - server.crt (Certificado do servidor)"
echo "  - server.key (Chave privada do servidor)"
echo "  - client.crt (Certificado do cliente)"
echo "  - client.key (Chave privada do cliente)"
echo "  - client.p12 (Certificado cliente PKCS12)"
echo "  - ca-chain.crt (Bundle CA para Nginx)"
echo ""
echo "🔧 Para usar com Nginx:"
echo "  sudo cp server.crt /etc/ssl/certs/pix-webhook-server.crt"
echo "  sudo cp server.key /etc/ssl/private/pix-webhook-server.key"
echo "  sudo cp ca-chain.crt /etc/ssl/certs/ca-chain.crt"
echo ""
echo "🔧 Para usar com Node.js:"
echo "  Copie os arquivos para o diretório do projeto e atualize os caminhos no código"
echo ""
echo "🧪 Para testar com curl:"
echo "  curl --cert client.crt --key client.key --cacert ca.crt https://localhost:3000/webhook" 
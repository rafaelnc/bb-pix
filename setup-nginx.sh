#!/bin/bash

# Script para configurar Nginx com HTTPS e mTLS
# Execute: chmod +x setup-nginx.sh && sudo ./setup-nginx.sh

echo "🌐 Configurando Nginx com HTTPS e mTLS..."
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script deve ser executado como root (sudo)"
    exit 1
fi

# Verificar se os certificados existem
echo "📋 Verificando certificados..."
if [ ! -f "/home/rafael/Documentos/CYC/bb-pix/cert/api_webhook_bb_com_br.crt" ]; then
    echo "❌ Certificado do servidor não encontrado"
    exit 1
fi

if [ ! -f "/home/rafael/Documentos/CYC/bb-pix/cert/bb-webhook-chain.crt" ]; then
    echo "❌ Cadeia de certificados não encontrada"
    exit 1
fi

echo "✅ Certificados encontrados"

# Verificar se a chave privada existe
if [ ! -f "/home/rafael/Documentos/CYC/bb-pix/cert/api_webhook_bb_com_br.key" ]; then
    echo "⚠️ Chave privada não encontrada. Criando certificado auto-assinado para teste..."
    
    # Criar diretório temporário para certificados
    mkdir -p /tmp/ssl-certs
    cd /tmp/ssl-certs
    
    # Gerar certificado auto-assinado
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout api_webhook_bb_com_br.key \
        -out api_webhook_bb_com_br.crt \
        -subj "/C=BR/ST=SP/L=Sao Paulo/O=PIX Webhook/CN=163.176.145.46"
    
    # Copiar para o diretório do projeto
    cp api_webhook_bb_com_br.key /home/rafael/Documentos/CYC/bb-pix/cert/
    cp api_webhook_bb_com_br.crt /home/rafael/Documentos/CYC/bb-pix/cert/
    
    echo "✅ Certificado auto-assinado criado para teste"
fi

# Fazer backup da configuração atual
echo "💾 Fazendo backup da configuração atual..."
if [ -f "/etc/nginx/sites-available/default" ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

# Copiar nova configuração
echo "📝 Copiando nova configuração..."
cp /home/rafael/Documentos/CYC/bb-pix/nginx-production.conf /etc/nginx/sites-available/pix-webhook-production

# Criar link simbólico
echo "🔗 Criando link simbólico..."
ln -sf /etc/nginx/sites-available/pix-webhook-production /etc/nginx/sites-enabled/

# Desabilitar configuração padrão se existir
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Verificar configuração do Nginx
echo "🔍 Verificando configuração do Nginx..."
if nginx -t; then
    echo "✅ Configuração do Nginx válida"
else
    echo "❌ Erro na configuração do Nginx"
    echo "📝 Verifique o arquivo: /etc/nginx/sites-available/pix-webhook-production"
    exit 1
fi

# Recarregar Nginx
echo "🔄 Recarregando Nginx..."
systemctl reload nginx

if [ $? -eq 0 ]; then
    echo "✅ Nginx recarregado com sucesso"
else
    echo "❌ Erro ao recarregar Nginx"
    exit 1
fi

# Verificar status do Nginx
echo "📊 Status do Nginx:"
systemctl status nginx --no-pager -l

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📋 Endpoints disponíveis:"
echo "  🌐 HTTP (redireciona para HTTPS): http://163.176.145.46"
echo "  🔐 HTTPS com mTLS: https://163.176.145.46"
echo "  🔐 HTTPS sem mTLS (desenvolvimento): https://163.176.145.46:8443"
echo ""
echo "🔗 URLs específicas:"
echo "  📱 Interface web: https://163.176.145.46"
echo "  🔗 Webhook (mTLS): https://163.176.145.46/webhook"
echo "  📊 Client info: https://163.176.145.46/api/client-info"
echo "  🔍 Health check: https://163.176.145.46/health"
echo ""
echo "📝 Logs:"
echo "  📄 Acesso: tail -f /var/log/nginx/bb-webhook-access.log"
echo "  ❌ Erros: tail -f /var/log/nginx/bb-webhook-error.log"
echo ""
echo "🧪 Para testar:"
echo "  curl -k https://163.176.145.46/health"
echo "" 
#!/bin/bash

# Script para configurar Nginx - Proxy HTTP simples
# Execute: chmod +x setup-nginx.sh && sudo ./setup-nginx.sh

echo "🌐 Configurando Nginx - Proxy HTTP simples..."
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script deve ser executado como root (sudo)"
    exit 1
fi

# Verificar se a aplicação está rodando
echo "📋 Verificando se a aplicação está rodando..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️ Aplicação não está rodando na porta 3000"
    echo "💡 Execute: node index.js"
    echo "💡 Ou inicie a aplicação em background: nohup node index.js &"
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
echo "  🌐 HTTP: http://163.176.145.46"
echo "  🔐 HTTPS (aplicação): https://163.176.145.46:3443"
echo ""
echo "🔗 URLs específicas:"
echo "  📱 Interface web: http://163.176.145.46"
echo "  🔗 Webhook (HTTP): http://163.176.145.46/webhook"
echo "  🔗 Webhook (HTTPS/mTLS): https://163.176.145.46:3443/webhook"
echo "  📊 Client info: http://163.176.145.46/api/client-info"
echo "  🔍 Health check: http://163.176.145.46/health"
echo ""
echo "📝 Logs:"
echo "  📄 Acesso: tail -f /var/log/nginx/pix-webhook-access.log"
echo "  ❌ Erros: tail -f /var/log/nginx/pix-webhook-error.log"
echo ""
echo "🧪 Para testar:"
echo "  curl http://163.176.145.46/health"
echo "  curl -k https://163.176.145.46:3443/health"
echo "" 
#!/usr/bin/env node

/**
 * Script para manter o servidor ativo no Render
 * Uso: node keep-alive.js https://seu-app.onrender.com
 */

const https = require('https');
const http = require('http');

const url = process.argv[2] || 'http://localhost:3000';

if (!url) {
    console.error('❌ URL do servidor não fornecida');
    console.log('Uso: node keep-alive.js https://seu-app.onrender.com');
    process.exit(1);
}

console.log(`🔄 Iniciando keep-alive para: ${url}`);
console.log('⏰ Ping a cada 5 minutos...');

function pingServer() {
    const startTime = Date.now();
    
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(`${url}/ping`, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            try {
                const response = JSON.parse(data);
                const timestamp = new Date().toLocaleString('pt-BR');
                
                console.log(`✅ [${timestamp}] Ping OK - Uptime: ${response.uptime}s - Response: ${responseTime}ms`);
            } catch (error) {
                console.log(`⚠️  [${new Date().toLocaleString('pt-BR')}] Ping OK - Response: ${responseTime}ms (JSON inválido)`);
            }
        });
    }).on('error', (error) => {
        console.error(`❌ [${new Date().toLocaleString('pt-BR')}] Erro no ping:`, error.message);
    });
}

// Primeiro ping imediato
pingServer();

// Ping a cada 5 minutos (300000ms)
setInterval(pingServer, 300000);

// Ping a cada 1 minuto se especificado
if (process.argv.includes('--frequent')) {
    console.log('⚡ Modo frequente ativado (ping a cada 1 minuto)');
    setInterval(pingServer, 60000);
}

console.log('🚀 Keep-alive ativo! Pressione Ctrl+C para parar.'); 
# 🔐 Implementação mTLS (Mutual TLS)

Este documento explica como implementar autenticação mTLS no sistema PIX Webhook.

## 📋 **Resumo das Opções**

### **1. Nginx + Node.js (Recomendado)**
- **Nginx**: Gerencia mTLS e faz proxy
- **Node.js**: Aplicação recebe headers com informações do certificado
- **Vantagens**: Melhor performance, configuração centralizada, logs detalhados

### **2. Node.js Direto**
- **Node.js**: Gerencia mTLS diretamente
- **Vantagens**: Controle total, mais flexibilidade
- **Desvantagens**: Mais complexo, menos performance

## 🚀 **Implementação com Nginx (Recomendado)**

### **1. Gerar Certificados**
```bash
# Executar o script de geração
chmod +x generate-mtls-certs.sh
./generate-mtls-certs.sh
```

### **2. Configurar Nginx**
```bash
# Copiar certificados
sudo cp certs/server.crt /etc/ssl/certs/pix-webhook-server.crt
sudo cp certs/server.key /etc/ssl/private/pix-webhook-server.key
sudo cp certs/ca-chain.crt /etc/ssl/certs/ca-chain.crt

# Configurar Nginx
sudo cp nginx-mtls.conf /etc/nginx/sites-available/pix-webhook-mtls
sudo ln -s /etc/nginx/sites-available/pix-webhook-mtls /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **3. Modificar Aplicação Node.js**
Adicionar middleware para ler headers do Nginx:

```javascript
// Middleware para verificar certificado via headers do Nginx
app.use((req, res, next) => {
  const clientVerify = req.headers['x-ssl-client-verify'];
  const clientDN = req.headers['x-ssl-client-dn'];
  
  if (clientVerify !== 'SUCCESS') {
    return res.status(401).json({ 
      error: 'Certificado do cliente não fornecido ou inválido' 
    });
  }
  
  // Extrair informações do DN
  const dnInfo = parseDN(clientDN);
  req.clientCert = {
    subject: dnInfo,
    verified: clientVerify === 'SUCCESS'
  };
  
  console.log(`Cliente autenticado: ${dnInfo.CN}`);
  next();
});

function parseDN(dn) {
  const parts = dn.split(',');
  const result = {};
  parts.forEach(part => {
    const [key, value] = part.trim().split('=');
    result[key] = value;
  });
  return result;
}
```

## 🔧 **Implementação Direta no Node.js**

### **1. Instalar Dependências**
```bash
npm install fs path
```

### **2. Usar o Arquivo `mtls-example.js`**
- Copie o conteúdo para `index.js`
- Ajuste os caminhos dos certificados
- Configure as opções de segurança

### **3. Configuração de Certificados**
```javascript
const mTLSConfig = {
  cert: fs.readFileSync('./certs/server.crt'),
  key: fs.readFileSync('./certs/server.key'),
  ca: fs.readFileSync('./certs/ca.crt'),
  requestCert: true,
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3'
};
```

## 🧪 **Testando mTLS**

### **1. Teste com curl**
```bash
# Teste com certificado válido
curl --cert certs/client.crt \
     --key certs/client.key \
     --cacert certs/ca.crt \
     -X POST https://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'

# Teste sem certificado (deve falhar)
curl -X POST https://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
```

### **2. Teste com Postman**
1. Importar certificado cliente (`client.p12`)
2. Configurar certificado CA (`ca.crt`)
3. Fazer requisição para o endpoint

### **3. Teste com Node.js**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/webhook',
  method: 'POST',
  cert: fs.readFileSync('./certs/client.crt'),
  key: fs.readFileSync('./certs/client.key'),
  ca: fs.readFileSync('./certs/ca.crt'),
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
});

req.write(JSON.stringify({test: 'data'}));
req.end();
```

## 🔒 **Segurança**

### **Boas Práticas**
1. **Certificados Fortes**: Use pelo menos 2048 bits
2. **Validação de CA**: Sempre verifique a cadeia de certificados
3. **Revogação**: Implemente CRL ou OCSP
4. **Renovação**: Configure renovação automática
5. **Logs**: Registre todas as tentativas de acesso

### **Configurações Recomendadas**
```nginx
# Nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
```

```javascript
// Node.js
const mTLSConfig = {
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  requestCert: true,
  rejectUnauthorized: true,
  honorCipherOrder: true
};
```

## 📊 **Monitoramento**

### **Logs Nginx**
```bash
# Acessos com certificado válido
tail -f /var/log/nginx/webhook-access.log

# Erros de certificado
tail -f /var/log/nginx/webhook-error.log
```

### **Logs Node.js**
```javascript
// Log de clientes autenticados
console.log(`Cliente autenticado: ${clientCert.subject.CN}`);

// Log de erros de certificado
server.on('tlsClientError', (err, socket) => {
  console.error('Erro de certificado:', err.message);
});
```

## 🚨 **Troubleshooting**

### **Problemas Comuns**

1. **Certificado não aceito**
   - Verificar se o CA está correto
   - Verificar se o certificado não expirou
   - Verificar se o CN está correto

2. **Erro de conexão**
   - Verificar se o servidor está rodando em HTTPS
   - Verificar se as portas estão corretas
   - Verificar se os certificados estão no local correto

3. **Erro de permissão**
   - Verificar permissões dos arquivos de certificado
   - Verificar se o usuário do Nginx/Node.js tem acesso

### **Comandos de Diagnóstico**
```bash
# Verificar certificado
openssl x509 -in certs/client.crt -text -noout

# Verificar conexão SSL
openssl s_client -connect localhost:3000 -cert certs/client.crt -key certs/client.key -CAfile certs/ca.crt

# Testar configuração Nginx
sudo nginx -t
```

## 📚 **Recursos Adicionais**

- [Nginx SSL/TLS Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Node.js HTTPS Documentation](https://nodejs.org/api/https.html)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [mTLS Best Practices](https://www.owasp.org/index.php/Transport_Layer_Protection_Cheat_Sheet) 
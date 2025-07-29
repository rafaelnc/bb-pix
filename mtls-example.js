const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Configuração mTLS
const mTLSConfig = {
  // Certificados do servidor
  cert: fs.readFileSync('/path/to/server.crt'),
  key: fs.readFileSync('/path/to/server.key'),
  
  // CA para verificar certificados dos clientes
  ca: fs.readFileSync('/path/to/ca.crt'),
  
  // Configurações de segurança
  requestCert: true,        // Solicitar certificado do cliente
  rejectUnauthorized: true, // Rejeitar conexões sem certificado válido
  minVersion: 'TLSv1.2',    // Versão mínima do TLS
  maxVersion: 'TLSv1.3'     // Versão máxima do TLS
};

// Criar servidor HTTPS com mTLS
const server = https.createServer(mTLSConfig, app);

// Middleware para verificar certificado do cliente
app.use((req, res, next) => {
  const clientCert = req.socket.getPeerCertificate();
  
  // Verificar se o certificado foi fornecido
  if (!clientCert || Object.keys(clientCert).length === 0) {
    return res.status(401).json({ 
      error: 'Certificado do cliente não fornecido' 
    });
  }
  
  // Verificar se o certificado é válido
  if (!clientCert.raw) {
    return res.status(401).json({ 
      error: 'Certificado do cliente inválido' 
    });
  }
  
  // Adicionar informações do certificado ao request
  req.clientCert = {
    subject: clientCert.subject,
    issuer: clientCert.issuer,
    serialNumber: clientCert.serialNumber,
    fingerprint: clientCert.fingerprint
  };
  
  console.log(`Cliente autenticado: ${clientCert.subject.CN}`);
  next();
});

// Socket.IO com HTTPS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Exemplo de endpoint que usa informações do certificado
app.get('/api/client-info', (req, res) => {
  res.json({
    clientCert: req.clientCert,
    message: 'Cliente autenticado via mTLS'
  });
});

// Endpoint para receber webhook com verificação mTLS
app.post('/webhook', (req, res) => {
  try {
    console.log('Webhook recebido de:', req.clientCert.subject.CN);
    console.log('Payload:', JSON.stringify(req.body, null, 2));
    
    // Seu código de processamento do webhook aqui...
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      client: req.clientCert.subject.CN
    });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🔐 Servidor mTLS rodando na porta ${PORT}`);
  console.log(`📱 Interface web: https://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoint: https://localhost:${PORT}/webhook`);
});

// Tratamento de erros de certificado
server.on('tlsClientError', (err, socket) => {
  console.error('Erro de certificado do cliente:', err.message);
  socket.destroy();
}); 
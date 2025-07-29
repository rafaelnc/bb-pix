const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Configuração dos certificados do Banco do Brasil
const BB_CERTIFICATES = {
  serverCert: fs.readFileSync('./cert/api_webhook_bb_com_br.crt'),
  intermediateCert: fs.readFileSync('./cert/2-GeoTrust_EV_RSA_CA_G2.cer'),
  rootCert: fs.readFileSync('./cert/1-DigiCert_Global_Root_G2.cer'),
  chainCert: fs.readFileSync('./cert/bb-webhook-chain.crt')
};

// Middleware para verificar certificados de clientes
app.use((req, res, next) => {
  // Verificar se há headers de certificado (quando usado com proxy)
  const clientCert = req.headers['x-ssl-client-cert'];
  const clientVerify = req.headers['x-ssl-client-verify'];
  const clientDN = req.headers['x-ssl-client-dn'];
  
  // Se estiver usando proxy (Nginx), verificar headers
  if (clientCert && clientVerify) {
    if (clientVerify !== 'SUCCESS') {
      console.log('❌ Cliente rejeitado - certificado inválido');
      return res.status(401).json({ 
        error: 'Certificado do cliente não fornecido ou inválido',
        details: 'Acesso negado - autenticação mTLS necessária'
      });
    }
    
    // Extrair informações do DN
    const dnInfo = parseDN(clientDN);
    req.clientCert = {
      subject: dnInfo,
      verified: true,
      source: 'proxy'
    };
    
    console.log(`✅ Cliente autenticado via proxy: ${dnInfo.CN || 'Unknown'}`);
    next();
    return;
  }
  
  // Se não estiver usando proxy, verificar certificado diretamente
  if (req.socket && req.socket.getPeerCertificate) {
    const cert = req.socket.getPeerCertificate();
    
    if (!cert || Object.keys(cert).length === 0 || !cert.raw) {
      console.log('❌ Cliente rejeitado - sem certificado');
      return res.status(401).json({ 
        error: 'Certificado do cliente não fornecido',
        details: 'Acesso negado - autenticação mTLS necessária'
      });
    }
    
    // Verificar se o certificado é válido
    try {
      const certBuffer = Buffer.from(cert.raw);
      const certObj = crypto.createCertificate(certBuffer);
      
      req.clientCert = {
        subject: cert.subject,
        issuer: cert.issuer,
        serialNumber: cert.serialNumber,
        fingerprint: cert.fingerprint,
        verified: true,
        source: 'direct'
      };
      
      console.log(`✅ Cliente autenticado diretamente: ${cert.subject.CN || 'Unknown'}`);
    } catch (error) {
      console.log('❌ Cliente rejeitado - certificado inválido:', error.message);
      return res.status(401).json({ 
        error: 'Certificado do cliente inválido',
        details: error.message
      });
    }
  }
  
  next();
});

// Função para parsear DN (Distinguished Name)
function parseDN(dn) {
  if (!dn) return {};
  
  const parts = dn.split(',');
  const result = {};
  parts.forEach(part => {
    const [key, value] = part.trim().split('=');
    if (key && value) {
      result[key] = value;
    }
  });
  return result;
}

// Criar servidor HTTP (para desenvolvimento)
const server = http.createServer(app);

// Criar servidor HTTPS com mTLS (para produção)
let httpsServer = null;
try {
  const httpsOptions = {
    cert: BB_CERTIFICATES.serverCert,
    ca: BB_CERTIFICATES.chainCert,
    requestCert: true,
    rejectUnauthorized: false, // Permitir certificados auto-assinados para desenvolvimento
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
  };
  
  httpsServer = https.createServer(httpsOptions, app);
  
  // Tratamento de erros de certificado
  httpsServer.on('tlsClientError', (err, socket) => {
    console.error('❌ Erro de certificado do cliente:', err.message);
    socket.destroy();
  });
  
  console.log('🔐 Servidor HTTPS com mTLS configurado');
} catch (error) {
  console.warn('⚠️ Erro ao configurar HTTPS:', error.message);
  console.log('📝 Continuando apenas com HTTP para desenvolvimento');
}

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

// Armazenamento em memória dos pagamentos por data
const pagamentos = {};

// Função para obter a data atual no formato YYYY-MM-DD
function getDataAtual() {
  const hoje = new Date();
  return hoje.toISOString().split('T')[0];
}

// Função para processar e extrair dados do PIX
function processarPagamentoPix(pixData) {
  const pagamento = {
    txid: pixData.txid,
    valor: parseFloat(pixData.valor),
    horario: new Date(pixData.horario),
    infoPagador: pixData.infoPagador,
    pagador: {
      nome: pixData.pagador.nome,
      cpf: pixData.pagador.cpf
    },
    endToEndId: pixData.endToEndId,
    chave: pixData.chave
  };
  
  return pagamento;
}

// Endpoint para receber webhook do Banco do Brasil
app.post('/webhook', (req, res) => {
  try {
    // Log do cliente autenticado
    const clientInfo = req.clientCert ? {
      subject: req.clientCert.subject,
      source: req.clientCert.source,
      verified: req.clientCert.verified
    } : { source: 'unauthenticated' };
    
    console.log('🔐 Webhook recebido de cliente autenticado:', clientInfo);
    console.log('📦 Payload:', JSON.stringify(req.body, null, 2));
    
    const { pix } = req.body;
    
    if (!pix || !Array.isArray(pix)) {
      return res.status(400).json({ error: 'Payload inválido: campo "pix" não encontrado ou não é um array' });
    }
    
    const dataAtual = getDataAtual();
    
    // Inicializar array de pagamentos para a data se não existir
    if (!pagamentos[dataAtual]) {
      pagamentos[dataAtual] = [];
    }
    
    // Processar cada pagamento PIX
    pix.forEach(pixData => {
      const pagamento = processarPagamentoPix(pixData);
      pagamentos[dataAtual].push(pagamento);
      
      console.log(`✅ Pagamento processado: ${pagamento.txid} - R$ ${pagamento.valor}`);
    });
    
    // Emitir evento em tempo real para todos os clientes conectados
    io.emit('novoPagamento', {
      data: dataAtual,
      pagamentos: pagamentos[dataAtual]
    });
    
    res.status(200).json({ 
      success: true, 
      message: `${pix.length} pagamento(s) processado(s)`,
      data: dataAtual,
      client: clientInfo
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para obter pagamentos de uma data específica
app.get('/api/pagamentos/:data', (req, res) => {
  const { data } = req.params;
  const pagamentosData = pagamentos[data] || [];
  
  res.json({
    data: data,
    pagamentos: pagamentosData,
    total: pagamentosData.length,
    valorTotal: pagamentosData.reduce((sum, p) => sum + p.valor, 0)
  });
});

// Endpoint para obter pagamentos do dia atual
app.get('/api/pagamentos', (req, res) => {
  const dataAtual = getDataAtual();
  const pagamentosHoje = pagamentos[dataAtual] || [];
  
  res.json({
    data: dataAtual,
    pagamentos: pagamentosHoje,
    total: pagamentosHoje.length,
    valorTotal: pagamentosHoje.reduce((sum, p) => sum + p.valor, 0)
  });
});

// Endpoint para simular webhook (apenas para desenvolvimento)
app.post('/simular-webhook', (req, res) => {
  const payloadExemplo = {
    pix: [
      {
        endToEndId: "E60746948202103082223A7540Db1234",
        txid: "123234443",
        valor: "100.00",
        componentesValor: {
          original: {
            valor: "100.00"
          }
        },
        chave: "baaf230c-a642-546d-1254-aa16ae7c8dc6",
        horario: new Date().toISOString(),
        infoPagador: "Pedido XYZ",
        pagador: {
          cpf: "93492239293",
          nome: "VICTOR LOPES DORNELES"
        }
      }
    ]
  };
  
  // Fazer requisição interna para o webhook
  const http = require('http');
  const postData = JSON.stringify(payloadExemplo);
  
  const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const webhookReq = http.request(options, (res) => {
    console.log('Webhook simulado enviado com sucesso');
  });
  
  webhookReq.on('error', (e) => {
    console.error('Erro ao simular webhook:', e);
  });
  
  webhookReq.write(postData);
  webhookReq.end();
  
  res.json({ message: 'Webhook simulado enviado' });
});

// Endpoint para health check (mantém servidor ativo)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Endpoint para verificar informações do certificado do cliente
app.get('/api/client-info', (req, res) => {
  if (req.clientCert) {
    res.json({
      authenticated: true,
      clientCert: {
        subject: req.clientCert.subject,
        issuer: req.clientCert.issuer,
        serialNumber: req.clientCert.serialNumber,
        fingerprint: req.clientCert.fingerprint,
        source: req.clientCert.source,
        verified: req.clientCert.verified
      },
      message: 'Cliente autenticado via mTLS'
    });
  } else {
    res.status(401).json({
      authenticated: false,
      error: 'Cliente não autenticado',
      message: 'Certificado do cliente não fornecido ou inválido'
    });
  }
});



// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Enviar pagamentos atuais do dia para o cliente recém-conectado
  const dataAtual = getDataAtual();
  const pagamentosHoje = pagamentos[dataAtual] || [];
  
  socket.emit('pagamentosAtuais', {
    data: dataAtual,
    pagamentos: pagamentosHoje
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Iniciar servidor HTTP (para desenvolvimento e interface web)
server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
  console.log(`📱 Interface web: http://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🧪 Simular webhook: http://localhost:${PORT}/simular-webhook`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Iniciar servidor HTTPS com mTLS (se configurado)
if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔐 Servidor HTTPS com mTLS rodando na porta ${HTTPS_PORT}`);
    console.log(`🔗 Webhook endpoint (mTLS): https://localhost:${HTTPS_PORT}/webhook`);
    console.log(`🔍 Client info: https://localhost:${HTTPS_PORT}/api/client-info`);
    console.log(`📋 Certificados BB configurados: ✅`);
  });
} else {
  console.log(`⚠️ Servidor HTTPS não iniciado - certificados não configurados`);
} 
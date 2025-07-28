const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
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
    console.log('Webhook recebido:', JSON.stringify(req.body, null, 2));
    
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
      
      console.log(`Pagamento processado: ${pagamento.txid} - R$ ${pagamento.valor}`);
    });
    
    // Emitir evento em tempo real para todos os clientes conectados
    io.emit('novoPagamento', {
      data: dataAtual,
      pagamentos: pagamentos[dataAtual]
    });
    
    res.status(200).json({ 
      success: true, 
      message: `${pix.length} pagamento(s) processado(s)`,
      data: dataAtual
    });
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
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

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Interface web: http://localhost:${PORT}`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🧪 Simular webhook: http://localhost:${PORT}/simular-webhook`);
}); 
# 🏦 PIX Webhook - Banco do Brasil

Sistema completo para receber e monitorar pagamentos PIX via webhook do Banco do Brasil em tempo real.

## ✨ Funcionalidades

- ✅ **Webhook PIX**: Endpoint para receber notificações do Banco do Brasil
- ✅ **Interface Web**: Dashboard moderno e responsivo
- ✅ **Tempo Real**: Atualizações instantâneas via Socket.IO
- ✅ **Armazenamento**: Pagamentos organizados por data
- ✅ **API REST**: Endpoints para consulta de dados
- ✅ **Simulação**: Ferramenta para testar webhooks
- ✅ **Notificações**: Alertas de novos pagamentos

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### 1. Instalar dependências
```bash
npm install
```

### 2. Executar o projeto
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### 3. Acessar a aplicação
- **Interface Web**: http://localhost:3000
- **Webhook**: http://localhost:3000/webhook
- **API**: http://localhost:3000/api/pagamentos

## 📋 Estrutura do Projeto

```
bb-pix/
├── index.js              # Servidor principal
├── package.json          # Dependências e scripts
├── public/
│   └── index.html        # Interface web
└── README.md            # Documentação
```

## 🔗 Endpoints da API

### POST `/webhook`
Recebe notificações PIX do Banco do Brasil

**Payload esperado:**
```json
{
  "pix": [
    {
      "endToEndId": "E60746948202103082223A7540Db1234",
      "txid": "123234443",
      "valor": "100.00",
      "componentesValor": {
        "original": {
          "valor": "100.00"
        }
      },
      "chave": "baaf230c-a642-546d-1254-aa16ae7c8dc6",
      "horario": "2022-07-27T14:30:47.00-03:00",
      "infoPagador": "Pedido XYZ",
      "pagador": {
        "cpf": "93492239293",
        "nome": "VICTOR LOPES DORNELES"
      }
    }
  ]
}
```

### GET `/api/pagamentos`
Retorna pagamentos do dia atual

### GET `/api/pagamentos/:data`
Retorna pagamentos de uma data específica (formato: YYYY-MM-DD)

### POST `/simular-webhook`
Simula o envio de um webhook para testes

## 🎯 Dados Extraídos do PIX

Para cada pagamento, o sistema extrai e armazena:

- **txid**: Identificador da transação
- **valor**: Valor do pagamento
- **horario**: Data e hora do pagamento
- **infoPagador**: Informação adicional do pagador
- **pagador.nome**: Nome do pagador
- **pagador.cpf**: CPF do pagador
- **endToEndId**: ID end-to-end da transação
- **chave**: Chave PIX utilizada

## 🔄 Funcionalidades em Tempo Real

### Socket.IO Events

- **`pagamentosAtuais`**: Enviado quando cliente se conecta
- **`novoPagamento`**: Enviado quando novo pagamento é recebido

### Interface Web

- **Dashboard em tempo real** com estatísticas
- **Lista de pagamentos** atualizada automaticamente
- **Indicador de conexão** com Socket.IO
- **Notificações push** para novos pagamentos
- **Design responsivo** para mobile e desktop

## 🧪 Testando o Sistema

### 1. Simular Webhook
Clique no botão "🧪 Simular Webhook" na interface web ou faça uma requisição POST para `/simular-webhook`

### 2. Enviar Webhook Manual
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "pix": [{
      "endToEndId": "E60746948202103082223A7540Db1234",
      "txid": "123234443",
      "valor": "100.00",
      "componentesValor": {"original": {"valor": "100.00"}},
      "chave": "baaf230c-a642-546d-1254-aa16ae7c8dc6",
      "horario": "2022-07-27T14:30:47.00-03:00",
      "infoPagador": "Pedido XYZ",
      "pagador": {
        "cpf": "93492239293",
        "nome": "VICTOR LOPES DORNELES"
      }
    }]
  }'
```

## 🚀 Deploy

### Render
1. Conecte seu repositório ao Render
2. Configure como **Web Service**
3. Use o comando: `npm start`
4. Configure a variável de ambiente `PORT` (opcional)

### Outras Plataformas
O projeto é compatível com qualquer plataforma que suporte Node.js:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk

## 📊 Armazenamento

- **Tipo**: Memória (volátil)
- **Organização**: Por data (`pagamentos["2025-01-28"]`)
- **Persistência**: Não há persistência - dados são perdidos ao reiniciar

> **Nota**: Para produção, considere implementar um banco de dados (MongoDB, PostgreSQL, etc.)

## 🔧 Configuração

### Variáveis de Ambiente
- `PORT`: Porta do servidor (padrão: 3000)

### Personalização
- Modifique `index.js` para alterar lógica de processamento
- Edite `public/index.html` para customizar interface
- Ajuste estilos CSS no arquivo HTML

## 📝 Logs

O sistema registra no console:
- Conexões de clientes Socket.IO
- Webhooks recebidos
- Pagamentos processados
- Erros de processamento

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para integração com PIX do Banco do Brasil**

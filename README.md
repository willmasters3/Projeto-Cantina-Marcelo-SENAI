# Projeto Cantina

## Visão geral

Projeto Cantina é uma aplicação monolítica modular em Node.js com Express, separando backend e frontend no mesmo repositório. A arquitetura é preparada para evolução futura e usa API REST para comunicação.

## Estrutura do projeto

- `backend/`: servidor Express e conexão MySQL.
- `frontend/`: interface HTML, CSS e JavaScript puro.
- `database/`: scripts e backups manuais.

## Pré-requisitos

- Node.js 18+ instalado.
- MySQL instalado localmente.
- Banco de dados `projeto_cantina` existente.

## Instalação

1. No diretório do projeto, instale dependências do backend:

```bash
cd backend
npm install
```

2. Crie o arquivo `.env` baseado em `.env.example` e configure-o com seus dados locais.

## Exemplo `.env`

```env
NODE_ENV=development
API_PORT=3000
CORS_ORIGIN=http://localhost:5500
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=projeto_cantina
```

> Não coloque senhas ou dados sensíveis em arquivos commitados.

## Como iniciar

- Ambiente de desenvolvimento:

```bash
npm run dev
```

- Execução normal:

```bash
npm start
```

## Testar a rota de status

A rota de teste está disponível em:

- `GET http://localhost:3000/api/v1/status`

Ela retorna o status do servidor e do banco de dados.

## Frontend

Abra `frontend/public/index.html` diretamente no navegador ou sirva a pasta `frontend/public` com um servidor local para testar o botão "Testar sistema".

## Arquitetura

- `routes`: define endpoints e vincula controllers.
- `controllers`: recebe requisições e chama services.
- `services`: contém regras de negócio.
- `repositories`: executa consultas MySQL.
- `config`: lê variáveis de ambiente e configura o pool.
- `middlewares`: tratamento de erros e rotas não encontradas.
- `utils`: funções reutilizáveis para crescimento futuro.

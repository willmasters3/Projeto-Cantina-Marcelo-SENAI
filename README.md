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

1. No diretório do projeto, instale as dependências do backend:

```bash
cd backend
npm install
```

2. Configure `backend/.env` a partir de `backend/.env.example`, sem versionar credenciais.

3. Crie o primeiro administrador de forma interativa. A senha não é exibida no terminal:

```bash
cd backend
npm run create:admin
```

## Como iniciar

- Ambiente de desenvolvimento:

```bash
cd backend
npm run dev
```

- Execução normal:

```bash
cd backend
npm start
```

O sistema fica disponível em `http://localhost:3000`.

## Testar a rota de status

A rota de teste está disponível em:

- `GET http://localhost:3000/api/v1/status`

Ela retorna o status do servidor e do banco de dados.

## Páginas

- Login: `http://localhost:3000/login`
- Monitor público: `http://localhost:3000/monitor`
- Área interna: `http://localhost:3000/app`

O frontend deve ser acessado pelo Express; não abra os arquivos HTML diretamente.

## Verificações locais

```bash
cd backend
npm run lint
npm test
```

## Arquitetura

- `routes`: define endpoints e vincula controllers.
- `controllers`: recebe requisições e chama services.
- `services`: contém regras de negócio.
- `repositories`: executa consultas MySQL.
- `config`: lê variáveis de ambiente e configura o pool.
- `middlewares`: tratamento de erros e rotas não encontradas.
- `utils`: funções reutilizáveis para crescimento futuro.

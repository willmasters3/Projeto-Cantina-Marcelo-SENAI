# 🍽️ Cantina Management System

![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![Express](https://img.shields.io/badge/Express.js-API-lightgrey)
![MySQL](https://img.shields.io/badge/MySQL-Database-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-Full%20Stack-yellow)
![REST API](https://img.shields.io/badge/API-REST-orange)

Sistema web desenvolvido para gerenciamento de **vendas, estoque, clientes e operações de uma cantina**, centralizando processos que normalmente seriam realizados manualmente.

A aplicação foi construída com **Node.js, Express e MySQL**, utilizando uma arquitetura modular com separação entre rotas, controllers, services e repositories.

---

## 📌 Visão geral

O Cantina Management System foi desenvolvido para facilitar a operação diária de uma cantina, reunindo em uma única aplicação funcionalidades de **PDV, controle de estoque, clientes, vendas e pagamentos a prazo**.

Um dos principais cenários atendidos pelo sistema é o controle de compras realizadas **a prazo (fiado)**, permitindo registrar os produtos consumidos por cada cliente e acompanhar posteriormente os valores pendentes.

O projeto também contempla vendas à vista, movimentação de estoque e recursos administrativos, mantendo as regras de negócio centralizadas no backend.

---

## 🎯 Objetivo do projeto

Criar uma solução simples e prática para substituir controles manuais utilizados no funcionamento de uma cantina.

Entre os problemas tratados pelo sistema estão:

- registro de vendas no ponto de venda;
- controle de produtos e estoque;
- identificação de produtos por código;
- acompanhamento de estoque mínimo;
- cadastro e gerenciamento de clientes;
- controle de compras realizadas a prazo;
- acompanhamento de valores pendentes;
- geração de informações e relatórios para administração;
- centralização das regras de negócio em uma única aplicação.

---

## 🧩 Principais funcionalidades

### 🛒 PDV e vendas

- Registro de vendas através do ponto de venda;
- Busca e inclusão de produtos;
- Suporte à identificação de produtos por código;
- Registro de vendas à vista;
- Registro de vendas a prazo vinculadas a clientes;
- Atualização de estoque conforme as movimentações realizadas.

### 📦 Estoque

- Cadastro e gerenciamento de produtos;
- Controle de quantidade disponível;
- Acompanhamento de estoque mínimo;
- Controle de movimentações;
- Validações para evitar inconsistências no cadastro de produtos.

### 👥 Clientes

- Cadastro e gerenciamento de clientes;
- Associação de compras a clientes;
- Consulta de movimentações relacionadas ao cliente;
- Acompanhamento de valores pendentes.

### 💳 Vendas a prazo

O sistema possui regras específicas para operações realizadas a prazo.

As compras podem ser vinculadas ao cliente e posteriormente consultadas para acompanhamento dos valores pendentes, permitindo organizar um processo que normalmente dependeria de anotações ou planilhas.

### 📊 Administração e relatórios

- Consulta de informações operacionais;
- Acompanhamento de vendas;
- Informações de estoque;
- Consulta de clientes e pendências;
- Recursos administrativos para gerenciamento do sistema.

---

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura de **monólito modular**, mantendo backend e frontend no mesmo repositório, mas separando as responsabilidades da aplicação.

```text
Frontend
HTML + CSS + JavaScript
        |
        | HTTP / REST
        v
Backend
Node.js + Express
        |
        +--> Routes
        |
        +--> Controllers
        |
        +--> Services
        |      |
        |      +--> Regras de negócio
        |
        +--> Repositories
                |
                v
              MySQL
```

### Organização do backend

- **Routes:** definição dos endpoints da API;
- **Controllers:** tratamento das requisições e respostas;
- **Services:** regras de negócio da aplicação;
- **Repositories:** acesso e consultas ao banco de dados;
- **Config:** configurações e conexão com o banco;
- **Middlewares:** tratamento de erros e processamento das requisições;
- **Utils:** funções auxiliares reutilizáveis.

Essa separação permite evoluir as funcionalidades sem concentrar toda a lógica diretamente nas rotas ou controllers.

---

## 🛠️ Tecnologias utilizadas

### Backend

- Node.js
- Express.js
- JavaScript
- API REST

### Frontend

- HTML5
- CSS3
- JavaScript puro
- Consumo da API através do navegador

### Banco de dados

- MySQL
- Estrutura relacional
- Separação da camada de persistência através de repositories

### Segurança e configuração

- Variáveis de ambiente com `.env`;
- Arquivo `.env.example` para configuração local;
- Autenticação administrativa;
- Senhas protegidas no backend;
- Separação entre configuração e código-fonte.

---

## 📂 Estrutura do projeto

```text
cantina-management-system/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── frontend/
│   ├── css/
│   ├── js/
│   └── páginas da aplicação
│
├── database/
│   └── scripts do banco de dados
│
└── README.md
```

---

## 🔄 Fluxo simplificado de uma venda

```text
Produto selecionado
        ↓
PDV registra os itens
        ↓
Forma de pagamento
        ↓
À vista ───────────────→ Finalização da venda
        │
        └─ A prazo
              ↓
        Cliente identificado
              ↓
        Débito registrado
              ↓
        Atualização do estoque
```

Esse fluxo permite que vendas comuns permaneçam rápidas, enquanto operações a prazo mantêm a rastreabilidade necessária.

---

## 🚀 Como executar

### Pré-requisitos

- Node.js 18 ou superior;
- MySQL;
- npm.

Clone o repositório e acesse o backend:

```bash
cd backend
npm install
```

Crie o arquivo de configuração local a partir do exemplo:

```text
backend/.env.example
```

Configure as informações do banco de dados no seu `.env`.

> O arquivo `.env` não deve ser versionado.

---

## 👤 Criando o primeiro administrador

O projeto possui uma rotina para criação do primeiro usuário administrativo.

```bash
cd backend
npm run create:admin
```

A senha é informada de forma interativa e não é exibida diretamente no terminal.

---

## ▶️ Iniciando a aplicação

### Desenvolvimento

```bash
cd backend
npm run dev
```

### Execução normal

```bash
cd backend
npm start
```

Por padrão, a aplicação pode ser acessada em:

```text
http://localhost:3000
```

---

## 🧪 Testes e verificações

Para executar as verificações disponíveis no projeto:

```bash
cd backend
npm run lint
npm test
```

A API também possui uma rota de status:

```text
GET /api/v1/status
```

Ela permite verificar o funcionamento do servidor e a comunicação com o banco de dados.

---

## 🔗 Principais áreas da aplicação

```text
/login
```

Autenticação.

```text
/monitor
```

Visualização pública de informações disponibilizadas pelo sistema.

```text
/app
```

Área interna da aplicação.

---

## 👨‍💻 Desenvolvimento

O projeto envolve diferentes aspectos do desenvolvimento de uma aplicação web completa:

- modelagem das regras de negócio;
- desenvolvimento de API REST;
- integração entre frontend e backend;
- persistência de dados com MySQL;
- autenticação e controle administrativo;
- gerenciamento de vendas;
- controle de estoque;
- implementação de operações a prazo;
- organização modular do backend;
- tratamento de erros;
- configuração por variáveis de ambiente;
- testes e manutenção evolutiva.

---

## 🚧 Desafios técnicos

Alguns dos principais desafios abordados durante o desenvolvimento foram:

- representar corretamente vendas à vista e a prazo;
- manter consistência entre vendas e movimentações de estoque;
- controlar pendências associadas aos clientes;
- evitar duplicidade e inconsistências no cadastro de produtos;
- separar regras de negócio da camada HTTP;
- estruturar o backend para permitir evolução do sistema;
- manter uma interface simples para utilização no ambiente operacional.

---

## 📈 Evolução do projeto

O sistema continua sendo desenvolvido de forma incremental.

A arquitetura modular permite adicionar novas regras e funcionalidades sem concentrar toda a aplicação em um único arquivo ou camada.

Entre as áreas que podem continuar evoluindo estão:

- relatórios gerenciais;
- histórico de movimentações;
- gerenciamento de pendências;
- melhorias na experiência do PDV;
- expansão das regras de estoque;
- maior cobertura de testes.

---

## 📷 Screenshots

Screenshots da aplicação poderão ser adicionados nesta seção para demonstrar visualmente o PDV, estoque, gerenciamento de clientes e relatórios.

```text
docs/screenshots/
├── pdv.png
├── estoque.png
├── clientes.png
└── relatorios.png
```

---

## 📌 Status

Projeto funcional e em evolução, desenvolvido como uma solução web completa para gerenciamento das operações de uma cantina.

---

## ✍️ Autor

**William Pereira do Nascimento**

Desenvolvedor com foco em **Node.js, Express, SQL, APIs REST e sistemas web**.

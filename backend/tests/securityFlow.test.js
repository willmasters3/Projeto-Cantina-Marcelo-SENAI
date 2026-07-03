import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import app, { shouldSkipRequestLog } from '../src/app.js';
import authSessionsRepository from '../src/repositories/authSessionsRepository.js';
import authService from '../src/services/authService.js';
import categoriesRepository from '../src/repositories/categoriesRepository.js';
import categoriesService from '../src/services/categoriesService.js';
import cashRepository from '../src/repositories/cashRepository.js';
import cashService from '../src/services/cashService.js';
import clientsRepository from '../src/repositories/clientsRepository.js';
import clientsService from '../src/services/clientsService.js';
import { isValidCpf, normalizeCpf } from '../src/utils/cpf.js';
import {
  formatFixedDecimal,
  multiplyFixedDecimal,
  parseFixedDecimal
} from '../src/utils/fixedDecimal.js';
import productsRepository from '../src/repositories/productsRepository.js';
import productsService from '../src/services/productsService.js';
import statusRepository from '../src/repositories/statusRepository.js';
import { isValidOptionalBarcode } from '../src/validators/productsValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend/public');

const adminUser = {
  id: 1,
  nome: 'Administrador de Teste',
  email: 'admin@example.test',
  role: { slug: 'ADMINISTRADOR', nome: 'Administrador' }
};

test('rotas públicas, autenticação e autorização sem acessar o banco', async (t) => {
  const originalGetUser = authService.getUserBySessionToken;
  const originalLogin = authService.login;
  const originalLogout = authService.logout;
  const originalStatusCheck = statusRepository.checkDatabaseConnection;
  const originalInvalidateSession = authSessionsRepository.invalidateSession;
  const originalListCategories = categoriesService.listCategories;
  const originalCreateCategory = categoriesService.createCategory;
  const originalGetProductByBarcode = productsService.getProductByBarcode;
  const originalCreateProduct = productsService.createProduct;
  const originalUpdateProduct = productsService.updateProduct;
  const originalFindProductByBarcode = productsRepository.findByBarcode;
  const originalFindCategoryByName = categoriesRepository.findByName;
  const originalCreateCategoryRecord = categoriesRepository.createCategory;
  const originalFindCategoryById = categoriesRepository.findById;
  const originalListClients = clientsService.listClients;
  const originalGetClientById = clientsService.getClientById;
  const originalCreateClient = clientsService.createClient;
  const originalUpdateClient = clientsService.updateClient;
  const originalUpdateClientStatus = clientsService.updateClientStatus;
  const originalFindClientById = clientsRepository.findById;
  const originalFindClientByCpf = clientsRepository.findByCpf;
  const originalFindClientByCpfExcludingId = clientsRepository.findByCpfExcludingId;
  const originalFindClientByMatricula = clientsRepository.findByMatricula;
  const originalFindClientByMatriculaExcludingId = clientsRepository.findByMatriculaExcludingId;
  const originalGetNextClientCodeNumber = clientsRepository.getNextCodeNumber;
  const originalCreateClientRecord = clientsRepository.createClient;
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const request = (path, options = {}) => fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options
  });

  try {
    await t.test('expõe somente as páginas públicas esperadas', async () => {
      const rootResponse = await request('/');
      assert.equal(rootResponse.status, 302);
      assert.equal(rootResponse.headers.get('location'), '/login');

      const loginResponse = await request('/login');
      assert.equal(loginResponse.status, 200);
      assert.match(await loginResponse.text(), /Acesso ao sistema/);
      const contentSecurityPolicy = loginResponse.headers.get('content-security-policy');
      assert.match(contentSecurityPolicy, /script-src 'self'/);
      assert.match(contentSecurityPolicy, /script-src-attr 'none'/);
      assert.doesNotMatch(contentSecurityPolicy, /script-src[^;]*'unsafe-inline'/);
      assert.doesNotMatch(contentSecurityPolicy, /'unsafe-eval'/);

      const monitorResponse = await request('/monitor');
      assert.equal(monitorResponse.status, 200);
      assert.match(await monitorResponse.text(), /Autoatendimento da Cantina/);
    });

    await t.test('bloqueia páginas, APIs e arquivos HTML internos sem sessão', async () => {
      const pageResponse = await request('/app/caixa');
      assert.equal(pageResponse.status, 302);
      assert.equal(pageResponse.headers.get('location'), '/login');

      const directHtmlResponse = await request('/app/caixa.html');
      assert.equal(directHtmlResponse.status, 404);

      const productsResponse = await request('/api/v1/products');
      assert.equal(productsResponse.status, 401);
    });

    await t.test('aplica permissões de página e retorna auth/me no contrato público', async () => {
      authService.getUserBySessionToken = async () => adminUser;
      const adminPageResponse = await request('/app/produtos', {
        headers: { cookie: 'cantina_session=admin-session' }
      });
      assert.equal(adminPageResponse.status, 200);

      const meResponse = await request('/api/v1/auth/me', {
        headers: { cookie: 'cantina_session=admin-session' }
      });
      assert.equal(meResponse.status, 200);
      assert.deepEqual(await meResponse.json(), { success: true, user: adminUser });

      authService.getUserBySessionToken = async () => ({
        ...adminUser,
        role: { slug: 'CONSULTA', nome: 'Consulta' }
      });
      const reportsResponse = await request('/app/relatorios', {
        headers: { cookie: 'cantina_session=viewer-session' }
      });
      assert.equal(reportsResponse.status, 200);

      const deniedResponse = await request('/app/caixa', {
        headers: { cookie: 'cantina_session=viewer-session' }
      });
      assert.equal(deniedResponse.status, 403);
    });

    await t.test('define e limpa cookie HttpOnly e SameSite=Lax', async () => {
      authService.login = async () => ({ token: 'browser-token', user: adminUser });
      const loginResponse = await request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adminUser.email, password: 'not-logged' })
      });
      assert.equal(loginResponse.status, 200);
      const sessionCookie = loginResponse.headers.get('set-cookie');
      assert.match(sessionCookie, /cantina_session=browser-token/);
      assert.match(sessionCookie, /HttpOnly/i);
      assert.match(sessionCookie, /SameSite=Lax/i);
      assert.match(sessionCookie, /Path=\//i);

      let loggedOutToken;
      authService.logout = async (token) => {
        loggedOutToken = token;
      };
      const logoutResponse = await request('/api/v1/auth/logout', {
        method: 'POST',
        headers: { cookie: 'cantina_session=browser-token' }
      });
      assert.equal(logoutResponse.status, 204);
      assert.equal(loggedOutToken, 'browser-token');
      assert.match(logoutResponse.headers.get('set-cookie'), /cantina_session=;/);
    });

    await t.test('processa categoria e consulta código de barras com sessão administrativa', async () => {
      authService.getUserBySessionToken = async () => adminUser;
      categoriesService.listCategories = async () => [
        { id: 1, nome: 'Bebidas', ativo: 1 }
      ];
      categoriesService.createCategory = async ({ nome }) => ({ id: 2, nome, ativo: 1 });
      productsService.getProductByBarcode = async (barcode) => ({
        id: 9,
        nome: 'Suco de laranja',
        codigo_barras: barcode,
        ativo: 1
      });

      const categoryResponse = await request('/api/v1/categories', {
        method: 'POST',
        headers: {
          cookie: 'cantina_session=admin-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ nome: 'Balas' })
      });
      assert.equal(categoryResponse.status, 201);
      assert.equal((await categoryResponse.json()).data.nome, 'Balas');

      const categoriesResponse = await request('/api/v1/categories', {
        headers: { cookie: 'cantina_session=admin-session' }
      });
      assert.equal(categoriesResponse.status, 200);
      assert.equal((await categoriesResponse.json()).data.length, 1);

      const barcodeResponse = await request('/api/v1/products/barcode/7891234567890', {
        headers: { cookie: 'cantina_session=admin-session' }
      });
      assert.equal(barcodeResponse.status, 200);
      assert.equal((await barcodeResponse.json()).data.nome, 'Suco de laranja');
    });

    await t.test('normaliza Balas e retorna conflito amigável sem coluna derivada', async () => {
      categoriesService.createCategory = originalCreateCategory;
      let insertedName;
      categoriesRepository.findByName = async () => null;
      categoriesRepository.createCategory = async (nome) => {
        insertedName = nome;
        return 12;
      };
      categoriesRepository.findById = async (id) => ({ id, nome: insertedName, ativo: 1 });

      const created = await categoriesService.createCategory({ nome: '  Balas  ' });
      assert.equal(insertedName, 'Balas');
      assert.equal(created.nome, 'Balas');

      categoriesRepository.findByName = async () => ({ id: 12, nome: 'Balas', ativo: 1 });
      await assert.rejects(
        categoriesService.createCategory({ nome: ' balas ' }),
        (error) => error.status === 409 && /Balas/.test(error.message)
      );

      const repositorySource = await fs.readFile(
        path.resolve(__dirname, '../src/repositories/categoriesRepository.js'),
        'utf8'
      );
      assert.doesNotMatch(repositorySource, /nome_normaliz(?:ed|ado)/i);
      assert.match(repositorySource, /LOWER\(TRIM\(nome\)\) = LOWER\(TRIM\(\?\)\)/);
      assert.match(repositorySource, /AND id != \?/);
    });

    await t.test('filtra logs estáticos e 304, mantendo mutações e erros', () => {
      const shouldSkip = (method, requestPath, statusCode) => shouldSkipRequestLog(
        { method, path: requestPath },
        { statusCode }
      );

      assert.equal(shouldSkip('GET', '/css/main.css', 200), true);
      assert.equal(shouldSkip('GET', '/js/app.js', 304), true);
      assert.equal(shouldSkip('GET', '/assets/logo.svg', 404), true);
      assert.equal(shouldSkip('GET', '/favicon.ico', 404), true);
      assert.equal(shouldSkip('GET', '/api/v1/auth/me', 200), true);
      assert.equal(shouldSkip('POST', '/api/v1/categories', 201), false);
      assert.equal(shouldSkip('PATCH', '/api/v1/products/1/status', 200), false);
      assert.equal(shouldSkip('GET', '/api/v1/categories', 500), false);
      assert.equal(shouldSkip('GET', '/rota-inexistente', 404), false);
    });

    await t.test('mantém stack interna no terminal e resposta genérica no frontend', async () => {
      authService.getUserBySessionToken = async () => adminUser;
      categoriesService.listCategories = async () => {
        throw new Error('detalhe interno de banco');
      };
      const originalConsoleError = console.error;
      let terminalError = '';
      console.error = (...parts) => {
        terminalError = parts.join(' ');
      };

      try {
        const response = await request('/api/v1/categories', {
          headers: { cookie: 'cantina_session=admin-session' }
        });
        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.error, 'Erro interno do servidor');
        assert.doesNotMatch(JSON.stringify(body), /detalhe interno de banco/);
        assert.match(terminalError, /detalhe interno de banco/);
      } finally {
        console.error = originalConsoleError;
      }
    });

    await t.test('mantém Categorias e Produtos livres de JavaScript inline', async () => {
      const files = await Promise.all([
        'app/categorias.html',
        'app/produtos.html',
        'js/categoriesApp.js',
        'js/productsApp.js',
        'js/appLayout.js',
        'js/currencyInput.js'
      ].map((file) => fs.readFile(path.join(frontendPath, file), 'utf8')));
      const source = files.join('\n');
      const productsHtml = files[1];
      const productsScript = files[3];

      assert.doesNotMatch(source, /\son[a-z]+\s*=/i);
      assert.doesNotMatch(source, /\beval\s*\(/);
      assert.doesNotMatch(source, /\bnew\s+Function\b/);
      assert.doesNotMatch(source, /innerHTML/);
      assert.match(productsScript, /barcodeInput\.addEventListener\('keydown'/);
      assert.match(productsScript, /event\.preventDefault\(\)/);
      assert.match(productsScript, /adminApi\.getProductByBarcode\(barcode\)/);
      assert.match(
        productsHtml,
        /id="productBarcode"[\s\S]*?type="text"[\s\S]*?inputmode="numeric"[\s\S]*?pattern="\[0-9\]\*"/
      );
      assert.match(productsHtml, /Nome do produto/);
      assert.match(productsScript, /barcodeInput\.addEventListener\('paste'/);
      assert.match(productsScript, /Código de barras deve conter somente números\./);
    });

    await t.test('mantém o CSS modular, sem estilos inline e com main apenas agregador', async () => {
      const cssPath = path.join(frontendPath, 'css');
      const expectedCssFiles = [
        'base/reset.css',
        'base/variables.css',
        'base/typography.css',
        'base/global.css',
        'layout/app-shell.css',
        'layout/sidebar.css',
        'layout/topbar.css',
        'components/buttons.css',
        'components/forms.css',
        'components/tables.css',
        'components/alerts.css',
        'components/cards.css',
        'components/modal.css',
        'pages/login.css',
        'pages/monitor.css',
        'pages/caixa.css',
        'pages/products.css',
        'pages/categories.css',
        'pages/clients.css',
        'pages/estoque.css',
        'pages/fiado.css',
        'pages/reports.css',
        'pages/home.css',
        'pages/dashboard.css',
        'pages/settings.css'
      ];
      await Promise.all(expectedCssFiles.map((file) => fs.access(path.join(cssPath, file))));

      const mainCss = await fs.readFile(path.join(cssPath, 'main.css'), 'utf8');
      const mainCssLines = mainCss.split(/\r?\n/).filter((line) => line.trim());
      assert.ok(mainCssLines.every((line) => line.startsWith('@import url(')));
      assert.doesNotMatch(mainCss, /[{}]/);
      assert.doesNotMatch(mainCss, /pages\//);

      const pageStyles = new Map([
        ['index.html', 'css/pages/home.css'],
        ['monitor.html', 'css/pages/monitor.css'],
        ['app/login.html', '../css/pages/login.css'],
        ['app/dashboard.html', '../css/pages/dashboard.css'],
        ['app/caixa.html', '../css/pages/caixa.css'],
        ['app/produtos.html', '../css/pages/products.css'],
        ['app/categorias.html', '../css/pages/categories.css'],
        ['app/clientes.html', '../css/pages/clients.css'],
        ['app/estoque.html', '../css/pages/estoque.css'],
        ['app/fiado.html', '../css/pages/fiado.css'],
        ['app/relatorios.html', '../css/pages/reports.css'],
        ['app/configuracoes.html', '../css/pages/settings.css']
      ]);
      const htmlSources = await Promise.all([...pageStyles].map(async ([htmlFile, pageStyle]) => {
        const source = await fs.readFile(path.join(frontendPath, htmlFile), 'utf8');
        assert.match(source, /css\/main\.css/);
        assert.ok(source.includes(`href="${pageStyle}"`));
        return source;
      }));
      assert.doesNotMatch(htmlSources.join('\n'), /\sstyle\s*=/i);

      const cssSources = await Promise.all(expectedCssFiles
        .concat('main.css')
        .map((file) => fs.readFile(path.join(cssPath, file), 'utf8')));
      assert.doesNotMatch(cssSources.join('\n'), /!important/i);
    });

    await t.test('formata preço e custo em centavos sem alterar a API', async () => {
      const currencyModuleSource = await fs.readFile(
        path.join(frontendPath, 'js/currencyInput.js'),
        'utf8'
      );
      const currencyModuleUrl = `data:text/javascript;base64,${Buffer
        .from(currencyModuleSource)
        .toString('base64')}`;
      const {
        bindCurrencyInput,
        decimalToFormattedCurrency,
        formatCurrencyInputValue,
        formattedCurrencyToDecimal,
        setCurrencyInputDecimalValue
      } = await import(currencyModuleUrl);

      assert.equal(formatCurrencyInputValue('4'), '0,04');
      assert.equal(formatCurrencyInputValue('400'), '4,00');
      assert.equal(formatCurrencyInputValue('40000'), '400,00');
      assert.equal(formatCurrencyInputValue('400000'), '4.000,00');
      assert.equal(formattedCurrencyToDecimal('4,50'), '4.50');
      assert.equal(formattedCurrencyToDecimal(''), null);
      assert.equal(decimalToFormattedCurrency('4000.00'), '4.000,00');
      assert.equal(decimalToFormattedCurrency(null), '');

      const listeners = {};
      const fakeInput = {
        value: '',
        dataset: {},
        selectionStart: 0,
        selectionEnd: 0,
        addEventListener: (eventName, listener) => {
          listeners[eventName] = listener;
        },
        setSelectionRange: (start, end) => {
          fakeInput.selectionStart = start;
          fakeInput.selectionEnd = end;
        }
      };
      const pressKey = (key) => {
        fakeInput.selectionStart = fakeInput.value.length;
        fakeInput.selectionEnd = fakeInput.value.length;
        listeners.keydown({
          key,
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          preventDefault: () => {}
        });
      };

      bindCurrencyInput(fakeInput);
      pressKey('4');
      pressKey('0');
      pressKey('0');
      assert.equal(fakeInput.value, '4,00');
      pressKey('Backspace');
      pressKey('Backspace');
      pressKey('Backspace');
      assert.equal(fakeInput.value, '');
      setCurrencyInputDecimalValue(fakeInput, '4000.00');
      assert.equal(fakeInput.value, '4.000,00');

      const productsHtml = await fs.readFile(
        path.join(frontendPath, 'app/produtos.html'),
        'utf8'
      );
      assert.doesNotMatch(productsHtml, /id="product(?:Price|Cost)"[^>]*type="number"/s);
      assert.match(productsHtml, /Valor cobrado do cliente\./);
      assert.match(productsHtml, /Quanto a cantina pagou pelo produto\./);
    });

    await t.test('bloqueia no backend o cadastro de código de barras duplicado', async () => {
      productsRepository.findByBarcode = async () => ({
        id: 4,
        nome: 'Produto existente',
        codigo_barras: '7891234567890'
      });

      await assert.rejects(
        productsService.createProduct({
          categoria_id: null,
          codigo_barras: '7891234567890',
          nome: 'Novo produto',
          preco_venda: 5,
          estoque_atual: 1,
          estoque_minimo: 0,
          ativo: true
        }),
        (error) => error.status === 409 && /Produto existente/.test(error.message)
      );
    });

    await t.test('aceita somente dígitos no código de barras ao cadastrar e editar', async () => {
      const acceptedBarcodes = ['7896067202340', '78938816', '078938816'];
      const rejectedBarcodes = [
        'Bateria Panasonic CR2032',
        '789-606-720',
        'ABC123'
      ];

      acceptedBarcodes.forEach((barcode) => assert.equal(isValidOptionalBarcode(barcode), true));
      assert.equal(isValidOptionalBarcode(null), true);
      assert.equal(isValidOptionalBarcode(''), true);
      rejectedBarcodes.forEach((barcode) => assert.equal(isValidOptionalBarcode(barcode), false));
      assert.equal(isValidOptionalBarcode(' 78938816'), false);

      authService.getUserBySessionToken = async () => adminUser;
      const receivedBarcodes = [];
      productsService.createProduct = async (payload) => {
        receivedBarcodes.push(payload.codigo_barras);
        return { id: receivedBarcodes.length, ...payload };
      };
      productsService.updateProduct = async () => {
        throw new Error('O service de edição não deve receber código de barras inválido');
      };

      try {
        for (const barcode of acceptedBarcodes) {
          const response = await request('/api/v1/products', {
            method: 'POST',
            headers: {
              cookie: 'cantina_session=admin-session',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              categoria_id: null,
              codigo_barras: barcode,
              nome: 'Produto de teste',
              preco_venda: 4.5,
              estoque_atual: 1,
              estoque_minimo: 0,
              ativo: true
            })
          });
          assert.equal(response.status, 201);
        }
        assert.deepEqual(receivedBarcodes, acceptedBarcodes);

        for (const barcode of rejectedBarcodes) {
          const response = await request('/api/v1/products', {
            method: 'POST',
            headers: {
              cookie: 'cantina_session=admin-session',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              categoria_id: null,
              codigo_barras: barcode,
              nome: 'Produto de teste',
              preco_venda: 4.5,
              estoque_atual: 1,
              estoque_minimo: 0,
              ativo: true
            })
          });
          assert.equal(response.status, 422);
          assert.equal(
            (await response.json()).error,
            'Código de barras deve conter somente números.'
          );
        }

        const editResponse = await request('/api/v1/products/8', {
          method: 'PUT',
          headers: {
            cookie: 'cantina_session=admin-session',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            categoria_id: null,
            codigo_barras: 'ABC123',
            nome: 'Produto editado',
            preco_venda: 4.5,
            estoque_atual: 1,
            estoque_minimo: 0,
            ativo: true
          })
        });
        assert.equal(editResponse.status, 422);
        assert.equal(
          (await editResponse.json()).error,
          'Código de barras deve conter somente números.'
        );
      } finally {
        productsService.createProduct = originalCreateProduct;
        productsService.updateProduct = originalUpdateProduct;
      }
    });

    await t.test('protege e processa a API de Clientes para administrador e operador', async () => {
      const client = {
        id: 1,
        nome: 'Maria da Silva',
        cpf: '52998224725',
        matricula: '2026001',
        telefone: '11999999999',
        email: 'maria@example.test',
        codigo: 'CLI-000001',
        ativo: 1,
        observacoes: 'Informação interna'
      };
      clientsService.listClients = async () => [client];
      clientsService.getClientById = async () => client;
      clientsService.createClient = async () => client;
      clientsService.updateClient = async () => ({ ...client, nome: 'Maria Souza' });
      clientsService.updateClientStatus = async (id, ativo) => ({ ...client, id, ativo });

      authService.getUserBySessionToken = async () => adminUser;
      const createResponse = await request('/api/v1/clients', {
        method: 'POST',
        headers: {
          cookie: 'cantina_session=admin-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          nome: 'Maria da Silva',
          cpf: '529.982.247-25',
          matricula: '2026001'
        })
      });
      assert.equal(createResponse.status, 201);
      assert.equal((await createResponse.json()).data.codigo, 'CLI-000001');

      const updateResponse = await request('/api/v1/clients/1', {
        method: 'PUT',
        headers: {
          cookie: 'cantina_session=admin-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ nome: 'Maria Souza', cpf: '52998224725', matricula: '2026001' })
      });
      assert.equal(updateResponse.status, 200);

      const statusResponse = await request('/api/v1/clients/1/status', {
        method: 'PATCH',
        headers: {
          cookie: 'cantina_session=admin-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ ativo: false })
      });
      assert.equal(statusResponse.status, 200);
      assert.equal((await statusResponse.json()).data.ativo, false);

      authService.getUserBySessionToken = async () => ({
        ...adminUser,
        role: { slug: 'OPERADOR_CAIXA', nome: 'Operador de Caixa' }
      });
      const cashierResponse = await request('/api/v1/clients', {
        headers: { cookie: 'cantina_session=cashier-session' }
      });
      assert.equal(cashierResponse.status, 200);

      const cashierPageResponse = await request('/app/clientes', {
        headers: { cookie: 'cantina_session=cashier-session' }
      });
      assert.equal(cashierPageResponse.status, 200);
      assert.match(await cashierPageResponse.text(), /Cadastrar cliente/);

      authService.getUserBySessionToken = async () => ({
        ...adminUser,
        role: { slug: 'CONSULTA', nome: 'Consulta' }
      });
      const deniedResponse = await request('/api/v1/clients', {
        headers: { cookie: 'cantina_session=viewer-session' }
      });
      assert.equal(deniedResponse.status, 403);
    });

    await t.test('valida, normaliza e protege CPF no módulo de Clientes', async () => {
      assert.equal(normalizeCpf('529.982.247-25'), '52998224725');
      assert.equal(isValidCpf('529.982.247-25'), true);
      assert.equal(isValidCpf('000.000.000-00'), false);
      assert.equal(isValidCpf('529.982.247-24'), false);
      assert.equal(isValidCpf('529982247250'), false);
      assert.equal(isValidCpf('529abc98224725'), false);

      authService.getUserBySessionToken = async () => adminUser;
      const invalidCpfResponse = await request('/api/v1/clients', {
        method: 'POST',
        headers: {
          cookie: 'cantina_session=admin-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ nome: 'CPF inválido', cpf: '000.000.000-00' })
      });
      assert.equal(invalidCpfResponse.status, 400);
      assert.match((await invalidCpfResponse.json()).error, /CPF válido/);

      const missingCpfOnUpdateResponse = await request('/api/v1/clients/1', {
        method: 'PUT',
        headers: {
          cookie: 'cantina_session=admin-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ nome: 'Edição sem CPF', matricula: null })
      });
      assert.equal(missingCpfOnUpdateResponse.status, 400);
      assert.equal((await missingCpfOnUpdateResponse.json()).error, 'CPF é obrigatório');
    });

    await t.test('gera código e trata CPF ou matrícula duplicados sem erro 500', async () => {
      clientsService.createClient = originalCreateClient;
      let insertedClient;
      clientsRepository.findByCpf = async () => null;
      clientsRepository.findByMatricula = async () => null;
      clientsRepository.getNextCodeNumber = async () => 1;
      clientsRepository.createClient = async (client) => {
        insertedClient = client;
        return 7;
      };
      clientsRepository.findById = async (id) => ({ id, ...insertedClient });

      const created = await clientsService.createClient({
        nome: '  João Pereira  ',
        cpf: '529.982.247-25',
        matricula: '',
        telefone: '',
        email: ' JOAO@EXAMPLE.TEST ',
        observacoes: ''
      });
      assert.equal(created.codigo, 'CLI-000001');
      assert.equal(created.nome, 'João Pereira');
      assert.equal(created.cpf, '52998224725');
      assert.equal(created.matricula, null);
      assert.equal(created.email, 'joao@example.test');

      clientsRepository.findByMatricula = async () => ({
        id: 3,
        nome: 'Cliente existente',
        matricula: 'MAT-1'
      });
      await assert.rejects(
        clientsService.createClient({
          nome: 'Outro cliente',
          cpf: '11144477735',
          matricula: ' MAT-1 ',
          telefone: null,
          email: null,
          observacoes: null
        }),
        (error) => error.status === 409 && /Cliente existente/.test(error.message)
      );

      clientsRepository.findByCpf = async () => ({
        id: 4,
        nome: 'Dona do CPF',
        cpf: '52998224725'
      });
      clientsRepository.findByMatricula = async () => null;
      await assert.rejects(
        clientsService.createClient({
          nome: 'CPF repetido',
          cpf: '529.982.247-25',
          matricula: null,
          telefone: null,
          email: null,
          observacoes: null
        }),
        (error) => error.status === 409 && /CPF informado/.test(error.message)
      );

      const generatedNumbers = [1, 2];
      let creationAttempts = 0;
      clientsRepository.findByCpf = async () => null;
      clientsRepository.findByMatricula = async () => null;
      clientsRepository.getNextCodeNumber = async () => generatedNumbers.shift();
      clientsRepository.createClient = async (client) => {
        creationAttempts += 1;
        if (creationAttempts === 1) {
          const collision = new Error('Código duplicado');
          collision.code = 'ER_DUP_ENTRY';
          throw collision;
        }
        insertedClient = client;
        return 8;
      };

      const retriedClient = await clientsService.createClient({
        nome: 'Código em concorrência',
        cpf: '11144477735',
        matricula: null,
        telefone: null,
        email: null,
        observacoes: null
      });
      assert.equal(creationAttempts, 2);
      assert.equal(retriedClient.codigo, 'CLI-000002');

      clientsRepository.findByCpf = async () => null;
      clientsRepository.findByMatricula = async () => null;
      clientsRepository.getNextCodeNumber = async () => 3;
      clientsRepository.createClient = async () => {
        const collision = new Error('Matrícula duplicada durante a gravação');
        collision.code = 'ER_DUP_ENTRY';
        clientsRepository.findByMatricula = async () => ({
          id: 9,
          nome: 'Matrícula concorrente',
          matricula: 'MAT-RACE'
        });
        throw collision;
      };
      await assert.rejects(
        clientsService.createClient({
          nome: 'Concorrência de matrícula',
          cpf: '93541134780',
          matricula: 'MAT-RACE',
          telefone: null,
          email: null,
          observacoes: null
        }),
        (error) => error.status === 409 && /Matrícula concorrente/.test(error.message)
      );
    });

    await t.test('exclui o próprio cliente e trata conflitos de CPF ou matrícula na edição', async () => {
      clientsService.updateClient = originalUpdateClient;
      clientsRepository.findById = async () => ({
        id: 5,
        nome: 'Cliente editado',
        cpf: '52998224725',
        matricula: 'MAT-5'
      });
      clientsRepository.findByCpfExcludingId = async (cpf, id) => {
        assert.equal(cpf, '52998224725');
        assert.equal(id, '5');
        return { id: 6, nome: 'Dona do CPF', cpf };
      };
      clientsRepository.findByMatriculaExcludingId = async () => null;

      await assert.rejects(
        clientsService.updateClient('5', {
          nome: 'Cliente editado',
          cpf: '529.982.247-25',
          matricula: 'MAT-5',
          telefone: null,
          email: null,
          observacoes: null
        }),
        (error) => error.status === 409 && /Dona do CPF/.test(error.message)
      );

      clientsRepository.findByCpfExcludingId = async () => null;
      clientsRepository.findByMatriculaExcludingId = async () => ({
        id: 7,
        nome: 'Dona da matrícula',
        matricula: 'MAT-5'
      });
      await assert.rejects(
        clientsService.updateClient('5', {
          nome: 'Cliente editado',
          cpf: '52998224725',
          matricula: 'MAT-5',
          telefone: null,
          email: null,
          observacoes: null
        }),
        (error) => error.status === 409 && /Dona da matrícula/.test(error.message)
      );
    });

    await t.test('mascara CPF na lista e pesquisa CPF somente na área protegida', async () => {
      const cpfModuleSource = await fs.readFile(
        path.join(frontendPath, 'js/cpfInput.js'),
        'utf8'
      );
      const cpfModuleUrl = `data:text/javascript;base64,${Buffer
        .from(cpfModuleSource)
        .toString('base64')}`;
      const { formatCpf, maskCpfForList, onlyCpfDigits } = await import(cpfModuleUrl);

      assert.equal(formatCpf('52998224725'), '529.982.247-25');
      assert.equal(onlyCpfDigits('529.982.247-25'), '52998224725');
      assert.equal(maskCpfForList('52998224725'), '***.***.***-25');

      const repositorySource = await fs.readFile(
        path.resolve(__dirname, '../src/repositories/clientsRepository.js'),
        'utf8'
      );
      assert.match(repositorySource, /OR cpf LIKE \?/);
    });

    await t.test('mantém Clientes livre de JavaScript inline e sem exposição pública', async () => {
      const files = await Promise.all([
        'app/clientes.html',
        'js/clientsApi.js',
        'js/clientsApp.js',
        'js/cpfInput.js'
      ].map((file) => fs.readFile(path.join(frontendPath, file), 'utf8')));
      const source = files.join('\n');

      assert.doesNotMatch(files[0], /\son[a-z]+\s*=/i);
      assert.doesNotMatch(source, /\beval\s*\(/);
      assert.doesNotMatch(source, /\bnew\s+Function\b/);
      assert.doesNotMatch(source, /innerHTML/);
      assert.match(files[0], /Observações internas/);
      assert.match(files[0], /placeholder="000\.000\.000-00"/);
      assert.match(files[0], /clientsApp\.js/);
      assert.match(files[2], /maskCpfForList\(client\.cpf\)/);

      authService.getUserBySessionToken = async () => null;
      const publicResponse = await request('/api/v1/clients');
      assert.equal(publicResponse.status, 401);
    });

    await t.test('usa a rota de status correta sem consultar o MySQL', async () => {
      statusRepository.checkDatabaseConnection = async () => true;
      const statusResponse = await request('/api/v1/status');
      assert.equal(statusResponse.status, 200);
      assert.equal((await statusResponse.json()).database, 'connected');

      const duplicatedPathResponse = await request('/api/v1/status/status');
      assert.equal(duplicatedPathResponse.status, 404);
    });

    await t.test('invalida no repositório somente o SHA-256 do token', async () => {
      let receivedHash;
      authSessionsRepository.invalidateSession = async (tokenHash) => {
        receivedHash = tokenHash;
      };
      authService.logout = originalLogout;
      await authService.logout('raw-session-token');
      const expectedHash = crypto
        .createHash('sha256')
        .update('raw-session-token')
        .digest('hex');
      assert.equal(receivedHash, expectedHash);
    });
  } finally {
    authService.getUserBySessionToken = originalGetUser;
    authService.login = originalLogin;
    authService.logout = originalLogout;
    statusRepository.checkDatabaseConnection = originalStatusCheck;
    authSessionsRepository.invalidateSession = originalInvalidateSession;
    categoriesService.listCategories = originalListCategories;
    categoriesService.createCategory = originalCreateCategory;
    productsService.getProductByBarcode = originalGetProductByBarcode;
    productsService.createProduct = originalCreateProduct;
    productsService.updateProduct = originalUpdateProduct;
    productsRepository.findByBarcode = originalFindProductByBarcode;
    categoriesRepository.findByName = originalFindCategoryByName;
    categoriesRepository.createCategory = originalCreateCategoryRecord;
    categoriesRepository.findById = originalFindCategoryById;
    clientsService.listClients = originalListClients;
    clientsService.getClientById = originalGetClientById;
    clientsService.createClient = originalCreateClient;
    clientsService.updateClient = originalUpdateClient;
    clientsService.updateClientStatus = originalUpdateClientStatus;
    clientsRepository.findById = originalFindClientById;
    clientsRepository.findByCpf = originalFindClientByCpf;
    clientsRepository.findByCpfExcludingId = originalFindClientByCpfExcludingId;
    clientsRepository.findByMatricula = originalFindClientByMatricula;
    clientsRepository.findByMatriculaExcludingId = originalFindClientByMatriculaExcludingId;
    clientsRepository.getNextCodeNumber = originalGetNextClientCodeNumber;
    clientsRepository.createClient = originalCreateClientRecord;
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test('fluxo funcional e transacional do Caixa sem acessar o banco', async (t) => {
  const originalRepository = { ...cashRepository };
  const originalGetUser = authService.getUserBySessionToken;
  const originalCancelService = cashService.cancelSale;
  const fakeConnection = {};
  const user = {
    id: 2,
    nome: 'Operador de Teste',
    email: 'caixa@example.test',
    role: { slug: 'OPERADOR_CAIXA', nome: 'Operador de Caixa' }
  };

  const useFakeTransaction = () => {
    cashRepository.withTransaction = async (callback) => callback(fakeConnection);
  };

  try {
    await t.test('calcula valores com quatro casas sem ponto flutuante', () => {
      assert.equal(parseFixedDecimal('0.10'), 1000n);
      assert.equal(parseFixedDecimal('4000.0000'), 40000000n);
      assert.equal(formatFixedDecimal(45000n), '4.5000');
      assert.equal(multiplyFixedDecimal(parseFixedDecimal('4.50'), 3n), 135000n);
      assert.equal(
        formatFixedDecimal(parseFixedDecimal('20.00') - parseFixedDecimal('13.50')),
        '6.5000'
      );
    });

    await t.test('confirma venda à vista usando preço e estoque travados no servidor', async () => {
      useFakeTransaction();
      const saleItems = [];
      const stockMovements = [];
      const stockUpdates = [];
      const payments = [];
      let insertedSale;

      cashRepository.findOpenSession = async () => ({ id: 4, status: 'ABERTA' });
      cashRepository.lockProductsByIds = async () => [{
        id: 8,
        codigo_barras: '7890000000001',
        nome: 'Suco',
        preco_venda: '4.5000',
        custo: '2.0000',
        estoque_atual: '2.0000',
        ativo: 1
      }];
      cashRepository.createSale = async (sale) => {
        insertedSale = sale;
        return 31;
      };
      cashRepository.createSaleItem = async (item) => {
        saleItems.push(item);
        return 41;
      };
      cashRepository.updateProductStock = async (id, stock) => {
        stockUpdates.push({ id, stock });
        return 1;
      };
      cashRepository.createStockMovement = async (movement) => {
        stockMovements.push(movement);
        return 51;
      };
      cashRepository.createPayment = async (payment) => {
        payments.push(payment);
        return 61;
      };
      cashRepository.createAccountEntry = async () => {
        throw new Error('Venda à vista não deve gerar débito de cliente');
      };
      cashRepository.findSaleById = async () => ({ id: 31, total: '9.0000' });

      const sale = await cashService.createSale({
        tipo_venda: 'A_VISTA',
        itens: [{ tipo_item: 'PRODUTO', produto_id: '8', quantidade: '2' }],
        pagamento: { forma_pagamento: 'PIX' }
      }, user);

      assert.equal(sale.id, 31);
      assert.equal(insertedSale.subtotal, '9.0000');
      assert.equal(insertedSale.total, '9.0000');
      assert.equal(saleItems[0].unitPrice, '4.5000');
      assert.equal(saleItems[0].quantity, '2.0000');
      assert.deepEqual(stockUpdates, [{ id: '8', stock: '0.0000' }]);
      assert.equal(stockMovements[0].stockBefore, '2.0000');
      assert.equal(stockMovements[0].stockAfter, '0.0000');
      assert.equal(payments[0].method, 'PIX');
      assert.equal(payments[0].amount, '9.0000');
    });

    await t.test('bloqueia estoque insuficiente antes de persistir a venda', async () => {
      useFakeTransaction();
      let saleWasCreated = false;
      cashRepository.findOpenSession = async () => ({ id: 4, status: 'ABERTA' });
      cashRepository.lockProductsByIds = async () => [{
        id: 8,
        codigo_barras: '7890000000001',
        nome: 'Suco',
        preco_venda: '4.5000',
        custo: null,
        estoque_atual: '1.0000',
        ativo: 1
      }];
      cashRepository.createSale = async () => {
        saleWasCreated = true;
        return 32;
      };

      await assert.rejects(
        cashService.createSale({
          tipo_venda: 'A_VISTA',
          itens: [{ tipo_item: 'PRODUTO', produto_id: '8', quantidade: '2' }],
          pagamento: { forma_pagamento: 'DINHEIRO' }
        }, user),
        (error) => error.status === 409 && /Estoque insuficiente/.test(error.message)
      );
      assert.equal(saleWasCreated, false);
    });

    await t.test('gera débito para fiado e exige descrição no item Diversos', async () => {
      useFakeTransaction();
      const accountEntries = [];
      const saleItems = [];
      cashRepository.findOpenSession = async () => ({ id: 4, status: 'ABERTA' });
      cashRepository.lockClientById = async () => ({
        id: 9,
        nome: 'Cliente ativo',
        codigo: 'CLI-000009',
        ativo: 1
      });
      cashRepository.lockProductsByIds = async () => [];
      cashRepository.createSale = async () => 33;
      cashRepository.createSaleItem = async (item) => {
        saleItems.push(item);
        return 43;
      };
      cashRepository.createAccountEntry = async (entry) => {
        accountEntries.push(entry);
        return 63;
      };
      cashRepository.createPayment = async () => {
        throw new Error('Fiado não deve gerar pagamento');
      };
      cashRepository.findSaleById = async () => ({ id: 33, tipo_venda: 'FIADO' });

      await cashService.createSale({
        tipo_venda: 'FIADO',
        cliente_id: '9',
        itens: [{
          tipo_item: 'DIVERSOS',
          descricao: 'Lanche especial',
          preco_unitario: '7.50',
          quantidade: '1'
        }]
      }, user);

      assert.equal(saleItems[0].itemType, 'DIVERSOS');
      assert.equal(saleItems[0].movesStock, false);
      assert.equal(accountEntries[0].direction, 'DEBITO');
      assert.equal(accountEntries[0].origin, 'VENDA_FIADO');
      assert.equal(accountEntries[0].amount, '7.5000');

      await assert.rejects(
        cashService.createSale({
          tipo_venda: 'FIADO',
          cliente_id: '9',
          itens: [{ tipo_item: 'DIVERSOS', preco_unitario: '1.00', quantidade: '1' }]
        }, user),
        (error) => error.status === 400 && /descrição/.test(error.message)
      );
    });

    await t.test('exige justificativa quando o fechamento possui diferença', async () => {
      useFakeTransaction();
      let closeWasCalled = false;
      cashRepository.findOpenSession = async () => ({ id: 4, status: 'ABERTA' });
      cashRepository.calculateExpectedCash = async () => '110.0000';
      cashRepository.closeSession = async () => {
        closeWasCalled = true;
        return 1;
      };

      await assert.rejects(
        cashService.closeSession({ valor_fechamento_informado: '100.00' }, user),
        (error) => error.status === 400 && /justificativa/.test(error.message)
      );
      assert.equal(closeWasCalled, false);
    });

    await t.test('cancela venda criando estorno e entrada de estoque', async () => {
      useFakeTransaction();
      const reversalMovements = [];
      const reversalPayments = [];
      cashRepository.findSaleById = async () => ({
        id: 34,
        cash_session_id: 4,
        cliente_id: null,
        tipo_venda: 'A_VISTA',
        status: 'CONFIRMADA'
      });
      cashRepository.findSaleStockMovements = async () => [{
        id: 70,
        produto_id: 8,
        sale_item_id: 44,
        quantidade: '2.0000'
      }];
      cashRepository.lockProductsByIds = async () => [{ id: 8, estoque_atual: '3.0000' }];
      cashRepository.updateProductStock = async () => 1;
      cashRepository.createStockMovement = async (movement) => {
        reversalMovements.push(movement);
        return 71;
      };
      cashRepository.findConfirmedSalePayments = async () => [{
        id: 80,
        cash_session_id: 4,
        cliente_id: null,
        finalidade: 'VENDA',
        forma_pagamento: 'DINHEIRO',
        valor: '9.0000'
      }];
      cashRepository.createPayment = async (payment) => {
        reversalPayments.push(payment);
        return 81;
      };
      cashRepository.cancelSale = async () => 1;

      await assert.rejects(
        cashService.cancelSale('34', { motivo: 'Tentativa do operador' }, user),
        (error) => error.status === 403
      );

      await cashService.cancelSale('34', { motivo: 'Lançamento incorreto' }, {
        ...user,
        role: { slug: 'ADMINISTRADOR', nome: 'Administrador' }
      });

      assert.equal(reversalMovements[0].direction, 'ENTRADA');
      assert.equal(reversalMovements[0].stockBefore, '3.0000');
      assert.equal(reversalMovements[0].stockAfter, '5.0000');
      assert.equal(reversalPayments[0].operationType, 'ESTORNO');
      assert.equal(reversalPayments[0].originalPaymentId, 80);
    });

    await t.test('nega cancelamento ao operador e permite ao administrador na rota', async () => {
      const server = app.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
      const { port } = server.address();
      const request = (options) => fetch(`http://127.0.0.1:${port}/api/v1/cash/sales/34/cancel`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          cookie: 'cantina_session=test-session',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ motivo: 'Teste de permissão' }),
        ...options
      });

      try {
        authService.getUserBySessionToken = async () => user;
        const denied = await request();
        assert.equal(denied.status, 403);

        let receivedUser;
        cashService.cancelSale = async (id, payload, authenticatedUser) => {
          receivedUser = authenticatedUser;
          return { id, status: 'CANCELADA', motivo: payload.motivo };
        };
        authService.getUserBySessionToken = async () => ({
          ...user,
          role: { slug: 'ADMINISTRADOR', nome: 'Administrador' }
        });
        const allowed = await request();
        assert.equal(allowed.status, 200);
        assert.equal(receivedUser.role.slug, 'ADMINISTRADOR');
      } finally {
        await new Promise((resolve, reject) => server.close((error) => (
          error ? reject(error) : resolve()
        )));
      }
    });

    await t.test('mantém Caixa livre de código inline e captura o Enter do leitor', async () => {
      const files = await Promise.all([
        'app/caixa.html',
        'js/cashApp.js',
        'js/cashApi.js',
        'js/fixedMoney.js',
        'css/pages/caixa.css'
      ].map((file) => fs.readFile(path.join(frontendPath, file), 'utf8')));
      const source = files.join('\n');
      assert.doesNotMatch(files[0], /\son[a-z]+\s*=/i);
      assert.doesNotMatch(source, /\beval\s*\(|\bnew\s+Function\b|innerHTML/);
      assert.match(files[1], /barcodeSaleForm\.addEventListener\('submit'/);
      assert.match(files[1], /event\.preventDefault\(\)/);
      assert.match(files[1], /cashApi\.getProductByBarcode\(barcode\)/);
      assert.match(files[0], /Passe ou digite o código de barras aqui/);
      assert.match(files[0], /id="quickProducts"/);
      assert.match(files[0], /data-sale-type="A_VISTA"/);
      assert.match(files[0], /data-sale-type="FIADO"/);
      assert.match(files[0], /id="cashReceived"/);
      assert.match(files[0], /id="cashChange"/);
      assert.match(files[1], /cashApi\.searchProducts\(''\)/);
      assert.match(files[1], /received < getCartTotal\(\)/);
      assert.doesNotMatch(files[1], /valor_recebido/);
      assert.match(files[4], /\/\* Sidebar \*\//);
      assert.match(files[4], /\/\* Quick products \*\//);
      assert.match(files[4], /\/\* Responsiveness \*\//);
      assert.doesNotMatch(files[4], /!important/i);
    });
  } finally {
    Object.assign(cashRepository, originalRepository);
    authService.getUserBySessionToken = originalGetUser;
    cashService.cancelSale = originalCancelService;
  }
});

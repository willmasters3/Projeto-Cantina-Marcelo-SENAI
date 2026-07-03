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
import productsRepository from '../src/repositories/productsRepository.js';
import productsService from '../src/services/productsService.js';
import statusRepository from '../src/repositories/statusRepository.js';

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
  const originalFindProductByBarcode = productsRepository.findByBarcode;
  const originalFindCategoryByName = categoriesRepository.findByName;
  const originalCreateCategoryRecord = categoriesRepository.createCategory;
  const originalFindCategoryById = categoriesRepository.findById;
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
      const productsScript = files[3];

      assert.doesNotMatch(source, /\son[a-z]+\s*=/i);
      assert.doesNotMatch(source, /\beval\s*\(/);
      assert.doesNotMatch(source, /\bnew\s+Function\b/);
      assert.doesNotMatch(source, /innerHTML/);
      assert.match(productsScript, /barcodeInput\.addEventListener\('keydown'/);
      assert.match(productsScript, /event\.preventDefault\(\)/);
      assert.match(productsScript, /adminApi\.getProductByBarcode\(barcode\)/);
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
    productsRepository.findByBarcode = originalFindProductByBarcode;
    categoriesRepository.findByName = originalFindCategoryByName;
    categoriesRepository.createCategory = originalCreateCategoryRecord;
    categoriesRepository.findById = originalFindCategoryById;
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

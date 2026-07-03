import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import app from '../src/app.js';
import authSessionsRepository from '../src/repositories/authSessionsRepository.js';
import authService from '../src/services/authService.js';
import statusRepository from '../src/repositories/statusRepository.js';

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
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

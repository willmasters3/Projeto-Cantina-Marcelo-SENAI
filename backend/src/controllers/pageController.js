import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../../frontend/public');

const sendPage = (res, page) => {
  res.sendFile(path.join(frontendPath, page));
};

const redirectToLogin = (req, res) => {
  res.redirect('/login');
};

const loginPage = (req, res) => sendPage(res, 'app/login.html');
const monitorPage = (req, res) => sendPage(res, 'monitor.html');
const appPage = (page) => (req, res) => sendPage(res, `app/${page}.html`);
const redirectToAppHome = (req, res) => {
  const destination = req.user.role.slug === 'CONSULTA' ? '/app/relatorios' : '/app/caixa';
  res.redirect(destination);
};

export default { redirectToLogin, loginPage, monitorPage, appPage, redirectToAppHome };

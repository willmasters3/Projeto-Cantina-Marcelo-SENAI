import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const defaultRoles = [
  ['ADMINISTRADOR', 'Administrador', 'Acesso total ao sistema'],
  ['OPERADOR_CAIXA', 'Operador de Caixa', 'Acesso a caixa, clientes e fiado'],
  ['CONSULTA', 'Consulta', 'Acesso apenas a relatórios e consultas']
];

class SafeError extends Error {}

const ask = async (prompt) => {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
};

const askHidden = (prompt) => {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new SafeError('Execute este comando em um terminal interativo.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    output.write(prompt);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();

    const finish = (error = null) => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
      output.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(new SafeError('Operação cancelada.'));
          return;
        }
        if (character === '\r' || character === '\n' || character === '\u0004') {
          finish();
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= ' ') value += character;
      }
    };

    input.on('data', onData);
  });
};

const validateInput = ({ nome, email, senha, confirmacao }) => {
  if (!nome.trim()) {
    throw new SafeError('O nome é obrigatório.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new SafeError('Informe um e-mail válido.');
  }

  const strongPassword = senha.length >= 10
    && /[a-z]/.test(senha)
    && /[A-Z]/.test(senha)
    && /\d/.test(senha)
    && /[^\w\s]/.test(senha);

  if (!strongPassword) {
    throw new SafeError(
      'A senha deve ter ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo.'
    );
  }

  if (senha !== confirmacao) {
    throw new SafeError('A confirmação da senha não confere.');
  }

  return { nome: nome.trim(), email: normalizedEmail };
};

const getDatabaseConfig = () => {
  const requiredVariables = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  if (requiredVariables.some((variable) => !process.env[variable])) {
    throw new SafeError('A configuração do banco de dados está incompleta.');
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
};

const ensureDefaultRoles = async (connection) => {
  const slugs = defaultRoles.map(([slug]) => slug);
  const [existingRoles] = await connection.query(
    'SELECT slug FROM roles WHERE slug IN (?, ?, ?)',
    slugs
  );
  const existingSlugs = new Set(existingRoles.map((role) => role.slug));

  for (const [slug, nome, descricao] of defaultRoles) {
    if (!existingSlugs.has(slug)) {
      await connection.query(
        'INSERT INTO roles (slug, nome, descricao) VALUES (?, ?, ?)',
        [slug, nome, descricao]
      );
    }
  }
};

const createAdministrator = async () => {
  let connection;
  let transactionStarted = false;

  try {
    const nomeInput = await ask('Nome do administrador: ');
    const emailInput = await ask('E-mail do administrador: ');
    const senha = await askHidden('Senha do administrador: ');
    const confirmacao = await askHidden('Confirme a senha: ');
    const { nome, email } = validateInput({
      nome: nomeInput,
      email: emailInput,
      senha,
      confirmacao
    });
    const passwordHash = await bcrypt.hash(senha, 12);

    connection = await mysql.createConnection(getDatabaseConfig());
    await connection.beginTransaction();
    transactionStarted = true;
    await ensureDefaultRoles(connection);

    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [email]
    );
    if (existingUsers.length > 0) {
      throw new SafeError('Já existe um usuário com esse e-mail.');
    }

    const [[adminRole]] = await connection.query(
      'SELECT id FROM roles WHERE slug = ? LIMIT 1',
      ['ADMINISTRADOR']
    );
    if (!adminRole) {
      throw new Error('Administrator role was not created');
    }

    await connection.query(
      `INSERT INTO users (nome, email, password_hash, role_id, ativo)
       VALUES (?, ?, ?, ?, 1)`,
      [nome, email, passwordHash, adminRole.id]
    );
    await connection.commit();
    transactionStarted = false;
    output.write('Administrador criado com sucesso.\n');
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback().catch(() => {});
    }
    const message = error instanceof SafeError
      ? error.message
      : 'Não foi possível criar o administrador. Verifique a configuração e a conexão com o banco.';
    output.write(`Erro: ${message}\n`);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
};

createAdministrator();

import readline from 'readline';
import { stdin as input, stdout as output } from 'process';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const rl = readline.createInterface({ input, output });

const question = (prompt, hidden = false) => {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(prompt, resolve);
      return;
    }

    const stdin = process.openStdin();
    output.write(prompt);
    const onData = (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          output.write('\n');
          break;
        default:
          output.write('*');
          break;
      }
    };

    stdin.on('data', onData);
    rl.question('', (value) => {
      resolve(value);
    });
  });
};

const init = async () => {
  try {
    const nome = await question('Nome do administrador: ');
    const email = await question('Email do administrador: ');
    const senha = await question('Senha do administrador: ', true);
    const senhaConfirm = await question('Confirme a senha: ', true);

    if (!nome.trim() || !email.trim() || !senha.trim()) {
      throw new Error('Nome, email e senha são obrigatórios.');
    }

    if (senha !== senhaConfirm) {
      throw new Error('As senhas não coincidem.');
    }

    const hashedPassword = await bcrypt.hash(senha, 12);

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await connection.beginTransaction();

    const [roles] = await connection.query(`SELECT id, slug FROM roles WHERE slug IN ('ADMINISTRADOR', 'OPERADOR_CAIXA', 'CONSULTA')`);
    const hasAdmin = roles.some((role) => role.slug === 'ADMINISTRADOR');

    if (!hasAdmin) {
      await connection.query(
        `INSERT INTO roles (slug, nome, descricao)
         VALUES
         ('ADMINISTRADOR', 'Administrador', 'Acesso total ao sistema'),
         ('OPERADOR_CAIXA', 'Operador de Caixa', 'Acesso a caixa, clientes e fiado'),
         ('CONSULTA', 'Consulta', 'Acesso apenas a relatórios e consultas')`
      );
    }

    const [[adminRole]] = await connection.query(`SELECT id FROM roles WHERE slug = 'ADMINISTRADOR' LIMIT 1`);

    const [existingUsers] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existingUsers.length > 0) {
      throw new Error('Já existe um usuário com esse email.');
    }

    await connection.query(
      `INSERT INTO users (nome, email, password_hash, role_id, ativo)
       VALUES (?, ?, ?, ?, 1)`,
      [nome.trim(), email.trim(), hashedPassword, adminRole.id]
    );

    await connection.commit();
    console.log('\nAdministrador criado com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('\nErro:', error.message);
    process.exit(1);
  }
};

init();

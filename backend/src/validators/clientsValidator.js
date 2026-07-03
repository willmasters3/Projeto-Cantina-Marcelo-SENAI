import HttpError from '../utils/httpError.js';
import { isValidCpf, normalizeCpf } from '../utils/cpf.js';

const validateOptionalText = (value, fieldName, maxLength) => {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${fieldName} deve ser texto`);
  }
  if (value.trim().length > maxLength) {
    throw new HttpError(400, `${fieldName} deve ter no máximo ${maxLength} caracteres`);
  }
};

const validateClientPayload = (req, res, next) => {
  const { nome, cpf, matricula, telefone, email, observacoes } = req.body;

  if (typeof nome !== 'string' || !nome.trim()) {
    throw new HttpError(400, 'Nome completo é obrigatório');
  }
  if (nome.trim().length > 150) {
    throw new HttpError(400, 'Nome completo deve ter no máximo 150 caracteres');
  }

  if (typeof cpf !== 'string' || !cpf.trim()) {
    throw new HttpError(400, 'CPF é obrigatório');
  }
  if (normalizeCpf(cpf).length !== 11 || !isValidCpf(cpf)) {
    throw new HttpError(400, 'Informe um CPF válido');
  }

  validateOptionalText(matricula, 'Matrícula', 50);
  validateOptionalText(telefone, 'Telefone', 30);
  validateOptionalText(email, 'E-mail', 254);
  validateOptionalText(observacoes, 'Observações', 65535);

  if (typeof email === 'string' && email.trim()) {
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new HttpError(400, 'Informe um e-mail válido');
    }
  }

  return next();
};

const validateClientStatus = (req, res, next) => {
  const { ativo } = req.body;
  if (typeof ativo !== 'boolean') {
    throw new HttpError(400, 'Campo ativo deve ser booleano');
  }
  return next();
};

export { validateClientPayload, validateClientStatus };

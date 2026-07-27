import HttpError from '../utils/httpError.js';

const validateSupplierPayload = (req, res, next) => {
  if (!req.body?.nome || !String(req.body.nome).trim()) {
    throw new HttpError(400, 'Nome do fornecedor é obrigatório');
  }
  return next();
};

const validateSupplierStatus = (req, res, next) => {
  const { ativo } = req.body;
  const valid = typeof ativo === 'boolean'
    || ativo === 1
    || ativo === 0
    || ativo === '1'
    || ativo === '0'
    || ativo === 'true'
    || ativo === 'false';

  if (!valid) {
    throw new HttpError(400, 'Campo ativo deve ser booleano');
  }

  return next();
};

export { validateSupplierPayload, validateSupplierStatus };

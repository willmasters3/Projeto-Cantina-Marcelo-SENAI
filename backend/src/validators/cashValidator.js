import HttpError from '../utils/httpError.js';

const requireObjectBody = (req) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new HttpError(400, 'Corpo da requisição inválido');
  }
};

const validateOpenSession = (req, res, next) => {
  requireObjectBody(req);
  if (req.body.valor_abertura === undefined) {
    throw new HttpError(400, 'Valor de abertura é obrigatório');
  }
  return next();
};

const validateCloseSession = (req, res, next) => {
  requireObjectBody(req);
  if (req.body.valor_fechamento_informado === undefined) {
    throw new HttpError(400, 'Valor informado no fechamento é obrigatório');
  }
  return next();
};

const validateSale = (req, res, next) => {
  requireObjectBody(req);
  if (!Array.isArray(req.body.itens)) {
    throw new HttpError(400, 'Itens da venda são obrigatórios');
  }
  return next();
};

const validateCancellation = (req, res, next) => {
  requireObjectBody(req);
  if (typeof req.body.motivo !== 'string' || !req.body.motivo.trim()) {
    throw new HttpError(400, 'Motivo do cancelamento é obrigatório');
  }
  return next();
};

export {
  validateCancellation,
  validateCloseSession,
  validateOpenSession,
  validateSale
};

import HttpError from '../utils/httpError.js';

const validateStockEntry = (req, res, next) => {
  if (req.body?.quantidade === undefined || req.body.quantidade === null || req.body.quantidade === '') {
    throw new HttpError(400, 'Quantidade inválida.');
  }
  return next();
};

const validateStockAdjustment = (req, res, next) => {
  if (req.body?.estoque_final === undefined || req.body.estoque_final === null || req.body.estoque_final === '') {
    throw new HttpError(400, 'Estoque final não pode ser negativo.');
  }

  if (!req.body?.motivo || !String(req.body.motivo).trim()) {
    throw new HttpError(400, 'Motivo obrigatório para ajuste.');
  }

  return next();
};

export { validateStockAdjustment, validateStockEntry };

import HttpError from '../utils/httpError.js';

const validateCreateCategory = (req, res, next) => {
  const { nome } = req.body;
  if (typeof nome !== 'string' || !nome.trim()) {
    throw new HttpError(400, 'Nome da categoria é obrigatório');
  }
  return next();
};

const validateUpdateCategory = (req, res, next) => {
  const { nome } = req.body;
  if (typeof nome !== 'string' || !nome.trim()) {
    throw new HttpError(400, 'Nome da categoria é obrigatório');
  }
  return next();
};

const validateCategoryStatus = (req, res, next) => {
  const { ativo } = req.body;
  if (typeof ativo !== 'boolean' && ativo !== 0 && ativo !== 1) {
    throw new HttpError(400, 'Campo ativo deve ser booleano');
  }
  return next();
};

export { validateCreateCategory, validateUpdateCategory, validateCategoryStatus };

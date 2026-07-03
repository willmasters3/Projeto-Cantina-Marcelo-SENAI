import HttpError from '../utils/httpError.js';

const validateCreateCategory = (req) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    throw new HttpError(400, 'Nome da categoria é obrigatório');
  }
};

const validateUpdateCategory = (req) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    throw new HttpError(400, 'Nome da categoria é obrigatório');
  }
};

const validateCategoryStatus = (req) => {
  const { ativo } = req.body;
  if (typeof ativo !== 'boolean' && ativo !== 0 && ativo !== 1) {
    throw new HttpError(400, 'Campo ativo deve ser booleano');
  }
};

export { validateCreateCategory, validateUpdateCategory, validateCategoryStatus };

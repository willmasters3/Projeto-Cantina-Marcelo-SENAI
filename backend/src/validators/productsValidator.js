import HttpError from '../utils/httpError.js';

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
};

const validateProductPayload = (req) => {
  const {
    categoria_id,
    codigo_barras,
    nome,
    preco_venda,
    estoque_atual,
    estoque_minimo,
    ativo
  } = req.body;

  if (categoria_id !== undefined && categoria_id !== null && Number.isNaN(Number(categoria_id))) {
    throw new HttpError(400, 'categoria_id inválido');
  }

  if (!nome || !nome.trim()) {
    throw new HttpError(400, 'Nome do produto é obrigatório');
  }

  if (preco_venda === undefined || Number(preco_venda) < 0) {
    throw new HttpError(400, 'Preço de venda deve ser informado e não pode ser negativo');
  }

  if (estoque_atual === undefined || Number(estoque_atual) < 0) {
    throw new HttpError(400, 'Estoque inicial deve ser informado e não pode ser negativo');
  }

  if (estoque_minimo === undefined || Number(estoque_minimo) < 0) {
    throw new HttpError(400, 'Estoque mínimo deve ser informado e não pode ser negativo');
  }

  if (codigo_barras && typeof codigo_barras !== 'string') {
    throw new HttpError(400, 'Código de barras deve ser texto');
  }

  const parsedAtivo = parseBoolean(ativo);
  if (ativo !== undefined && parsedAtivo === null) {
    throw new HttpError(400, 'Campo ativo deve ser booleano');
  }
};

const validateProductStatus = (req) => {
  const parsedAtivo = parseBoolean(req.body.ativo);
  if (parsedAtivo === null) {
    throw new HttpError(400, 'Campo ativo deve ser booleano');
  }
};

export { validateProductPayload, validateProductStatus };

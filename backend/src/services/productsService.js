import productsRepository from '../repositories/productsRepository.js';
import categoriesRepository from '../repositories/categoriesRepository.js';
import HttpError from '../utils/httpError.js';

const validateCategory = async (categoria_id) => {
  if (categoria_id === null || categoria_id === undefined) {
    return;
  }

  const category = await categoriesRepository.findById(categoria_id);
  if (!category) {
    throw new HttpError(400, 'Categoria não encontrada');
  }
};

const listProducts = async ({ search, barcode, categoryId }) => {
  return productsRepository.findAll({ activeOnly: true, search, barcode, categoryId });
};

const getProductById = async (id) => {
  const product = await productsRepository.findById(id);
  if (!product) {
    throw new HttpError(404, 'Produto não encontrado');
  }
  return product;
};

const getProductByBarcode = async (barcode) => {
  const product = await productsRepository.findByBarcode(barcode, true);
  if (!product) {
    throw new HttpError(404, 'Produto não encontrado');
  }
  return product;
};

const createProduct = async (payload) => {
  await validateCategory(payload.categoria_id);

  if (!payload.nome || !payload.nome.trim()) {
    throw new HttpError(400, 'Nome do produto é obrigatório');
  }

  if (payload.preco_venda === undefined || Number(payload.preco_venda) < 0) {
    throw new HttpError(400, 'Preço de venda deve ser informado e não pode ser negativo');
  }

  if (payload.estoque_atual === undefined || Number(payload.estoque_atual) < 0) {
    throw new HttpError(400, 'Estoque inicial deve ser informado e não pode ser negativo');
  }

  if (payload.estoque_minimo === undefined || Number(payload.estoque_minimo) < 0) {
    throw new HttpError(400, 'Estoque mínimo deve ser informado e não pode ser negativo');
  }

  if (payload.codigo_barras) {
    const existing = await productsRepository.findByBarcode(payload.codigo_barras, false);
    if (existing) {
      throw new HttpError(409, 'Código de barras já cadastrado');
    }
  }

  const productId = await productsRepository.createProduct(payload);
  return productsRepository.findById(productId);
};

const updateProduct = async (id, payload) => {
  const currentProduct = await productsRepository.findById(id);
  if (!currentProduct) {
    throw new HttpError(404, 'Produto não encontrado');
  }

  await validateCategory(payload.categoria_id);

  if (!payload.nome || !payload.nome.trim()) {
    throw new HttpError(400, 'Nome do produto é obrigatório');
  }

  if (payload.preco_venda === undefined || Number(payload.preco_venda) < 0) {
    throw new HttpError(400, 'Preço de venda deve ser informado e não pode ser negativo');
  }

  if (payload.estoque_atual === undefined || Number(payload.estoque_atual) < 0) {
    throw new HttpError(400, 'Estoque inicial deve ser informado e não pode ser negativo');
  }

  if (payload.estoque_minimo === undefined || Number(payload.estoque_minimo) < 0) {
    throw new HttpError(400, 'Estoque mínimo deve ser informado e não pode ser negativo');
  }

  if (payload.codigo_barras) {
    const existing = await productsRepository.findByBarcodeExcludingId(payload.codigo_barras, id);
    if (existing) {
      throw new HttpError(409, 'Código de barras já cadastrado');
    }
  }

  await productsRepository.updateProduct(id, payload);
  return productsRepository.findById(id);
};

const updateProductStatus = async (id, ativo) => {
  const currentProduct = await productsRepository.findById(id);
  if (!currentProduct) {
    throw new HttpError(404, 'Produto não encontrado');
  }

  await productsRepository.updateStatus(id, ativo);
  return productsRepository.findById(id);
};

export default {
  listProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateProductStatus
};

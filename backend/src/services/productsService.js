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
  const normalizedBarcode = String(barcode || '').trim();
  if (!normalizedBarcode) {
    throw new HttpError(400, 'Código de barras é obrigatório para a consulta');
  }

  const product = await productsRepository.findByBarcode(normalizedBarcode, false);
  if (!product) {
    throw new HttpError(404, 'Produto não encontrado');
  }
  return product;
};

const createProduct = async (payload) => {
  const productData = {
    ...payload,
    nome: payload.nome?.trim(),
    codigo_barras: payload.codigo_barras?.trim() || null
  };
  await validateCategory(productData.categoria_id);

  if (!productData.nome) {
    throw new HttpError(400, 'Nome do produto é obrigatório');
  }

  if (productData.preco_venda === undefined || Number(productData.preco_venda) < 0) {
    throw new HttpError(400, 'Preço de venda deve ser informado e não pode ser negativo');
  }

  if (productData.estoque_atual === undefined || Number(productData.estoque_atual) < 0) {
    throw new HttpError(400, 'Estoque inicial deve ser informado e não pode ser negativo');
  }

  if (productData.estoque_minimo === undefined || Number(productData.estoque_minimo) < 0) {
    throw new HttpError(400, 'Estoque mínimo deve ser informado e não pode ser negativo');
  }

  if (productData.codigo_barras) {
    const existing = await productsRepository.findByBarcode(productData.codigo_barras, false);
    if (existing) {
      throw new HttpError(
        409,
        `Este código de barras já está cadastrado para o produto ${existing.nome}.`
      );
    }
  }

  const productId = await productsRepository.createProduct(productData);
  return productsRepository.findById(productId);
};

const updateProduct = async (id, payload) => {
  const currentProduct = await productsRepository.findById(id);
  if (!currentProduct) {
    throw new HttpError(404, 'Produto não encontrado');
  }

  const productData = {
    ...payload,
    nome: payload.nome?.trim(),
    codigo_barras: payload.codigo_barras?.trim() || null
  };

  await validateCategory(productData.categoria_id);

  if (!productData.nome) {
    throw new HttpError(400, 'Nome do produto é obrigatório');
  }

  if (productData.preco_venda === undefined || Number(productData.preco_venda) < 0) {
    throw new HttpError(400, 'Preço de venda deve ser informado e não pode ser negativo');
  }

  if (productData.estoque_atual === undefined || Number(productData.estoque_atual) < 0) {
    throw new HttpError(400, 'Estoque inicial deve ser informado e não pode ser negativo');
  }

  if (productData.estoque_minimo === undefined || Number(productData.estoque_minimo) < 0) {
    throw new HttpError(400, 'Estoque mínimo deve ser informado e não pode ser negativo');
  }

  if (productData.codigo_barras) {
    const existing = await productsRepository.findByBarcodeExcludingId(productData.codigo_barras, id);
    if (existing) {
      throw new HttpError(
        409,
        `Este código de barras já está cadastrado para o produto ${existing.nome}.`
      );
    }
  }

  await productsRepository.updateProduct(id, productData);
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

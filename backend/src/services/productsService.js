import productsRepository from '../repositories/productsRepository.js';
import categoriesRepository from '../repositories/categoriesRepository.js';
import authConfig from '../config/auth.js';
import { parseFixedDecimal } from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const PRODUCT_HAS_HISTORY_MESSAGE = 'Este produto já possui histórico no sistema e não pode ser excluído. Ele pode ser inativado para não aparecer nas vendas.';
const PRODUCT_HAS_STOCK_MESSAGE = 'Este produto possui estoque atual. Para evitar perda de controle, ajuste ou zere o estoque antes de excluir/inativar.';

const normalizeProductId = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new HttpError(400, 'Produto inválido');
  }
  return normalized;
};

const normalizeProductStatusFilter = (value) => {
  const normalized = String(value ?? 'active').trim().toLowerCase();
  if (['active', 'inactive', 'all'].includes(normalized)) return normalized;
  throw new HttpError(400, 'Filtro de status de produto inválido');
};

const normalizeBoolean = (value, fieldName) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  throw new HttpError(400, `${fieldName} deve ser booleano`);
};

const validateCategory = async (categoria_id) => {
  if (categoria_id === null || categoria_id === undefined) {
    return;
  }

  const category = await categoriesRepository.findById(categoria_id);
  if (!category) {
    throw new HttpError(400, 'Categoria não encontrada');
  }
};

const listProducts = async ({ search, barcode, categoryId, status }) => {
  return productsRepository.findAll({
    status: normalizeProductStatusFilter(status),
    search,
    barcode,
    categoryId
  });
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
  const productId = normalizeProductId(id);
  const currentProduct = await productsRepository.findById(productId);
  if (!currentProduct) {
    throw new HttpError(404, 'Produto não encontrado');
  }

  await productsRepository.updateStatus(productId, normalizeBoolean(ativo, 'Campo ativo'));
  return productsRepository.findById(productId);
};

const deleteProduct = async (id, user) => {
  if (user?.role?.slug !== authConfig.roles.admin) {
    throw new HttpError(403, 'Somente administradores podem excluir produto.', {
      code: 'PRODUCT_DELETE_FORBIDDEN'
    });
  }

  const productId = normalizeProductId(id);

  return productsRepository.withTransaction(async (connection) => {
    const product = await productsRepository.findForDeletion(productId, connection);
    if (!product) {
      throw new HttpError(404, 'Produto não encontrado');
    }

    if (parseFixedDecimal(product.estoque_atual) > 0n) {
      throw new HttpError(409, PRODUCT_HAS_STOCK_MESSAGE, {
        code: 'PRODUCT_HAS_STOCK'
      });
    }

    const associations = await productsRepository.findProductAssociations(productId, connection);
    if (associations.length) {
      throw new HttpError(409, PRODUCT_HAS_HISTORY_MESSAGE, {
        code: 'PRODUCT_HAS_HISTORY'
      });
    }

    try {
      const affectedRows = await productsRepository.deleteById(productId, connection);
      if (!affectedRows) {
        throw new HttpError(404, 'Produto não encontrado');
      }
      return { excluido: true, id: Number(productId) };
    } catch (error) {
      if (['ER_ROW_IS_REFERENCED', 'ER_ROW_IS_REFERENCED_2'].includes(error.code)) {
        throw new HttpError(409, PRODUCT_HAS_HISTORY_MESSAGE, {
          code: 'PRODUCT_HAS_HISTORY'
        });
      }
      throw error;
    }
  });
};

export default {
  deleteProduct,
  listProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateProductStatus
};

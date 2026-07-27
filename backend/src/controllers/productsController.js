import productsService from '../services/productsService.js';

const listProducts = async (req, res, next) => {
  try {
    const products = await productsService.listProducts({
      search: req.query.search,
      barcode: req.query.barcode,
      categoryId: req.query.category_id ? Number(req.query.category_id) : null,
      status: req.query.status
    });
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await productsService.getProductByBarcode(req.params.barcode);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await productsService.createProduct(req.body);
    res.status(201).json({ data: product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productsService.updateProduct(req.params.id, req.body);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

const updateProductStatus = async (req, res, next) => {
  try {
    const product = await productsService.updateProductStatus(req.params.id, req.body.ativo);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const result = await productsService.deleteProduct(req.params.id, req.user);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
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

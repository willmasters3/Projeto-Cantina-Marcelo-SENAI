import stockService from '../services/stockService.js';

const getSummary = async (req, res, next) => {
  try {
    const summary = await stockService.listSummary();
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

const listProducts = async (req, res, next) => {
  try {
    const products = await stockService.listProducts({
      search: req.query.search,
      categoryId: req.query.category_id,
      supplierId: req.query.supplier_id,
      status: req.query.status,
      page: req.query.page,
      pageSize: req.query.pageSize,
      limit: req.query.limit
    });
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

const listMovements = async (req, res, next) => {
  try {
    const movements = await stockService.listMovements({
      page: req.query.page,
      pageSize: req.query.pageSize,
      limit: req.query.limit
    });
    res.status(200).json({ data: movements });
  } catch (error) {
    next(error);
  }
};

const listLowStockProducts = async (req, res, next) => {
  try {
    const products = await stockService.listLowStockProducts({ limit: req.query.limit });
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

const createStockEntry = async (req, res, next) => {
  try {
    const entry = await stockService.createStockEntry(req.body, req.user);
    res.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
};

const createStockAdjustment = async (req, res, next) => {
  try {
    const adjustment = await stockService.createStockAdjustment(req.body, req.user);
    res.status(adjustment.alterado === false ? 200 : 201).json({ data: adjustment });
  } catch (error) {
    next(error);
  }
};

export default {
  createStockAdjustment,
  createStockEntry,
  getSummary,
  listLowStockProducts,
  listMovements,
  listProducts
};

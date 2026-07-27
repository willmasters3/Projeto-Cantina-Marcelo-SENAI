import reportsService from '../services/reportsService.js';

const listOptions = async (req, res, next) => {
  try {
    const options = await reportsService.listOptions(req.user);
    res.status(200).json({ data: options });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const summary = await reportsService.getSummary(req.query, req.user);
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

const listSales = async (req, res, next) => {
  try {
    const sales = await reportsService.listSales(req.query, req.user);
    res.status(200).json({ data: sales });
  } catch (error) {
    next(error);
  }
};

const getCashReport = async (req, res, next) => {
  try {
    const cash = await reportsService.getCashReport(req.query, req.user);
    res.status(200).json({ data: cash });
  } catch (error) {
    next(error);
  }
};

const getFiadoReport = async (req, res, next) => {
  try {
    const fiado = await reportsService.getFiadoReport(req.query, req.user);
    res.status(200).json({ data: fiado });
  } catch (error) {
    next(error);
  }
};

const getPaymentsReport = async (req, res, next) => {
  try {
    const payments = await reportsService.getPaymentsReport(req.query, req.user);
    res.status(200).json({ data: payments });
  } catch (error) {
    next(error);
  }
};

const getProductsReport = async (req, res, next) => {
  try {
    const products = await reportsService.getProductsReport(req.query, req.user);
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

const getStockReport = async (req, res, next) => {
  try {
    const stock = await reportsService.getStockReport(req.query, req.user);
    res.status(200).json({ data: stock });
  } catch (error) {
    next(error);
  }
};

export default {
  getCashReport,
  getFiadoReport,
  getPaymentsReport,
  getProductsReport,
  getStockReport,
  getSummary,
  listOptions,
  listSales
};

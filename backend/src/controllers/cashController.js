import cashService from '../services/cashService.js';

const getCurrentSession = async (req, res, next) => {
  try {
    const session = await cashService.getCurrentSession();
    res.status(200).json({ data: session });
  } catch (error) {
    next(error);
  }
};

const openSession = async (req, res, next) => {
  try {
    const session = await cashService.openSession(req.body, req.user);
    res.status(201).json({ data: session });
  } catch (error) {
    next(error);
  }
};

const closeSession = async (req, res, next) => {
  try {
    const session = await cashService.closeSession(req.body, req.user);
    res.status(200).json({ data: session });
  } catch (error) {
    next(error);
  }
};

const createMonitorPairing = async (req, res, next) => {
  try {
    const pairing = await cashService.createMonitorPairing(req.body);
    res.setHeader('Cache-Control', 'no-store');
    res.status(201).json({ data: pairing });
  } catch (error) {
    next(error);
  }
};

const getProductByBarcode = async (req, res, next) => {
  try {
    const product = await cashService.getProductByBarcode(req.params.barcode);
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
};

const searchProducts = async (req, res, next) => {
  try {
    const products = await cashService.searchProducts(req.query.search);
    res.status(200).json({ data: products });
  } catch (error) {
    next(error);
  }
};

const searchClients = async (req, res, next) => {
  try {
    const clients = await cashService.searchClients(req.query.search);
    res.status(200).json({ data: clients });
  } catch (error) {
    next(error);
  }
};

const createSale = async (req, res, next) => {
  try {
    const sale = await cashService.createSale(req.body, req.user);
    res.status(201).json({ data: sale });
  } catch (error) {
    next(error);
  }
};

const listRecentSales = async (req, res, next) => {
  try {
    const sales = await cashService.listRecentSales();
    res.status(200).json({ data: sales });
  } catch (error) {
    next(error);
  }
};

const cancelSale = async (req, res, next) => {
  try {
    const sale = await cashService.cancelSale(req.params.id, req.body, req.user);
    res.status(200).json({ data: sale });
  } catch (error) {
    next(error);
  }
};

export default {
  cancelSale,
  closeSession,
  createMonitorPairing,
  createSale,
  getCurrentSession,
  getProductByBarcode,
  listRecentSales,
  openSession,
  searchClients,
  searchProducts
};

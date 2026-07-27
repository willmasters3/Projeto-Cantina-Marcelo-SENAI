import fiadoService from '../services/fiadoService.js';

const getSummary = async (req, res, next) => {
  try {
    const summary = await fiadoService.getSummary();
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

const listCustomers = async (req, res, next) => {
  try {
    const customers = await fiadoService.listCustomers({ search: req.query.search });
    res.status(200).json({ data: customers });
  } catch (error) {
    next(error);
  }
};

const getCustomer = async (req, res, next) => {
  try {
    const customer = await fiadoService.getCustomerDetails(req.params.id);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

const getCustomerStatement = async (req, res, next) => {
  try {
    const statement = await fiadoService.getCustomerStatement(req.params.id);
    res.status(200).json({ data: statement });
  } catch (error) {
    next(error);
  }
};

const getCustomerCycles = async (req, res, next) => {
  try {
    const cycles = await fiadoService.getCustomerCycles(req.params.id);
    res.status(200).json({ data: cycles });
  } catch (error) {
    next(error);
  }
};

const registerPayment = async (req, res, next) => {
  try {
    const payment = await fiadoService.registerPayment(req.body, req.user);
    res.status(201).json({ data: payment });
  } catch (error) {
    next(error);
  }
};

export default {
  getCustomer,
  getCustomerCycles,
  getCustomerStatement,
  getSummary,
  listCustomers,
  registerPayment
};

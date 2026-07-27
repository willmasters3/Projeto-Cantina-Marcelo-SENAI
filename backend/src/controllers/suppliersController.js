import suppliersService from '../services/suppliersService.js';

const listSuppliers = async (req, res, next) => {
  try {
    const suppliers = await suppliersService.listSuppliers({
      search: req.query.search,
      activeOnly: req.query.active_only
    });
    res.status(200).json({ data: suppliers });
  } catch (error) {
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await suppliersService.createSupplier(req.body);
    res.status(201).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await suppliersService.updateSupplier(req.params.id, req.body);
    res.status(200).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

const updateSupplierStatus = async (req, res, next) => {
  try {
    const supplier = await suppliersService.updateSupplierStatus(req.params.id, req.body.ativo);
    res.status(200).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

export default {
  createSupplier,
  listSuppliers,
  updateSupplier,
  updateSupplierStatus
};

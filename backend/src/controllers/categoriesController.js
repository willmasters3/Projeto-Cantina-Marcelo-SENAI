import categoriesService from '../services/categoriesService.js';

const listCategories = async (req, res, next) => {
  try {
    const categories = await categoriesService.listCategories({ search: req.query.search });
    res.status(200).json({ data: categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await categoriesService.createCategory(req.body);
    res.status(201).json({ data: category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await categoriesService.updateCategory(req.params.id, req.body);
    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
};

const updateCategoryStatus = async (req, res, next) => {
  try {
    const category = await categoriesService.updateCategoryStatus(req.params.id, req.body.ativo);
    res.status(200).json({ data: category });
  } catch (error) {
    next(error);
  }
};

export default { listCategories, createCategory, updateCategory, updateCategoryStatus };

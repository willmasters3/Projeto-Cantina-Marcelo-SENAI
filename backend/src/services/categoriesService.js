import categoriesRepository from '../repositories/categoriesRepository.js';
import HttpError from '../utils/httpError.js';

const listCategories = async ({ search }) => {
  return categoriesRepository.findAll({ activeOnly: false, search });
};

const createCategory = async ({ nome }) => {
  const normalizedName = nome.trim();
  const existing = await categoriesRepository.findByName(normalizedName);
  if (existing) {
    throw new HttpError(409, `A categoria "${existing.nome}" já está cadastrada`);
  }

  const categoryId = await categoriesRepository.createCategory(normalizedName);
  return categoriesRepository.findById(categoryId);
};

const updateCategory = async (id, { nome }) => {
  const current = await categoriesRepository.findById(id);
  if (!current) {
    throw new HttpError(404, 'Categoria não encontrada');
  }

  const existing = await categoriesRepository.findByNameActiveExcludingId(nome, id);
  if (existing) {
    throw new HttpError(409, 'Já existe outra categoria ativa com esse nome');
  }

  await categoriesRepository.updateCategory(id, nome);
  return categoriesRepository.findById(id);
};

const updateCategoryStatus = async (id, ativo) => {
  const current = await categoriesRepository.findById(id);
  if (!current) {
    throw new HttpError(404, 'Categoria não encontrada');
  }

  await categoriesRepository.updateStatus(id, ativo);
  return categoriesRepository.findById(id);
};

export default {
  listCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus
};

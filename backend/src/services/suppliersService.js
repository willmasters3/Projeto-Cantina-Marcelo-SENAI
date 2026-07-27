import suppliersRepository from '../repositories/suppliersRepository.js';
import HttpError from '../utils/httpError.js';

const normalizeId = (value, fieldName = 'Fornecedor') => {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new HttpError(400, `${fieldName} inválido`);
  }
  return normalized;
};

const normalizeBoolean = (value, fieldName) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  throw new HttpError(400, `${fieldName} deve ser booleano`);
};

const normalizeOptionalText = (value, maxLength = 255) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `Texto deve ter no máximo ${maxLength} caracteres`);
  }
  return normalized;
};

const normalizeSupplierPayload = (payload) => {
  const nome = normalizeOptionalText(payload.nome, 255);
  if (!nome) throw new HttpError(400, 'Nome do fornecedor é obrigatório');

  return {
    nome,
    nome_fantasia: normalizeOptionalText(payload.nome_fantasia, 255),
    documento: normalizeOptionalText(payload.documento, 80),
    telefone: normalizeOptionalText(payload.telefone, 80),
    email: normalizeOptionalText(payload.email, 180),
    observacoes: normalizeOptionalText(payload.observacoes, 1000),
    ativo: payload.ativo === undefined ? true : normalizeBoolean(payload.ativo, 'Campo ativo')
  };
};

const listSuppliers = async ({ search, activeOnly }) => {
  const normalizedSearch = String(search ?? '').trim();
  return suppliersRepository.findAll({
    search: normalizedSearch,
    activeOnly: activeOnly === true || activeOnly === '1' || activeOnly === 'true'
  });
};

const createSupplier = async (payload) => {
  const supplier = normalizeSupplierPayload(payload);
  if (supplier.ativo) {
    const existing = await suppliersRepository.findActiveByName(supplier.nome);
    if (existing) {
      throw new HttpError(409, `O fornecedor "${existing.nome}" já está cadastrado como ativo`);
    }
  }

  const supplierId = await suppliersRepository.createSupplier(supplier);
  return suppliersRepository.findById(supplierId);
};

const updateSupplier = async (id, payload) => {
  const supplierId = normalizeId(id);
  const current = await suppliersRepository.findById(supplierId);
  if (!current) throw new HttpError(404, 'Fornecedor não encontrado');

  const supplier = normalizeSupplierPayload({
    ...payload,
    ativo: current.ativo
  });

  if (current.ativo) {
    const existing = await suppliersRepository.findActiveByNameExcludingId(
      supplier.nome,
      supplierId
    );
    if (existing) {
      throw new HttpError(409, `O fornecedor "${existing.nome}" já está cadastrado como ativo`);
    }
  }

  await suppliersRepository.updateSupplier(supplierId, supplier);
  return suppliersRepository.findById(supplierId);
};

const updateSupplierStatus = async (id, ativo) => {
  const supplierId = normalizeId(id);
  const nextStatus = normalizeBoolean(ativo, 'Campo ativo');
  const current = await suppliersRepository.findById(supplierId);
  if (!current) throw new HttpError(404, 'Fornecedor não encontrado');

  if (nextStatus) {
    const existing = await suppliersRepository.findActiveByNameExcludingId(
      current.nome,
      supplierId
    );
    if (existing) {
      throw new HttpError(409, `O fornecedor "${current.nome}" já existe como ativo`);
    }
  }

  await suppliersRepository.updateStatus(supplierId, nextStatus);
  return suppliersRepository.findById(supplierId);
};

export default {
  createSupplier,
  listSuppliers,
  updateSupplier,
  updateSupplierStatus
};

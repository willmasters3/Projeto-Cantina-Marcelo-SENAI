import HttpError from '../utils/httpError.js';

const validateFiadoPayment = (req, res, next) => {
  const {
    cliente_id,
    ciclo,
    valor_recebido,
    forma_pagamento
  } = req.body || {};

  if (!cliente_id) throw new HttpError(400, 'Cliente não encontrado.');
  if (!ciclo) throw new HttpError(400, 'Ciclo de cobrança inválido.');
  if (valor_recebido === undefined || valor_recebido === null || valor_recebido === '') {
    throw new HttpError(400, 'Valor recebido inválido.');
  }
  if (!forma_pagamento) throw new HttpError(400, 'Forma de pagamento inválida.');

  return next();
};

export { validateFiadoPayment };

import monitorRepository from '../repositories/monitorRepository.js';
import { formatFixedDecimal, parseFixedDecimal } from '../utils/fixedDecimal.js';
import { isValidCpf, normalizeCpf } from '../utils/cpf.js';
import HttpError from '../utils/httpError.js';

const entryStatuses = {
  VENDA_FIADO: 'Lançado',
  PAGAMENTO_CLIENTE: 'Recebido',
  CANCELAMENTO_VENDA: 'Cancelado',
  ESTORNO_PAGAMENTO: 'Estornado',
  AJUSTE: 'Ajuste'
};

const getFirstName = (fullName) => String(fullName || '').trim().split(/\s+/)[0] || 'Cliente';

const maskCpf = (cpf) => `***.***.***-${String(cpf).slice(-2)}`;

const getPublicAccount = async (cpfValue) => {
  if (!isValidCpf(cpfValue)) {
    throw new HttpError(422, 'Informe um CPF válido.');
  }

  const cpf = normalizeCpf(cpfValue);
  const client = await monitorRepository.findClientByCpf(cpf);
  if (!client) {
    throw new HttpError(404, 'Não foi possível localizar uma conta para este CPF.');
  }

  const [totals, entries] = await Promise.all([
    monitorRepository.getAccountTotals(client.id),
    monitorRepository.listRecentAccountEntries(client.id, 10)
  ]);
  const balance = parseFixedDecimal(totals.debitos) - parseFixedDecimal(totals.creditos);

  return {
    cliente: {
      primeiro_nome: getFirstName(client.nome),
      cpf_mascarado: maskCpf(client.cpf)
    },
    saldo_pendente: formatFixedDecimal(balance > 0n ? balance : 0n),
    lancamentos: entries.map((entry) => ({
      data: entry.criado_em,
      descricao: entry.itens_venda || entry.descricao,
      tipo: entry.natureza === 'DEBITO' ? 'Débito' : 'Crédito',
      natureza: entry.natureza,
      valor: entry.valor,
      status: entryStatuses[entry.origem] || 'Registrado'
    }))
  };
};

export default { getPublicAccount };

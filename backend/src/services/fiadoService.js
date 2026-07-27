import crypto from 'node:crypto';
import authConfig from '../config/auth.js';
import fiadoRepository from '../repositories/fiadoRepository.js';
import {
  formatFixedDecimal,
  parseFixedDecimal
} from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const terminalCode = 'CAIXA-01';
const allowedPaymentMethods = new Set(['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTROS']);

const monthLabels = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

const normalizeId = (value, fieldName) => {
  const normalized = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new HttpError(400, `${fieldName} inválido`);
  }
  return normalized;
};

const normalizeAmount = (value) => {
  try {
    const amount = parseFixedDecimal(value);
    if (amount <= 0n) throw new HttpError(400, 'Valor recebido inválido.');
    return amount;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Valor recebido inválido.');
  }
};

const normalizePaymentMethod = (value) => {
  const method = String(value ?? '').trim().toUpperCase();
  if (!allowedPaymentMethods.has(method)) {
    throw new HttpError(400, 'Forma de pagamento inválida.');
  }
  return method;
};

const normalizeOptionalText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new HttpError(400, `Texto deve ter no máximo ${maxLength} caracteres`);
  }
  return normalized;
};

const maskCpf = (cpf) => {
  const digits = String(cpf ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return 'Não informado';
  return `***.***.***-${digits.slice(-2)}`;
};

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getCycleKeyFromDate = (value) => {
  const date = toDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentCycleKey = () => getCycleKeyFromDate(new Date());

const getCycleLabel = (cycleKey) => {
  const [year, month] = String(cycleKey).split('-');
  const monthIndex = Number(month) - 1;
  return `${monthLabels[monthIndex] || month}/${year}`;
};

const parseCycleFromPayment = (entry) => {
  const source = `${entry.referencia_transacao || ''} ${entry.descricao || ''}`;
  const match = source.match(/(?:FIADO-CICLO-|ciclo\s+)(\d{4}-\d{2})/i);
  return match?.[1] || null;
};

const getEntryCycleKey = (entry) => {
  if (entry.origem === 'PAGAMENTO_CLIENTE') {
    return parseCycleFromPayment(entry) || getCycleKeyFromDate(entry.pagamento_em || entry.criado_em);
  }
  return getCycleKeyFromDate(entry.venda_em || entry.criado_em);
};

const compareCycleKeys = (left, right) => left.localeCompare(right);

const emptyCycle = (cycleKey) => ({
  cycle_key: cycleKey,
  label: getCycleLabel(cycleKey),
  debits: 0n,
  credits: 0n,
  balance: 0n,
  entries: []
});

const getStatusForCycle = (cycle, currentCycleKey) => {
  if (cycle.balance <= 0n) return 'QUITADO';
  if (compareCycleKeys(cycle.cycle_key, currentCycleKey) < 0) {
    return cycle.credits > 0n ? 'PARCIAL' : 'VENCIDO';
  }
  return cycle.credits > 0n ? 'PARCIAL' : 'EM_ABERTO';
};

const getClientSituation = (cycles, currentCycleKey) => {
  const openCycles = cycles.filter((cycle) => cycle.balance > 0n);
  if (!openCycles.length) return 'QUITADO';
  if (openCycles.some((cycle) => compareCycleKeys(cycle.cycle_key, currentCycleKey) < 0 && cycle.credits === 0n)) {
    return 'VENCIDO';
  }
  if (openCycles.some((cycle) => compareCycleKeys(cycle.cycle_key, currentCycleKey) < 0)) {
    return 'ATRASADO';
  }
  if (openCycles.some((cycle) => cycle.credits > 0n)) return 'PARCIAL';
  return 'EM_ABERTO';
};

const formatCycle = (cycle, currentCycleKey) => ({
  cycle_key: cycle.cycle_key,
  label: cycle.label,
  debitos: formatFixedDecimal(cycle.debits),
  creditos: formatFixedDecimal(cycle.credits),
  saldo: formatFixedDecimal(cycle.balance),
  status: getStatusForCycle(cycle, currentCycleKey)
});

const buildClientCycles = (entries) => {
  const cyclesByKey = new Map();

  entries.forEach((entry) => {
    const cycleKey = getEntryCycleKey(entry);
    if (!cyclesByKey.has(cycleKey)) cyclesByKey.set(cycleKey, emptyCycle(cycleKey));
    const cycle = cyclesByKey.get(cycleKey);
    const amount = parseFixedDecimal(entry.valor);
    if (entry.natureza === 'DEBITO') {
      cycle.debits += amount;
      cycle.balance += amount;
    } else {
      cycle.credits += amount;
      cycle.balance -= amount;
    }
    cycle.entries.push(entry);
  });

  return [...cyclesByKey.values()].sort((left, right) => compareCycleKeys(left.cycle_key, right.cycle_key));
};

const groupEntriesByClient = (entries) => {
  const clientsById = new Map();
  entries.forEach((entry) => {
    const clientId = String(entry.cliente_id);
    if (!clientsById.has(clientId)) {
      clientsById.set(clientId, {
        id: entry.cliente_id,
        nome: entry.cliente_nome,
        cpf: entry.cpf,
        matricula: entry.matricula,
        codigo: entry.codigo,
        ativo: entry.cliente_ativo,
        entries: []
      });
    }
    clientsById.get(clientId).entries.push(entry);
  });
  return [...clientsById.values()];
};

const formatClientSummary = (client, currentCycleKey) => {
  const cycles = buildClientCycles(client.entries);
  const openCycles = cycles.filter((cycle) => cycle.balance > 0n);
  const netBalance = cycles.reduce((total, cycle) => total + cycle.balance, 0n);
  const openBalance = netBalance > 0n ? netBalance : 0n;
  const oldestOpenCycle = openCycles[0] || null;

  return {
    id: client.id,
    nome: client.nome,
    cpf_mascarado: maskCpf(client.cpf),
    matricula: client.matricula,
    codigo: client.codigo,
    ativo: Boolean(client.ativo),
    saldo_aberto: formatFixedDecimal(openBalance),
    ciclo_mais_antigo: oldestOpenCycle ? oldestOpenCycle.label : null,
    ciclo_mais_antigo_key: oldestOpenCycle ? oldestOpenCycle.cycle_key : null,
    situacao: getClientSituation(cycles, currentCycleKey),
    ciclos_abertos: openCycles.map((cycle) => formatCycle(cycle, currentCycleKey))
  };
};

const listPendingCustomers = async ({ search = '' } = {}) => {
  const entries = await fiadoRepository.listAccountEntries({ search: String(search ?? '').trim() });
  const currentCycleKey = getCurrentCycleKey();
  return groupEntriesByClient(entries)
    .map((client) => formatClientSummary(client, currentCycleKey))
    .filter((client) => parseFixedDecimal(client.saldo_aberto) > 0n)
    .sort((left, right) => left.nome.localeCompare(right.nome));
};

const getSummary = async () => {
  const customers = await listPendingCustomers();
  const currentCycleKey = getCurrentCycleKey();
  const totalOpen = customers.reduce(
    (total, client) => total + parseFixedDecimal(client.saldo_aberto),
    0n
  );
  const overdue = customers.reduce((total, client) => {
    const overdueCycles = client.ciclos_abertos.filter(
      (cycle) => compareCycleKeys(cycle.cycle_key, currentCycleKey) < 0
    );
    return total + overdueCycles.reduce(
      (cycleTotal, cycle) => cycleTotal + parseFixedDecimal(cycle.saldo),
      0n
    );
  }, 0n);
  const receivedCurrentMonth = parseFixedDecimal(await fiadoRepository.getReceivedInCurrentMonth());

  return {
    saldo_total_aberto: formatFixedDecimal(totalOpen),
    vencido_mes_anterior: formatFixedDecimal(overdue),
    recebido_mes_atual: formatFixedDecimal(receivedCurrentMonth),
    clientes_com_pendencia: customers.length
  };
};

const listCustomers = async ({ search = '' } = {}) => {
  const normalizedSearch = String(search ?? '').trim();
  if (normalizedSearch) {
    const clients = await fiadoRepository.listClients({ search: normalizedSearch });
    const entries = await fiadoRepository.listAccountEntries({ search: normalizedSearch });
    const summariesById = new Map(
      groupEntriesByClient(entries)
        .map((client) => [String(client.id), formatClientSummary(client, getCurrentCycleKey())])
    );
    return clients.map((client) => summariesById.get(String(client.id)) || {
      id: client.id,
      nome: client.nome,
      cpf_mascarado: maskCpf(client.cpf),
      matricula: client.matricula,
      codigo: client.codigo,
      ativo: Boolean(client.ativo),
      saldo_aberto: '0.0000',
      ciclo_mais_antigo: null,
      ciclo_mais_antigo_key: null,
      situacao: 'QUITADO',
      ciclos_abertos: []
    });
  }

  return listPendingCustomers();
};

const getCustomerDetails = async (id) => {
  const clientId = normalizeId(id, 'Cliente');
  const client = await fiadoRepository.findClientById(clientId);
  if (!client) throw new HttpError(404, 'Cliente não encontrado.');

  const entries = await fiadoRepository.listAccountEntries({ clientId });
  const summary = formatClientSummary({
    id: client.id,
    nome: client.nome,
    cpf: client.cpf,
    matricula: client.matricula,
    codigo: client.codigo,
    ativo: client.ativo,
    entries
  }, getCurrentCycleKey());

  return summary;
};

const getCustomerCycles = async (id) => {
  const clientId = normalizeId(id, 'Cliente');
  const client = await fiadoRepository.findClientById(clientId);
  if (!client) throw new HttpError(404, 'Cliente não encontrado.');

  const entries = await fiadoRepository.listAccountEntries({ clientId });
  const currentCycleKey = getCurrentCycleKey();
  return buildClientCycles(entries)
    .map((cycle) => formatCycle(cycle, currentCycleKey))
    .filter((cycle) => parseFixedDecimal(cycle.saldo) > 0n);
};

const getCustomerStatement = async (id) => {
  const clientId = normalizeId(id, 'Cliente');
  const client = await fiadoRepository.findClientById(clientId);
  if (!client) throw new HttpError(404, 'Cliente não encontrado.');

  const entries = await fiadoRepository.listAccountEntries({ clientId });
  const saleItems = await fiadoRepository.listSaleItemsByClient(clientId);
  const currentCycleKey = getCurrentCycleKey();
  let balance = 0n;

  const statement = entries
    .sort((left, right) => {
      const leftDate = toDate(left.venda_em || left.pagamento_em || left.criado_em);
      const rightDate = toDate(right.venda_em || right.pagamento_em || right.criado_em);
      return leftDate - rightDate || Number(left.id) - Number(right.id);
    })
    .map((entry) => {
      const amount = parseFixedDecimal(entry.valor);
      balance += entry.natureza === 'DEBITO' ? amount : -amount;
      return {
        id: entry.id,
        ciclo: getCycleLabel(getEntryCycleKey(entry)),
        ciclo_key: getEntryCycleKey(entry),
        natureza: entry.natureza,
        origem: entry.origem,
        valor: formatFixedDecimal(amount),
        saldo_apos: formatFixedDecimal(balance),
        descricao: entry.descricao,
        forma_pagamento: entry.forma_pagamento,
        usuario: entry.usuario,
        criado_em: entry.venda_em || entry.pagamento_em || entry.criado_em
      };
    })
    .reverse();

  return {
    cliente: await getCustomerDetails(clientId),
    ciclos: buildClientCycles(entries)
      .map((cycle) => formatCycle(cycle, currentCycleKey)),
    compras: saleItems.map((item) => ({
      sale_id: item.sale_id,
      confirmada_em: item.confirmada_em,
      descricao: item.descricao,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      total_item: item.total_item,
      venda_total: item.venda_total,
      status: item.status,
      ciclo: getCycleLabel(getCycleKeyFromDate(item.confirmada_em))
    })),
    lancamentos: statement
  };
};

const buildPaymentApplications = (openCycles, selectedCycleKey, amount) => {
  const selectedIndex = openCycles.findIndex((cycle) => cycle.cycle_key === selectedCycleKey);
  if (selectedIndex < 0) throw new HttpError(409, 'Cliente sem pendências neste ciclo.');

  let remaining = amount;
  const applications = [];

  for (let index = selectedIndex; index < openCycles.length && remaining > 0n; index += 1) {
    const cycle = openCycles[index];
    const appliedAmount = remaining > cycle.balance ? cycle.balance : remaining;
    if (appliedAmount > 0n) {
      applications.push({
        cycle,
        amount: appliedAmount,
        extraCredit: false
      });
      remaining -= appliedAmount;
    }
  }

  if (remaining > 0n) {
    const lastApplication = applications[applications.length - 1];
    applications.push({
      cycle: lastApplication?.cycle || openCycles[selectedIndex],
      amount: remaining,
      extraCredit: true
    });
  }

  return applications;
};

const buildPaymentDescription = ({ cycleKey, cycleLabel, notes, extraCredit }) => (
  [
    `Recebimento fiado ciclo ${cycleKey} (${cycleLabel})`,
    extraCredit ? 'Crédito adicional' : null,
    notes
  ].filter(Boolean).join(' - ')
);

const registerPayment = async (payload, user) => {
  if (![authConfig.roles.admin, authConfig.roles.cashier].includes(user?.role?.slug)) {
    throw new HttpError(403, 'Você não tem permissão para registrar pagamento.');
  }

  const clientId = normalizeId(payload.cliente_id, 'Cliente');
  const cycleKey = String(payload.ciclo || '').trim();
  if (!/^\d{4}-\d{2}$/.test(cycleKey)) {
    throw new HttpError(400, 'Ciclo de cobrança inválido.');
  }
  const amount = normalizeAmount(payload.valor_recebido);
  const method = normalizePaymentMethod(payload.forma_pagamento);
  const notes = normalizeOptionalText(payload.observacao, 350);
  const allowExtraCredit = payload.confirmar_credito_adicional === true;

  return fiadoRepository.withTransaction(async (connection) => {
    const client = await fiadoRepository.findClientById(clientId, connection, true);
    if (!client) throw new HttpError(404, 'Cliente não encontrado.');
    if (!client.ativo) throw new HttpError(409, 'Cliente inativo.');

    const session = await fiadoRepository.findOpenCashSession(terminalCode, connection, true);
    if (!session) {
      throw new HttpError(409, 'Abra o caixa antes de registrar recebimento de fiado.');
    }

    const entries = await fiadoRepository.listAccountEntries({ clientId }, connection);
    const openCycles = buildClientCycles(entries).filter((item) => item.balance > 0n);
    const cycle = openCycles.find((item) => item.cycle_key === cycleKey);
    const cycleBalance = cycle?.balance || 0n;
    if (cycleBalance <= 0n) throw new HttpError(409, 'Cliente sem pendências neste ciclo.');

    if (amount > cycleBalance && !allowExtraCredit) {
      throw new HttpError(
        409,
        'Valor recebido maior que saldo do ciclo. Confirme se deseja lançar crédito adicional.',
        { code: 'FIADO_OVERPAYMENT_REQUIRES_CONFIRMATION' }
      );
    }

    const applications = buildPaymentApplications(openCycles, cycleKey, amount);
    const totalOpenBalance = openCycles.reduce((total, item) => total + item.balance, 0n);
    const extraCredit = amount > totalOpenBalance ? amount - totalOpenBalance : 0n;
    const paymentUuid = crypto.randomUUID();
    const amountText = formatFixedDecimal(amount);
    const paymentId = await fiadoRepository.createPayment({
      cashSessionId: session.id,
      clientId,
      method,
      amount: amountText,
      reference: `FIADO-RECEBIMENTO-${paymentUuid}`,
      idempotencyKey: `fiado-payment-${clientId}-${paymentUuid}`,
      userId: user.id
    }, connection);

    const entryIds = [];
    for (const [index, application] of applications.entries()) {
      const applicationCycleKey = application.cycle.cycle_key;
      const entryId = await fiadoRepository.createAccountEntry({
        clientId,
        paymentId,
        amount: formatFixedDecimal(application.amount),
        description: buildPaymentDescription({
          cycleKey: applicationCycleKey,
          cycleLabel: getCycleLabel(applicationCycleKey),
          notes,
          extraCredit: application.extraCredit
        }),
        idempotencyKey: `fiado-credit-${paymentId}-${index + 1}`,
        userId: user.id
      }, connection);
      entryIds.push(entryId);
    }

    const selectedApplied = applications
      .filter((application) => application.cycle.cycle_key === cycleKey)
      .reduce((total, application) => total + application.amount, 0n);
    const selectedRemaining = cycleBalance > selectedApplied ? cycleBalance - selectedApplied : 0n;
    const totalRemaining = totalOpenBalance > amount ? totalOpenBalance - amount : 0n;

    return {
      payment_id: paymentId,
      lancamento_ids: entryIds,
      cliente_id: Number(clientId),
      ciclo: cycleKey,
      valor_recebido: amountText,
      saldo_anterior: formatFixedDecimal(cycleBalance),
      saldo_restante: formatFixedDecimal(selectedRemaining),
      saldo_total_restante: formatFixedDecimal(totalRemaining),
      credito_adicional: formatFixedDecimal(extraCredit),
      aplicacoes: applications.map((application) => ({
        ciclo: application.cycle.cycle_key,
        label: application.cycle.label,
        valor: formatFixedDecimal(application.amount),
        credito_adicional: application.extraCredit
      }))
    };
  });
};

export default {
  getCustomerCycles,
  getCustomerDetails,
  getCustomerStatement,
  getSummary,
  listCustomers,
  registerPayment
};

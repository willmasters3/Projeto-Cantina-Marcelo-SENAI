import authConfig from '../config/auth.js';
import reportsRepository from '../repositories/reportsRepository.js';
import {
  decimalFactor,
  decimalScale,
  formatFixedDecimal
} from '../utils/fixedDecimal.js';
import HttpError from '../utils/httpError.js';

const validPaymentMethods = new Set(['ALL', 'DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTROS', 'FIADO']);
const validStatuses = new Set(['ALL', 'CONFIRMADA', 'CANCELADA']);
const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const today = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
};

const normalizeDate = (value, fieldName, fallback) => {
  const normalized = String(value ?? fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new HttpError(400, `${fieldName} inválida.`);
  }
  return normalized;
};

const normalizeOptionalId = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new HttpError(400, `${fieldName} inválido.`);
  }
  return normalized;
};

const normalizeEnum = (value, validValues, fallback, fieldName) => {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  if (!validValues.has(normalized)) throw new HttpError(400, `${fieldName} inválido.`);
  return normalized;
};

const normalizePage = (value, fallback = 1) => {
  const page = Number(value);
  if (!Number.isFinite(page)) return fallback;
  return Math.min(Math.max(Math.trunc(page), 1), 100000);
};

const normalizePageSize = (value, fallback = 10) => {
  const pageSize = Number(value);
  if (!Number.isFinite(pageSize)) return fallback;
  return Math.min(Math.max(Math.trunc(pageSize), 1), 100);
};

const normalizeFilters = (query = {}) => {
  const startDate = normalizeDate(query.startDate, 'Data inicial', today());
  const endDate = normalizeDate(query.endDate, 'Data final', startDate);
  if (endDate < startDate) throw new HttpError(400, 'Data final não pode ser menor que a data inicial.');

  return {
    startDate,
    endDate,
    paymentMethod: normalizeEnum(query.paymentMethod, validPaymentMethods, 'ALL', 'Forma de pagamento'),
    status: normalizeEnum(query.status, validStatuses, 'ALL', 'Status'),
    clientId: normalizeOptionalId(query.clientId, 'Cliente'),
    productId: normalizeOptionalId(query.productId, 'Produto'),
    page: normalizePage(query.page),
    pageSize: normalizePageSize(query.pageSize, 10)
  };
};

const parseReportDecimal = (value, { allowNegative = false } = {}) => {
  if (typeof value === 'bigint') return value;

  const normalized = typeof value === 'number'
    ? value.toFixed(decimalScale + 1)
    : String(value ?? '0').trim();
  const pattern = allowNegative
    ? /^-?\d+(?:\.\d+)?$/
    : /^\d+(?:\.\d+)?$/;
  if (!pattern.test(normalized)) {
    throw new TypeError('Valor decimal inválido');
  }

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, decimalPart = ''] = unsigned.split('.');
  const paddedDecimal = decimalPart.padEnd(decimalScale + 1, '0');
  const keptDecimal = paddedDecimal.slice(0, decimalScale);
  const roundDigit = Number(paddedDecimal[decimalScale] || '0');
  let units = (BigInt(integerPart) * decimalFactor) + BigInt(keptDecimal || '0');

  if (roundDigit >= 5) units += 1n;
  return negative ? -units : units;
};

const money = (value) => formatFixedDecimal(parseReportDecimal(value, { allowNegative: true }));

const subtractMoney = (left, right) => (
  formatFixedDecimal(parseReportDecimal(left) - parseReportDecimal(right))
);

const maskCpf = (cpf) => {
  const digits = String(cpf ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return 'Não informado';
  return `***.***.***-${digits.slice(-2)}`;
};

const getCycleKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today().slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const dateKey = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const normalized = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
};

const getCycleLabel = (cycleKey) => {
  const [year, month] = String(cycleKey).split('-');
  return `${monthLabels[Number(month) - 1] || month}/${year}`;
};

const getFiadoStatus = (debtor) => {
  const currentCycle = today().slice(0, 7);
  const oldestCycle = getCycleKey(debtor.ciclo_mais_antigo);
  const hasCredit = parseReportDecimal(debtor.creditos) > 0n;
  if (oldestCycle < currentCycle) return hasCredit ? 'ATRASADO' : 'VENCIDO';
  return hasCredit ? 'PARCIAL' : 'EM_ABERTO';
};

const formatDebtor = (debtor) => {
  const cycleKey = getCycleKey(debtor.ciclo_mais_antigo);
  return {
    id: debtor.id,
    nome: debtor.nome,
    cpf_mascarado: maskCpf(debtor.cpf),
    codigo: debtor.codigo,
    matricula: debtor.matricula,
    ciclo_mais_antigo: getCycleLabel(cycleKey),
    ciclo_mais_antigo_key: cycleKey,
    saldo_aberto: money(debtor.saldo_aberto),
    status: getFiadoStatus(debtor)
  };
};

const fillSevenDayTrend = (rows, endDate) => {
  const byDate = new Map(rows.map((row) => [dateKey(row.data), row]));
  const end = new Date(`${endDate}T00:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const row = byDate.get(key);
    return {
      data: key,
      quantidade: Number(row?.quantidade || 0),
      total: money(row?.total)
    };
  });
};

const addPercentages = (rows) => {
  const total = rows.reduce(
    (sum, row) => sum + parseReportDecimal(row.total),
    0n
  );

  return rows.map((row) => {
    const value = parseReportDecimal(row.total);
    const percentage = total > 0n ? Number(value * 10000n / total) / 100 : 0;
    return {
      ...row,
      total: money(row.total),
      percentual: percentage.toFixed(2)
    };
  });
};

const assertReportAccess = (user) => {
  const role = user?.role?.slug;
  if (![authConfig.roles.admin, authConfig.roles.viewer].includes(role)) {
    throw new HttpError(403, 'Você não tem permissão para acessar relatórios.');
  }
};

const listOptions = async (user) => {
  assertReportAccess(user);
  return reportsRepository.listOptions();
};

const getSummary = async (query, user) => {
  assertReportAccess(user);
  const filters = normalizeFilters(query);
  const [
    sales,
    canceled,
    received,
    fiadoOpen,
    profit,
    paymentBreakdown,
    trend,
    topProducts,
    debtors,
    fiadoReceipts,
    cash
  ] = await Promise.all([
    reportsRepository.getSalesPeriodSummary(filters),
    reportsRepository.getCanceledSalesSummary(filters),
    reportsRepository.getReceivedPeriodSummary(filters),
    reportsRepository.getFiadoOpenSummary(),
    reportsRepository.getEstimatedProfit(filters),
    reportsRepository.getPaymentBreakdown(filters, {
      includeRefunds: false,
      salePaymentsOnly: true
    }),
    reportsRepository.getSalesTrend(filters),
    reportsRepository.listTopProducts(filters, 5),
    reportsRepository.listFiadoDebtors(5),
    reportsRepository.listFiadoReceipts(filters, 5),
    reportsRepository.getCashSummary(filters)
  ]);

  return {
    filters,
    cards: {
      vendas_periodo: {
        total: money(sales.total_vendido),
        quantidade: Number(sales.quantidade_vendas || 0)
      },
      recebido_periodo: {
        total: money(received.total_recebido),
        quantidade: Number(received.quantidade_recebimentos || 0)
      },
      fiado_em_aberto: {
        total: money(fiadoOpen.total_em_aberto),
        clientes: Number(fiadoOpen.clientes_com_pendencia || 0)
      },
      lucro_estimado: {
        total: subtractMoney(profit.total_itens, profit.custo_estimado),
        custo_estimado: money(profit.custo_estimado)
      }
    },
    paymentBreakdown: addPercentages(paymentBreakdown),
    salesTrend: fillSevenDayTrend(trend, filters.endDate),
    topProducts: topProducts.map((product) => ({
      ...product,
      total: money(product.total)
    })),
    fiadoDebtors: debtors.map(formatDebtor),
    fiadoReceipts: fiadoReceipts.map((receipt) => ({
      ...receipt,
      valor: money(receipt.valor)
    })),
    cash: {
      payments: addPercentages(cash.payments),
      sales: {
        total_vendido: money(cash.sales.total_vendido),
        quantidade_vendas: Number(cash.sales.quantidade_vendas || 0)
      },
      canceled: {
        valor_cancelado: money(cash.canceled.valor_cancelado),
        quantidade_cancelada: Number(cash.canceled.quantidade_cancelada || 0)
      }
    }
  };
};

const listSales = async (query, user) => {
  assertReportAccess(user);
  const report = await reportsRepository.listSales(normalizeFilters(query));
  return report;
};

const getCashReport = async (query, user) => {
  assertReportAccess(user);
  const filters = normalizeFilters(query);
  const [summary, sessions] = await Promise.all([
    reportsRepository.getCashSummary(filters),
    reportsRepository.listCashSessions(filters)
  ]);
  return {
    summary: {
      payments: addPercentages(summary.payments),
      sales: {
        total_vendido: money(summary.sales.total_vendido),
        quantidade_vendas: Number(summary.sales.quantidade_vendas || 0)
      },
      canceled: {
        valor_cancelado: money(summary.canceled.valor_cancelado),
        quantidade_cancelada: Number(summary.canceled.quantidade_cancelada || 0)
      }
    },
    sessions
  };
};

const getFiadoReport = async (query, user) => {
  assertReportAccess(user);
  const filters = normalizeFilters(query);
  const [open, debtors, receipts] = await Promise.all([
    reportsRepository.getFiadoOpenSummary(),
    reportsRepository.listFiadoDebtors(100),
    reportsRepository.listFiadoReceipts(filters)
  ]);
  return {
    summary: {
      total_em_aberto: money(open.total_em_aberto),
      clientes_com_pendencia: Number(open.clientes_com_pendencia || 0),
      recebido_periodo: money(receipts.reduce(
        (sum, receipt) => sum + parseReportDecimal(receipt.valor),
        0n
      ))
    },
    debtors: debtors.map(formatDebtor),
    receipts: receipts.map((receipt) => ({
      ...receipt,
      valor: money(receipt.valor)
    }))
  };
};

const getPaymentsReport = async (query, user) => {
  assertReportAccess(user);
  return {
    items: addPercentages(await reportsRepository.getPaymentBreakdown(normalizeFilters(query)))
  };
};

const getProductsReport = async (query, user) => {
  assertReportAccess(user);
  const report = await reportsRepository.listProductsSold(normalizeFilters(query));
  return {
    ...report,
    items: report.items.map((item) => ({
      ...item,
      total_vendido: money(item.total_vendido),
      custo_estimado: money(item.custo_estimado),
      lucro_estimado: money(item.lucro_estimado)
    }))
  };
};

const getStockReport = async (query, user) => {
  assertReportAccess(user);
  const report = await reportsRepository.getStockReport(normalizeFilters(query));
  return {
    ...report,
    summary: {
      valor_estimado: money(report.summary.valor_estimado),
      baixo_estoque: Number(report.summary.baixo_estoque || 0),
      sem_estoque: Number(report.summary.sem_estoque || 0)
    }
  };
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

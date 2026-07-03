const scale = 4;
const factor = 10n ** BigInt(scale);

const decimalToUnits = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^-?\d+(?:\.\d{1,4})?$/.test(normalized)) {
    throw new TypeError('Valor monetário inválido');
  }
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, decimalPart = ''] = unsigned.split('.');
  const units = BigInt(integerPart) * factor + BigInt(decimalPart.padEnd(scale, '0'));
  return negative ? -units : units;
};

const unitsToDecimal = (units) => {
  const normalized = BigInt(units);
  const negative = normalized < 0n;
  const absolute = negative ? -normalized : normalized;
  const integerPart = absolute / factor;
  const decimalPart = String(absolute % factor).padStart(scale, '0');
  return `${negative ? '-' : ''}${integerPart}.${decimalPart}`;
};

const formatBRL = (value) => {
  const units = typeof value === 'bigint' ? value : decimalToUnits(value ?? '0');
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const integerPart = absolute / factor;
  const fourDecimals = String(absolute % factor).padStart(scale, '0');
  const decimals = fourDecimals.slice(2) === '00' ? fourDecimals.slice(0, 2) : fourDecimals;
  const grouped = String(integerPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '- ' : ''}R$ ${grouped},${decimals}`;
};

const multiplyMoney = (value, quantity) => decimalToUnits(value) * BigInt(quantity);

export { decimalToUnits, factor, formatBRL, multiplyMoney, unitsToDecimal };

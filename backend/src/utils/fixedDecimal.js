const decimalScale = 4;
const decimalFactor = 10n ** BigInt(decimalScale);

const parseFixedDecimal = (value, { allowNegative = false } = {}) => {
  if (typeof value === 'bigint') return value;

  const normalized = String(value ?? '').trim();
  const pattern = allowNegative
    ? /^-?\d+(?:\.\d{1,4})?$/
    : /^\d+(?:\.\d{1,4})?$/;
  if (!pattern.test(normalized)) {
    throw new TypeError('Valor decimal inválido');
  }

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, decimalPart = ''] = unsigned.split('.');
  const units = BigInt(integerPart) * decimalFactor
    + BigInt(decimalPart.padEnd(decimalScale, '0'));
  return negative ? -units : units;
};

const formatFixedDecimal = (units) => {
  const normalized = BigInt(units);
  const negative = normalized < 0n;
  const absolute = negative ? -normalized : normalized;
  const integerPart = absolute / decimalFactor;
  const decimalPart = String(absolute % decimalFactor).padStart(decimalScale, '0');
  return `${negative ? '-' : ''}${integerPart}.${decimalPart}`;
};

const multiplyFixedDecimal = (units, integerMultiplier) => (
  BigInt(units) * BigInt(integerMultiplier)
);

export {
  decimalFactor,
  decimalScale,
  formatFixedDecimal,
  multiplyFixedDecimal,
  parseFixedDecimal
};

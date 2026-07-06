const formatQuantity = (value) => {
  const normalized = String(value ?? '').trim();
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return normalized || '0';

  const sign = match[1];
  const integer = match[2].replace(/^0+(?=\d)/, '');
  const fraction = (match[3] || '').replace(/0+$/, '');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${sign}${groupedInteger}${fraction ? `,${fraction}` : ''}`;
};

export { formatQuantity };

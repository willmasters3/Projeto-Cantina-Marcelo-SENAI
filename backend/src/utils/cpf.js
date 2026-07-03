const normalizeCpf = (value) => String(value ?? '').replace(/\D/g, '');

const calculateCpfDigit = (cpfBase, factor) => {
  const total = [...cpfBase].reduce(
    (sum, digit, index) => sum + Number(digit) * (factor - index),
    0
  );
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
};

const isValidCpf = (value) => {
  const rawCpf = String(value ?? '').trim();
  const isAcceptedFormat = /^\d{11}$/.test(rawCpf)
    || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(rawCpf);
  if (!isAcceptedFormat) return false;

  const cpf = normalizeCpf(rawCpf);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const firstDigit = calculateCpfDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateCpfDigit(cpf.slice(0, 10), 11);
  return firstDigit === Number(cpf[9]) && secondDigit === Number(cpf[10]);
};

export { isValidCpf, normalizeCpf };
